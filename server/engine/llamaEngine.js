const path = require('path');
const fs = require('fs');
const { scanModelsDirectory } = require('./modelScanner');
const { MODELS_DIR } = require('../config');

class LlamaEngineManager {
  constructor() {
    this.llama = null;
    this.model = null;
    this.context = null;
    this.activeModelName = null;
    this.allocatedContextSize = 8192;
    this.isNativeLoaded = false;
    this.isLoading = false;
    this.gpuInfo = 'Hardware Accelerated (Vulkan)';
    this.lastError = null;
    this._executionMutex = Promise.resolve();
  }

  /**
   * Initializes the Llama runtime if available with GPU acceleration
   */
  async initRuntime() {
    if (this.llama && this.isNativeLoaded) return true;
    try {
      const { getLlama } = await import('node-llama-cpp');
      this.llama = await getLlama({ gpu: 'vulkan' });
      this.gpuInfo = this.llama.gpu || 'Hardware Accelerated (Vulkan)';
      this.isNativeLoaded = true;
      console.log(`[LlamaEngine]: Native runtime loaded successfully with GPU: ${this.gpuInfo}`);
      return true;
    } catch (error) {
      this.isNativeLoaded = false;
      this.llama = null;
      this.lastError = error.message;
      console.warn(`[LlamaEngine]: node-llama-cpp native bindings fallback error: ${error.message}`);
      return false;
    }
  }

  /**
   * Safely disposes current context and model to free VRAM
   */
  async _disposeCurrent() {
    if (this.context) {
      try {
        await this.context.dispose();
      } catch (e) {}
      this.context = null;
    }
    if (this.model) {
      try {
        await this.model.dispose();
      } catch (e) {}
      this.model = null;
    }
  }

  /**
   * Resolves a model filename or partial string to a full filepath in MODELS_DIR
   */
  resolveModelPath(modelFilename) {
    if (!modelFilename) return null;
    if (path.isAbsolute(modelFilename) && fs.existsSync(modelFilename)) {
      return modelFilename;
    }
    const directPath = path.join(MODELS_DIR, modelFilename);
    if (fs.existsSync(directPath)) {
      return directPath;
    }

    const available = scanModelsDirectory(MODELS_DIR).filter(m => m.type === 'llm');
    const cleanTarget = path.basename(modelFilename, path.extname(modelFilename)).toLowerCase().replace(/[-_.]/g, '');
    
    const matched = available.find(m => {
      const cleanName = path.basename(m.filename, path.extname(m.filename)).toLowerCase().replace(/[-_.]/g, '');
      return cleanName.includes(cleanTarget) || cleanTarget.includes(cleanName);
    });

    if (matched) {
      return path.join(MODELS_DIR, matched.filename);
    }
    if (available.length > 0) {
      return path.join(MODELS_DIR, available[0].filename);
    }
    return null;
  }

  /**
   * Loads a specific GGUF model into memory/VRAM (Serialized via Mutex)
   * @param {string} modelFilename 
   */
  async loadModel(modelFilename) {
    return (this._executionMutex = this._executionMutex.then(async () => {
      this.isLoading = true;
      this.lastError = null;

      try {
        const fullPath = this.resolveModelPath(modelFilename);
        if (!fullPath || !fs.existsSync(fullPath)) {
          throw new Error(`Model file not found for '${modelFilename}' at: ${MODELS_DIR}`);
        }

        const targetBaseName = path.basename(fullPath);

        // If already active and healthy, reuse without re-allocating VRAM
        if (this.activeModelName === targetBaseName && this.model && !this.model.disposed && this.context && !this.context.disposed) {
          this.isLoading = false;
          return { success: true, model: this.activeModelName, native: this.isNativeLoaded };
        }

        await this.initRuntime();

        if (this.isNativeLoaded && this.llama) {
          // Free previous model and context first to release GPU VRAM
          await this._disposeCurrent();

          // Tiered context allocation to guarantee loading into GPU VRAM
          const contextTiers = [8192, 4096, 2048];
          let loaded = false;

          for (const ctxSize of contextTiers) {
            try {
              await this._disposeCurrent();
              this.model = await this.llama.loadModel({
                modelPath: fullPath,
                gpuLayers: 99
              });
              this.context = await this.model.createContext({
                contextSize: ctxSize,
                sequences: 1
              });
              this.allocatedContextSize = ctxSize;
              loaded = true;
              console.log(`[LlamaEngine]: Loaded model ${targetBaseName} into GPU VRAM with context ${ctxSize} successfully.`);
              break;
            } catch (tierErr) {
              console.warn(`[LlamaEngine]: Context ${ctxSize} tier failed for ${targetBaseName} (${tierErr.message}), trying next tier...`);
            }
          }

          if (!loaded) {
            // CPU fallback as last resort
            await this._disposeCurrent();
            this.model = await this.llama.loadModel({
              modelPath: fullPath,
              gpuLayers: 0
            });
            this.context = await this.model.createContext({
              contextSize: 2048,
              sequences: 1
            });
            this.allocatedContextSize = 2048;
            console.log(`[LlamaEngine]: Loaded model ${targetBaseName} on CPU fallback successfully.`);
          }
        }

        this.activeModelName = targetBaseName;
        this.isLoading = false;
        return { success: true, model: this.activeModelName, native: this.isNativeLoaded };
      } catch (error) {
        this.isLoading = false;
        this.lastError = error.message;
        console.error('[LlamaEngine]: Failed to load model:', error);
        throw error;
      }
    }));
  }

  /**
   * Executes chat completion for a list of messages with complete conversational history
   * @param {Array<{role: string, content: string}>} messages 
   * @param {object} options 
   * @param {function} onToken
   */
  async generateCompletion(messages = [], options = {}, onToken = null) {
    if (!messages || !Array.isArray(messages)) {
      throw new Error('messages array is required');
    }
    return (this._executionMutex = this._executionMutex.then(async () => {
      // 1. If no model is active, load requested model or first available
      if (!this.activeModelName || !this.model || this.model.disposed) {
        const target = options.model || null;
        const resolved = this.resolveModelPath(target);
        if (resolved) {
          await this.loadModel(resolved);
        } else {
          const available = scanModelsDirectory(MODELS_DIR).filter(m => m.type === 'llm');
          if (available.length > 0) {
            await this.loadModel(available[0].filename);
          } else {
            throw new Error('No se encontraron modelos .gguf en la carpeta ./models/. Coloca un archivo .gguf para activar la inferencia nativa.');
          }
        }
      } else if (options.model) {
        const resolved = this.resolveModelPath(options.model);
        if (resolved && path.basename(resolved) !== this.activeModelName) {
          console.log(`[LlamaEngine]: Dynamic model switch requested: ${this.activeModelName} -> ${path.basename(resolved)}`);
          await this.loadModel(resolved);
        }
      }

      if (this.isNativeLoaded && this.model && !this.model.disposed) {
        const { LlamaChatSession } = await import('node-llama-cpp');

        // Ensure healthy context with available sequence
        if (!this.context || this.context.disposed || this.context.sequencesLeft === 0) {
          if (this.context) {
            try { await this.context.dispose(); } catch (e) {}
          }
          this.context = await this.model.createContext({
            contextSize: this.allocatedContextSize || 4096,
            sequences: 1
          });
        }

        const systemMsg = messages.find(m => m.role === 'system')?.content || '';
        const nonSystemMessages = messages.filter(m => m.role !== 'system');
        
        // Build full conversational history for node-llama-cpp
        const chatHistory = [];
        if (systemMsg) {
          chatHistory.push({ type: 'system', text: systemMsg });
        }

        const historyItems = nonSystemMessages.slice(0, -1);
        const lastMessage = nonSystemMessages[nonSystemMessages.length - 1];
        const lastUserMsg = lastMessage ? lastMessage.content : 'Continuar narración.';

        // Si el primer mensaje del historial es del narrador (mensaje #0 de apertura),
        // insertar un turno canónico inicial de usuario para preservar la alternancia estándar
        if (historyItems.length > 0 && historyItems[0].role === 'assistant') {
          chatHistory.push({ type: 'user', text: 'Comienza la historia e introduce la escena de partida del escenario.' });
        }

        for (const item of historyItems) {
          if (item.role === 'user') {
            chatHistory.push({ type: 'user', text: item.content });
          } else if (item.role === 'assistant') {
            chatHistory.push({ type: 'model', response: [item.content] });
          }
        }

        const sequence = this.context.getSequence();
        const session = new LlamaChatSession({
          contextSequence: sequence,
          autoDisposeSequence: true,
          systemPrompt: systemMsg || undefined,
          contextShift: {
            strategy: 'eraseBeginning'
          }
        });

        if (chatHistory.length > 0) {
          session.setChatHistory(chatHistory);
        }

        try {
          const response = await session.prompt(lastUserMsg, {
            maxTokens: options.maxTokens || options.max_tokens || 1024,
            temperature: options.temperature !== undefined ? options.temperature : 0.7,
            topP: options.topP !== undefined ? options.topP : (options.top_p !== undefined ? options.top_p : 0.95),
            onToken: (tokens) => {
              if (onToken && this.model && !this.model.disposed) {
                const text = this.model.detokenize(tokens);
                onToken(text);
              }
            }
          });
          return response;
        } finally {
          try {
            session.dispose({ disposeSequence: true });
          } catch (e) {}
        }
      }

      throw new Error(`[LlamaEngine]: El motor nativo no pudo inicializar el modelo '${this.activeModelName}'. Comprueba que el archivo .gguf es válido.`);
    }));
  }

  /**
   * Returns current status of the engine
   */
  getStatus() {
    return {
      status: this.isLoading ? 'loading' : (this.activeModelName ? 'ready' : 'idle'),
      activeModel: this.activeModelName,
      allocatedContextSize: this.allocatedContextSize,
      isNativeLoaded: this.isNativeLoaded,
      gpu: this.gpuInfo,
      modelsDir: MODELS_DIR,
      error: this.lastError
    };
  }
}

const llamaEngine = new LlamaEngineManager();

module.exports = {
  llamaEngine
};

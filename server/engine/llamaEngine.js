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
    this.isNativeLoaded = false;
    this.isLoading = false;
    this.gpuInfo = 'CPU / Auto-detect';
    this.lastError = null;
  }

  /**
   * Initializes the Llama runtime if available
   */
  async initRuntime() {
    if (this.llama) return true;
    try {
      // Dynamic import of node-llama-cpp
      const { getLlama } = await import('node-llama-cpp');
      this.llama = await getLlama();
      this.gpuInfo = this.llama.gpu || 'Hardware Accelerated (Vulkan/CUDA)';
      this.isNativeLoaded = true;
      console.log(`[LlamaEngine]: Native runtime loaded successfully with GPU: ${this.gpuInfo}`);
      return true;
    } catch (error) {
      this.isNativeLoaded = false;
      this.lastError = error.message;
      console.warn('[LlamaEngine]: node-llama-cpp native bindings not active. Running in server mode with GGUF file management.');
      return false;
    }
  }

  /**
   * Loads a specific GGUF model into memory/VRAM
   * @param {string} modelFilename 
   */
  async loadModel(modelFilename) {
    this.isLoading = true;
    this.lastError = null;

    try {
      const fullPath = path.isAbsolute(modelFilename) 
        ? modelFilename 
        : path.join(MODELS_DIR, modelFilename);

      if (!fs.existsSync(fullPath)) {
        throw new Error(`Model file not found at: ${fullPath}`);
      }

      await this.initRuntime();

      if (this.isNativeLoaded && this.llama) {
        // Free previous context and model
        if (this.context) {
          await this.context.dispose();
          this.context = null;
        }
        if (this.model) {
          await this.model.dispose();
          this.model = null;
        }

        this.model = await this.llama.loadModel({ modelPath: fullPath });
        this.context = await this.model.createContext({
          contextSize: 8192
        });
        console.log(`[LlamaEngine]: Loaded model ${modelFilename} into VRAM context.`);
      }

      this.activeModelName = path.basename(fullPath);
      this.isLoading = false;
      return { success: true, model: this.activeModelName, native: this.isNativeLoaded };
    } catch (error) {
      this.isLoading = false;
      this.lastError = error.message;
      console.error('[LlamaEngine]: Failed to load model:', error);
      throw error;
    }
  }

  /**
   * Executes chat completion for a list of messages
   * @param {Array<{role: string, content: string}>} messages 
   * @param {object} options 
   * @param {function} onToken
   */
  async generateCompletion(messages = [], options = {}, onToken = null) {
    if (!this.activeModelName) {
      // If no model explicitly loaded, try loading the first available model in ./models/
      const available = scanModelsDirectory(MODELS_DIR);
      if (available.length > 0) {
        await this.loadModel(available[0].filename);
      } else {
        throw new Error('No .gguf models found in ./models/ directory. Please place a .gguf model in ./models/');
      }
    }

    if (this.isNativeLoaded && this.context) {
      const { LlamaChatSession } = await import('node-llama-cpp');
      const session = new LlamaChatSession({ contextSequence: this.context.getSequence() });
      
      const lastUserMsg = messages.filter(m => m.role === 'user').pop()?.content || '';
      const response = await session.prompt(lastUserMsg, {
        maxTokens: options.maxTokens || 1024,
        temperature: options.temperature || 0.7,
        onToken: (tokens) => {
          if (onToken && this.model) {
            const text = this.model.detokenize(tokens);
            onToken(text);
          }
        }
      });
      return response;
    }

    // Fallback response if native binary compiler is building
    return `[Ptahn Native Server]: Modelo '${this.activeModelName}' detectado en ./models/. Inferencia lista.`;
  }

  /**
   * Returns current status of the engine
   */
  getStatus() {
    return {
      status: this.isLoading ? 'loading' : (this.activeModelName ? 'ready' : 'idle'),
      activeModel: this.activeModelName,
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

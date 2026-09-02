/**
 * rerankerEngine.js
 * Native CPU Cross-Encoder & Semantic Affinity Scorer for Ptahn.
 * 
 * Computes fast, pairwise semantic relevance between the player's recent actions
 * and candidate lore cards (characters, locations, factions, creatures).
 * 
 * Operates 100% locally on CPU via Transformers.js (ONNX Runtime) with zero GPU VRAM consumption.
 */

let pipelineFn = null;
let extractorInstance = null;
let isInitializing = false;
let initError = null;

// Lightweight in-memory embedding cache for static card texts
const textEmbeddingCache = new Map();
const MAX_CACHE_ENTRIES = 200;

/**
 * Computes dot product and cosine similarity between two float vectors.
 * @param {Float32Array|number[]} a 
 * @param {Float32Array|number[]} b 
 * @returns {number} Normalized score between 0.0 and 1.0
 */
function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  const sim = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  // Direct cosine similarity clamped to [0, 1] without artificial baseline inflation
  return Math.max(0, Math.min(1, sim));
}

/**
 * Heuristic token-overlap and n-gram similarity fallback (0ms, 0 dependency).
 * @param {string} query 
 * @param {string} target 
 * @returns {number} Score between 0.0 and 1.0
 */
function heuristicSimilarity(query = '', target = '') {
  if (!query || !target) return 0;
  const qTokens = query.toLowerCase().split(/\W+/).filter(t => t.length > 2);
  const tTokens = target.toLowerCase().split(/\W+/).filter(t => t.length > 2);
  if (qTokens.length === 0 || tTokens.length === 0) return 0;

  const tSet = new Set(tTokens);
  let matches = 0;
  for (const token of qTokens) {
    if (tSet.has(token)) {
      matches += (token.length > 3 ? 1.5 : 1.0);
    }
  }
  if (matches === 0) return 0;

  // Dice coefficient with boost for targeted context
  const dice = (2.0 * matches) / (qTokens.length + tTokens.length);
  const normalized = Math.min(1.0, Math.max(0.0, dice * 2.8));
  return Number(normalized.toFixed(4));
}

class RerankerEngine {
  constructor() {
    this.modelName = 'Xenova/all-MiniLM-L6-v2';
    this.isReady = false;
  }

  /**
   * Initializes the Transformers.js CPU pipeline asynchronously.
   */
  async init() {
    if (this.isReady && extractorInstance) return true;
    if (isInitializing) return false;
    isInitializing = true;

    try {
      if (!pipelineFn) {
        const dynamicImport = new Function('specifier', 'return import(specifier)');
        const transformers = await dynamicImport('@xenova/transformers');
        pipelineFn = transformers.pipeline;
        // Ensure models download to local cache and run purely on CPU
        if (transformers.env) {
          transformers.env.allowRemoteModels = true;
          transformers.env.backends = transformers.env.backends || {};
          if (transformers.env.backends.onnx) {
            transformers.env.backends.onnx.wasm = transformers.env.backends.onnx.wasm || {};
            transformers.env.backends.onnx.wasm.numThreads = 2;
          }
        }
      }

      extractorInstance = await pipelineFn('feature-extraction', this.modelName, {
        quantized: true
      });
      this.isReady = true;
      initError = null;
      console.log(`[RerankerEngine]: Successfully loaded ${this.modelName} on CPU (Zero VRAM).`);
      return true;
    } catch (err) {
      initError = err.message;
      console.warn(`[RerankerEngine]: Could not initialize ONNX model (${err.message}), falling back to smart token affinity.`);
      return false;
    } finally {
      isInitializing = false;
    }
  }

  /**
   * Extracts embedding vector for a given text snippet.
   * @param {string} text 
   * @returns {Promise<Float32Array|null>}
   */
  async getEmbedding(text) {
    if (!text || typeof text !== 'string') return null;
    const clean = text.trim();
    if (!clean) return null;

    if (textEmbeddingCache.has(clean)) {
      return textEmbeddingCache.get(clean);
    }

    if (!this.isReady && !initError) {
      await this.init().catch(() => {});
    }

    if (!extractorInstance) {
      return null;
    }

    try {
      const output = await extractorInstance(clean, { pooling: 'mean', normalize: true });
      const embedding = output.data;
      if (textEmbeddingCache.size >= MAX_CACHE_ENTRIES) {
        const firstKey = textEmbeddingCache.keys().next().value;
        textEmbeddingCache.delete(firstKey);
      }
      textEmbeddingCache.set(clean, embedding);
      return embedding;
    } catch (e) {
      return null;
    }
  }

  /**
   * Scores an array of candidate cards against the user query.
   * @param {string} query The latest player message + immediate context
   * @param {Array<{ id: string, text: string }>} candidates Candidate cards
   * @returns {Promise<Object<string, number>>} Map of { [id]: score (0.0 to 1.0) }
   */
  async scoreCandidates(query, candidates = []) {
    if (!candidates || !Array.isArray(candidates) || candidates.length === 0) {
      return {};
    }

    const cleanQuery = (query || '').trim();
    if (!cleanQuery) {
      const emptyScores = {};
      candidates.forEach(c => { if (c && c.id) emptyScores[c.id] = 0; });
      return emptyScores;
    }

    const queryEmbedding = await this.getEmbedding(cleanQuery);
    const results = {};

    for (const item of candidates) {
      if (!item || !item.id) continue;
      const docText = item.text || item.title || '';

      if (queryEmbedding) {
        const docEmbedding = await this.getEmbedding(docText);
        if (docEmbedding) {
          const sim = cosineSimilarity(queryEmbedding, docEmbedding);
          results[item.id] = Number(sim.toFixed(4));
          continue;
        }
      }

      // High-performance token/n-gram fallback
      const hScore = heuristicSimilarity(cleanQuery, docText);
      results[item.id] = hScore;
    }

    return results;
  }
}

const rerankerEngine = new RerankerEngine();

module.exports = {
  RerankerEngine,
  rerankerEngine,
  cosineSimilarity,
  heuristicSimilarity
};

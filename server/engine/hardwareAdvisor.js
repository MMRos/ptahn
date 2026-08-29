const os = require('os');

/**
 * Hardware Advisor & Model Memory Estimator
 * Evaluates host VRAM/RAM capabilities to recommend models that run smoothly.
 */

function getSystemHardwareSpecs() {
  const totalRamGb = Math.round(os.totalmem() / (1024 * 1024 * 1024));
  const freeRamGb = Math.round(os.freemem() / (1024 * 1024 * 1024));

  // Default fallback VRAM detection (12GB typical gaming GPU baseline if not queryable via driver)
  let estimatedVramGb = 12;
  try {
    if (process.env.VRAM_GB) {
      estimatedVramGb = Number(process.env.VRAM_GB) || 12;
    }
  } catch (e) { }

  return {
    vramGb: estimatedVramGb,
    ramGb: totalRamGb,
    freeRamGb: freeRamGb,
    cpuCores: os.cpus().length,
    platform: process.platform
  };
}

/**
 * Estimates model VRAM requirements in GB based on architecture, parameter count and quantization.
 */
function estimateModelMemory({ parameterSizeB = 12, quantization = 'Q4_K_M', type = 'llm', subType = 'checkpoint' }) {
  if (type === 'diffusion') {
    if (subType === 'lora') {
      return { estimatedVramGb: 0.5, minimumRamGb: 4 };
    }
    // SDXL / Pony Checkpoints: ~6.5GB VRAM base + 1.0GB overhead
    return { estimatedVramGb: 7.2, minimumRamGb: 16 };
  }

  // LLM / GGUF Memory Estimation
  const b = Number(parameterSizeB) || 12;
  const quantLower = String(quantization || 'Q4_K_M').toUpperCase();

  let bytesPerParam = 0.55; // Q4 default (~4.5 bits + metadata)
  if (quantLower.includes('Q3') || quantLower.includes('IQ3')) bytesPerParam = 0.45;
  else if (quantLower.includes('Q4')) bytesPerParam = 0.55;
  else if (quantLower.includes('Q5')) bytesPerParam = 0.68;
  else if (quantLower.includes('Q6')) bytesPerParam = 0.80;
  else if (quantLower.includes('Q8')) bytesPerParam = 1.05;
  else if (quantLower.includes('F16') || quantLower.includes('FP16')) bytesPerParam = 2.0;

  // Context window overhead (8k context ~ 1.2GB KV cache)
  const kvCacheOverheadGb = 1.2;
  const weightsGb = b * bytesPerParam;
  const totalVramGb = Number((weightsGb + kvCacheOverheadGb).toFixed(1));

  return {
    estimatedVramGb: totalVramGb,
    minimumRamGb: Math.ceil(totalVramGb * 1.3)
  };
}

/**
 * Calculates hardware fit rating for a given model on the host machine.
 */
function calculateHardwareFit(model, hardware = null) {
  const specs = hardware || getSystemHardwareSpecs();
  const memoryReq = estimateModelMemory(model);
  const vram = specs.vramGb || 12;
  const ram = specs.ramGb || 32;

  const reqVram = memoryReq.estimatedVramGb;

  if (reqVram <= vram * 0.92) {
    return {
      status: 'optimal',
      badgeText: '🟢 Óptimo (100% VRAM)',
      color: '#6ee7b7',
      estimatedVramGb: reqVram,
      fitPercent: Math.min(100, Math.round((vram / reqVram) * 100)),
      recommendation: 'Velocidad máxima de inferencia en GPU nativa.'
    };
  } else if (reqVram <= vram + (ram * 0.4)) {
    return {
      status: 'partial',
      badgeText: '🟡 Carga Híbrida (GPU + RAM)',
      color: '#ffd36b',
      estimatedVramGb: reqVram,
      fitPercent: 75,
      recommendation: 'Carga parcial en VRAM con offloading a RAM del sistema.'
    };
  } else if (reqVram <= ram * 0.85) {
    return {
      status: 'heavy',
      badgeText: '🟠 Exigente / Offload Masivo',
      color: '#fb923c',
      estimatedVramGb: reqVram,
      fitPercent: 45,
      recommendation: 'Requiere mucha RAM. La generación será más lenta.'
    };
  } else {
    return {
      status: 'incompatible',
      badgeText: '🔴 Memoria Insuficiente',
      color: '#f87171',
      estimatedVramGb: reqVram,
      fitPercent: 15,
      recommendation: 'Supera la memoria combinada de tu equipo.'
    };
  }
}

/**
 * Curated Catalog of top tested roleplay, SLM, and diffusion models for Ptahn.
 */
function getCuratedModelsCatalog(hardware = null) {
  const specs = hardware || getSystemHardwareSpecs();

  const curatedList = [
    // 1. Rol Narrativo / Sin Censura
    {
      id: 'magnum-v4-12b-Q4_K_M.gguf',
      name: 'Magnum v4 12B (anthracite-org)',
      category: 'roleplay',
      categoryLabel: 'Rol Narrativo y Sin Censura',
      description: 'Excelente para rol inmersivo, diálogos picantes y fantasía oscura. Libertad total y prosa rica.',
      parameterSizeB: 12,
      quantization: 'Q4_K_M',
      type: 'llm',
      sizeBytes: 7477207936,
      formattedSize: '7.48 GB',
      downloadUrl: 'https://huggingface.co/bartowski/Magnum-v4-12B-GGUF/resolve/main/Magnum-v4-12B-Q4_K_M.gguf',
      tags: ['Uncensored', 'Roleplay', 'Sensory Prose', 'Fast']
    },
    {
      id: 'Stheno-v3.2-Zloss-8B.Q4_K_M.gguf',
      name: 'Llama 3 Stheno v3.2 (8B Q4_K_M)',
      category: 'roleplay',
      categoryLabel: 'Rol y Ficción Creativa',
      description: 'Uno de los modelos de 8B más aclamados por la comunidad de rol narrativo. Ultra rápido y expresivo.',
      parameterSizeB: 8,
      quantization: 'Q4_K_M',
      type: 'llm',
      sizeBytes: 4920000000,
      formattedSize: '4.92 GB',
      downloadUrl: 'https://huggingface.co/mradermacher/L3-8B-Stheno-v3.2-GGUF/resolve/main/L3-8B-Stheno-v3.2.Q4_K_M.gguf',
      tags: ['Roleplay', '8B', 'Stheno', 'Creative Writing']
    },
    {
      id: 'L3.2-8X3B-MOE-Dark-Champion-Inst-18.4B-uncen-ablit_D_AU-Q4_k_s.gguf',
      name: 'L3.2 MoE Dark Champion (18.4B Q4_K_S)',
      category: 'roleplay',
      categoryLabel: 'Multi-Personaje / MoE',
      description: 'Arquitectura Mixture of Experts optimizada para gestionar múltiples personajes simultáneos con voces diferenciadas.',
      parameterSizeB: 18,
      quantization: 'Q4_K_S',
      type: 'llm',
      sizeBytes: 10661776416,
      formattedSize: '10.66 GB',
      downloadUrl: 'https://huggingface.co/mradermacher/L3.2-8X3B-MOE-Dark-Champion-Inst-18.4B-uncen-ablit_D_AU-GGUF/resolve/main/L3.2-8X3B-MOE-Dark-Champion-Inst-18.4B-uncen-ablit_D_AU.Q4_k_s.gguf',
      tags: ['MoE', 'Multi-Character', 'Uncensored', 'Llama 3.2']
    },
    {
      id: 'Fimbulvetr-11B-v2.Q4_K_M.gguf',
      name: 'Fimbulvetr v2 (11B Solar Q4_K_M)',
      category: 'roleplay',
      categoryLabel: 'Fantasía Oscura y Novela',
      description: 'Basado en Solar 10.7B. Maestría en descripciones de combate, misterio y coherencia en partidas de rol complejas.',
      parameterSizeB: 11,
      quantization: 'Q4_K_M',
      type: 'llm',
      sizeBytes: 6850000000,
      formattedSize: '6.85 GB',
      downloadUrl: 'https://huggingface.co/TheBloke/Fimbulvetr-11B-v2-GGUF/resolve/main/fimbulvetr-11b-v2.Q4_K_M.gguf',
      tags: ['Roleplay', 'Solar', 'Dark Fantasy', '11B']
    },
    {
      id: 'Cydonia-22B-v2.Q4_K_S.gguf',
      name: 'Cydonia 22B v2 (Q4_K_S)',
      category: 'roleplay',
      categoryLabel: 'Narrativa Avanzada 22B',
      description: 'Fusión de alta fidelidad entre Mistral NeMo y Llama 3 para historias profundas con razonamiento complejo.',
      parameterSizeB: 22,
      quantization: 'Q4_K_S',
      type: 'llm',
      sizeBytes: 13200000000,
      formattedSize: '13.20 GB',
      downloadUrl: 'https://huggingface.co/mradermacher/Cydonia-22B-v2-GGUF/resolve/main/Cydonia-22B-v2.Q4_K_S.gguf',
      tags: ['22B', 'Deep Lore', 'Creative', 'Uncensored']
    },
    {
      id: 'Precog-Magnum-31B.i1-Q3_K_S.gguf',
      name: 'Precog-Magnum 31B (Q3_K_S)',
      category: 'roleplay',
      categoryLabel: 'Máxima Calidad de Prosa',
      description: 'Profundidad literaria suprema, gran iniciativa narrativa y coherencia a largo plazo para GPUs de 16GB VRAM.',
      parameterSizeB: 31,
      quantization: 'Q3_K_S',
      type: 'llm',
      sizeBytes: 13744015104,
      formattedSize: '13.74 GB',
      downloadUrl: 'https://huggingface.co/mradermacher/Precog-Magnum-31B-i1-GGUF/resolve/main/Precog-Magnum-31B.i1-Q3_K_S.gguf',
      tags: ['High Quality', '31B', 'Deep Roleplay', 'Uncensored']
    },

    // 2. Orquestadores SLM & Herramientas
    {
      id: 'mistral-nemo-instruct-2407-gguf-Q4-K-M.gguf',
      name: 'Mistral Nemo Instruct 2407 (12B Q4_K_M)',
      category: 'slm',
      categoryLabel: 'Orquestador SLM / Herramientas',
      description: 'El modelo orquestador e intermediario oficial de Ptahn. Extracción de fichas JSON en milisegundos, resúmenes y traducción Danbooru.',
      parameterSizeB: 12,
      quantization: 'Q4_K_M',
      type: 'llm',
      sizeBytes: 7477207808,
      formattedSize: '7.48 GB',
      downloadUrl: 'https://huggingface.co/bartowski/Mistral-Nemo-Instruct-2407-GGUF/resolve/main/Mistral-Nemo-Instruct-2407-Q4_K_M.gguf',
      tags: ['SLM', 'Fast', 'Tool Calling', 'JSON Extraction', 'Official']
    },
    {
      id: 'Qwen2.5-7B-Instruct.Q4_K_M.gguf',
      name: 'Qwen 2.5 Instruct (7B Q4_K_M)',
      category: 'slm',
      categoryLabel: 'SLM Inteligente / Español Fluido',
      description: 'Modelo de Alibaba con razonamiento excepcional, soporte nativo superior de español y seguimiento estricto de instrucciones.',
      parameterSizeB: 7,
      quantization: 'Q4_K_M',
      type: 'llm',
      sizeBytes: 4680000000,
      formattedSize: '4.68 GB',
      downloadUrl: 'https://huggingface.co/Qwen/Qwen2.5-7B-Instruct-GGUF/resolve/main/qwen2.5-7b-instruct-q4_k_m.gguf',
      tags: ['Qwen', '7B', 'Spanish', 'Fast SLM', 'Instruction']
    },
    {
      id: 'Qwen2.5-14B-Instruct.Q4_K_M.gguf',
      name: 'Qwen 2.5 Instruct (14B Q4_K_M)',
      category: 'slm',
      categoryLabel: 'SLM Avanzado / Rol & Lógica',
      description: 'Uno de los modelos más inteligentes de 14B del mundo. Compite directamente con modelos de 70B en razonamiento y rol.',
      parameterSizeB: 14,
      quantization: 'Q4_K_M',
      type: 'llm',
      sizeBytes: 8950000000,
      formattedSize: '8.95 GB',
      downloadUrl: 'https://huggingface.co/Qwen/Qwen2.5-14B-Instruct-GGUF/resolve/main/qwen2.5-14b-instruct-q4_k_m.gguf',
      tags: ['Qwen', '14B', 'High Intelligence', 'Multi-Lingual']
    },
    {
      id: 'Llama-3.2-3B-Instruct.Q4_K_M.gguf',
      name: 'Llama 3.2 Instruct (3B Q4_K_M)',
      category: 'slm',
      categoryLabel: 'SLM Ultra-Ligero (2.2 GB)',
      description: 'Modelo enano ultrarrápido ideal para PCs con poca VRAM o teléfonos móviles.',
      parameterSizeB: 3,
      quantization: 'Q4_K_M',
      type: 'llm',
      sizeBytes: 2150000000,
      formattedSize: '2.15 GB',
      downloadUrl: 'https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf',
      tags: ['3B', 'Ultra Fast', 'Mobile Friendly', 'Llama 3.2']
    },

    // 3. Difusión & Generación de Imágenes
    {
      id: 'malaAnimeMixNSFW_v70WithoutVAE.safetensors',
      name: 'Mala Anime Mix NSFW v7.0 (Pony V6 Base)',
      category: 'diffusion',
      categoryLabel: 'Generación de Arte Anime & NSFW',
      description: 'Checkpoint de difusión en GPU nativa para portadas de personajes, expresiones y fondos de escenarios.',
      type: 'diffusion',
      subType: 'checkpoint',
      sizeBytes: 6938041602,
      formattedSize: '6.94 GB',
      downloadUrl: 'https://huggingface.co/datasets/PtahnModels/anime-diffusion/resolve/main/malaAnimeMixNSFW_v70WithoutVAE.safetensors',
      tags: ['Diffusion', 'Pony V6', 'Anime', 'NSFW', 'Checkpoints']
    },
    {
      id: 'Animagine-XL-3.1.safetensors',
      name: 'Animagine XL v3.1 (SDXL Checkpoint)',
      category: 'diffusion',
      categoryLabel: 'Anime HD / Estilo Manga & Ilustración',
      description: 'Especializado en generación anime limpia de alta definición, trazos nítidos y estética manga oficial.',
      type: 'diffusion',
      subType: 'checkpoint',
      sizeBytes: 6940000000,
      formattedSize: '6.94 GB',
      downloadUrl: 'https://huggingface.co/cagliostrolab/animagine-xl-3.1/resolve/main/animagine-xl-3.1.safetensors',
      tags: ['Anime', 'SDXL', 'Clean Art', 'High Definition']
    },
    {
      id: 'Illustrious-XL-v0.1.safetensors',
      name: 'Illustrious XL v0.1 (SDXL Base)',
      category: 'diffusion',
      categoryLabel: 'Color Vibrante & Alta Fidelidad',
      description: 'Arquitectura avanzada para personajes y composiciones dinámicas con soporte de estilos y etiquetas Danbooru.',
      type: 'diffusion',
      subType: 'checkpoint',
      sizeBytes: 6940000000,
      formattedSize: '6.94 GB',
      downloadUrl: 'https://huggingface.co/OnomaAIResearch/Illustrious-xl-early-release-v0/resolve/main/Illustrious-XL-v0.1.safetensors',
      tags: ['Illustrious', 'SDXL', 'Vibrant', 'Danbooru Tags']
    },
    {
      id: 'dmd2_sdxl_4step_lora.safetensors',
      name: 'DMD2 SDXL 4-Step (Acelerador Turbo LoRA)',
      category: 'diffusion',
      categoryLabel: 'Acelerador de Difusión (4 Pasos)',
      description: 'Permite generar imágenes de alta calidad en solo 4 pasos de inferencia, multiplicando la velocidad por 5x.',
      type: 'diffusion',
      subType: 'lora',
      sizeBytes: 787359616,
      formattedSize: '787 MB',
      downloadUrl: 'https://huggingface.co/tianweiy/DMD2/resolve/main/dmd2_sdxl_4step_lora.safetensors',
      tags: ['LoRA', '4-Step', 'Turbo Speed', 'Accelerator']
    }
  ];

  return curatedList.map(item => ({
    ...item,
    hardwareFit: calculateHardwareFit(item, specs)
  }));
}

module.exports = {
  getSystemHardwareSpecs,
  estimateModelMemory,
  calculateHardwareFit,
  getCuratedModelsCatalog
};

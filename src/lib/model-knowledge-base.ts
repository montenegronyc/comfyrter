// Smart Model Selection System - Knowledge Base

export interface ModelInfo {
  name: string;
  type: 'checkpoint' | 'lora' | 'vae' | 'upscaler';
  category: string;
  tags: string[];
  strength?: number;
  description: string;
  bestFor: string[];
  cfg: number[];
  steps: number[];
  samplers: string[];
  negativePrompts?: string[];
  aspectRatios?: string[];
}

export interface StylePreset {
  name: string;
  description: string;
  models: string[];
  loras: Array<{ name: string; strength: number }>;
  parameters: {
    cfg: number;
    steps: number;
    sampler: string;
    scheduler: string;
  };
  negativePrompt: string;
  postProcessing?: string[];
}

// Comprehensive Model Knowledge Base - Updated for 2024/2025
export const MODEL_KNOWLEDGE_BASE: Record<string, ModelInfo> = {
  // === 2024/2025 SDXL MODELS ===
  'juggernautXL_v9.safetensors': {
    name: 'JuggernautXL v9',
    type: 'checkpoint',
    category: 'realistic',
    tags: ['photorealistic', 'xl', 'sdxl', 'versatile', '2024'],
    description: 'Latest SDXL photorealistic model with exceptional detail and lighting',
    bestFor: ['portraits', 'photography', 'realistic scenes', 'commercial work'],
    cfg: [4, 7],
    steps: [25, 40],
    samplers: ['DPM++ 2M Karras', 'DPM++ SDE Karras', 'Euler a'],
    negativePrompts: ['blurry', 'low quality', 'bad anatomy', 'deformed', 'cartoon'],
    aspectRatios: ['1:1', '3:4', '4:3', '16:9', '9:16']
  },

  'realvisXL_v4.safetensors': {
    name: 'RealVisXL v4.0',
    type: 'checkpoint',
    category: 'realistic',
    tags: ['photorealistic', 'xl', 'sdxl', 'portrait', 'detailed', '2024'],
    description: 'Premium SDXL model for ultra-realistic portraits and scenes',
    bestFor: ['professional portraits', 'fashion photography', 'beauty shots', 'lifestyle'],
    cfg: [3, 6],
    steps: [30, 50],
    samplers: ['DPM++ 2M Karras', 'DPM++ 2M SDE Karras'],
    negativePrompts: ['cartoon', 'anime', 'painting', 'sketch', 'low quality'],
    aspectRatios: ['1:1', '3:4', '4:3', '2:3', '3:2']
  },

  'ponyDiffusionV6XL.safetensors': {
    name: 'Pony Diffusion V6 XL',
    type: 'checkpoint',
    category: 'anime',
    tags: ['anime', 'pony', 'xl', 'sdxl', 'versatile', 'anthropomorphic', '2024'],
    description: 'Advanced SDXL anime model with excellent character generation',
    bestFor: ['anime characters', 'furry art', 'cartoon style', 'character design'],
    cfg: [6, 9],
    steps: [25, 35],
    samplers: ['DPM++ 2M Karras', 'Euler a', 'DPM++ SDE Karras'],
    negativePrompts: ['photorealistic', 'realistic', 'blurry', 'low quality'],
    aspectRatios: ['1:1', '3:4', '4:3', '16:9']
  },

  'dreamShaperXL_v21.safetensors': {
    name: 'DreamShaper XL v2.1',
    type: 'checkpoint',
    category: 'artistic',
    tags: ['artistic', 'xl', 'sdxl', 'versatile', 'creative', '2024'],
    description: 'Versatile SDXL model for artistic and creative generations',
    bestFor: ['artistic scenes', 'creative concepts', 'fantasy art', 'illustrations'],
    cfg: [5, 8],
    steps: [20, 30],
    samplers: ['DPM++ 2M Karras', 'DPM++ SDE Karras', 'Euler a'],
    negativePrompts: ['blurry', 'low quality', 'deformed', 'bad anatomy'],
    aspectRatios: ['1:1', '3:4', '4:3', '16:9', '9:16']
  },

  'animagineXL_v31.safetensors': {
    name: 'Animagine XL v3.1',
    type: 'checkpoint',
    category: 'anime',
    tags: ['anime', 'xl', 'sdxl', 'manga', 'detailed', '2024'],
    description: 'High-quality SDXL anime model with manga-style aesthetics',
    bestFor: ['anime art', 'manga style', 'character illustrations', 'waifus'],
    cfg: [7, 12],
    steps: [25, 40],
    samplers: ['DPM++ 2M Karras', 'Euler a', 'DPM++ SDE Karras'],
    negativePrompts: ['photorealistic', 'realistic', 'low quality', 'blurry'],
    aspectRatios: ['1:1', '3:4', '4:3', '2:3']
  },

  // === LEGACY SD1.5 MODELS (Still Popular) ===
  'epicrealism_naturalSinRC1VAE.safetensors': {
    name: 'EpicRealism Natural Sin RC1 VAE',
    type: 'checkpoint',
    category: 'realistic',
    tags: ['photorealistic', 'natural', 'people', 'portrait', 'cinematic', 'sd15'],
    description: 'High-quality SD1.5 photorealistic model with natural skin tones',
    bestFor: ['portraits', 'people', 'realistic scenes', 'photography style'],
    cfg: [4, 8],
    steps: [25, 35],
    samplers: ['DPM++ 2M', 'DPM++ SDE', 'Euler a'],
    negativePrompts: ['blurry', 'low quality', 'bad anatomy', 'deformed'],
    aspectRatios: ['1:1', '3:4', '4:3', '16:9']
  },

  'anythingV5_anythingV5.safetensors': {
    name: 'Anything V5',
    type: 'checkpoint',
    category: 'anime',
    tags: ['anime', 'versatile', 'colorful', 'sd15', 'popular'],
    description: 'Popular SD1.5 anime model with vibrant colors and versatility',
    bestFor: ['anime characters', 'colorful art', 'fantasy scenes', 'creative concepts'],
    cfg: [7, 12],
    steps: [20, 30],
    samplers: ['DPM++ 2M Karras', 'Euler a', 'DPM++ SDE'],
    negativePrompts: ['photorealistic', 'realistic', 'low quality', 'blurry'],
    aspectRatios: ['1:1', '3:4', '4:3']
  },
  
  'realistic_vision_v5.safetensors': {
    name: 'Realistic Vision V5.0',
    type: 'checkpoint',
    category: 'realistic',
    tags: ['photorealistic', 'versatile', 'clean', 'detailed'],
    description: 'Versatile realistic model with excellent detail and clean outputs',
    bestFor: ['general photography', 'product shots', 'environments', 'people'],
    cfg: [6, 10],
    steps: [20, 30],
    samplers: ['DPM++ 2M Karras', 'Euler a', 'DDIM'],
    negativePrompts: ['cartoon', 'anime', 'painting', 'sketch'],
    aspectRatios: ['1:1', '3:4', '4:3', '16:9', '21:9']
  },

  'deliberate_v2.safetensors': {
    name: 'Deliberate V2',
    type: 'checkpoint',
    category: 'realistic',
    tags: ['artistic', 'painterly', 'detailed', 'versatile'],
    description: 'Artistic realistic model with painterly qualities and rich details',
    bestFor: ['artistic photography', 'concept art', 'detailed scenes'],
    cfg: [7, 12],
    steps: [25, 40],
    samplers: ['DPM++ 2M', 'Euler a', 'DDIM'],
    negativePrompts: ['blurry', 'low resolution', 'distorted'],
    aspectRatios: ['1:1', '3:4', '4:3', '16:9']
  },

  // === ANIME MODELS ===
  'animePastelDream_softBakedVae.safetensors': {
    name: 'Anime Pastel Dream Soft Baked VAE',
    type: 'checkpoint',
    category: 'anime',
    tags: ['anime', 'pastel', 'soft', 'dreamy', 'cute'],
    description: 'Soft anime style with pastel colors and dreamy atmosphere',
    bestFor: ['anime characters', 'cute illustrations', 'soft art'],
    cfg: [7, 12],
    steps: [20, 30],
    samplers: ['DPM++ 2M', 'Euler a', 'DPM++ SDE Karras'],
    negativePrompts: ['realistic', 'photographic', 'ugly', 'deformed'],
    aspectRatios: ['1:1', '3:4', '4:5', '9:16']
  },

  'meinaMix_v11.safetensors': {
    name: 'MeinaMix V11',
    type: 'checkpoint',
    category: 'anime',
    tags: ['anime', 'versatile', 'character', 'detailed'],
    description: 'Popular anime model with excellent character generation',
    bestFor: ['anime characters', 'detailed anime art', 'character design'],
    cfg: [5, 9],
    steps: [25, 35],
    samplers: ['DPM++ 2M Karras', 'Euler a'],
    negativePrompts: ['realistic', '3d', 'blurry', 'bad anatomy'],
    aspectRatios: ['1:1', '3:4', '4:5', '9:16']
  },

  'anything_v5.safetensors': {
    name: 'Anything V5',
    type: 'checkpoint',
    category: 'anime',
    tags: ['anime', 'versatile', 'colorful', 'flexible'],
    description: 'Highly versatile anime model suitable for various anime styles',
    bestFor: ['general anime', 'characters', 'scenes', 'various anime styles'],
    cfg: [6, 11],
    steps: [20, 30],
    samplers: ['DPM++ 2M', 'Euler a', 'DPM++ SDE'],
    negativePrompts: ['realistic', 'photo', 'ugly', 'lowres'],
    aspectRatios: ['1:1', '3:4', '4:5', '9:16']
  },

  // === FANTASY MODELS ===
  'dreamshaper_8.safetensors': {
    name: 'DreamShaper 8',
    type: 'checkpoint',
    category: 'fantasy',
    tags: ['fantasy', 'dreamy', 'artistic', 'cinematic', 'atmospheric'],
    description: 'Fantasy-oriented model with dreamy, cinematic qualities',
    bestFor: ['fantasy scenes', 'magical environments', 'cinematic art'],
    cfg: [6, 10],
    steps: [25, 35],
    samplers: ['DPM++ 2M Karras', 'Euler a', 'DPM++ SDE'],
    negativePrompts: ['modern', 'contemporary', 'low quality'],
    aspectRatios: ['16:9', '21:9', '4:3', '1:1']
  },

  'revAnimated_v122.safetensors': {
    name: 'ReV Animated V1.2.2',
    type: 'checkpoint',
    category: 'fantasy',
    tags: ['animated', 'stylized', 'fantasy', 'vibrant', 'cartoon'],
    description: 'Animated style model perfect for fantasy and stylized art',
    bestFor: ['animated style', 'fantasy characters', 'stylized scenes'],
    cfg: [7, 12],
    steps: [20, 30],
    samplers: ['DPM++ 2M', 'Euler a'],
    negativePrompts: ['realistic', 'photograph', 'blurry'],
    aspectRatios: ['1:1', '3:4', '16:9', '4:5']
  },

  // === CYBERPUNK MODELS ===
  'cyberrealistic_v33.safetensors': {
    name: 'CyberRealistic V3.3',
    type: 'checkpoint',
    category: 'cyberpunk',
    tags: ['cyberpunk', 'futuristic', 'neon', 'dystopian', 'tech'],
    description: 'Specialized model for cyberpunk and futuristic scenes',
    bestFor: ['cyberpunk scenes', 'futuristic characters', 'neon aesthetics'],
    cfg: [7, 11],
    steps: [25, 35],
    samplers: ['DPM++ 2M Karras', 'Euler a'],
    negativePrompts: ['medieval', 'natural', 'rustic', 'vintage'],
    aspectRatios: ['16:9', '21:9', '1:1', '9:16']
  },

  // === PORTRAIT MODELS ===
  'absolutereality_v181.safetensors': {
    name: 'AbsoluteReality V1.8.1',
    type: 'checkpoint',
    category: 'portrait',
    tags: ['portrait', 'realistic', 'detailed', 'faces', 'skin'],
    description: 'Specialized realistic model for high-quality portraits',
    bestFor: ['portraits', 'faces', 'character close-ups', 'detailed people'],
    cfg: [4, 8],
    steps: [25, 35],
    samplers: ['DPM++ 2M', 'DPM++ SDE', 'Euler a'],
    negativePrompts: ['cartoon', 'anime', 'deformed face', 'bad anatomy'],
    aspectRatios: ['3:4', '4:5', '1:1']
  }
};

// LoRA Knowledge Base
export const LORA_KNOWLEDGE_BASE: Record<string, ModelInfo> = {
  'add_detail_xl.safetensors': {
    name: 'Add Detail XL',
    type: 'lora',
    category: 'enhancement',
    tags: ['detail', 'enhancement', 'quality', 'sharpness'],
    strength: 0.7,
    description: 'Enhances detail and sharpness in generated images',
    bestFor: ['detail enhancement', 'quality improvement', 'sharpening'],
    cfg: [6, 12],
    steps: [25, 40],
    samplers: ['DPM++ 2M', 'Euler a']
  },

  'film_grain_v1.safetensors': {
    name: 'Film Grain V1',
    type: 'lora',
    category: 'style',
    tags: ['film', 'grain', 'vintage', 'analog', 'texture'],
    strength: 0.6,
    description: 'Adds authentic film grain texture for vintage look',
    bestFor: ['vintage style', 'film look', 'analog photography'],
    cfg: [6, 10],
    steps: [20, 30],
    samplers: ['DPM++ 2M', 'Euler a']
  },

  'vintage_style_v1.safetensors': {
    name: 'Vintage Style V1',
    type: 'lora',
    category: 'style',
    tags: ['vintage', 'retro', 'old', 'aged', 'classic'],
    strength: 0.8,
    description: 'Creates vintage and retro aesthetic with aged look',
    bestFor: ['vintage photos', 'retro art', 'aged effects'],
    cfg: [7, 11],
    steps: [25, 35],
    samplers: ['DPM++ 2M Karras', 'Euler a']
  },

  'watercolor_v1.safetensors': {
    name: 'Watercolor V1',
    type: 'lora',
    category: 'style',
    tags: ['watercolor', 'painting', 'artistic', 'soft', 'fluid'],
    strength: 0.9,
    description: 'Creates watercolor painting style with soft, fluid effects',
    bestFor: ['watercolor art', 'artistic style', 'painting effects'],
    cfg: [8, 12],
    steps: [30, 40],
    samplers: ['DPM++ 2M', 'DDIM']
  },

  'anime_style_v2.safetensors': {
    name: 'Anime Style V2',
    type: 'lora',
    category: 'character',
    tags: ['anime', 'character', 'manga', 'japanese', 'stylized'],
    strength: 0.7,
    description: 'Enhances anime character features and style',
    bestFor: ['anime characters', 'manga style', 'japanese art'],
    cfg: [7, 11],
    steps: [25, 35],
    samplers: ['DPM++ 2M', 'Euler a']
  },

  'face_enhancer_v1.safetensors': {
    name: 'Face Enhancer V1',
    type: 'lora',
    category: 'character',
    tags: ['face', 'enhancement', 'realistic', 'detail', 'portrait'],
    strength: 0.5,
    description: 'Enhances facial features and realism in portraits',
    bestFor: ['portrait enhancement', 'face detail', 'realistic faces'],
    cfg: [5, 9],
    steps: [25, 35],
    samplers: ['DPM++ 2M', 'DPM++ SDE']
  }
};

// Style Presets for Quick Workflow Generation
export const STYLE_PRESETS: Record<string, StylePreset> = {
  'cinematic_portrait': {
    name: 'Cinematic Portrait',
    description: 'High-quality cinematic portrait with film grain and professional lighting',
    models: ['epicrealism_naturalSinRC1VAE.safetensors'],
    loras: [
      { name: 'add_detail_xl.safetensors', strength: 0.7 },
      { name: 'film_grain_v1.safetensors', strength: 0.4 }
    ],
    parameters: {
      cfg: 6,
      steps: 30,
      sampler: 'DPM++ 2M',
      scheduler: 'Karras'
    },
    negativePrompt: 'blurry, low quality, bad anatomy, deformed, cartoon, anime',
    postProcessing: ['upscale_2x']
  },

  'anime_character': {
    name: 'Anime Character',
    description: 'High-quality anime character with enhanced details',
    models: ['meinaMix_v11.safetensors'],
    loras: [
      { name: 'anime_style_v2.safetensors', strength: 0.8 },
      { name: 'add_detail_xl.safetensors', strength: 0.6 }
    ],
    parameters: {
      cfg: 7,
      steps: 28,
      sampler: 'DPM++ 2M Karras',
      scheduler: 'Karras'
    },
    negativePrompt: 'realistic, photographic, ugly, deformed, bad anatomy, lowres',
    postProcessing: ['enhance_details']
  },

  'fantasy_landscape': {
    name: 'Fantasy Landscape',
    description: 'Epic fantasy landscape with magical atmosphere',
    models: ['dreamshaper_8.safetensors'],
    loras: [
      { name: 'add_detail_xl.safetensors', strength: 0.8 }
    ],
    parameters: {
      cfg: 8,
      steps: 32,
      sampler: 'DPM++ 2M Karras',
      scheduler: 'Karras'
    },
    negativePrompt: 'modern, contemporary, low quality, blurry, people',
    postProcessing: ['upscale_2x', 'enhance_colors']
  },

  'cyberpunk_scene': {
    name: 'Cyberpunk Scene',
    description: 'Futuristic cyberpunk scene with neon lighting',
    models: ['cyberrealistic_v33.safetensors'],
    loras: [
      { name: 'add_detail_xl.safetensors', strength: 0.7 }
    ],
    parameters: {
      cfg: 8,
      steps: 30,
      sampler: 'DPM++ 2M',
      scheduler: 'Karras'
    },
    negativePrompt: 'medieval, natural, rustic, vintage, low quality',
    postProcessing: ['enhance_contrast', 'color_grade']
  },

  'vintage_photo': {
    name: 'Vintage Photo',
    description: 'Authentic vintage photograph with film grain and aged look',
    models: ['realistic_vision_v5.safetensors'],
    loras: [
      { name: 'vintage_style_v1.safetensors', strength: 0.8 },
      { name: 'film_grain_v1.safetensors', strength: 0.7 }
    ],
    parameters: {
      cfg: 7,
      steps: 28,
      sampler: 'DPM++ 2M',
      scheduler: 'Karras'
    },
    negativePrompt: 'modern, digital, clean, sharp, high resolution',
    postProcessing: ['add_noise', 'sepia_tone']
  },

  'watercolor_art': {
    name: 'Watercolor Art',
    description: 'Soft watercolor painting style with artistic flair',
    models: ['deliberate_v2.safetensors'],
    loras: [
      { name: 'watercolor_v1.safetensors', strength: 0.9 }
    ],
    parameters: {
      cfg: 9,
      steps: 35,
      sampler: 'DDIM',
      scheduler: 'normal'
    },
    negativePrompt: 'photographic, realistic, sharp, digital, low quality',
    postProcessing: ['soft_blur', 'enhance_colors']
  }
};

// Smart model selection based on keywords and context
export class ModelSelector {
  static getModelKeyByInfo(modelInfo: ModelInfo | null): string | null {
    if (!modelInfo) return null;
    
    for (const [key, model] of Object.entries(MODEL_KNOWLEDGE_BASE)) {
      if (model === modelInfo) {
        return key;
      }
    }
    return null;
  }
  
  static selectBestModel(keywords: string[], style?: string): ModelInfo | null {
    const models = Object.values(MODEL_KNOWLEDGE_BASE);
    
    // If style preset is specified, use it
    if (style && STYLE_PRESETS[style]) {
      const preset = STYLE_PRESETS[style];
      const modelName = preset.models[0];
      return MODEL_KNOWLEDGE_BASE[modelName] || null;
    }
    
    // Score models based on keyword matches
    const scoredModels = models.map(model => {
      let score = 0;
      
      keywords.forEach(keyword => {
        const lowerKeyword = keyword.toLowerCase();
        
        // Category match (high weight)
        if (model.category.includes(lowerKeyword)) score += 10;
        
        // Tag matches (medium weight)
        model.tags.forEach(tag => {
          if (tag.includes(lowerKeyword)) score += 5;
        });
        
        // Best for matches (medium weight)
        model.bestFor.forEach(use => {
          if (use.includes(lowerKeyword)) score += 5;
        });
        
        // Description matches (low weight)
        if (model.description.toLowerCase().includes(lowerKeyword)) score += 2;
      });
      
      return { model, score };
    });
    
    // Return highest scoring model
    const bestMatch = scoredModels.reduce((best, current) => 
      current.score > best.score ? current : best
    );
    
    return bestMatch.score > 0 ? bestMatch.model : null;
  }
  
  static selectLoras(keywords: string[], style?: string): Array<{ model: ModelInfo; strength: number }> {
    const loras = Object.values(LORA_KNOWLEDGE_BASE);
    const selectedLoras: Array<{ model: ModelInfo; strength: number }> = [];
    
    // If style preset is specified, use its LoRAs
    if (style && STYLE_PRESETS[style]) {
      const preset = STYLE_PRESETS[style];
      preset.loras.forEach(lora => {
        const model = LORA_KNOWLEDGE_BASE[lora.name];
        if (model) {
          selectedLoras.push({ model, strength: lora.strength });
        }
      });
      return selectedLoras;
    }
    
    // Score LoRAs based on keywords
    const scoredLoras = loras.map(lora => {
      let score = 0;
      
      keywords.forEach(keyword => {
        const lowerKeyword = keyword.toLowerCase();
        
        if (lora.category.includes(lowerKeyword)) score += 8;
        
        lora.tags.forEach(tag => {
          if (tag.includes(lowerKeyword)) score += 4;
        });
        
        if (lora.description.toLowerCase().includes(lowerKeyword)) score += 2;
      });
      
      return { lora, score };
    });
    
    // Select top scoring LoRAs (max 3)
    const sortedLoras = scoredLoras
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
    
    sortedLoras.forEach(item => {
      selectedLoras.push({ 
        model: item.lora, 
        strength: item.lora.strength || 0.7 
      });
    });
    
    return selectedLoras;
  }
  
  static getOptimalParameters(model: ModelInfo, complexity: 'low' | 'medium' | 'high' = 'medium'): {
    cfg: number;
    steps: number;
    sampler: string;
  } {
    const cfgRange = model.cfg;
    const stepsRange = model.steps;
    const samplers = model.samplers;
    
    let cfg: number;
    let steps: number;
    
    switch (complexity) {
      case 'low':
        cfg = cfgRange[0];
        steps = stepsRange[0];
        break;
      case 'high':
        cfg = cfgRange[1];
        steps = stepsRange[1];
        break;
      default: // medium
        cfg = Math.round((cfgRange[0] + cfgRange[1]) / 2);
        steps = Math.round((stepsRange[0] + stepsRange[1]) / 2);
    }
    
    return {
      cfg,
      steps,
      sampler: samplers[0] // Use the first (usually best) sampler
    };
  }
}
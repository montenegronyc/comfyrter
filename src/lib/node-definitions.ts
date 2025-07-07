import { NodeDefinition } from './types';

// Comprehensive ComfyUI node definitions
export const NODE_DEFINITIONS: Record<string, NodeDefinition> = {
  // Basic Generation Nodes
  KSampler: {
    class_type: 'KSampler',
    category: 'sampling',
    description: 'Basic sampler for image generation',
    inputs: {
      model: { type: 'MODEL', required: true },
      positive: { type: 'CONDITIONING', required: true },
      negative: { type: 'CONDITIONING', required: true },
      latent_image: { type: 'LATENT', required: true },
      seed: { type: 'INT', required: true, default: -1 },
      steps: { type: 'INT', required: true, default: 20 },
      cfg: { type: 'FLOAT', required: true, default: 8.0 },
      sampler_name: { 
        type: 'STRING', 
        required: true, 
        default: 'euler',
        options: ['euler', 'euler_ancestral', 'heun', 'heunpp2', 'dpm_2', 'dpm_2_ancestral', 'lms', 'dpm_fast', 'dpm_adaptive', 'dpmpp_2s_ancestral', 'dpmpp_sde', 'dpmpp_sde_gpu', 'dpmpp_2m', 'dpmpp_2m_sde', 'dpmpp_2m_sde_gpu', 'dpmpp_3m_sde', 'dpmpp_3m_sde_gpu', 'ddpm', 'lcm', 'ddim', 'uni_pc', 'uni_pc_bh2']
      },
      scheduler: { 
        type: 'STRING', 
        required: true, 
        default: 'normal',
        options: ['normal', 'karras', 'exponential', 'sgm_uniform', 'simple', 'ddim_uniform']
      },
      denoise: { type: 'FLOAT', required: true, default: 1.0 }
    },
    outputs: {
      LATENT: 'LATENT'
    },
    keywords: ['sample', 'generate', 'create', 'render', 'sampling']
  },

  KSamplerAdvanced: {
    class_type: 'KSamplerAdvanced',
    category: 'sampling',
    description: 'Advanced sampler with more control options',
    inputs: {
      model: { type: 'MODEL', required: true },
      add_noise: { type: 'BOOLEAN', required: true, default: 'enable' },
      noise_seed: { type: 'INT', required: true, default: -1 },
      steps: { type: 'INT', required: true, default: 20 },
      cfg: { type: 'FLOAT', required: true, default: 8.0 },
      sampler_name: { 
        type: 'STRING', 
        required: true, 
        default: 'euler',
        options: ['euler', 'euler_ancestral', 'heun', 'heunpp2', 'dpm_2', 'dpm_2_ancestral', 'lms', 'dpm_fast', 'dpm_adaptive', 'dpmpp_2s_ancestral', 'dpmpp_sde', 'dpmpp_sde_gpu', 'dpmpp_2m', 'dpmpp_2m_sde', 'dpmpp_2m_sde_gpu', 'dpmpp_3m_sde', 'dpmpp_3m_sde_gpu', 'ddpm', 'lcm', 'ddim', 'uni_pc', 'uni_pc_bh2']
      },
      scheduler: { 
        type: 'STRING', 
        required: true, 
        default: 'normal',
        options: ['normal', 'karras', 'exponential', 'sgm_uniform', 'simple', 'ddim_uniform']
      },
      positive: { type: 'CONDITIONING', required: true },
      negative: { type: 'CONDITIONING', required: true },
      latent_image: { type: 'LATENT', required: true },
      start_at_step: { type: 'INT', required: true, default: 0 },
      end_at_step: { type: 'INT', required: true, default: 10000 },
      return_with_leftover_noise: { type: 'BOOLEAN', required: true, default: 'disable' }
    },
    outputs: {
      LATENT: 'LATENT'
    },
    keywords: ['advanced', 'sample', 'generate', 'control', 'steps']
  },

  // Model Loading
  CheckpointLoaderSimple: {
    class_type: 'CheckpointLoaderSimple',
    category: 'loaders',
    description: 'Load a checkpoint model',
    inputs: {
      ckpt_name: { type: 'STRING', required: true, default: 'model.safetensors' }
    },
    outputs: {
      MODEL: 'MODEL',
      CLIP: 'CLIP',
      VAE: 'VAE'
    },
    keywords: ['model', 'checkpoint', 'load', 'base']
  },

  LoraLoader: {
    class_type: 'LoraLoader',
    category: 'loaders',
    description: 'Load and apply LoRA',
    inputs: {
      model: { type: 'MODEL', required: true },
      clip: { type: 'CLIP', required: true },
      lora_name: { type: 'STRING', required: true },
      strength_model: { type: 'FLOAT', required: true, default: 1.0 },
      strength_clip: { type: 'FLOAT', required: true, default: 1.0 }
    },
    outputs: {
      MODEL: 'MODEL',
      CLIP: 'CLIP'
    },
    keywords: ['lora', 'style', 'character', 'enhancement']
  },

  VAELoader: {
    class_type: 'VAELoader',
    category: 'loaders',
    description: 'Load a VAE model',
    inputs: {
      vae_name: { type: 'STRING', required: true }
    },
    outputs: {
      VAE: 'VAE'
    },
    keywords: ['vae', 'encode', 'decode']
  },

  // Text Processing
  CLIPTextEncode: {
    class_type: 'CLIPTextEncode',
    category: 'conditioning',
    description: 'Encode text prompt using CLIP',
    inputs: {
      text: { type: 'STRING', required: true, default: '' },
      clip: { type: 'CLIP', required: true }
    },
    outputs: {
      CONDITIONING: 'CONDITIONING'
    },
    keywords: ['prompt', 'text', 'conditioning', 'positive', 'negative']
  },

  // VAE Operations
  VAEDecode: {
    class_type: 'VAEDecode',
    category: 'latent',
    description: 'Decode latent to image',
    inputs: {
      samples: { type: 'LATENT', required: true },
      vae: { type: 'VAE', required: true }
    },
    outputs: {
      IMAGE: 'IMAGE'
    },
    keywords: ['decode', 'latent', 'image', 'final']
  },

  VAEEncode: {
    class_type: 'VAEEncode',
    category: 'latent',
    description: 'Encode image to latent',
    inputs: {
      pixels: { type: 'IMAGE', required: true },
      vae: { type: 'VAE', required: true }
    },
    outputs: {
      LATENT: 'LATENT'
    },
    keywords: ['encode', 'image', 'latent']
  },

  // Image Loading and Saving
  LoadImage: {
    class_type: 'LoadImage',
    category: 'image',
    description: 'Load an image from file',
    inputs: {
      image: { type: 'STRING', required: true }
    },
    outputs: {
      IMAGE: 'IMAGE',
      MASK: 'MASK'
    },
    keywords: ['load', 'input', 'source']
  },

  SaveImage: {
    class_type: 'SaveImage',
    category: 'image',
    description: 'Save image to file',
    inputs: {
      images: { type: 'IMAGE', required: true },
      filename_prefix: { type: 'STRING', required: false, default: 'ComfyUI' }
    },
    outputs: {},
    keywords: ['save', 'output', 'export']
  },

  PreviewImage: {
    class_type: 'PreviewImage',
    category: 'image',
    description: 'Preview image in the interface',
    inputs: {
      images: { type: 'IMAGE', required: true }
    },
    outputs: {},
    keywords: ['preview', 'display', 'show']
  },

  // Latent Operations
  EmptyLatentImage: {
    class_type: 'EmptyLatentImage',
    category: 'latent',
    description: 'Create empty latent image',
    inputs: {
      width: { type: 'INT', required: true, default: 512 },
      height: { type: 'INT', required: true, default: 512 },
      batch_size: { type: 'INT', required: true, default: 1 }
    },
    outputs: {
      LATENT: 'LATENT'
    },
    keywords: ['empty', 'blank', 'start', 'initial']
  },

  LatentUpscale: {
    class_type: 'LatentUpscale',
    category: 'latent',
    description: 'Upscale latent image',
    inputs: {
      samples: { type: 'LATENT', required: true },
      upscale_method: { 
        type: 'STRING', 
        required: true, 
        default: 'nearest-exact',
        options: ['nearest-exact', 'bilinear', 'area', 'bicubic', 'bislerp']
      },
      width: { type: 'INT', required: true, default: 512 },
      height: { type: 'INT', required: true, default: 512 },
      crop: { 
        type: 'STRING', 
        required: true, 
        default: 'disabled',
        options: ['disabled', 'center']
      }
    },
    outputs: {
      LATENT: 'LATENT'
    },
    keywords: ['upscale', 'enlarge', 'resize', 'bigger']
  },

  // Image Processing
  ImageUpscaleWithModel: {
    class_type: 'ImageUpscaleWithModel',
    category: 'image',
    description: 'Upscale image using upscale model',
    inputs: {
      upscale_model: { type: 'UPSCALE_MODEL', required: true },
      image: { type: 'IMAGE', required: true }
    },
    outputs: {
      IMAGE: 'IMAGE'
    },
    keywords: ['upscale', 'enlarge', 'super resolution', 'enhance']
  },

  UpscaleModelLoader: {
    class_type: 'UpscaleModelLoader',
    category: 'loaders',
    description: 'Load upscale model',
    inputs: {
      model_name: { type: 'STRING', required: true }
    },
    outputs: {
      UPSCALE_MODEL: 'UPSCALE_MODEL'
    },
    keywords: ['upscale', 'model', 'load']
  },

  ImageScale: {
    class_type: 'ImageScale',
    category: 'image',
    description: 'Scale image to specific dimensions',
    inputs: {
      image: { type: 'IMAGE', required: true },
      upscale_method: { 
        type: 'STRING', 
        required: true, 
        default: 'nearest-exact',
        options: ['nearest-exact', 'bilinear', 'area', 'bicubic', 'bislerp']
      },
      width: { type: 'INT', required: true, default: 512 },
      height: { type: 'INT', required: true, default: 512 },
      crop: { 
        type: 'STRING', 
        required: true, 
        default: 'disabled',
        options: ['disabled', 'center']
      }
    },
    outputs: {
      IMAGE: 'IMAGE'
    },
    keywords: ['scale', 'resize', 'dimensions']
  },

  // ControlNet
  ControlNetLoader: {
    class_type: 'ControlNetLoader',
    category: 'loaders',
    description: 'Load ControlNet model',
    inputs: {
      control_net_name: { type: 'STRING', required: true }
    },
    outputs: {
      CONTROL_NET: 'CONTROL_NET'
    },
    keywords: ['controlnet', 'control', 'load']
  },

  ControlNetApply: {
    class_type: 'ControlNetApply',
    category: 'conditioning',
    description: 'Apply ControlNet to conditioning',
    inputs: {
      conditioning: { type: 'CONDITIONING', required: true },
      control_net: { type: 'CONTROL_NET', required: true },
      image: { type: 'IMAGE', required: true },
      strength: { type: 'FLOAT', required: true, default: 1.0 }
    },
    outputs: {
      CONDITIONING: 'CONDITIONING'
    },
    keywords: ['controlnet', 'apply', 'control', 'conditioning']
  },

  ControlNetApplyAdvanced: {
    class_type: 'ControlNetApplyAdvanced',
    category: 'conditioning',
    description: 'Apply ControlNet with advanced settings',
    inputs: {
      positive: { type: 'CONDITIONING', required: true },
      negative: { type: 'CONDITIONING', required: true },
      control_net: { type: 'CONTROL_NET', required: true },
      image: { type: 'IMAGE', required: true },
      strength: { type: 'FLOAT', required: true, default: 1.0 },
      start_percent: { type: 'FLOAT', required: true, default: 0.0 },
      end_percent: { type: 'FLOAT', required: true, default: 1.0 }
    },
    outputs: {
      positive: 'CONDITIONING',
      negative: 'CONDITIONING'
    },
    keywords: ['controlnet', 'advanced', 'control', 'conditioning']
  },

  // Effects and Filters
  ImageBlend: {
    class_type: 'ImageBlend',
    category: 'image',
    description: 'Blend two images together',
    inputs: {
      image1: { type: 'IMAGE', required: true },
      image2: { type: 'IMAGE', required: true },
      blend_factor: { type: 'FLOAT', required: true, default: 0.5 },
      blend_mode: { 
        type: 'STRING', 
        required: true, 
        default: 'normal',
        options: ['normal', 'multiply', 'screen', 'overlay', 'soft_light', 'hard_light', 'color_dodge', 'color_burn', 'darken', 'lighten', 'difference', 'exclusion']
      }
    },
    outputs: {
      IMAGE: 'IMAGE'
    },
    keywords: ['blend', 'mix', 'combine', 'overlay']
  },

  // Math and Utility
  ConditioningCombine: {
    class_type: 'ConditioningCombine',
    category: 'conditioning',
    description: 'Combine multiple conditionings',
    inputs: {
      conditioning_1: { type: 'CONDITIONING', required: true },
      conditioning_2: { type: 'CONDITIONING', required: true }
    },
    outputs: {
      CONDITIONING: 'CONDITIONING'
    },
    keywords: ['combine', 'merge', 'conditioning']
  },

  ConditioningSetArea: {
    class_type: 'ConditioningSetArea',
    category: 'conditioning',
    description: 'Set conditioning area',
    inputs: {
      conditioning: { type: 'CONDITIONING', required: true },
      width: { type: 'INT', required: true, default: 512 },
      height: { type: 'INT', required: true, default: 512 },
      x: { type: 'INT', required: true, default: 0 },
      y: { type: 'INT', required: true, default: 0 },
      strength: { type: 'FLOAT', required: true, default: 1.0 }
    },
    outputs: {
      CONDITIONING: 'CONDITIONING'
    },
    keywords: ['area', 'region', 'conditioning', 'mask']
  }
};

// Helper function to find nodes by keyword
export function findNodesByKeyword(keyword: string): NodeDefinition[] {
  return Object.values(NODE_DEFINITIONS).filter(node =>
    node.keywords.some(k => k.toLowerCase().includes(keyword.toLowerCase()))
  );
}

// Helper function to get node by class type
export function getNodeDefinition(classType: string): NodeDefinition | undefined {
  return NODE_DEFINITIONS[classType];
}
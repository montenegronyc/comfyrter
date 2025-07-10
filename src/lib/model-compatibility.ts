export type BaseModelType = 'sd15' | 'sdxl' | 'sd3' | 'pony' | 'flux' | 'unknown';

export interface CompatibilityMatrix {
  controlNets: Record<BaseModelType, string[]>;
  detailers: Record<BaseModelType, string[]>;
  vaes: Record<BaseModelType, string>;
  samplers: Record<BaseModelType, string[]>;
  resolutions: Record<BaseModelType, { width: number; height: number }[]>;
  schedulers: Record<BaseModelType, string[]>;
}

export interface ModelCompatibility {
  baseModel: BaseModelType;
  compatibleControlNets: string[];
  compatibleDetailers: string[];
  recommendedVAE: string;
  optimalResolutions: { width: number; height: number }[];
  preferredSamplers: string[];
  supportedSchedulers: string[];
  maxSteps: number;
  recommendedCFG: { min: number; max: number; default: number };
  clipSkip: number;
}

export const COMPATIBILITY_MATRIX: CompatibilityMatrix = {
  controlNets: {
    sd15: [
      // OpenPose
      'control_v11p_sd15_openpose',
      'control_v11p_sd15_openpose_fp16',
      // Canny
      'control_v11p_sd15_canny',
      'control_v11p_sd15_canny_fp16',
      // Depth
      'control_v11p_sd15_depth',
      'control_v11f1p_sd15_depth',
      'control_v11f1p_sd15_depth_fp16',
      // Others
      'control_v11p_sd15_normalbae',
      'control_v11p_sd15_seg',
      'control_v11p_sd15_inpaint',
      'control_v11p_sd15_lineart',
      'control_v11p_sd15_lineart_anime',
      'control_v11p_sd15_mlsd',
      'control_v11p_sd15_scribble',
      'control_v11p_sd15_softedge',
      'control_v11e_sd15_ip2p',
      'control_v11e_sd15_shuffle',
      'control_v11p_sd15_s2d'
    ],
    sdxl: [
      // LoRA-based ControlNets
      'control-lora-canny-xl',
      'control-lora-openpose-xl',
      'control-lora-depth-xl',
      'control-lora-lineart-xl',
      'control-lora-sketch-xl',
      'control-lora-recolor-xl',
      // Full ControlNets
      'controlnet-openpose-sdxl-1.0',
      'controlnet-canny-sdxl-1.0',
      'controlnet-depth-sdxl-1.0',
      'diffusers-xl-canny-mid',
      'diffusers-xl-depth-mid',
      'sai-controlnet-xl-canny-256lora',
      'sai-controlnet-xl-depth-256lora',
      'controlnet-scribble-sdxl-1.0',
      'controlnet-softedge-sdxl-1.0'
    ],
    pony: [
      // Pony-specific (mostly SDXL-compatible)
      'control-lora-openpose-xl',
      'control-lora-canny-xl',
      'control-lora-depth-xl',
      'controlnet-openpose-sdxl-1.0',
      'pony-controlnet-openpose',
      'pony-controlnet-depth',
      'pony-controlnet-canny',
      'diffusers-xl-canny-mid',
      'diffusers-xl-depth-mid'
    ],
    sd3: [
      'sd3-controlnet-canny',
      'sd3-controlnet-depth',
      'sd3-controlnet-openpose',
      'sd3-controlnet-tile',
      'sd3-controlnet-blur'
    ],
    flux: [
      'flux-controlnet-canny',
      'flux-controlnet-depth',
      'flux-controlnet-pose',
      'flux-dev-controlnet'
    ],
    unknown: []
  },

  detailers: {
    sd15: [
      'yolov5l-face.pt',
      'yolov5s-face.pt',
      'yolov5n-face.pt',
      'yolov8n-face.pt',
      'yolov8s-face.pt',
      'yolov8m-face.pt',
      'yolov5l6-person.pt',
      'yolov5s6-person.pt'
    ],
    sdxl: [
      'bbox/yolov8n.pt',
      'bbox/yolov8s.pt',
      'bbox/yolov8m.pt',
      'face_yolov8n.pt',
      'face_yolov8s.pt',
      'face_yolov8m.pt',
      'person_yolov8n-seg.pt',
      'person_yolov8s-seg.pt',
      'hand_yolov8n.pt',
      'hand_yolov8s.pt',
      'mmdet_anime-face_yolov3.pth'
    ],
    pony: [
      'bbox/yolov8n.pt',
      'bbox/yolov8s.pt',
      'face_yolov8n.pt',
      'face_yolov8s.pt',
      'person_yolov8n-seg.pt',
      'hand_yolov8n.pt',
      'mmdet_anime-face_yolov3.pth'
    ],
    sd3: [
      'face_yolov8n.pt',
      'face_yolov8s.pt',
      'bbox/yolov8n.pt',
      'bbox/yolov8s.pt',
      'person_yolov8n-seg.pt'
    ],
    flux: [
      'face_yolov8n.pt',
      'bbox/yolov8n.pt',
      'person_yolov8n-seg.pt'
    ],
    unknown: []
  },

  vaes: {
    sd15: 'vae-ft-mse-840000-ema-pruned.safetensors',
    sdxl: 'sdxl_vae.safetensors',
    pony: 'sdxl_vae.safetensors',
    sd3: 'sd3_vae.safetensors',
    flux: 'ae.safetensors', // Flux uses a different VAE name
    unknown: 'vae-ft-mse-840000-ema-pruned.safetensors'
  },

  samplers: {
    sd15: [
      'euler_a', 'euler', 'heun', 'dpm_2', 'dpm_2_ancestral',
      'lms', 'dpm_fast', 'dpm_adaptive', 'dpmpp_2s_ancestral',
      'dpmpp_2m', 'dpmpp_2m_karras', 'dpmpp_2m_sde', 'dpmpp_2m_sde_karras',
      'dpmpp_sde', 'dpmpp_sde_karras', 'ddim', 'plms', 'uni_pc'
    ],
    sdxl: [
      'dpmpp_2m_karras', 'dpmpp_2m_sde_karras', 'dpmpp_2m', 'dpmpp_2m_sde',
      'euler_a', 'euler', 'dpmpp_sde_karras', 'dpmpp_sde',
      'ddim', 'uni_pc', 'heun'
    ],
    pony: [
      'dpmpp_2m_karras', 'dpmpp_2m_sde_karras', 'euler_a',
      'dpmpp_sde_karras', 'ddim'
    ],
    sd3: [
      'dpmpp_2m', 'dpmpp_2m_sde', 'euler', 'ddim'
    ],
    flux: [
      'euler', 'dpmpp_2m', 'ddim'
    ],
    unknown: ['euler_a', 'dpmpp_2m_karras']
  },

  resolutions: {
    sd15: [
      { width: 512, height: 512 },
      { width: 512, height: 768 },
      { width: 768, height: 512 },
      { width: 640, height: 640 },
      { width: 448, height: 832 },
      { width: 832, height: 448 }
    ],
    sdxl: [
      { width: 1024, height: 1024 },
      { width: 832, height: 1216 },
      { width: 1216, height: 832 },
      { width: 896, height: 1152 },
      { width: 1152, height: 896 },
      { width: 768, height: 1344 },
      { width: 1344, height: 768 }
    ],
    pony: [
      { width: 1024, height: 1024 },
      { width: 832, height: 1216 },
      { width: 1216, height: 832 },
      { width: 896, height: 1152 },
      { width: 1152, height: 896 }
    ],
    sd3: [
      { width: 1024, height: 1024 },
      { width: 832, height: 1216 },
      { width: 1216, height: 832 },
      { width: 896, height: 1152 },
      { width: 1152, height: 896 }
    ],
    flux: [
      { width: 1024, height: 1024 },
      { width: 832, height: 1216 },
      { width: 1216, height: 832 },
      { width: 768, height: 1344 },
      { width: 1344, height: 768 }
    ],
    unknown: [
      { width: 512, height: 512 },
      { width: 1024, height: 1024 }
    ]
  },

  schedulers: {
    sd15: ['normal', 'karras', 'exponential', 'sgm_uniform', 'simple', 'ddim_uniform'],
    sdxl: ['normal', 'karras', 'exponential', 'sgm_uniform', 'simple', 'ddim_uniform', 'beta'],
    pony: ['normal', 'karras', 'exponential', 'sgm_uniform', 'simple'],
    sd3: ['normal', 'karras', 'exponential', 'sgm_uniform'],
    flux: ['normal', 'simple'],
    unknown: ['normal', 'karras']
  }
};

export class ModelCompatibilityChecker {
  static getCompatibility(baseModel: BaseModelType): ModelCompatibility {
    const matrix = COMPATIBILITY_MATRIX;
    
    const configs = {
      sd15: {
        maxSteps: 150,
        recommendedCFG: { min: 3, max: 15, default: 7 },
        clipSkip: 1
      },
      sdxl: {
        maxSteps: 100,
        recommendedCFG: { min: 3, max: 12, default: 6 },
        clipSkip: 2
      },
      pony: {
        maxSteps: 100,
        recommendedCFG: { min: 4, max: 10, default: 7 },
        clipSkip: 2
      },
      sd3: {
        maxSteps: 80,
        recommendedCFG: { min: 3, max: 8, default: 5 },
        clipSkip: 1
      },
      flux: {
        maxSteps: 50,
        recommendedCFG: { min: 1, max: 4, default: 2 },
        clipSkip: 1
      },
      unknown: {
        maxSteps: 100,
        recommendedCFG: { min: 5, max: 12, default: 7 },
        clipSkip: 1
      }
    };

    const config = configs[baseModel];

    return {
      baseModel,
      compatibleControlNets: matrix.controlNets[baseModel],
      compatibleDetailers: matrix.detailers[baseModel],
      recommendedVAE: matrix.vaes[baseModel],
      optimalResolutions: matrix.resolutions[baseModel],
      preferredSamplers: matrix.samplers[baseModel],
      supportedSchedulers: matrix.schedulers[baseModel],
      maxSteps: config.maxSteps,
      recommendedCFG: config.recommendedCFG,
      clipSkip: config.clipSkip
    };
  }

  static isControlNetCompatible(baseModel: BaseModelType, controlNetName: string): boolean {
    const compatibility = this.getCompatibility(baseModel);
    return compatibility.compatibleControlNets.some(cn => 
      controlNetName.toLowerCase().includes(cn.toLowerCase()) ||
      cn.toLowerCase().includes(controlNetName.toLowerCase())
    );
  }

  static isDetailerCompatible(baseModel: BaseModelType, detailerName: string): boolean {
    const compatibility = this.getCompatibility(baseModel);
    return compatibility.compatibleDetailers.some(detailer => 
      detailerName.toLowerCase().includes(detailer.toLowerCase()) ||
      detailer.toLowerCase().includes(detailerName.toLowerCase())
    );
  }

  static getBestControlNet(baseModel: BaseModelType, controlType: string): string | null {
    const compatibility = this.getCompatibility(baseModel);
    const lowerControlType = controlType.toLowerCase();
    
    // Find the best matching ControlNet for the requested type
    const matches = compatibility.compatibleControlNets.filter(cn => 
      cn.toLowerCase().includes(lowerControlType)
    );
    
    if (matches.length === 0) return null;
    
    // Prefer more recent/better versions
    const priorities = ['v11', 'xl', 'lora', 'sdxl', 'v1'];
    for (const priority of priorities) {
      const priorityMatch = matches.find(match => 
        match.toLowerCase().includes(priority)
      );
      if (priorityMatch) return priorityMatch;
    }
    
    return matches[0];
  }

  static getBestDetailer(baseModel: BaseModelType, detailType: 'face' | 'person' | 'hand' | 'bbox' = 'face'): string | null {
    const compatibility = this.getCompatibility(baseModel);
    
    const matches = compatibility.compatibleDetailers.filter(detailer => 
      detailer.toLowerCase().includes(detailType.toLowerCase())
    );
    
    if (matches.length === 0) return null;
    
    // Prefer newer YOLO versions
    const priorities = ['yolov8', 'yolov5'];
    for (const priority of priorities) {
      const priorityMatch = matches.find(match => 
        match.toLowerCase().includes(priority)
      );
      if (priorityMatch) return priorityMatch;
    }
    
    return matches[0];
  }

  static getOptimalResolution(baseModel: BaseModelType, aspectRatio: 'square' | 'portrait' | 'landscape' = 'square'): { width: number; height: number } {
    const compatibility = this.getCompatibility(baseModel);
    const resolutions = compatibility.optimalResolutions;
    
    if (aspectRatio === 'square') {
      return resolutions.find(r => r.width === r.height) || resolutions[0];
    }
    
    if (aspectRatio === 'portrait') {
      return resolutions.find(r => r.height > r.width) || resolutions[0];
    }
    
    if (aspectRatio === 'landscape') {
      return resolutions.find(r => r.width > r.height) || resolutions[0];
    }
    
    return resolutions[0];
  }

  static validateConfiguration(baseModel: BaseModelType, config: {
    controlNet?: string;
    detailer?: string;
    sampler?: string;
    steps?: number;
    cfg?: number;
    resolution?: { width: number; height: number };
  }): { valid: boolean; warnings: string[]; suggestions: string[] } {
    const compatibility = this.getCompatibility(baseModel);
    const warnings: string[] = [];
    const suggestions: string[] = [];
    let valid = true;

    // Check ControlNet compatibility
    if (config.controlNet && !this.isControlNetCompatible(baseModel, config.controlNet)) {
      valid = false;
      warnings.push(`ControlNet "${config.controlNet}" is not compatible with ${baseModel}`);
      const suggestion = this.getBestControlNet(baseModel, config.controlNet);
      if (suggestion) {
        suggestions.push(`Use "${suggestion}" instead`);
      }
    }

    // Check detailer compatibility
    if (config.detailer && !this.isDetailerCompatible(baseModel, config.detailer)) {
      valid = false;
      warnings.push(`Detailer "${config.detailer}" is not compatible with ${baseModel}`);
      const suggestion = this.getBestDetailer(baseModel);
      if (suggestion) {
        suggestions.push(`Use "${suggestion}" instead`);
      }
    }

    // Check sampler compatibility
    if (config.sampler && !compatibility.preferredSamplers.includes(config.sampler)) {
      warnings.push(`Sampler "${config.sampler}" may not be optimal for ${baseModel}`);
      suggestions.push(`Consider using: ${compatibility.preferredSamplers.slice(0, 3).join(', ')}`);
    }

    // Check steps
    if (config.steps && config.steps > compatibility.maxSteps) {
      warnings.push(`${config.steps} steps may be excessive for ${baseModel} (max recommended: ${compatibility.maxSteps})`);
      suggestions.push(`Consider reducing to ${Math.min(config.steps, compatibility.maxSteps)} steps`);
    }

    // Check CFG
    if (config.cfg) {
      const { min, max, default: defaultCFG } = compatibility.recommendedCFG;
      if (config.cfg < min || config.cfg > max) {
        warnings.push(`CFG ${config.cfg} is outside optimal range for ${baseModel} (${min}-${max})`);
        suggestions.push(`Use CFG around ${defaultCFG} for best results`);
      }
    }

    // Check resolution
    if (config.resolution) {
      const isOptimal = compatibility.optimalResolutions.some(r => 
        r.width === config.resolution!.width && r.height === config.resolution!.height
      );
      if (!isOptimal) {
        warnings.push(`Resolution ${config.resolution.width}x${config.resolution.height} may not be optimal for ${baseModel}`);
        const optimalRes = compatibility.optimalResolutions[0];
        suggestions.push(`Consider using ${optimalRes.width}x${optimalRes.height}`);
      }
    }

    return { valid, warnings, suggestions };
  }
}
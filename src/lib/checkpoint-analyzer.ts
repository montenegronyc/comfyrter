import type { BaseModelType } from './model-compatibility';

export interface CheckpointInfo {
  filename: string;
  baseModel: BaseModelType;
  estimatedType: 'realistic' | 'anime' | 'artistic' | 'fantasy' | 'nsfw' | 'unknown';
  confidence: number;
  version?: string;
  creator?: string;
  tags: string[];
  recommendedSettings: {
    steps: number;
    cfg: number;
    sampler: string;
    scheduler: string;
    clipSkip: number;
    resolution: { width: number; height: number };
  };
}

export class CheckpointAnalyzer {
  private static readonly FILENAME_PATTERNS = {
    // Base model detection patterns
    baseModel: {
      sdxl: /(?:sdxl|xl(?![\w])|_xl_|xl[-_]|pony.*xl|juggernaut.*xl|realvis.*xl|dream.*xl)/i,
      pony: /(?:pony|v6(?:xl)?(?![\w])|pony.*diffusion|pdxl)/i,
      sd3: /(?:sd3|stable.*diffusion.*3|sd[-_]?3)/i,
      flux: /(?:flux|dev|schnell)/i,
      sd15: /(?:sd15|sd[-_]?1\.?5|v1[-_]?5|anything|dreamshaper(?!xl)|realistic.*vision(?!xl)|epic.*realism)/i
    },
    
    // Style detection patterns
    style: {
      realistic: /(?:realistic|real|photo|juggernaut|epic.*realism|copax|photo.*matrix|realvis|uber.*realistic)/i,
      anime: /(?:anime|anything|counterfeit|abyssorange|pastelmix|anylora|animagine|pony(?!.*real))/i,
      artistic: /(?:artistic|art|paint|draw|sketch|dream.*shaper|deliberate|protogen|stable.*cascade)/i,
      fantasy: /(?:fantasy|magic|medieval|dragon|elf|wizard|crystal|mystic)/i,
      nsfw: /(?:nsfw|xxx|adult|hentai|porn|sex|nude|explicit)/i
    },
    
    // Version detection
    version: {
      pattern: /(?:v|version)[-_]?(\d+(?:\.\d+)*)/i,
      numeric: /(\d+(?:\.\d+)+)/
    },
    
    // Creator/brand detection
    creator: {
      civitai: /(?:civitai|civ)/i,
      huggingface: /(?:hugging.*face|hf)/i,
      stability: /(?:stability|stabilityai|stable)/i,
      runwayml: /(?:runway|runwayml)/i
    }
  };

  private static readonly MODEL_SIGNATURES = {
    // Known model signatures for precise detection
    knownModels: [
      // SDXL Models
      { pattern: /juggernaut.*xl.*v9/i, baseModel: 'sdxl' as const, type: 'realistic' as const, confidence: 0.95 },
      { pattern: /realvis.*xl.*v4/i, baseModel: 'sdxl' as const, type: 'realistic' as const, confidence: 0.95 },
      { pattern: /dream.*shaper.*xl/i, baseModel: 'sdxl' as const, type: 'artistic' as const, confidence: 0.9 },
      { pattern: /pony.*diffusion.*v6/i, baseModel: 'pony' as const, type: 'anime' as const, confidence: 0.95 },
      { pattern: /animagine.*xl/i, baseModel: 'sdxl' as const, type: 'anime' as const, confidence: 0.9 },
      
      // SD1.5 Models
      { pattern: /anything.*v5/i, baseModel: 'sd15' as const, type: 'anime' as const, confidence: 0.9 },
      { pattern: /epic.*realism.*pure.*evolution/i, baseModel: 'sd15' as const, type: 'realistic' as const, confidence: 0.9 },
      { pattern: /realistic.*vision.*v6/i, baseModel: 'sd15' as const, type: 'realistic' as const, confidence: 0.9 },
      { pattern: /dream.*shaper.*v8/i, baseModel: 'sd15' as const, type: 'artistic' as const, confidence: 0.85 },
      { pattern: /deliberate.*v3/i, baseModel: 'sd15' as const, type: 'artistic' as const, confidence: 0.85 },
      
      // SD3 Models
      { pattern: /sd3.*medium/i, baseModel: 'sd3' as const, type: 'artistic' as const, confidence: 0.9 },
      { pattern: /stable.*diffusion.*3/i, baseModel: 'sd3' as const, type: 'artistic' as const, confidence: 0.8 },
      
      // Flux Models
      { pattern: /flux.*dev/i, baseModel: 'flux' as const, type: 'artistic' as const, confidence: 0.9 },
      { pattern: /flux.*schnell/i, baseModel: 'flux' as const, type: 'artistic' as const, confidence: 0.9 }
    ]
  };

  static analyzeCheckpoint(filename: string, additionalInfo?: {
    description?: string;
    tags?: string[];
    creator?: string;
  }): CheckpointInfo {
    const cleanFilename = filename.toLowerCase().replace(/\.(safetensors|ckpt|pt)$/, '');
    const searchText = [cleanFilename, additionalInfo?.description || '', ...(additionalInfo?.tags || [])].join(' ').toLowerCase();
    
    // First, try to match against known model signatures
    for (const signature of this.MODEL_SIGNATURES.knownModels) {
      if (signature.pattern.test(cleanFilename)) {
        return this.buildCheckpointInfo(filename, signature.baseModel, signature.type, signature.confidence, {
          version: this.extractVersion(cleanFilename),
          creator: additionalInfo?.creator,
          tags: additionalInfo?.tags || []
        });
      }
    }
    
    // Fall back to pattern-based detection
    const baseModel = this.detectBaseModel(searchText);
    const styleType = this.detectStyleType(searchText);
    const confidence = this.calculateConfidence(cleanFilename, baseModel, styleType);
    
    return this.buildCheckpointInfo(filename, baseModel, styleType, confidence, {
      version: this.extractVersion(cleanFilename),
      creator: this.detectCreator(searchText) || additionalInfo?.creator,
      tags: additionalInfo?.tags || this.extractTags(cleanFilename)
    });
  }

  private static detectBaseModel(text: string): BaseModelType {
    const patterns = this.FILENAME_PATTERNS.baseModel;
    
    // Order matters - check more specific patterns first
    if (patterns.sd3.test(text)) return 'sd3';
    if (patterns.flux.test(text)) return 'flux';
    if (patterns.pony.test(text)) return 'pony';
    if (patterns.sdxl.test(text)) return 'sdxl';
    if (patterns.sd15.test(text)) return 'sd15';
    
    // Heuristic: newer models are more likely to be SDXL
    const currentYear = new Date().getFullYear();
    if (text.includes('2024') || text.includes(currentYear.toString())) {
      return 'sdxl';
    }
    
    return 'unknown';
  }

  private static detectStyleType(text: string): CheckpointInfo['estimatedType'] {
    const patterns = this.FILENAME_PATTERNS.style;
    
    if (patterns.nsfw.test(text)) return 'nsfw';
    if (patterns.realistic.test(text)) return 'realistic';
    if (patterns.anime.test(text)) return 'anime';
    if (patterns.fantasy.test(text)) return 'fantasy';
    if (patterns.artistic.test(text)) return 'artistic';
    
    return 'unknown';
  }

  private static extractVersion(filename: string): string | undefined {
    const versionMatch = filename.match(this.FILENAME_PATTERNS.version.pattern);
    if (versionMatch) return versionMatch[1];
    
    const numericMatch = filename.match(this.FILENAME_PATTERNS.version.numeric);
    if (numericMatch) return numericMatch[1];
    
    return undefined;
  }

  private static detectCreator(text: string): string | undefined {
    const patterns = this.FILENAME_PATTERNS.creator;
    
    if (patterns.stability.test(text)) return 'Stability AI';
    if (patterns.runwayml.test(text)) return 'RunwayML';
    if (patterns.huggingface.test(text)) return 'Hugging Face';
    if (patterns.civitai.test(text)) return 'CivitAI Community';
    
    return undefined;
  }

  private static extractTags(filename: string): string[] {
    const tags: string[] = [];
    const lower = filename.toLowerCase();
    
    // Extract common tags from filename
    if (lower.includes('realistic') || lower.includes('photo')) tags.push('realistic');
    if (lower.includes('anime') || lower.includes('manga')) tags.push('anime');
    if (lower.includes('art') || lower.includes('paint')) tags.push('artistic');
    if (lower.includes('nsfw') || lower.includes('adult')) tags.push('nsfw');
    if (lower.includes('fantasy') || lower.includes('magic')) tags.push('fantasy');
    if (lower.includes('turbo') || lower.includes('lightning')) tags.push('fast');
    if (lower.includes('xl') || lower.includes('sdxl')) tags.push('xl');
    if (lower.includes('pony')) tags.push('pony');
    
    return tags;
  }

  private static calculateConfidence(filename: string, baseModel: BaseModelType, styleType: CheckpointInfo['estimatedType']): number {
    let confidence = 0.5; // Base confidence
    
    // Increase confidence for clear indicators
    if (baseModel !== 'unknown') confidence += 0.2;
    if (styleType !== 'unknown') confidence += 0.15;
    
    // Known model patterns increase confidence
    const lower = filename.toLowerCase();
    const knownPatterns = [
      'juggernaut', 'realvis', 'dreamshaper', 'anything', 'epic',
      'animagine', 'pony', 'deliberate', 'counterfeit'
    ];
    
    if (knownPatterns.some(pattern => lower.includes(pattern))) {
      confidence += 0.15;
    }
    
    // Version numbers increase confidence
    if (this.extractVersion(filename)) {
      confidence += 0.1;
    }
    
    return Math.min(confidence, 1.0);
  }

  private static buildCheckpointInfo(
    filename: string, 
    baseModel: BaseModelType, 
    estimatedType: CheckpointInfo['estimatedType'], 
    confidence: number,
    metadata: {
      version?: string;
      creator?: string;
      tags: string[];
    }
  ): CheckpointInfo {
    const recommendedSettings = this.getRecommendedSettings(baseModel, estimatedType);
    
    return {
      filename,
      baseModel,
      estimatedType,
      confidence,
      version: metadata.version,
      creator: metadata.creator,
      tags: metadata.tags,
      recommendedSettings
    };
  }

  private static getRecommendedSettings(baseModel: BaseModelType, styleType: CheckpointInfo['estimatedType']) {
    const baseSettings = {
      sd15: {
        steps: 20,
        cfg: 7,
        sampler: 'dpmpp_2m_karras',
        scheduler: 'karras',
        clipSkip: 1,
        resolution: { width: 512, height: 768 }
      },
      sdxl: {
        steps: 25,
        cfg: 6,
        sampler: 'dpmpp_2m_karras',
        scheduler: 'karras',
        clipSkip: 2,
        resolution: { width: 1024, height: 1024 }
      },
      pony: {
        steps: 20,
        cfg: 7,
        sampler: 'dpmpp_2m_karras',
        scheduler: 'karras',
        clipSkip: 2,
        resolution: { width: 1024, height: 1024 }
      },
      sd3: {
        steps: 20,
        cfg: 5,
        sampler: 'dpmpp_2m',
        scheduler: 'normal',
        clipSkip: 1,
        resolution: { width: 1024, height: 1024 }
      },
      flux: {
        steps: 20,
        cfg: 2,
        sampler: 'euler',
        scheduler: 'simple',
        clipSkip: 1,
        resolution: { width: 1024, height: 1024 }
      },
      unknown: {
        steps: 20,
        cfg: 7,
        sampler: 'dpmpp_2m_karras',
        scheduler: 'karras',
        clipSkip: 1,
        resolution: { width: 512, height: 512 }
      }
    };

    const settings = { ...baseSettings[baseModel] };

    // Adjust settings based on style type
    switch (styleType) {
      case 'realistic':
        settings.steps = Math.max(settings.steps, 25);
        settings.cfg = Math.max(settings.cfg - 1, 4);
        break;
      case 'anime':
        settings.clipSkip = Math.max(settings.clipSkip, 2);
        if (baseModel === 'pony') {
          settings.cfg = 7;
          settings.steps = 28;
        }
        break;
      case 'artistic':
        settings.cfg += 1;
        settings.steps += 5;
        break;
      case 'fantasy':
        settings.cfg += 1;
        settings.steps += 3;
        break;
    }

    return settings;
  }

  static batchAnalyze(filenames: string[]): CheckpointInfo[] {
    return filenames.map(filename => this.analyzeCheckpoint(filename));
  }

  static findBestMatch(prompt: string, availableModels: CheckpointInfo[]): CheckpointInfo | null {
    if (availableModels.length === 0) return null;

    const lowerPrompt = prompt.toLowerCase();
    let bestMatch: CheckpointInfo | null = null;
    let bestScore = 0;

    for (const model of availableModels) {
      let score = 0;

      // Base model preference (newer models generally better)
      const modelScore = {
        'flux': 5,
        'sd3': 4,
        'sdxl': 3,
        'pony': 3,
        'sd15': 2,
        'unknown': 1
      };
      score += modelScore[model.baseModel] || 0;

      // Style matching
      if (lowerPrompt.includes('realistic') || lowerPrompt.includes('photo')) {
        if (model.estimatedType === 'realistic') score += 10;
      }
      if (lowerPrompt.includes('anime') || lowerPrompt.includes('manga')) {
        if (model.estimatedType === 'anime') score += 10;
      }
      if (lowerPrompt.includes('art') || lowerPrompt.includes('paint')) {
        if (model.estimatedType === 'artistic') score += 8;
      }
      if (lowerPrompt.includes('fantasy') || lowerPrompt.includes('magic')) {
        if (model.estimatedType === 'fantasy') score += 8;
      }

      // Confidence bonus
      score += model.confidence * 5;

      // Tag matching
      for (const tag of model.tags) {
        if (lowerPrompt.includes(tag.toLowerCase())) {
          score += 3;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = model;
      }
    }

    return bestMatch;
  }
}
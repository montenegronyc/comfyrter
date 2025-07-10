import type { ProcessedModel } from '@/app/api/models/trending/route';
import { MODEL_KNOWLEDGE_BASE, ModelSelector } from './model-knowledge-base';
import { CheckpointAnalyzer, type CheckpointInfo } from './checkpoint-analyzer';
import { ModelCompatibilityChecker, type BaseModelType } from './model-compatibility';

export interface DynamicModelSelection {
  selectedModel: string;
  baseModel: BaseModelType;
  compatibility: ReturnType<typeof ModelCompatibilityChecker.getCompatibility>;
  fallbackUsed: boolean;
  source: 'dynamic' | 'static' | 'fallback';
  warnings: string[];
  suggestions: string[];
}

export class DynamicModelService {
  private static cachedModels: ProcessedModel[] | null = null;
  private static lastFetch: number = 0;
  private static readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  static async getTrendingModels(forceRefresh = false): Promise<ProcessedModel[]> {
    const now = Date.now();
    
    // Use cache if available and not expired
    if (!forceRefresh && this.cachedModels && (now - this.lastFetch) < this.CACHE_DURATION) {
      return this.cachedModels || [];
    }

    try {
      const response = await fetch('/api/models/trending');
      
      if (!response.ok) {
        throw new Error(`API responded with ${response.status}`);
      }

      const data = await response.json();
      this.cachedModels = data.models || [];
      this.lastFetch = now;
      
      return this.cachedModels || [];
    } catch (error) {
      console.error('Failed to fetch trending models:', error);
      
      // Return cached models if available, even if expired
      if (this.cachedModels) {
        return this.cachedModels || [];
      }
      
      // Return empty array as last resort
      return [];
    }
  }

  static async selectOptimalModel(
    prompt: string, 
    style: string = 'unknown',
    preferredBaseModel?: BaseModelType
  ): Promise<DynamicModelSelection> {
    const warnings: string[] = [];
    const suggestions: string[] = [];
    let selectedModel: string;
    let source: DynamicModelSelection['source'] = 'static';
    let fallbackUsed = false;

    try {
      // First, try to get trending models
      const trendingModels = await this.getTrendingModels();
      
      if (trendingModels.length > 0) {
        // Convert to CheckpointInfo format for analysis
        const checkpointModels: CheckpointInfo[] = trendingModels.map(model => ({
          filename: model.filename,
          baseModel: model.baseModel,
          estimatedType: this.mapCategoryToType(model.category),
          confidence: 0.9, // High confidence for trending models
          tags: model.tags,
          creator: model.creator,
          recommendedSettings: {
            steps: 25,
            cfg: 7,
            sampler: 'dpmpp_2m_karras',
            scheduler: 'karras',
            clipSkip: model.baseModel === 'sdxl' ? 2 : 1,
            resolution: model.optimalResolution
          }
        }));

        // Find best match from trending models
        const bestMatch = CheckpointAnalyzer.findBestMatch(prompt + ' ' + style, checkpointModels);
        
        if (bestMatch && (!preferredBaseModel || bestMatch.baseModel === preferredBaseModel)) {
          selectedModel = bestMatch.filename;
          source = 'dynamic';
          suggestions.push(`Selected trending model: ${bestMatch.filename} (${bestMatch.baseModel})`);
        } else {
          // Fall back to static knowledge base
          selectedModel = this.selectFromStaticKnowledge(prompt, style, preferredBaseModel);
          source = 'static';
          suggestions.push('Using static model knowledge base (trending models API unavailable or no match)');
        }
      } else {
        // No trending models available, use static knowledge
        selectedModel = this.selectFromStaticKnowledge(prompt, style, preferredBaseModel);
        source = 'static';
        warnings.push('Trending models API unavailable, using static knowledge base');
      }
    } catch (error) {
      console.error('Error in model selection:', error);
      selectedModel = this.selectFromStaticKnowledge(prompt, style, preferredBaseModel);
      source = 'fallback';
      fallbackUsed = true;
      warnings.push('Model selection error, using fallback');
    }

    // Analyze the selected model
    const checkpointInfo = CheckpointAnalyzer.analyzeCheckpoint(selectedModel);
    const baseModel = checkpointInfo.baseModel;
    const compatibility = ModelCompatibilityChecker.getCompatibility(baseModel);

    // Final fallback if model analysis failed
    if (baseModel === 'unknown') {
      selectedModel = this.getFinalFallback(style);
      fallbackUsed = true;
      warnings.push('Model analysis failed, using final fallback');
    }

    // Validate the selection
    if (preferredBaseModel && baseModel !== preferredBaseModel) {
      warnings.push(`Requested ${preferredBaseModel} but selected ${baseModel} model`);
    }

    return {
      selectedModel,
      baseModel,
      compatibility,
      fallbackUsed,
      source,
      warnings,
      suggestions
    };
  }

  private static selectFromStaticKnowledge(
    prompt: string, 
    style: string, 
    preferredBaseModel?: BaseModelType
  ): string {
    // Use existing ModelSelector logic
    const keywords = prompt.toLowerCase().split(' ');
    const selectedModel = ModelSelector.selectBestModel(keywords, style);
    const modelKey = ModelSelector.getModelKeyByInfo(selectedModel);
    
    if (modelKey) {
      // Check if it matches preferred base model
      if (preferredBaseModel) {
        const checkpointInfo = CheckpointAnalyzer.analyzeCheckpoint(modelKey);
        if (checkpointInfo.baseModel === preferredBaseModel) {
          return modelKey;
        }
        
        // Find alternative in static knowledge that matches base model
        for (const [filename, info] of Object.entries(MODEL_KNOWLEDGE_BASE)) {
          const analysis = CheckpointAnalyzer.analyzeCheckpoint(filename);
          if (analysis.baseModel === preferredBaseModel && 
              info.category === style) {
            return filename;
          }
        }
      }
      
      return modelKey;
    }
    
    // Ultimate fallback
    return this.getFinalFallback(style);
  }

  private static getFinalFallback(style: string): string {
    const fallbacks = {
      realistic: 'juggernautXL_v9.safetensors',
      anime: 'ponyDiffusionV6XL.safetensors',
      artistic: 'dreamShaperXL_v21.safetensors',
      fantasy: 'dreamShaperXL_v21.safetensors'
    };
    
    return fallbacks[style as keyof typeof fallbacks] || fallbacks.realistic;
  }

  private static mapCategoryToType(category: string): CheckpointInfo['estimatedType'] {
    const mapping = {
      'realistic': 'realistic' as const,
      'anime': 'anime' as const, 
      'artistic': 'artistic' as const,
      'fantasy': 'fantasy' as const,
      'nsfw': 'nsfw' as const
    };
    
    return mapping[category as keyof typeof mapping] || 'unknown';
  }

  static async getCompatibleControlNets(baseModel: BaseModelType, controlType: string): Promise<{
    recommended: string;
    alternatives: string[];
    warnings: string[];
  }> {
    const compatibility = ModelCompatibilityChecker.getCompatibility(baseModel);
    const warnings: string[] = [];
    
    const recommended = ModelCompatibilityChecker.getBestControlNet(baseModel, controlType);
    
    if (!recommended) {
      warnings.push(`No compatible ControlNet found for ${controlType} with ${baseModel}`);
      return {
        recommended: 'control_v11p_sd15_canny', // Safe fallback
        alternatives: [],
        warnings
      };
    }

    const alternatives = compatibility.compatibleControlNets
      .filter(cn => cn !== recommended && cn.toLowerCase().includes(controlType.toLowerCase()))
      .slice(0, 3);

    return {
      recommended,
      alternatives,
      warnings
    };
  }

  static async getCompatibleDetailers(baseModel: BaseModelType, detailType: 'face' | 'person' | 'hand' | 'bbox' = 'face'): Promise<{
    recommended: string;
    alternatives: string[];
    warnings: string[];
  }> {
    const compatibility = ModelCompatibilityChecker.getCompatibility(baseModel);
    const warnings: string[] = [];
    
    const recommended = ModelCompatibilityChecker.getBestDetailer(baseModel, detailType);
    
    if (!recommended) {
      warnings.push(`No compatible detailer found for ${detailType} with ${baseModel}`);
      return {
        recommended: 'face_yolov8n.pt', // Safe fallback
        alternatives: [],
        warnings
      };
    }

    const alternatives = compatibility.compatibleDetailers
      .filter(detailer => detailer !== recommended && detailer.toLowerCase().includes(detailType))
      .slice(0, 3);

    return {
      recommended,
      alternatives,
      warnings
    };
  }

  static getModelAnalytics(): {
    staticModelsCount: number;
    dynamicModelsCount: number;
    lastUpdate: string | null;
    cacheStatus: 'fresh' | 'stale' | 'empty';
  } {
    const staticCount = Object.keys(MODEL_KNOWLEDGE_BASE).length;
    const dynamicCount = this.cachedModels?.length || 0;
    const now = Date.now();
    
    let cacheStatus: 'fresh' | 'stale' | 'empty' = 'empty';
    if (this.cachedModels) {
      if ((now - this.lastFetch) < this.CACHE_DURATION) {
        cacheStatus = 'fresh';
      } else {
        cacheStatus = 'stale';
      }
    }

    return {
      staticModelsCount: staticCount,
      dynamicModelsCount: dynamicCount,
      lastUpdate: this.lastFetch ? new Date(this.lastFetch).toISOString() : null,
      cacheStatus
    };
  }

  static async refreshModelCache(): Promise<boolean> {
    try {
      await this.getTrendingModels(true);
      return true;
    } catch (error) {
      console.error('Failed to refresh model cache:', error);
      return false;
    }
  }
}
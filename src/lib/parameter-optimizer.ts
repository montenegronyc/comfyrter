// Intelligent Parameter Optimization System

import { ModelInfo } from './model-knowledge-base';

export interface OptimizationContext {
  imageType: 'portrait' | 'landscape' | 'character' | 'scene' | 'product' | 'abstract';
  quality: 'draft' | 'standard' | 'high' | 'ultra';
  style: 'realistic' | 'artistic' | 'anime' | 'fantasy' | 'cyberpunk' | 'vintage';
  complexity: 'simple' | 'medium' | 'complex';
  aspectRatio: string;
  hasUpscaling: boolean;
  hasEffects: boolean;
  batchSize?: number;
}

export interface OptimizedParameters {
  cfg: number;
  steps: number;
  sampler: string;
  scheduler: string;
  denoise: number;
  width: number;
  height: number;
  seed?: number;
  clipSkip?: number;
}

export interface QualityMetrics {
  expectedTime: number; // in seconds
  memoryUsage: number; // in MB
  qualityScore: number; // 0-100
  tokenCost: number; // estimated API cost
}

export class ParameterOptimizer {
  private static readonly ASPECT_RATIO_MAP: Record<string, [number, number]> = {
    '1:1': [512, 512],
    '3:4': [512, 684],
    '4:3': [684, 512],
    '4:5': [512, 640],
    '5:4': [640, 512],
    '16:9': [912, 512],
    '9:16': [512, 912],
    '21:9': [1168, 512],
    '2:3': [512, 768],
    '3:2': [768, 512]
  };

  private static readonly SAMPLER_PERFORMANCE: Record<string, {
    speed: number; // 1-10 (10 = fastest)
    quality: number; // 1-10 (10 = best quality)
    consistency: number; // 1-10 (10 = most consistent)
  }> = {
    'Euler a': { speed: 9, quality: 7, consistency: 8 },
    'Euler': { speed: 9, quality: 6, consistency: 9 },
    'DPM++ 2M': { speed: 7, quality: 9, consistency: 9 },
    'DPM++ 2M Karras': { speed: 6, quality: 10, consistency: 9 },
    'DPM++ SDE': { speed: 5, quality: 9, consistency: 8 },
    'DPM++ SDE Karras': { speed: 4, quality: 10, consistency: 8 },
    'DDIM': { speed: 8, quality: 7, consistency: 10 },
    'LMS': { speed: 6, quality: 6, consistency: 7 },
    'UniPC': { speed: 8, quality: 8, consistency: 8 }
  };

  static optimizeParameters(
    context: OptimizationContext,
    baseModel?: ModelInfo,
    loras: Array<{ model: ModelInfo; strength: number }> = []
  ): OptimizedParameters {
    const dimensions = this.calculateOptimalDimensions(context);
    const sampler = this.selectOptimalSampler(context, baseModel);
    const steps = this.calculateOptimalSteps(context, sampler, loras.length);
    const cfg = this.calculateOptimalCFG(context, baseModel, loras);
    const scheduler = this.selectScheduler(sampler, context.quality);
    const denoise = this.calculateDenoise(context);

    return {
      cfg,
      steps,
      sampler,
      scheduler,
      denoise,
      width: dimensions[0],
      height: dimensions[1],
      clipSkip: this.calculateClipSkip(context.style)
    };
  }

  private static calculateOptimalDimensions(context: OptimizationContext): [number, number] {
    const baseDimensions = this.ASPECT_RATIO_MAP[context.aspectRatio] || [512, 512];
    
    // Adjust based on quality setting
    const qualityMultipliers = {
      draft: 0.75,
      standard: 1.0,
      high: 1.25,
      ultra: 1.5
    };

    const multiplier = qualityMultipliers[context.quality];
    
    // Apply multiplier and round to multiples of 64 (required for most models)
    const width = Math.round((baseDimensions[0] * multiplier) / 64) * 64;
    const height = Math.round((baseDimensions[1] * multiplier) / 64) * 64;

    // Ensure reasonable limits
    const maxDimension = context.quality === 'ultra' ? 1024 : 768;
    const adjustedWidth = Math.min(width, maxDimension);
    const adjustedHeight = Math.min(height, maxDimension);

    return [adjustedWidth, adjustedHeight];
  }

  private static selectOptimalSampler(context: OptimizationContext, baseModel?: ModelInfo): string {
    // Get model's preferred samplers
    const modelSamplers = baseModel?.samplers || ['DPM++ 2M', 'Euler a', 'DDIM'];
    
    // Filter available samplers based on context
    const availableSamplers = modelSamplers.filter(sampler => 
      this.SAMPLER_PERFORMANCE[sampler]
    );

    if (availableSamplers.length === 0) {
      return 'DPM++ 2M'; // fallback
    }

    // Score samplers based on context
    const scoredSamplers = availableSamplers.map(sampler => {
      const perf = this.SAMPLER_PERFORMANCE[sampler];
      let score = 0;

      // Quality preference
      switch (context.quality) {
        case 'draft':
          score += perf.speed * 0.7 + perf.quality * 0.3;
          break;
        case 'standard':
          score += perf.speed * 0.4 + perf.quality * 0.6;
          break;
        case 'high':
          score += perf.speed * 0.2 + perf.quality * 0.8;
          break;
        case 'ultra':
          score += perf.speed * 0.1 + perf.quality * 0.9;
          break;
      }

      // Complexity preference
      if (context.complexity === 'complex') {
        score += perf.consistency * 0.3;
      }

      return { sampler, score };
    });

    // Return highest scoring sampler
    const bestSampler = scoredSamplers.reduce((best, current) => 
      current.score > best.score ? current : best
    );

    return bestSampler.sampler;
  }

  private static calculateOptimalSteps(
    context: OptimizationContext, 
    sampler: string, 
    loraCount: number
  ): number {
    const samplerPerf = this.SAMPLER_PERFORMANCE[sampler];
    
    // Base steps by quality
    const baseSteps = {
      draft: 15,
      standard: 25,
      high: 35,
      ultra: 50
    };

    let steps = baseSteps[context.quality];

    // Adjust for sampler efficiency (more efficient = fewer steps needed)
    const efficiency = (samplerPerf.speed + samplerPerf.quality) / 2;
    if (efficiency >= 8) {
      steps = Math.max(steps - 5, 10);
    } else if (efficiency <= 5) {
      steps += 10;
    }

    // Adjust for complexity
    switch (context.complexity) {
      case 'simple':
        steps = Math.max(steps - 10, 10);
        break;
      case 'complex':
        steps += 15;
        break;
    }

    // Adjust for LoRAs (more LoRAs = more steps for convergence)
    steps += loraCount * 3;

    // Adjust for effects and upscaling
    if (context.hasEffects) steps += 5;
    if (context.hasUpscaling) steps += 5;

    return Math.min(steps, 100); // Cap at 100 steps
  }

  private static calculateOptimalCFG(
    context: OptimizationContext,
    baseModel?: ModelInfo,
    loras: Array<{ model: ModelInfo; strength: number }> = []
  ): number {
    // Base CFG from model or defaults
    const modelCfg = baseModel?.cfg || [7, 12];
    let cfg = (modelCfg[0] + modelCfg[1]) / 2;

    // Adjust for style
    switch (context.style) {
      case 'realistic':
        cfg = Math.max(cfg - 1, 4); // Lower CFG for realism
        break;
      case 'artistic':
        cfg += 1; // Higher CFG for artistic styles
        break;
      case 'anime':
        cfg += 0.5; // Slightly higher for anime
        break;
      case 'fantasy':
        cfg += 1.5; // Higher for creative fantasy
        break;
    }

    // Adjust for complexity
    switch (context.complexity) {
      case 'simple':
        cfg = Math.max(cfg - 1.5, 3);
        break;
      case 'complex':
        cfg += 2;
        break;
    }

    // Adjust for LoRAs (more LoRAs = higher CFG for control)
    const totalLoraStrength = loras.reduce((sum, lora) => sum + lora.strength, 0);
    cfg += totalLoraStrength * 0.5;

    // Quality adjustments
    switch (context.quality) {
      case 'draft':
        cfg = Math.max(cfg - 2, 3);
        break;
      case 'ultra':
        cfg += 1;
        break;
    }

    return Math.round(cfg * 10) / 10; // Round to 1 decimal
  }

  private static selectScheduler(sampler: string, quality: string): string {
    // Karras scheduler generally provides better quality
    const karrasSamplers = ['DPM++ 2M Karras', 'DPM++ SDE Karras'];
    
    if (karrasSamplers.includes(sampler)) {
      return 'Karras';
    }

    // For high quality, prefer Karras when available
    if (quality === 'high' || quality === 'ultra') {
      if (sampler.includes('DPM++')) {
        return 'Karras';
      }
    }

    return 'normal';
  }

  private static calculateDenoise(context: OptimizationContext): number {
    // Full denoise for most cases
    let denoise = 1.0;

    // Reduce denoise for img2img scenarios or when preserving some noise is desired
    if (context.style === 'vintage') {
      denoise = 0.95; // Preserve some grain
    }

    if (context.complexity === 'simple') {
      denoise = 0.98; // Slightly less aggressive
    }

    return denoise;
  }

  private static calculateClipSkip(style: string): number {
    // CLIP skip affects how text conditioning is processed
    switch (style) {
      case 'anime':
        return 2; // Anime models often work better with CLIP skip 2
      case 'artistic':
        return 1; // Artistic styles benefit from CLIP skip 1
      default:
        return 1; // Standard for realistic styles
    }
  }

  static calculateQualityMetrics(
    params: OptimizedParameters,
    context: OptimizationContext,
    loraCount: number = 0
  ): QualityMetrics {
    // Estimate processing time
    const pixelCount = params.width * params.height;
    const baseTime = (pixelCount / 512 / 512) * params.steps * 0.1; // Base: 0.1s per step at 512x512
    
    // Adjust for sampler efficiency
    const samplerPerf = this.SAMPLER_PERFORMANCE[params.sampler];
    const samplerMultiplier = 11 - samplerPerf.speed; // Convert speed to time multiplier
    const estimatedTime = baseTime * (samplerMultiplier / 10) * (1 + loraCount * 0.2);

    // Estimate memory usage
    const baseMemory = (pixelCount / 512 / 512) * 2048; // Base: 2GB for 512x512
    const memoryUsage = baseMemory * (1 + loraCount * 0.3);

    // Calculate quality score
    let qualityScore = 50; // Base score
    
    // Steps contribution
    qualityScore += Math.min((params.steps - 15) * 1.5, 30);
    
    // Sampler contribution
    qualityScore += samplerPerf.quality * 3;
    
    // Resolution contribution
    qualityScore += Math.min((pixelCount / 512 / 512 - 1) * 15, 20);
    
    // Cap at 100
    qualityScore = Math.min(qualityScore, 100);

    // Estimate token cost (simplified)
    const tokenCost = params.steps * 0.01 + loraCount * 0.005;

    return {
      expectedTime: Math.round(estimatedTime),
      memoryUsage: Math.round(memoryUsage),
      qualityScore: Math.round(qualityScore),
      tokenCost: Math.round(tokenCost * 100) / 100
    };
  }

  static suggestOptimizations(
    context: OptimizationContext,
    metrics: QualityMetrics
  ): string[] {
    const suggestions: string[] = [];

    // Performance suggestions
    if (metrics.expectedTime > 60) {
      suggestions.push('Consider reducing steps or using a faster sampler for quicker generation');
    }

    if (metrics.memoryUsage > 8192) {
      suggestions.push('Consider reducing resolution to lower memory usage');
    }

    // Quality suggestions
    if (metrics.qualityScore < 60) {
      suggestions.push('Increase steps or use a higher quality sampler for better results');
    }

    // Context-specific suggestions
    if (context.imageType === 'portrait' && context.aspectRatio === '16:9') {
      suggestions.push('Consider using 3:4 or 4:5 aspect ratio for better portrait composition');
    }

    if (context.style === 'anime' && context.quality === 'draft') {
      suggestions.push('Anime styles typically benefit from higher quality settings');
    }

    return suggestions;
  }
}
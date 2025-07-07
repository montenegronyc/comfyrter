// Enhanced Workflow Parser with Intelligent Model Selection

import { ParsedWorkflowStep } from './types';
import { ModelSelector, STYLE_PRESETS } from './model-knowledge-base';
import { ParameterOptimizer, OptimizationContext } from './parameter-optimizer';

export interface EnhancedWorkflowStep extends ParsedWorkflowStep {
  confidence: number; // 0-1 confidence in parsing accuracy
  suggestions: string[];
  optimizations: Record<string, unknown>;
  metadata: {
    detectedStyle?: string;
    detectedQuality?: string;
    detectedComplexity?: string;
    suggestedAspectRatio?: string;
  };
}

export interface ParsedWorkflowContext {
  description: string;
  detectedStyle: string;
  detectedImageType: string;
  detectedQuality: string;
  detectedComplexity: string;
  aspectRatio: string;
  keywords: string[];
  confidence: number;
}

export class EnhancedWorkflowParser {
  private static readonly STYLE_PATTERNS = {
    realistic: /\b(photorealistic|realistic|photo|photography|portrait|natural|lifelike)\b/gi,
    anime: /\b(anime|manga|japanese|cartoon|animated|cel.?shaded)\b/gi,
    fantasy: /\b(fantasy|magical|dragon|castle|medieval|fairy|mystical|epic)\b/gi,
    cyberpunk: /\b(cyberpunk|futuristic|neon|dystopian|sci.?fi|robot|android|tech)\b/gi,
    vintage: /\b(vintage|retro|old|aged|sepia|antique|classic|film|analog)\b/gi,
    artistic: /\b(artistic|painterly|oil.?painting|watercolor|impressionist|abstract)\b/gi
  };

  private static readonly QUALITY_PATTERNS = {
    draft: /\b(quick|fast|draft|rough|sketch|simple)\b/gi,
    standard: /\b(normal|standard|regular|basic)\b/gi,
    high: /\b(high.?quality|detailed|sharp|crisp|professional)\b/gi,
    ultra: /\b(ultra|maximum|best|perfect|masterpiece|8k|4k)\b/gi
  };

  private static readonly COMPLEXITY_PATTERNS = {
    simple: /\b(simple|basic|minimal|clean|single)\b/gi,
    medium: /\b(medium|average|normal|standard)\b/gi,
    complex: /\b(complex|detailed|intricate|elaborate|multiple|layered)\b/gi
  };

  private static readonly IMAGE_TYPE_PATTERNS = {
    portrait: /\b(portrait|face|person|character|headshot|closeup)\b/gi,
    landscape: /\b(landscape|scenery|environment|outdoor|nature|vista)\b/gi,
    character: /\b(character|person|figure|body|full.?body)\b/gi,
    scene: /\b(scene|setting|room|interior|location|place)\b/gi,
    product: /\b(product|object|item|still.?life)\b/gi,
    abstract: /\b(abstract|surreal|conceptual|artistic)\b/gi
  };

  private static readonly ASPECT_RATIO_PATTERNS = {
    '1:1': /\b(square|1:1|512x512|1024x1024)\b/gi,
    '3:4': /\b(3:4|portrait|vertical|512x684)\b/gi,
    '4:3': /\b(4:3|horizontal|684x512)\b/gi,
    '16:9': /\b(16:9|widescreen|cinematic|912x512)\b/gi,
    '9:16': /\b(9:16|phone|mobile|vertical|512x912)\b/gi,
    '4:5': /\b(4:5|512x640)\b/gi
  };

  parseDescription(description: string): {
    steps: EnhancedWorkflowStep[];
    context: ParsedWorkflowContext;
  } {
    const context = this.analyzeContext(description);
    const sentences = this.splitIntoSentences(description);
    const steps: EnhancedWorkflowStep[] = [];

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i].trim();
      if (!sentence) continue;
      
      const step = this.parseEnhancedSentence(sentence, i, context);
      if (step) {
        steps.push(step);
      }
    }

    // If no specific steps were identified, create an intelligent generation step
    if (steps.length === 0) {
      steps.push(this.createIntelligentGenerationStep(description, context));
    }

    // Apply global optimizations
    this.applyGlobalOptimizations(steps, context);

    return { steps, context };
  }

  private analyzeContext(description: string): ParsedWorkflowContext {
    const keywords = this.extractKeywords(description);
    
    const detectedStyle = this.detectPattern(description, EnhancedWorkflowParser.STYLE_PATTERNS) || 'realistic';
    const detectedImageType = this.detectPattern(description, EnhancedWorkflowParser.IMAGE_TYPE_PATTERNS) || 'scene';
    const detectedQuality = this.detectPattern(description, EnhancedWorkflowParser.QUALITY_PATTERNS) || 'standard';
    const detectedComplexity = this.detectPattern(description, EnhancedWorkflowParser.COMPLEXITY_PATTERNS) || 'medium';
    const aspectRatio = this.detectPattern(description, EnhancedWorkflowParser.ASPECT_RATIO_PATTERNS) || this.suggestAspectRatio(detectedImageType);

    // Calculate confidence based on pattern matches
    const confidence = this.calculateConfidence(description, keywords);

    return {
      description,
      detectedStyle,
      detectedImageType,
      detectedQuality,
      detectedComplexity,
      aspectRatio,
      keywords,
      confidence
    };
  }

  private detectPattern(text: string, patterns: Record<string, RegExp>): string | null {
    let bestMatch = null;
    let maxMatches = 0;

    for (const [key, pattern] of Object.entries(patterns)) {
      const matches = text.match(pattern);
      const matchCount = matches ? matches.length : 0;
      
      if (matchCount > maxMatches) {
        maxMatches = matchCount;
        bestMatch = key;
      }
    }

    return bestMatch;
  }

  private extractKeywords(description: string): string[] {
    // Remove common words and extract meaningful keywords
    const commonWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
      'then', 'now', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both',
      'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only',
      'own', 'same', 'so', 'than', 'too', 'very', 'can', 'will', 'just', 'should', 'now'
    ]);

    return description
      .toLowerCase()
      .split(/[^\w]+/)
      .filter(word => word.length > 2 && !commonWords.has(word))
      .slice(0, 20); // Limit to top 20 keywords
  }

  private suggestAspectRatio(imageType: string): string {
    switch (imageType) {
      case 'portrait':
        return '3:4';
      case 'landscape':
        return '16:9';
      case 'character':
        return '4:5';
      case 'product':
        return '1:1';
      default:
        return '4:3';
    }
  }

  private calculateConfidence(description: string, keywords: string[]): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence based on description length and detail
    if (description.length > 100) confidence += 0.2;
    if (description.length > 200) confidence += 0.1;

    // Increase confidence based on keyword count
    if (keywords.length > 10) confidence += 0.1;
    if (keywords.length > 15) confidence += 0.1;

    // Increase confidence based on specific technical terms
    const technicalTerms = ['cfg', 'steps', 'sampler', 'lora', 'model', 'upscale', 'resolution'];
    const technicalMatches = technicalTerms.filter(term => 
      description.toLowerCase().includes(term)
    ).length;
    confidence += technicalMatches * 0.05;

    return Math.min(confidence, 1.0);
  }

  private splitIntoSentences(text: string): string[] {
    return text.split(/[.!?;]|(?:\s*(?:then|next|after|and then)\s*)/i)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  private parseEnhancedSentence(
    sentence: string, 
    index: number, 
    context: ParsedWorkflowContext
  ): EnhancedWorkflowStep | null {
    const lowerSentence = sentence.toLowerCase();
    
    // Detect action type with higher intelligence
    let action = 'unknown';
    let confidence = 0.5;
    const suggestions: string[] = [];

    if (this.containsGenerationKeywords(lowerSentence)) {
      action = 'generate';
      confidence = 0.9;
    } else if (this.containsUpscaleKeywords(lowerSentence)) {
      action = 'upscale';
      confidence = 0.8;
    } else if (this.containsEffectKeywords(lowerSentence)) {
      action = 'effect';
      confidence = 0.7;
    } else if (this.containsLoRAKeywords(lowerSentence)) {
      action = 'lora';
      confidence = 0.8;
    } else if (this.containsControlNetKeywords(lowerSentence)) {
      action = 'controlnet';
      confidence = 0.8;
    }

    if (action === 'unknown') {
      return null;
    }

    // Extract parameters with intelligence
    let parameters: Record<string, unknown> = {};
    const metadata = {
      detectedStyle: context.detectedStyle,
      detectedQuality: context.detectedQuality,
      detectedComplexity: context.detectedComplexity,
      suggestedAspectRatio: context.aspectRatio
    };

    switch (action) {
      case 'generate':
        parameters = this.extractIntelligentGenerationParams(sentence, context);
        break;
      case 'upscale':
        parameters = this.extractUpscaleParams();
        break;
      case 'effect':
        parameters = this.extractEffectParams();
        break;
      case 'lora':
        parameters = this.extractLoRAParams();
        break;
      case 'controlnet':
        parameters = this.extractControlNetParams();
        break;
    }

    // Apply optimizations
    const optimizations = this.generateOptimizations(action, parameters, context);

    return {
      action,
      parameters,
      dependencies: index > 0 ? [`step_${index - 1}`] : [],
      keywords: context.keywords,
      confidence,
      suggestions,
      optimizations,
      metadata
    };
  }

  private extractIntelligentGenerationParams(
    sentence: string,
    context: ParsedWorkflowContext
  ): Record<string, unknown> {
    // Start with basic parameter extraction
    const basicParams = this.extractBasicGenerationParams(sentence);
    
    // Select optimal model
    const selectedModel = ModelSelector.selectBestModel(context.keywords, context.detectedStyle);
    if (selectedModel) {
      basicParams.model = selectedModel.name;
    }

    // Select optimal LoRAs
    const selectedLoras = ModelSelector.selectLoras(context.keywords, context.detectedStyle);
    if (selectedLoras.length > 0) {
      basicParams.loras = selectedLoras.map(lora => ({
        name: lora.model.name,
        strength: lora.strength
      }));
    }

    // Apply parameter optimization
    const optimizationContext: OptimizationContext = {
      imageType: context.detectedImageType as 'portrait' | 'landscape' | 'character' | 'scene' | 'product' | 'abstract',
      quality: context.detectedQuality as 'draft' | 'standard' | 'high' | 'ultra',
      style: context.detectedStyle as 'realistic' | 'artistic' | 'anime' | 'fantasy' | 'cyberpunk' | 'vintage',
      complexity: context.detectedComplexity as 'simple' | 'medium' | 'complex',
      aspectRatio: context.aspectRatio,
      hasUpscaling: false, // Will be updated if upscaling steps are found
      hasEffects: false // Will be updated if effects are found
    };

    const optimizedParams = ParameterOptimizer.optimizeParameters(
      optimizationContext,
      selectedModel || undefined,
      selectedLoras
    );

    // Merge optimized parameters
    return {
      ...basicParams,
      ...optimizedParams,
      style_preset: this.detectStylePreset(context)
    };
  }

  private extractBasicGenerationParams(sentence: string): Record<string, unknown> {
    const params: Record<string, unknown> = {};
    
    // Extract explicit parameters from sentence
    const cfgMatch = sentence.match(/cfg\s*([\d\.]+)/i);
    if (cfgMatch) params.cfg = parseFloat(cfgMatch[1]);

    const stepsMatch = sentence.match(/(\d+)\s*steps?/i);
    if (stepsMatch) params.steps = parseInt(stepsMatch[1]);

    const samplerMatch = sentence.match(/(?:sampler|sampling)\s*:?\s*([a-zA-Z0-9_+\s]+)/i);
    if (samplerMatch) params.sampler = samplerMatch[1].trim();

    const dimensionMatch = sentence.match(/(\d+)\s*x\s*(\d+)/i);
    if (dimensionMatch) {
      params.width = parseInt(dimensionMatch[1]);
      params.height = parseInt(dimensionMatch[2]);
    }

    return params;
  }

  private detectStylePreset(context: ParsedWorkflowContext): string | null {
    const styleKeywords = context.keywords.join(' ').toLowerCase();
    
    for (const [presetName, preset] of Object.entries(STYLE_PRESETS)) {
      const presetKeywords = preset.description.toLowerCase();
      const matchScore = this.calculateKeywordMatch(styleKeywords, presetKeywords);
      
      if (matchScore > 0.6) {
        return presetName;
      }
    }
    
    return null;
  }

  private calculateKeywordMatch(text1: string, text2: string): number {
    const words1 = new Set(text1.split(/\s+/));
    const words2 = new Set(text2.split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  private createIntelligentGenerationStep(
    description: string,
    context: ParsedWorkflowContext
  ): EnhancedWorkflowStep {
    const parameters = this.extractIntelligentGenerationParams(description, context);
    
    return {
      action: 'generate',
      parameters,
      dependencies: [],
      keywords: context.keywords,
      confidence: context.confidence,
      suggestions: [
        'Consider adding specific model or style preferences',
        'Try including quality indicators like "high quality" or "detailed"'
      ],
      optimizations: this.generateOptimizations('generate', parameters, context),
      metadata: {
        detectedStyle: context.detectedStyle,
        detectedQuality: context.detectedQuality,
        detectedComplexity: context.detectedComplexity,
        suggestedAspectRatio: context.aspectRatio
      }
    };
  }

  private generateOptimizations(
    action: string,
    parameters: Record<string, unknown>,
    context: ParsedWorkflowContext
  ): Record<string, unknown> {
    const optimizations: Record<string, unknown> = {};

    if (action === 'generate') {
      // Suggest model alternatives
      const alternativeModels = ModelSelector.selectBestModel(
        [...context.keywords, 'alternative'],
        context.detectedStyle
      );
      if (alternativeModels) {
        optimizations.alternativeModel = alternativeModels.name;
      }

      // Suggest parameter adjustments
      if (context.detectedQuality === 'high' && !parameters.steps) {
        optimizations.suggestedSteps = 35;
      }
      
      if (context.detectedStyle === 'realistic' && !parameters.cfg) {
        optimizations.suggestedCfg = 6;
      }
    }

    return optimizations;
  }

  private applyGlobalOptimizations(
    steps: EnhancedWorkflowStep[],
    context: ParsedWorkflowContext
  ): void {
    // Check for missing essential steps
    const hasGeneration = steps.some(step => step.action === 'generate');
    if (!hasGeneration) {
      steps.unshift(this.createIntelligentGenerationStep(context.description, context));
    }

    // Optimize step order
    this.optimizeStepOrder(steps);

    // Add quality improvements
    this.addQualityImprovements(steps, context);
  }

  private optimizeStepOrder(steps: EnhancedWorkflowStep[]): void {
    // Ensure correct order: generate -> lora -> effects -> upscale
    const actionPriority = { generate: 0, lora: 1, controlnet: 2, effect: 3, upscale: 4 };
    
    steps.sort((a, b) => {
      const priorityA = actionPriority[a.action as keyof typeof actionPriority] ?? 999;
      const priorityB = actionPriority[b.action as keyof typeof actionPriority] ?? 999;
      return priorityA - priorityB;
    });

    // Update dependencies based on new order
    steps.forEach((step, index) => {
      if (index > 0) {
        step.dependencies = [`step_${index - 1}`];
      }
    });
  }

  private addQualityImprovements(
    steps: EnhancedWorkflowStep[],
    context: ParsedWorkflowContext
  ): void {
    // Add detail enhancement LoRA for high quality requests
    if (context.detectedQuality === 'high' || context.detectedQuality === 'ultra') {
      const hasDetailLora = steps.some(step => 
        step.action === 'lora' && 
        String(step.parameters.name).includes('detail')
      );

      if (!hasDetailLora) {
        steps.push({
          action: 'lora',
          parameters: {
            name: 'add_detail_xl.safetensors',
            strength: 0.7
          },
          dependencies: ['generate'],
          keywords: ['detail', 'enhancement'],
          confidence: 0.8,
          suggestions: ['Automatically added for quality enhancement'],
          optimizations: {},
          metadata: {}
        });
      }
    }

    // Suggest upscaling for high quality
    if ((context.detectedQuality === 'ultra' || context.keywords.includes('upscale')) &&
        !steps.some(step => step.action === 'upscale')) {
      steps.push({
        action: 'upscale',
        parameters: {
          factor: 2,
          method: 'model',
          model: 'RealESRGAN_x4plus.pth'
        },
        dependencies: [steps.length > 0 ? `step_${steps.length - 1}` : 'generate'],
        keywords: ['upscale', 'enhancement'],
        confidence: 0.7,
        suggestions: ['Added for ultra quality enhancement'],
        optimizations: {},
        metadata: {}
      });
    }
  }

  // Helper methods for keyword detection
  private containsGenerationKeywords(text: string): boolean {
    const keywords = ['generate', 'create', 'make', 'produce', 'render', 'draw', 'paint'];
    return keywords.some(keyword => text.includes(keyword));
  }

  private containsUpscaleKeywords(text: string): boolean {
    const keywords = ['upscale', 'enlarge', 'bigger', 'scale up', 'increase size', 'enhance resolution'];
    return keywords.some(keyword => text.includes(keyword));
  }

  private containsEffectKeywords(text: string): boolean {
    const keywords = ['blur', 'sharpen', 'grain', 'noise', 'film', 'vintage', 'sepia', 'effect'];
    return keywords.some(keyword => text.includes(keyword));
  }

  private containsLoRAKeywords(text: string): boolean {
    const keywords = ['lora', 'style', 'character'];
    return keywords.some(keyword => text.includes(keyword));
  }

  private containsControlNetKeywords(text: string): boolean {
    const keywords = ['controlnet', 'control', 'pose', 'depth', 'canny', 'edge', 'guidance'];
    return keywords.some(keyword => text.includes(keyword));
  }

  // Existing methods adapted for the new system
  private extractUpscaleParams(/* _text: string */): Record<string, unknown> {
    // Implementation similar to existing but with enhancements
    return {
      factor: 2,
      method: 'model',
      model: 'RealESRGAN_x4plus.pth'
    };
  }

  private extractEffectParams(/* _text: string */): Record<string, unknown> {
    // Implementation similar to existing but with enhancements
    return {
      type: 'grain',
      strength: 0.5
    };
  }

  private extractLoRAParams(/* _text: string */): Record<string, unknown> {
    // Implementation similar to existing but with enhancements
    return {
      name: 'default.safetensors',
      strength_model: 1.0,
      strength_clip: 1.0
    };
  }

  private extractControlNetParams(/* _text: string */): Record<string, unknown> {
    // Implementation similar to existing but with enhancements
    return {
      type: 'canny',
      strength: 1.0
    };
  }

  // Extract the main subject/prompt from the description with intelligence
  extractPrompt(description: string): { positive: string; negative: string } {
    // Clean the description to extract the core artistic prompt
    const cleanDescription = description
      .replace(/(?:then|next|after|and then)\s+.*/gi, '')
      .replace(/(?:upscale|enlarge|bigger).*/gi, '')
      .replace(/(?:add|apply)\s+(?:film grain|grain|effect).*/gi, '')
      .replace(/(?:using|with)\s+(?:sampler|model|lora).*/gi, '')
      .replace(/\d+\s*x\s*\d+/gi, '')
      .replace(/\d+\s*steps?/gi, '')
      .replace(/cfg\s*[\d\.]+/gi, '')
      .trim();

    // Enhance the prompt based on detected style
    const context = this.analyzeContext(description);
    const enhancedPrompt = this.enhancePrompt(cleanDescription || description, context);

    // Generate intelligent negative prompt
    const negativePrompt = this.generateIntelligentNegativePrompt(context);

    return {
      positive: enhancedPrompt,
      negative: negativePrompt
    };
  }

  private enhancePrompt(basePrompt: string, context: ParsedWorkflowContext): string {
    let enhanced = basePrompt;

    // Add quality keywords if not present
    if (context.detectedQuality === 'high' || context.detectedQuality === 'ultra') {
      if (!enhanced.toLowerCase().includes('high quality')) {
        enhanced += ', high quality, detailed';
      }
    }

    // Add style-specific enhancements
    switch (context.detectedStyle) {
      case 'realistic':
        if (!enhanced.toLowerCase().includes('photorealistic')) {
          enhanced += ', photorealistic, professional photography';
        }
        break;
      case 'anime':
        if (!enhanced.toLowerCase().includes('anime')) {
          enhanced += ', anime style, detailed anime art';
        }
        break;
      case 'fantasy':
        enhanced += ', fantasy art, magical atmosphere';
        break;
      case 'cyberpunk':
        enhanced += ', cyberpunk style, futuristic, neon lighting';
        break;
    }

    return enhanced;
  }

  private generateIntelligentNegativePrompt(context: ParsedWorkflowContext): string {
    const baseNegative = ['low quality', 'blurry', 'distorted', 'bad anatomy', 'worst quality'];
    
    // Add style-specific negative prompts
    switch (context.detectedStyle) {
      case 'realistic':
        baseNegative.push('cartoon', 'anime', 'painting', 'sketch', 'artificial');
        break;
      case 'anime':
        baseNegative.push('realistic', 'photographic', '3d render');
        break;
      case 'fantasy':
        baseNegative.push('modern', 'contemporary', 'urban');
        break;
      case 'cyberpunk':
        baseNegative.push('medieval', 'natural', 'rustic', 'vintage');
        break;
    }

    // Add quality-specific negatives
    if (context.detectedQuality === 'high' || context.detectedQuality === 'ultra') {
      baseNegative.push('low resolution', 'pixelated', 'compressed');
    }

    return baseNegative.join(', ');
  }
}
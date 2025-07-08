// Hybrid Workflow Parser - Combines LLM parsing with existing enhanced parser

import { EnhancedWorkflowParser, EnhancedWorkflowStep, ParsedWorkflowContext } from './enhanced-workflow-parser';
import { createLLMCommandParser, isLLMParsingAvailable } from './llm-command-parser';
import { LLMCommandParser, LLMCommandParserResult, LLMConfig } from './llm-types';
// import { ParsedWorkflowStep } from './types'; // Removed - not used

export interface HybridParseResult {
  steps: EnhancedWorkflowStep[];
  context: ParsedWorkflowContext;
  llmUsed: boolean;
  confidence: number;
  processingTime: number;
  suggestions: string[];
  errors?: string[];
  debugInfo?: {
    llmResult?: LLMCommandParserResult | null;
    fallbackReason?: string;
    enhancedParserUsed: boolean;
  };
}

export interface HybridParserConfig {
  llm?: Partial<LLMConfig>;
  confidenceThreshold?: number;
  enableFallback?: boolean;
  timeoutMs?: number;
  debug?: boolean;
}

export class HybridWorkflowParser {
  private llmParser: LLMCommandParser;
  private enhancedParser: EnhancedWorkflowParser;
  private config: Required<HybridParserConfig>;

  constructor(config: HybridParserConfig = {}) {
    this.config = {
      llm: config.llm || {},
      confidenceThreshold: config.confidenceThreshold || 0.6,
      enableFallback: config.enableFallback !== false,
      timeoutMs: config.timeoutMs || 25000,
      debug: config.debug || false
    };

    this.llmParser = createLLMCommandParser(this.config.llm);
    this.enhancedParser = new EnhancedWorkflowParser();
  }

  async parseDescription(description: string): Promise<HybridParseResult> {
    const startTime = Date.now();
    let llmResult: LLMCommandParserResult | null | undefined;
    let fallbackReason: string | undefined;
    
    this.log('Starting hybrid parsing for:', description.substring(0, 100) + '...');

    try {
      // First, try LLM parsing
      llmResult = await this.tryLLMParsing(description);
      
      if (llmResult && !llmResult.fallbackUsed && 
          llmResult.confidence >= this.config.confidenceThreshold) {
        
        this.log('LLM parsing successful, confidence:', llmResult.confidence);
        
        // Convert LLM result to Enhanced format and enhance with existing optimizations
        const enhancedResult = this.convertLLMToEnhanced(llmResult, description);
        
        return {
          steps: enhancedResult.steps,
          context: enhancedResult.context,
          llmUsed: true,
          confidence: llmResult.confidence,
          processingTime: Date.now() - startTime,
          suggestions: llmResult.result.suggestions || [],
          debugInfo: {
            llmResult,
            enhancedParserUsed: true
          }
        };
      }
      
      fallbackReason = llmResult?.fallbackUsed 
        ? 'LLM confidence below threshold'
        : 'LLM parsing failed';
        
    } catch (error) {
      this.log('LLM parsing error:', error);
      fallbackReason = `LLM error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }

    // Fallback to enhanced parser
    this.log('Falling back to enhanced parser, reason:', fallbackReason);
    
    if (this.config.enableFallback) {
      const enhancedResult = this.enhancedParser.parseDescription(description);
      
      return {
        steps: enhancedResult.steps,
        context: enhancedResult.context,
        llmUsed: false,
        confidence: enhancedResult.context.confidence,
        processingTime: Date.now() - startTime,
        suggestions: [
          'LLM parsing was not available. Consider installing Ollama for better parsing.',
          ...this.generateFallbackSuggestions(description)
        ],
        errors: llmResult?.errors,
        debugInfo: {
          llmResult,
          fallbackReason,
          enhancedParserUsed: true
        }
      };
    }

    // If fallback is disabled and LLM failed, return minimal result
    return {
      steps: [],
      context: {
        description,
        detectedStyle: 'realistic',
        detectedImageType: 'scene',
        detectedQuality: 'standard',
        detectedComplexity: 'medium',
        aspectRatio: '1:1',
        keywords: [],
        confidence: 0
      },
      llmUsed: false,
      confidence: 0,
      processingTime: Date.now() - startTime,
      suggestions: ['Parsing failed. Please check your description and try again.'],
      errors: llmResult?.errors || ['Parsing failed'],
      debugInfo: {
        llmResult,
        fallbackReason,
        enhancedParserUsed: false
      }
    };
  }

  private async tryLLMParsing(description: string): Promise<LLMCommandParserResult | null> {
    try {
      // Check if LLM is available first
      const isAvailable = await Promise.race([
        isLLMParsingAvailable(),
        new Promise<boolean>(resolve => setTimeout(() => resolve(false), 5000))
      ]);

      if (!isAvailable) {
        this.log('LLM service not available');
        return null;
      }

      // Parse with timeout
      const result = await Promise.race([
        this.llmParser.parseCommand(description),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('LLM parsing timeout')), this.config.timeoutMs)
        )
      ]);

      return result;
      
    } catch (error) {
      this.log('LLM parsing failed:', error);
      return null;
    }
  }

  private convertLLMToEnhanced(
    llmResult: LLMCommandParserResult, 
    originalDescription: string
  ): { steps: EnhancedWorkflowStep[]; context: ParsedWorkflowContext } {
    
    const llmData = llmResult.result;
    
    // Create context from LLM extracted context
    const context: ParsedWorkflowContext = {
      description: originalDescription,
      detectedStyle: llmData.extracted_context.style || 'realistic',
      detectedImageType: llmData.extracted_context.image_type || 'scene',
      detectedQuality: llmData.extracted_context.quality || 'standard',
      detectedComplexity: this.inferComplexity(llmData.workflow_steps.length),
      aspectRatio: llmData.extracted_context.aspect_ratio || '1:1',
      keywords: [
        ...(llmData.extracted_context.technical_keywords || []),
        ...(llmData.extracted_context.creative_keywords || [])
      ],
      confidence: llmResult.confidence
    };

    // Convert LLM workflow steps to Enhanced format
    const steps: EnhancedWorkflowStep[] = llmData.workflow_steps.map((llmStep, index) => {
      const enhancedStep: EnhancedWorkflowStep = {
        action: llmStep.action,
        parameters: llmStep.parameters,
        dependencies: llmStep.dependencies.length > 0 
          ? llmStep.dependencies 
          : (index > 0 ? [`step_${index - 1}`] : []),
        keywords: this.extractKeywordsFromStep(llmStep),
        confidence: llmStep.confidence,
        suggestions: llmStep.reasoning ? [llmStep.reasoning] : [],
        optimizations: this.generateOptimizations(llmStep, context),
        metadata: {
          detectedStyle: context.detectedStyle,
          detectedQuality: context.detectedQuality,
          detectedComplexity: context.detectedComplexity,
          suggestedAspectRatio: context.aspectRatio
        }
      };

      return enhancedStep;
    });

    // Apply additional enhancements from the enhanced parser
    this.applyEnhancedOptimizations(steps, context);

    return { steps, context };
  }

  private inferComplexity(stepCount: number): string {
    if (stepCount <= 1) return 'simple';
    if (stepCount <= 3) return 'medium';
    return 'complex';
  }

  private extractKeywordsFromStep(llmStep: LLMCommandParserResult['commands'][0]): string[] {
    const keywords: string[] = [];
    
    // Extract keywords from parameters
    Object.entries(llmStep.parameters).forEach(([, value]) => {
      if (typeof value === 'string') {
        keywords.push(value);
      }
    });
    
    // Add action as keyword
    keywords.push(llmStep.action);
    
    return keywords.filter(k => k && k.length > 2);
  }

  private generateOptimizations(llmStep: LLMCommandParserResult['commands'][0], context: ParsedWorkflowContext): Record<string, unknown> {
    const optimizations: Record<string, unknown> = {};
    
    // Add optimization suggestions based on step type
    switch (llmStep.action) {
      case 'generate':
        if (context.detectedQuality === 'high' && !llmStep.parameters.steps) {
          optimizations.suggestedSteps = 35;
        }
        if (context.detectedStyle === 'realistic' && !llmStep.parameters.cfg) {
          optimizations.suggestedCfg = 6;
        }
        break;
        
      case 'upscale':
        if (!llmStep.parameters.method) {
          optimizations.suggestedMethod = 'model';
          optimizations.suggestedModel = 'RealESRGAN_x4plus.pth';
        }
        break;
    }
    
    return optimizations;
  }

  private applyEnhancedOptimizations(steps: EnhancedWorkflowStep[], context: ParsedWorkflowContext): void {
    // Apply global optimizations from enhanced parser
    const hasGeneration = steps.some(step => step.action === 'generate');
    
    if (!hasGeneration && context.description) {
      // Add a generation step if none exists
      const generationStep: EnhancedWorkflowStep = {
        action: 'generate',
        parameters: {
          prompt: context.description,
          style: context.detectedStyle,
          quality: context.detectedQuality
        },
        dependencies: [],
        keywords: context.keywords,
        confidence: 0.7,
        suggestions: ['Added missing generation step'],
        optimizations: {},
        metadata: {
          detectedStyle: context.detectedStyle,
          detectedQuality: context.detectedQuality,
          detectedComplexity: context.detectedComplexity,
          suggestedAspectRatio: context.aspectRatio
        }
      };
      
      steps.unshift(generationStep);
    }
  }

  private generateFallbackSuggestions(description: string): string[] {
    const suggestions: string[] = [];
    
    // Basic suggestions based on keywords
    if (description.toLowerCase().includes('upscale')) {
      suggestions.push('For upscaling, try: "Generate [description], then upscale 2x"');
    }
    
    if (description.toLowerCase().includes('anime')) {
      suggestions.push('For anime style, specify: "anime style" or "manga style"');
    }
    
    if (description.toLowerCase().includes('realistic')) {
      suggestions.push('For realistic images, try: "photorealistic" or "professional photography"');
    }
    
    return suggestions;
  }

  private log(...args: unknown[]): void {
    if (this.config.debug) {
      console.log('[HybridParser]', ...args);
    }
  }

  // Public utility methods
  async isLLMAvailable(): Promise<boolean> {
    return await isLLMParsingAvailable();
  }

  setLLMModel(modelName: string): void {
    this.llmParser.setModel(modelName);
  }

  getConfig(): Readonly<Required<HybridParserConfig>> {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<HybridParserConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // Enhanced backward compatibility method
  parseDescriptionSync(description: string): { steps: EnhancedWorkflowStep[]; context: ParsedWorkflowContext } {
    // Synchronous fallback using only enhanced parser
    return this.enhancedParser.parseDescription(description);
  }
}
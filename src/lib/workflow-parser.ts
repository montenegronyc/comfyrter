import { ParsedWorkflowStep, GenerationParams, EffectParams, LoRAParams } from './types';

// Keywords for different operations
const GENERATION_KEYWORDS = ['generate', 'create', 'make', 'produce', 'render', 'draw', 'paint'];
const UPSCALE_KEYWORDS = ['upscale', 'enlarge', 'bigger', 'scale up', 'increase size', 'enhance resolution'];
const EFFECT_KEYWORDS = ['blur', 'sharpen', 'grain', 'noise', 'film', 'vintage', 'sepia', 'black and white', 'monochrome'];
const CONTROLNET_KEYWORDS = ['controlnet', 'control', 'pose', 'depth', 'canny', 'edge', 'guidance'];
const STYLE_KEYWORDS = ['style', 'lora', 'character', 'artistic'];
const BLEND_KEYWORDS = ['blend', 'mix', 'combine', 'overlay', 'composite'];

// Model and parameter extraction patterns
const MODEL_PATTERNS = [
  /(?:using|with|model)\s+([a-zA-Z0-9_\-\.]+(?:\.(?:safetensors|ckpt|pt))?)/gi,
  /(?:checkpoint|model):\s*([a-zA-Z0-9_\-\.]+)/gi
];

const LORA_PATTERNS = [
  /(?:lora|style):\s*([a-zA-Z0-9_\-\.]+)(?:\s*(?:at|@|strength)\s*([\d\.]+))?/gi,
  /(?:using|with)\s+lora\s+([a-zA-Z0-9_\-\.]+)/gi
];

const DIMENSION_PATTERNS = [
  /(\d+)\s*x\s*(\d+)/gi,
  /(\d+)\s*by\s*(\d+)/gi,
  /resolution\s*(\d+)\s*x\s*(\d+)/gi,
  /size\s*(\d+)\s*x\s*(\d+)/gi
];

const STEP_PATTERNS = [
  /(\d+)\s*steps?/gi,
  /steps?\s*(\d+)/gi
];

const CFG_PATTERNS = [
  /cfg\s*([\d\.]+)/gi,
  /guidance\s*(?:scale)?\s*([\d\.]+)/gi
];

const SAMPLER_PATTERNS = [
  /(?:sampler|sampling)\s*:?\s*([a-zA-Z0-9_]+)/gi,
  /(?:using|with)\s+([a-zA-Z0-9_]+)\s+sampler/gi
];

const SEED_PATTERNS = [
  /seed\s*:?\s*(\d+)/gi,
  /random\s*seed/gi
];

const UPSCALE_FACTOR_PATTERNS = [
  /upscale\s*(?:by|to)?\s*(\d+(?:\.\d+)?)x?/gi,
  /(\d+(?:\.\d+)?)x\s*(?:upscale|bigger|larger)/gi,
  /scale\s*(?:by|to)\s*(\d+(?:\.\d+)?)/gi
];

export class WorkflowParser {
  parseDescription(description: string): ParsedWorkflowStep[] {
    const steps: ParsedWorkflowStep[] = [];
    const sentences = this.splitIntoSentences(description);
    
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i].trim();
      if (!sentence) continue;
      
      const step = this.parseSentence(sentence, i);
      if (step) {
        steps.push(step);
      }
    }
    
    // If no specific steps were identified, treat as a basic generation
    if (steps.length === 0) {
      steps.push({
        action: 'generate',
        parameters: this.extractGenerationParams(description) as unknown as Record<string, unknown>,
        dependencies: [],
        keywords: ['generate']
      });
    }
    
    return steps;
  }
  
  private splitIntoSentences(text: string): string[] {
    // Split on sentence endings and common workflow separators
    return text.split(/[.!?;]|(?:\s*(?:then|next|after|and then)\s*)/i)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }
  
  private parseSentence(sentence: string, index: number): ParsedWorkflowStep | null {
    const lowerSentence = sentence.toLowerCase();
    
    // Check for generation keywords
    if (this.containsAny(lowerSentence, GENERATION_KEYWORDS)) {
      return {
        action: 'generate',
        parameters: this.extractGenerationParams(sentence) as unknown as Record<string, unknown>,
        dependencies: index > 0 ? [`step_${index - 1}`] : [],
        keywords: ['generate']
      };
    }
    
    // Check for upscaling
    if (this.containsAny(lowerSentence, UPSCALE_KEYWORDS)) {
      return {
        action: 'upscale',
        parameters: this.extractUpscaleParams(sentence),
        dependencies: [`step_${Math.max(0, index - 1)}`],
        keywords: ['upscale']
      };
    }
    
    // Check for effects
    if (this.containsAny(lowerSentence, EFFECT_KEYWORDS)) {
      return {
        action: 'effect',
        parameters: this.extractEffectParams(sentence) as unknown as Record<string, unknown>,
        dependencies: [`step_${Math.max(0, index - 1)}`],
        keywords: ['effect']
      };
    }
    
    // Check for ControlNet
    if (this.containsAny(lowerSentence, CONTROLNET_KEYWORDS)) {
      return {
        action: 'controlnet',
        parameters: this.extractControlNetParams(sentence),
        dependencies: [`step_${Math.max(0, index - 1)}`],
        keywords: ['controlnet']
      };
    }
    
    // Check for LoRA/Style
    if (this.containsAny(lowerSentence, STYLE_KEYWORDS)) {
      return {
        action: 'lora',
        parameters: this.extractLoRAParams(sentence) as unknown as Record<string, unknown>,
        dependencies: [`step_${Math.max(0, index - 1)}`],
        keywords: ['lora', 'style']
      };
    }
    
    // Check for blending
    if (this.containsAny(lowerSentence, BLEND_KEYWORDS)) {
      return {
        action: 'blend',
        parameters: this.extractBlendParams(sentence),
        dependencies: [`step_${Math.max(0, index - 1)}`],
        keywords: ['blend']
      };
    }
    
    return null;
  }
  
  private containsAny(text: string, keywords: string[]): boolean {
    return keywords.some(keyword => text.includes(keyword));
  }
  
  private extractGenerationParams(text: string): GenerationParams {
    const params: GenerationParams = {};
    
    // Extract model
    for (const pattern of MODEL_PATTERNS) {
      const match = pattern.exec(text);
      if (match) {
        params.model = match[1];
        break;
      }
    }
    
    // Extract dimensions
    for (const pattern of DIMENSION_PATTERNS) {
      const match = pattern.exec(text);
      if (match) {
        params.width = parseInt(match[1]);
        params.height = parseInt(match[2]);
        break;
      }
    }
    
    // Extract steps
    for (const pattern of STEP_PATTERNS) {
      const match = pattern.exec(text);
      if (match) {
        params.steps = parseInt(match[1]);
        break;
      }
    }
    
    // Extract CFG
    for (const pattern of CFG_PATTERNS) {
      const match = pattern.exec(text);
      if (match) {
        params.cfg = parseFloat(match[1]);
        break;
      }
    }
    
    // Extract sampler
    for (const pattern of SAMPLER_PATTERNS) {
      const match = pattern.exec(text);
      if (match) {
        params.sampler = match[1];
        break;
      }
    }
    
    // Extract seed
    for (const pattern of SEED_PATTERNS) {
      const match = pattern.exec(text);
      if (match) {
        if (match[0].includes('random')) {
          params.seed = -1;
        } else {
          params.seed = parseInt(match[1]);
        }
        break;
      }
    }
    
    // Set defaults if not specified
    if (!params.width || !params.height) {
      params.width = 512;
      params.height = 512;
    }
    if (!params.steps) params.steps = 20;
    if (!params.cfg) params.cfg = 8.0;
    if (!params.sampler) params.sampler = 'euler';
    if (params.seed === undefined) params.seed = -1;
    
    return params;
  }
  
  private extractUpscaleParams(text: string): Record<string, unknown> {
    const params: Record<string, unknown> = {};
    
    // Extract upscale factor
    for (const pattern of UPSCALE_FACTOR_PATTERNS) {
      const match = pattern.exec(text);
      if (match) {
        params.factor = parseFloat(match[1]);
        break;
      }
    }
    
    if (!params.factor) {
      params.factor = 2.0; // Default upscale factor
    }
    
    // Determine upscale method
    if (text.toLowerCase().includes('ai') || text.toLowerCase().includes('model')) {
      params.method = 'model';
      params.model = 'RealESRGAN_x4plus.pth'; // Default upscale model
    } else {
      params.method = 'latent';
      params.algorithm = 'nearest-exact';
    }
    
    return params;
  }
  
  private extractEffectParams(text: string): EffectParams {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('film grain') || lowerText.includes('grain')) {
      return {
        type: 'grain',
        strength: this.extractStrength(text) || 0.5
      };
    }
    
    if (lowerText.includes('blur')) {
      return {
        type: 'blur',
        strength: this.extractStrength(text) || 1.0
      };
    }
    
    if (lowerText.includes('sharpen')) {
      return {
        type: 'sharpen',
        strength: this.extractStrength(text) || 1.0
      };
    }
    
    if (lowerText.includes('vintage') || lowerText.includes('sepia')) {
      return {
        type: 'vintage',
        strength: this.extractStrength(text) || 0.7
      };
    }
    
    if (lowerText.includes('black and white') || lowerText.includes('monochrome')) {
      return {
        type: 'monochrome',
        strength: 1.0
      };
    }
    
    return {
      type: 'custom',
      strength: this.extractStrength(text) || 0.5
    };
  }
  
  private extractControlNetParams(text: string): Record<string, unknown> {
    const params: Record<string, unknown> = {};
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('pose') || lowerText.includes('openpose')) {
      params.type = 'openpose';
    } else if (lowerText.includes('depth')) {
      params.type = 'depth';
    } else if (lowerText.includes('canny') || lowerText.includes('edge')) {
      params.type = 'canny';
    } else if (lowerText.includes('scribble')) {
      params.type = 'scribble';
    } else {
      params.type = 'canny'; // Default
    }
    
    params.strength = this.extractStrength(text) || 1.0;
    
    return params;
  }
  
  private extractLoRAParams(text: string): LoRAParams {
    const params: LoRAParams = {
      name: 'default.safetensors'
    };
    
    // Extract LoRA name and strength
    for (const pattern of LORA_PATTERNS) {
      const match = pattern.exec(text);
      if (match) {
        params.name = match[1];
        if (match[2]) {
          params.strength_model = parseFloat(match[2]);
          params.strength_clip = parseFloat(match[2]);
        }
        break;
      }
    }
    
    if (!params.strength_model) {
      params.strength_model = 1.0;
      params.strength_clip = 1.0;
    }
    
    return params;
  }
  
  private extractBlendParams(text: string): Record<string, unknown> {
    const params: Record<string, unknown> = {};
    
    const strengthMatch = text.match(/(?:blend|mix|opacity)\s*(?:at|by|with)?\s*([\d\.]+)%?/i);
    if (strengthMatch) {
      let strength = parseFloat(strengthMatch[1]);
      if (strength > 1) strength = strength / 100; // Convert percentage
      params.blend_factor = strength;
    } else {
      params.blend_factor = 0.5;
    }
    
    // Determine blend mode
    const lowerText = text.toLowerCase();
    if (lowerText.includes('multiply')) params.blend_mode = 'multiply';
    else if (lowerText.includes('screen')) params.blend_mode = 'screen';
    else if (lowerText.includes('overlay')) params.blend_mode = 'overlay';
    else if (lowerText.includes('soft light')) params.blend_mode = 'soft_light';
    else if (lowerText.includes('hard light')) params.blend_mode = 'hard_light';
    else params.blend_mode = 'normal';
    
    return params;
  }
  
  private extractStrength(text: string): number | null {
    const strengthMatch = text.match(/(?:strength|intensity|amount)\s*(?:of|at)?\s*([\d\.]+)/i);
    if (strengthMatch) {
      return parseFloat(strengthMatch[1]);
    }
    return null;
  }
  
  // Extract the main subject/prompt from the description
  extractPrompt(description: string): { positive: string; negative: string } {
    // Remove workflow instructions and keep the artistic description
    const cleanDescription = description
      .replace(/(?:then|next|after|and then)\s+.*/gi, '')
      .replace(/(?:upscale|enlarge|bigger).*/gi, '')
      .replace(/(?:add|apply)\s+(?:film grain|grain|effect).*/gi, '')
      .trim();
    
    // Default negative prompt
    const defaultNegative = 'low quality, blurry, distorted, watermark, signature, text, bad anatomy, worst quality';
    
    return {
      positive: cleanDescription || 'beautiful artwork, high quality, detailed',
      negative: defaultNegative
    };
  }
}
// LLM Command Parsing Types

export interface LLMConfig {
  model: string;
  baseUrl: string;
  timeout: number;
  confidenceThreshold: number;
  maxRetries: number;
}

export interface Intent {
  primary_action: 'generate' | 'upscale' | 'effect' | 'controlnet' | 'lora' | 'blend';
  description: string;
  confidence: number;
}

export interface LLMWorkflowStep {
  action: string;
  parameters: Record<string, unknown>;
  dependencies: string[];
  confidence: number;
  reasoning?: string;
}

export interface ExtractedContext {
  style?: string;
  quality?: string;
  subject?: string;
  image_type?: string;
  aspect_ratio?: string;
  technical_keywords?: string[];
  creative_keywords?: string[];
}

export interface LLMParseResult {
  intent: Intent;
  workflow_steps: LLMWorkflowStep[];
  extracted_context: ExtractedContext;
  suggestions?: string[];
}

export interface LLMCommandParserResult {
  result: LLMParseResult;
  confidence: number;
  processingTime: number;
  fallbackUsed: boolean;
  rawLLMOutput?: string;
  errors?: string[];
}

export interface OllamaResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface LLMCommandParser {
  parseCommand(description: string): Promise<LLMCommandParserResult>;
  isAvailable(): Promise<boolean>;
  getConfidenceThreshold(): number;
  setModel(modelName: string): void;
  validateOutput(result: LLMParseResult): boolean;
}

// JSON Schema for structured output validation
export const LLM_OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    intent: {
      type: "object",
      properties: {
        primary_action: {
          type: "string",
          enum: ["generate", "upscale", "effect", "controlnet", "lora", "blend"]
        },
        description: { type: "string" },
        confidence: { type: "number", minimum: 0, maximum: 1 }
      },
      required: ["primary_action", "description", "confidence"]
    },
    workflow_steps: {
      type: "array",
      items: {
        type: "object",
        properties: {
          action: { type: "string" },
          parameters: { type: "object" },
          dependencies: { type: "array", items: { type: "string" } },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          reasoning: { type: "string" }
        },
        required: ["action", "parameters", "dependencies", "confidence"]
      }
    },
    extracted_context: {
      type: "object",
      properties: {
        style: { type: "string" },
        quality: { type: "string" },
        subject: { type: "string" },
        image_type: { type: "string" },
        aspect_ratio: { type: "string" },
        technical_keywords: { type: "array", items: { type: "string" } },
        creative_keywords: { type: "array", items: { type: "string" } }
      }
    },
    suggestions: {
      type: "array",
      items: { type: "string" }
    }
  },
  required: ["intent", "workflow_steps", "extracted_context"]
} as const;

// Few-shot examples for prompt engineering
export const FEW_SHOT_EXAMPLES = [
  {
    input: "Generate a fantasy landscape with a castle using euler sampler with 25 steps, then upscale it 2x",
    output: {
      intent: {
        primary_action: "generate",
        description: "Generate a fantasy landscape with a castle, followed by upscaling",
        confidence: 0.95
      },
      workflow_steps: [
        {
          action: "generate",
          parameters: {
            prompt: "fantasy landscape with castle",
            sampler: "euler",
            steps: 25,
            style: "fantasy"
          },
          dependencies: [],
          confidence: 0.9,
          reasoning: "Primary generation step with explicit sampler and steps"
        },
        {
          action: "upscale",
          parameters: {
            factor: 2,
            method: "model"
          },
          dependencies: ["step_0"],
          confidence: 0.95,
          reasoning: "Clear upscaling request with 2x factor"
        }
      ],
      extracted_context: {
        style: "fantasy",
        quality: "standard",
        subject: "landscape with castle",
        image_type: "landscape",
        aspect_ratio: "16:9",
        technical_keywords: ["euler", "25 steps", "upscale", "2x"],
        creative_keywords: ["fantasy", "landscape", "castle"]
      },
      suggestions: [
        "Consider using DreamShaper model for fantasy scenes",
        "Add film grain effect for more atmospheric feel"
      ]
    }
  },
  {
    input: "Create a realistic portrait of a woman with professional photography style",
    output: {
      intent: {
        primary_action: "generate",
        description: "Generate a realistic portrait with professional photography style",
        confidence: 0.9
      },
      workflow_steps: [
        {
          action: "generate",
          parameters: {
            prompt: "realistic portrait of woman, professional photography",
            style: "realistic",
            aspect_ratio: "3:4",
            quality: "high"
          },
          dependencies: [],
          confidence: 0.9,
          reasoning: "Portrait generation with realistic style emphasis"
        }
      ],
      extracted_context: {
        style: "realistic",
        quality: "high",
        subject: "woman portrait",
        image_type: "portrait",
        aspect_ratio: "3:4",
        technical_keywords: ["realistic", "professional"],
        creative_keywords: ["portrait", "woman", "photography"]
      },
      suggestions: [
        "Use EpicRealism model for high-quality portraits",
        "Consider adding face enhancer LoRA for better detail"
      ]
    }
  },
  {
    input: "Make an anime character with blue hair and add watercolor effect",
    output: {
      intent: {
        primary_action: "generate",
        description: "Generate anime character with blue hair and apply watercolor effect",
        confidence: 0.85
      },
      workflow_steps: [
        {
          action: "generate",
          parameters: {
            prompt: "anime character with blue hair",
            style: "anime"
          },
          dependencies: [],
          confidence: 0.9,
          reasoning: "Anime character generation with specific hair color"
        },
        {
          action: "lora",
          parameters: {
            name: "watercolor_v1.safetensors",
            strength: 0.8
          },
          dependencies: ["step_0"],
          confidence: 0.8,
          reasoning: "Apply watercolor style effect as requested"
        }
      ],
      extracted_context: {
        style: "anime",
        quality: "standard",
        subject: "character with blue hair",
        image_type: "character",
        aspect_ratio: "3:4",
        technical_keywords: ["watercolor", "effect"],
        creative_keywords: ["anime", "character", "blue hair"]
      },
      suggestions: [
        "MeinaMix model works well for anime characters",
        "Consider anime style LoRA for enhanced character features"
      ]
    }
  }
] as const;
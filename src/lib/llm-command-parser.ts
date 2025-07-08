// LLM Command Parser - Core integration with Ollama for sophisticated command parsing

import {
  LLMConfig,
  LLMCommandParser,
  LLMCommandParserResult,
  LLMParseResult,
  OllamaResponse,
  LLM_OUTPUT_SCHEMA,
  FEW_SHOT_EXAMPLES
} from './llm-types';

export class OllamaCommandParser implements LLMCommandParser {
  private config: LLMConfig = {
    model: 'qwen2.5-coder:7b',
    baseUrl: 'http://localhost:11434',
    timeout: 30000,
    confidenceThreshold: 0.6,
    maxRetries: 2
  };

  constructor(config?: Partial<LLMConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  async parseCommand(description: string): Promise<LLMCommandParserResult> {
    const startTime = Date.now();
    
    try {
      // Check if Ollama is available
      const isOllamaAvailable = await this.isAvailable();
      if (!isOllamaAvailable) {
        return {
          result: this.createEmptyResult(),
          confidence: 0,
          processingTime: Date.now() - startTime,
          fallbackUsed: true,
          errors: ['Ollama service not available']
        };
      }

      // Generate the prompt
      const prompt = this.createPrompt(description);
      
      // Make request to Ollama with structured output
      const response = await this.makeOllamaRequest(prompt);
      
      // Parse and validate the response
      const parseResult = this.parseAndValidateResponse(response);
      
      // Calculate overall confidence
      const confidence = this.calculateOverallConfidence(parseResult);
      
      const processingTime = Date.now() - startTime;
      
      return {
        result: parseResult,
        confidence,
        processingTime,
        fallbackUsed: confidence < this.config.confidenceThreshold,
        rawLLMOutput: response.message.content
      };
      
    } catch (error) {
      console.error('LLM parsing error:', error);
      
      return {
        result: this.createEmptyResult(),
        confidence: 0,
        processingTime: Date.now() - startTime,
        fallbackUsed: true,
        errors: [error instanceof Error ? error.message : 'Unknown LLM error']
      };
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/version`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  getConfidenceThreshold(): number {
    return this.config.confidenceThreshold;
  }

  setModel(modelName: string): void {
    this.config.model = modelName;
  }

  validateOutput(result: LLMParseResult): boolean {
    return this.validateAgainstSchema(result, LLM_OUTPUT_SCHEMA);
  }

  private createPrompt(description: string): string {
    const systemPrompt = `You are an expert ComfyUI workflow parsing assistant. Your task is to analyze natural language descriptions of image generation workflows and convert them into structured workflow steps.

CAPABILITIES:
- Parse complex natural language descriptions
- Extract technical parameters (models, samplers, steps, CFG, etc.)
- Identify workflow sequences and dependencies
- Suggest optimal parameters and improvements

OUTPUT FORMAT:
Always respond with valid JSON following the provided schema. Include confidence scores for each step.

WORKFLOW ACTIONS:
- generate: Create images using text-to-image models
- upscale: Increase image resolution using AI upscaling
- effect: Apply post-processing effects (blur, grain, etc.)
- controlnet: Use ControlNet for guided generation
- lora: Apply LoRA models for style/character modifications
- blend: Combine multiple images

PARAMETER GUIDELINES:
- steps: Typically 15-50 (20-30 is standard)
- cfg: Usually 6-12 (7-8 is standard)
- samplers: euler, euler_a, dpm++_2m, dpm++_sde, ddim
- aspect_ratios: 1:1, 3:4, 4:3, 16:9, 9:16, 4:5
- styles: realistic, anime, fantasy, cyberpunk, vintage, artistic
- quality: draft, standard, high, ultra

EXAMPLES:
${FEW_SHOT_EXAMPLES.map(example => 
  `Input: "${example.input}"\nOutput: ${JSON.stringify(example.output, null, 2)}`
).join('\n\n')}

Remember:
- Always provide confidence scores (0.0-1.0)
- Include reasoning for each step
- Extract both technical and creative keywords
- Suggest improvements when applicable
- Ensure proper dependency chains between steps`;

    const userPrompt = `Parse this ComfyUI workflow description into structured steps:

"${description}"

Respond with valid JSON only, following the schema exactly.`;

    return `${systemPrompt}\n\n${userPrompt}`;
  }

  private async makeOllamaRequest(prompt: string): Promise<OllamaResponse> {
    const requestBody = {
      model: this.config.model,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      stream: false,
      format: LLM_OUTPUT_SCHEMA,
      options: {
        temperature: 0.1, // Low temperature for more deterministic output
        top_p: 0.9,
        top_k: 40
      }
    };

    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        const response = await fetch(`${this.config.baseUrl}/api/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: AbortSignal.timeout(this.config.timeout)
        });

        if (!response.ok) {
          throw new Error(`Ollama request failed: ${response.status} ${response.statusText}`);
        }

        const data: OllamaResponse = await response.json();
        
        if (!data.message?.content) {
          throw new Error('Invalid response format from Ollama');
        }

        return data;
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        console.warn(`Ollama request attempt ${attempt + 1} failed:`, lastError.message);
        
        if (attempt < this.config.maxRetries - 1) {
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    throw lastError || new Error('All Ollama request attempts failed');
  }

  private parseAndValidateResponse(response: OllamaResponse): LLMParseResult {
    try {
      const content = response.message.content.trim();
      
      // Try to extract JSON if wrapped in code blocks
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const jsonString = jsonMatch ? jsonMatch[1] : content;
      
      const parsed = JSON.parse(jsonString);
      
      // Validate against schema
      if (!this.validateAgainstSchema(parsed)) {
        throw new Error('Response does not match required schema');
      }
      
      return parsed as LLMParseResult;
      
    } catch (error) {
      console.error('Failed to parse LLM response:', error);
      throw new Error(`Invalid JSON response: ${error instanceof Error ? error.message : 'Unknown parsing error'}`);
    }
  }

  private validateAgainstSchema(data: unknown): boolean {
    // Basic schema validation - in production, use a proper JSON schema validator
    try {
      const obj = data as LLMParseResult;
      
      // Check required top-level properties
      if (!obj.intent || !obj.workflow_steps || !obj.extracted_context) {
        return false;
      }
      
      // Validate intent
      if (!obj.intent.primary_action || !obj.intent.description || 
          typeof obj.intent.confidence !== 'number') {
        return false;
      }
      
      // Validate workflow steps
      if (!Array.isArray(obj.workflow_steps)) {
        return false;
      }
      
      for (const step of obj.workflow_steps) {
        if (!step.action || !step.parameters || !Array.isArray(step.dependencies) ||
            typeof step.confidence !== 'number') {
          return false;
        }
      }
      
      // Validate extracted context is an object
      if (typeof obj.extracted_context !== 'object' || obj.extracted_context === null) {
        return false;
      }
      
      return true;
      
    } catch {
      return false;
    }
  }

  private calculateOverallConfidence(result: LLMParseResult): number {
    if (!result.workflow_steps.length) {
      return 0;
    }
    
    // Combine intent confidence with average step confidence
    const stepConfidences = result.workflow_steps.map(step => step.confidence);
    const avgStepConfidence = stepConfidences.reduce((sum, conf) => sum + conf, 0) / stepConfidences.length;
    
    // Weight intent confidence higher than step confidence
    return (result.intent.confidence * 0.6) + (avgStepConfidence * 0.4);
  }

  private createEmptyResult(): LLMParseResult {
    return {
      intent: {
        primary_action: 'generate',
        description: 'Failed to parse command',
        confidence: 0
      },
      workflow_steps: [],
      extracted_context: {},
      suggestions: ['Please try rephrasing your request or check if Ollama is running']
    };
  }
}

// Factory function for creating parser instances
export function createLLMCommandParser(config?: Partial<LLMConfig>): LLMCommandParser {
  return new OllamaCommandParser(config);
}

// Utility function to check if LLM parsing is available
export async function isLLMParsingAvailable(baseUrl = 'http://localhost:11434'): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/api/version`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    return response.ok;
  } catch {
    return false;
  }
}

// Utility function to list available models
export async function getAvailableModels(baseUrl = 'http://localhost:11434'): Promise<string[]> {
  try {
    const response = await fetch(`${baseUrl}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status}`);
    }
    
    const data = await response.json();
    return data.models?.map((model: { name: string }) => model.name) || [];
    
  } catch (error) {
    console.error('Failed to fetch available models:', error);
    return [];
  }
}
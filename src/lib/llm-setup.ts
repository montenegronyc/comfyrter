// LLM Setup and Model Management Utilities

import { isLLMParsingAvailable } from './llm-command-parser';
import { isHuggingFaceAvailable } from './env';

export interface ModelInfo {
  name: string;
  size: string;
  description: string;
  recommended: boolean;
  parameters?: string;
  memoryRequirement?: string;
}

export interface SetupStatus {
  huggingFaceAvailable: boolean;
  modelAvailable: boolean;
  recommendedModel?: string;
  availableModels: string[];
  apiTokenConfigured?: boolean;
  errors: string[];
  suggestions: string[];
}

// Recommended Hugging Face models for command parsing
export const RECOMMENDED_MODELS: ModelInfo[] = [
  {
    name: 'microsoft/DialoGPT-medium',
    size: 'API',
    description: 'Microsoft DialoGPT Medium - Fast and reliable for parsing tasks',
    recommended: true,
    parameters: '345 million',
    memoryRequirement: 'Hosted on Hugging Face'
  },
  {
    name: 'meta-llama/Llama-2-7b-chat-hf',
    size: 'API',
    description: 'Llama 2 7B Chat - High quality instruction following',
    recommended: true,
    parameters: '7 billion',
    memoryRequirement: 'Hosted on Hugging Face'
  },
  {
    name: 'mistralai/Mistral-7B-Instruct-v0.1',
    size: 'API',
    description: 'Mistral 7B Instruct - Good balance of speed and accuracy',
    recommended: true,
    parameters: '7 billion',
    memoryRequirement: 'Hosted on Hugging Face'
  }
];

export class LLMSetupManager {
  private baseUrl: string;

  constructor(baseUrl = 'https://api-inference.huggingface.co/models') {
    this.baseUrl = baseUrl;
  }

  async checkSetupStatus(): Promise<SetupStatus> {
    const status: SetupStatus = {
      huggingFaceAvailable: false,
      modelAvailable: false,
      availableModels: [],
      apiTokenConfigured: false,
      errors: [],
      suggestions: []
    };

    try {
      // Check if Hugging Face API token is configured
      const hasToken = isHuggingFaceAvailable();
      status.apiTokenConfigured = hasToken;
      
      if (!hasToken) {
        status.errors.push('Hugging Face API token not configured');
        status.suggestions.push('Add HUGGINGFACE_API_TOKEN to your environment variables');
        status.suggestions.push('Get a free token from https://huggingface.co/settings/tokens');
        return status;
      }

      // Check if Hugging Face API is available
      status.huggingFaceAvailable = await isLLMParsingAvailable();
      
      if (!status.huggingFaceAvailable) {
        status.errors.push('Hugging Face API is not accessible');
        status.suggestions.push('Check your internet connection');
        status.suggestions.push('Verify your API token is valid');
        return status;
      }

      // Set available models (Hugging Face models are always "available" via API)
      status.availableModels = RECOMMENDED_MODELS.map(model => model.name);
      status.modelAvailable = true;
      status.recommendedModel = RECOMMENDED_MODELS.find(m => m.recommended)?.name;

      // No memory requirements for API-based models
      // Hugging Face handles all the infrastructure

    } catch (error) {
      status.errors.push(`Setup check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return status;
  }

  findBestAvailableModel(): string | null {
    // For Hugging Face, we always have access to the models via API
    // Return the first recommended model
    const recommendedModel = RECOMMENDED_MODELS.find(m => m.recommended);
    return recommendedModel ? recommendedModel.name : null;
  }

  async pullModel(modelName: string): Promise<{ success: boolean; error?: string }> {
    // For Hugging Face, models are always available via API
    // No "pulling" required, just verify the model exists
    try {
      const validModels = RECOMMENDED_MODELS.map(m => m.name);
      if (validModels.includes(modelName)) {
        return { success: true };
      } else {
        return {
          success: false,
          error: `Model ${modelName} is not in our recommended list`
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async deleteModel(modelName: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: modelName })
      });

      if (!response.ok) {
        throw new Error(`Failed to delete model: ${response.status} ${response.statusText}`);
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  generateSetupInstructions(): string[] {
    return [
      '# LLM Setup Instructions for Enhanced Command Parsing',
      '',
      '## 1. Get Hugging Face API Token',
      'Visit https://huggingface.co/settings/tokens and create a new token with "Read" permissions.',
      '',
      '## 2. Configure Environment Variable',
      'Add your token to your environment:',
      '```bash',
      'export HUGGINGFACE_API_TOKEN=your_token_here',
      '```',
      '',
      '## 3. Recommended Models',
      'The following models are available via API:',
      '- microsoft/DialoGPT-medium: Microsoft DialoGPT Medium - Fast and reliable for parsing tasks',
      '- meta-llama/Llama-2-7b-chat-hf: Llama 2 7B Chat - High quality instruction following',
      '- mistralai/Mistral-7B-Instruct-v0.1: Mistral 7B Instruct - Good balance of speed and accuracy',
      '',
      '## 4. Verify Setup',
      'The comfyrter app will automatically detect when LLM parsing is available.',
      '',
      '## Features',
      '- **Free Tier**: 20,000 requests/month on Hugging Face',
      '- **No Local Installation**: Everything runs via API',
      '- **Multiple Models**: Choose from various open-source models',
      '',
      '## Troubleshooting',
      '- Verify your API token is valid',
      '- Check internet connectivity',
      '- Ensure token has proper permissions'
    ];
  }

  async generateSystemReport(): Promise<string> {
    const status = await this.checkSetupStatus();
    
    const report = [
      '# LLM System Status Report',
      `Generated: ${new Date().toISOString()}`,
      '',
      '## Hugging Face Status',
      `- API Available: ${status.huggingFaceAvailable ? '✅' : '❌'}`,
      `- Token Configured: ${status.apiTokenConfigured ? '✅' : '❌'}`,
      '',
      '## Models',
      `- Model available: ${status.modelAvailable ? '✅' : '❌'}`,
      `- Recommended model: ${status.recommendedModel || 'None'}`,
      `- Available models: ${status.availableModels.length}`,
      ''
    ];

    if (status.availableModels.length > 0) {
      report.push('### Available Models:');
      status.availableModels.forEach(model => {
        const modelInfo = RECOMMENDED_MODELS.find(rec => rec.name === model);
        report.push(`- ${model} ${modelInfo?.recommended ? '(Recommended)' : ''}`);
      });
      report.push('');
    }

    report.push('## System Features');
    report.push('- No local installation required');
    report.push('- Free tier: 20,000 requests/month');
    report.push('- Multiple model options available');
    report.push('');

    if (status.errors.length > 0) {
      report.push('## Issues Found');
      status.errors.forEach(error => report.push(`- ❌ ${error}`));
      report.push('');
    }

    if (status.suggestions.length > 0) {
      report.push('## Suggestions');
      status.suggestions.forEach(suggestion => report.push(`- 💡 ${suggestion}`));
      report.push('');
    }

    return report.join('\n');
  }
}

// Utility functions
export async function quickSetupCheck(): Promise<boolean> {
  const manager = new LLMSetupManager();
  const status = await manager.checkSetupStatus();
  return status.huggingFaceAvailable && status.modelAvailable;
}

export function getSystemRequirements(modelName?: string): string {
  const model = RECOMMENDED_MODELS.find(m => m.name === modelName) || RECOMMENDED_MODELS[0];
  return `For ${model.name}: ${model.memoryRequirement}`;
}

export function getBestModelForSystem(): ModelInfo {
  // For Hugging Face API, we recommend the most balanced model
  return RECOMMENDED_MODELS.find(m => m.recommended) || RECOMMENDED_MODELS[0];
}
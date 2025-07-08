// LLM Setup and Model Management Utilities

import { getAvailableModels, isLLMParsingAvailable } from './llm-command-parser';

export interface ModelInfo {
  name: string;
  size: string;
  description: string;
  recommended: boolean;
  parameters?: string;
  memoryRequirement?: string;
}

export interface SetupStatus {
  ollamaInstalled: boolean;
  modelAvailable: boolean;
  recommendedModel?: string;
  availableModels: string[];
  memoryAvailable?: number;
  errors: string[];
  suggestions: string[];
}

// Recommended models for command parsing
export const RECOMMENDED_MODELS: ModelInfo[] = [
  {
    name: 'qwen2.5-coder:7b',
    size: '4.2GB',
    description: 'Qwen 2.5 Coder 7B - Best balance of performance and speed for command parsing',
    recommended: true,
    parameters: '7 billion',
    memoryRequirement: '8GB RAM minimum'
  },
  {
    name: 'qwen2.5-coder:14b',
    size: '8.2GB', 
    description: 'Qwen 2.5 Coder 14B - Higher accuracy for complex parsing tasks',
    recommended: true,
    parameters: '14 billion',
    memoryRequirement: '16GB RAM minimum'
  },
  {
    name: 'qwen2.5-coder:3b',
    size: '2.0GB',
    description: 'Qwen 2.5 Coder 3B - Lightweight option for basic parsing',
    recommended: false,
    parameters: '3 billion',
    memoryRequirement: '4GB RAM minimum'
  },
  {
    name: 'llama3.2:3b',
    size: '2.0GB',
    description: 'Llama 3.2 3B - Alternative lightweight model',
    recommended: false,
    parameters: '3 billion',
    memoryRequirement: '4GB RAM minimum'
  }
];

export class LLMSetupManager {
  private baseUrl: string;

  constructor(baseUrl = 'http://localhost:11434') {
    this.baseUrl = baseUrl;
  }

  async checkSetupStatus(): Promise<SetupStatus> {
    const status: SetupStatus = {
      ollamaInstalled: false,
      modelAvailable: false,
      availableModels: [],
      errors: [],
      suggestions: []
    };

    try {
      // Check if Ollama is running
      status.ollamaInstalled = await isLLMParsingAvailable(this.baseUrl);
      
      if (!status.ollamaInstalled) {
        status.errors.push('Ollama is not running or not installed');
        status.suggestions.push('Install Ollama from https://ollama.ai');
        status.suggestions.push('Run "ollama serve" to start the service');
        return status;
      }

      // Get available models
      status.availableModels = await getAvailableModels(this.baseUrl);
      
      // Check if recommended model is available
      const recommendedModel = this.findBestAvailableModel(status.availableModels);
      if (recommendedModel) {
        status.modelAvailable = true;
        status.recommendedModel = recommendedModel;
      } else {
        status.errors.push('No recommended models are installed');
        status.suggestions.push('Install a recommended model with: ollama pull qwen2.5-coder:7b');
      }

      // Check system memory (if possible)
      if (typeof navigator !== 'undefined' && 'deviceMemory' in navigator) {
        status.memoryAvailable = (navigator as Navigator & { deviceMemory?: number }).deviceMemory! * 1024; // Convert GB to MB
      }

    } catch (error) {
      status.errors.push(`Setup check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return status;
  }

  findBestAvailableModel(availableModels: string[]): string | null {
    // Find the best recommended model that's available
    for (const model of RECOMMENDED_MODELS.filter(m => m.recommended)) {
      if (availableModels.some(available => available.includes(model.name))) {
        return model.name;
      }
    }

    // Fallback to any available recommended model
    for (const model of RECOMMENDED_MODELS) {
      if (availableModels.some(available => available.includes(model.name))) {
        return model.name;
      }
    }

    return null;
  }

  async pullModel(modelName: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/pull`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: modelName })
      });

      if (!response.ok) {
        throw new Error(`Failed to pull model: ${response.status} ${response.statusText}`);
      }

      return { success: true };
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
      '## 1. Install Ollama',
      'Visit https://ollama.ai and download the installer for your platform.',
      '',
      '## 2. Start Ollama Service',
      '```bash',
      'ollama serve',
      '```',
      '',
      '## 3. Install Recommended Model',
      '```bash',
      '# For best performance (requires 8GB+ RAM)',
      'ollama pull qwen2.5-coder:7b',
      '',
      '# For lower memory systems (requires 4GB+ RAM)',
      'ollama pull qwen2.5-coder:3b',
      '```',
      '',
      '## 4. Verify Setup',
      'The comfyrter app will automatically detect when LLM parsing is available.',
      '',
      '## System Requirements',
      '- **Minimum**: 4GB RAM (for 3B models)',
      '- **Recommended**: 8GB+ RAM (for 7B models)',
      '- **Optional**: GPU acceleration for faster inference',
      '',
      '## Troubleshooting',
      '- Ensure Ollama is running: `ollama list`',
      '- Check model status: `ollama show qwen2.5-coder:7b`',
      '- Restart Ollama if needed: `ollama serve`'
    ];
  }

  async generateSystemReport(): Promise<string> {
    const status = await this.checkSetupStatus();
    
    const report = [
      '# LLM System Status Report',
      `Generated: ${new Date().toISOString()}`,
      '',
      '## Ollama Status',
      `- Installed: ${status.ollamaInstalled ? '✅' : '❌'}`,
      `- Service URL: ${this.baseUrl}`,
      '',
      '## Models',
      `- Recommended model available: ${status.modelAvailable ? '✅' : '❌'}`,
      `- Best available model: ${status.recommendedModel || 'None'}`,
      `- Total models installed: ${status.availableModels.length}`,
      ''
    ];

    if (status.availableModels.length > 0) {
      report.push('### Installed Models:');
      status.availableModels.forEach(model => {
        const isRecommended = RECOMMENDED_MODELS.some(rec => model.includes(rec.name));
        report.push(`- ${model} ${isRecommended ? '(Recommended)' : ''}`);
      });
      report.push('');
    }

    if (status.memoryAvailable) {
      report.push('## System Resources');
      report.push(`- Available memory: ${Math.round(status.memoryAvailable / 1024)}GB`);
      report.push('');
    }

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
  return status.ollamaInstalled && status.modelAvailable;
}

export function getSystemRequirements(modelName?: string): string {
  const model = RECOMMENDED_MODELS.find(m => m.name === modelName) || RECOMMENDED_MODELS[0];
  return `For ${model.name}: ${model.memoryRequirement}`;
}

export function getBestModelForSystem(availableMemoryGB?: number): ModelInfo {
  if (!availableMemoryGB) {
    return RECOMMENDED_MODELS[0]; // Default to 7B model
  }

  if (availableMemoryGB >= 16) {
    return RECOMMENDED_MODELS.find(m => m.name.includes('14b')) || RECOMMENDED_MODELS[0];
  } else if (availableMemoryGB >= 8) {
    return RECOMMENDED_MODELS.find(m => m.name.includes('7b')) || RECOMMENDED_MODELS[0];
  } else {
    return RECOMMENDED_MODELS.find(m => m.name.includes('3b')) || RECOMMENDED_MODELS[2];
  }
}
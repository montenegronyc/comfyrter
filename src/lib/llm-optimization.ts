// LLM Parser Performance Optimization

import { LLMConfig } from './llm-types'
import { HybridParserConfig } from './hybrid-workflow-parser'

export interface SystemSpecs {
  totalRAM?: number // in GB
  hasGPU?: boolean
  cpuCores?: number
  platform?: 'windows' | 'macos' | 'linux'
}

export interface OptimizationProfile {
  name: string
  description: string
  llmConfig: Partial<LLMConfig>
  hybridConfig: Partial<HybridParserConfig>
  recommendedModel: string
  expectedPerformance: {
    averageParsingTime: number // in ms
    memoryUsage: number // in MB
    accuracyScore: number // 0-1
  }
}

export const OPTIMIZATION_PROFILES: Record<string, OptimizationProfile> = {
  'performance': {
    name: 'High Performance',
    description: 'Optimized for speed and low latency',
    llmConfig: {
      model: 'qwen2.5-coder:3b',
      timeout: 15000,
      confidenceThreshold: 0.5,
      maxRetries: 1
    },
    hybridConfig: {
      confidenceThreshold: 0.5,
      timeoutMs: 15000,
      enableFallback: true
    },
    recommendedModel: 'qwen2.5-coder:3b',
    expectedPerformance: {
      averageParsingTime: 800,
      memoryUsage: 2048,
      accuracyScore: 0.8
    }
  },

  'balanced': {
    name: 'Balanced',
    description: 'Good balance of speed and accuracy',
    llmConfig: {
      model: 'qwen2.5-coder:7b',
      timeout: 25000,
      confidenceThreshold: 0.6,
      maxRetries: 2
    },
    hybridConfig: {
      confidenceThreshold: 0.6,
      timeoutMs: 25000,
      enableFallback: true
    },
    recommendedModel: 'qwen2.5-coder:7b',
    expectedPerformance: {
      averageParsingTime: 1500,
      memoryUsage: 4096,
      accuracyScore: 0.9
    }
  },

  'accuracy': {
    name: 'High Accuracy',
    description: 'Optimized for best parsing accuracy',
    llmConfig: {
      model: 'qwen2.5-coder:14b',
      timeout: 40000,
      confidenceThreshold: 0.7,
      maxRetries: 3
    },
    hybridConfig: {
      confidenceThreshold: 0.7,
      timeoutMs: 40000,
      enableFallback: true
    },
    recommendedModel: 'qwen2.5-coder:14b',
    expectedPerformance: {
      averageParsingTime: 3000,
      memoryUsage: 8192,
      accuracyScore: 0.95
    }
  },

  'lightweight': {
    name: 'Lightweight',
    description: 'Minimal resource usage for low-spec systems',
    llmConfig: {
      model: 'llama3.2:3b',
      timeout: 20000,
      confidenceThreshold: 0.4,
      maxRetries: 1
    },
    hybridConfig: {
      confidenceThreshold: 0.4,
      timeoutMs: 20000,
      enableFallback: true
    },
    recommendedModel: 'llama3.2:3b',
    expectedPerformance: {
      averageParsingTime: 1200,
      memoryUsage: 1536,
      accuracyScore: 0.75
    }
  }
}

export class PerformanceOptimizer {
  static detectSystemSpecs(): SystemSpecs {
    const specs: SystemSpecs = {}

    // Detect platform
    if (typeof navigator !== 'undefined') {
      specs.platform = navigator.platform.toLowerCase().includes('win') ? 'windows' :
                      navigator.platform.toLowerCase().includes('mac') ? 'macos' : 'linux'
      
      // Detect memory if available
      if ('deviceMemory' in navigator) {
        specs.totalRAM = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
      }
      
      // Detect CPU cores
      if ('hardwareConcurrency' in navigator) {
        specs.cpuCores = navigator.hardwareConcurrency
      }
    }

    return specs
  }

  static recommendProfile(specs?: SystemSpecs): OptimizationProfile {
    const systemSpecs = specs || this.detectSystemSpecs()
    
    // Recommend based on available RAM
    if (systemSpecs.totalRAM) {
      if (systemSpecs.totalRAM >= 16) {
        return OPTIMIZATION_PROFILES.accuracy
      } else if (systemSpecs.totalRAM >= 8) {
        return OPTIMIZATION_PROFILES.balanced
      } else if (systemSpecs.totalRAM >= 4) {
        return OPTIMIZATION_PROFILES.performance
      } else {
        return OPTIMIZATION_PROFILES.lightweight
      }
    }

    // Default to balanced if we can't detect specs
    return OPTIMIZATION_PROFILES.balanced
  }

  static generateOptimizedConfig(
    profileName: keyof typeof OPTIMIZATION_PROFILES,
    customSpecs?: SystemSpecs
  ): { llmConfig: Partial<LLMConfig>; hybridConfig: Partial<HybridParserConfig> } {
    const profile = OPTIMIZATION_PROFILES[profileName]
    const specs = customSpecs || this.detectSystemSpecs()
    
    // Clone the profile configs
    const llmConfig = { ...profile.llmConfig }
    const hybridConfig = { ...profile.hybridConfig }
    
    // Apply system-specific optimizations
    if (specs.cpuCores && specs.cpuCores > 8) {
      // High-end CPU - can handle more parallel processing
      llmConfig.maxRetries = Math.min((llmConfig.maxRetries || 2) + 1, 4)
    }
    
    if (specs.platform === 'macos' && specs.hasGPU) {
      // macOS with Apple Silicon - typically faster
      llmConfig.timeout = Math.max((llmConfig.timeout || 25000) * 0.8, 10000)
      hybridConfig.timeoutMs = Math.max((hybridConfig.timeoutMs || 25000) * 0.8, 10000)
    }
    
    return { llmConfig, hybridConfig }
  }

  static async benchmarkModel(modelName: string, testQueries: string[] = []): Promise<{
    averageTime: number
    successRate: number
    memoryUsage?: number
    errors: string[]
  }> {
    const defaultQueries = [
      'Generate a simple landscape',
      'Create a portrait and upscale it',
      'Make an anime character with blue hair and add watercolor effect'
    ]
    
    const queries = testQueries.length > 0 ? testQueries : defaultQueries
    const results: { time: number; success: boolean; error?: string }[] = []
    
    // Import dynamically to avoid circular dependencies
    const { createLLMCommandParser } = await import('./llm-command-parser')
    const parser = createLLMCommandParser({ model: modelName })
    
    for (const query of queries) {
      const startTime = Date.now()
      
      try {
        const result = await parser.parseCommand(query)
        const endTime = Date.now()
        
        results.push({
          time: endTime - startTime,
          success: !result.fallbackUsed && result.confidence > 0.5
        })
      } catch (error) {
        const endTime = Date.now()
        results.push({
          time: endTime - startTime,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
    
    const successfulResults = results.filter(r => r.success)
    const averageTime = results.reduce((sum, r) => sum + r.time, 0) / results.length
    const successRate = successfulResults.length / results.length
    const errors = results.filter(r => r.error).map(r => r.error!)
    
    return {
      averageTime: Math.round(averageTime),
      successRate: Math.round(successRate * 100) / 100,
      errors
    }
  }

  static generateOptimizationReport(specs?: SystemSpecs): string {
    const systemSpecs = specs || this.detectSystemSpecs()
    const recommendedProfile = this.recommendProfile(systemSpecs)
    
    const reportLines = [
      '# LLM Parser Optimization Report',
      `Generated: ${new Date().toISOString()}`,
      '',
      '## System Specifications',
      `- Platform: ${systemSpecs.platform || 'Unknown'}`,
      `- Total RAM: ${systemSpecs.totalRAM ? systemSpecs.totalRAM + 'GB' : 'Unknown'}`,
      `- CPU Cores: ${systemSpecs.cpuCores || 'Unknown'}`,
      `- GPU Available: ${systemSpecs.hasGPU ? 'Yes' : 'Unknown'}`,
      '',
      '## Recommended Configuration',
      `**Profile**: ${recommendedProfile.name}`,
      `**Model**: ${recommendedProfile.recommendedModel}`,
      `**Description**: ${recommendedProfile.description}`,
      '',
      '### Expected Performance',
      `- Average Parsing Time: ${recommendedProfile.expectedPerformance.averageParsingTime}ms`,
      `- Memory Usage: ${Math.round(recommendedProfile.expectedPerformance.memoryUsage / 1024)}GB`,
      `- Accuracy Score: ${Math.round(recommendedProfile.expectedPerformance.accuracyScore * 100)}%`,
      '',
      '## Alternative Profiles'
    ]
    
    Object.entries(OPTIMIZATION_PROFILES).forEach(([, profile]) => {
      if (profile.name !== recommendedProfile.name) {
        reportLines.push(`### ${profile.name}`)
        reportLines.push(`- Model: ${profile.recommendedModel}`)
        reportLines.push(`- Description: ${profile.description}`)
        reportLines.push(`- Performance: ${profile.expectedPerformance.averageParsingTime}ms avg, ${Math.round(profile.expectedPerformance.accuracyScore * 100)}% accuracy`)
        reportLines.push('')
      }
    })
    
    reportLines.push('## Optimization Tips')
    
    if (!systemSpecs.totalRAM || systemSpecs.totalRAM < 8) {
      reportLines.push('- Consider upgrading RAM for better model performance')
    }
    
    if (systemSpecs.platform === 'windows') {
      reportLines.push('- Consider WSL2 for potentially better Ollama performance')
    }
    
    if (!systemSpecs.hasGPU) {
      reportLines.push('- GPU acceleration can significantly improve inference speed')
    }
    
    reportLines.push('- Close other memory-intensive applications during parsing')
    reportLines.push('- Use SSD storage for better model loading times')
    reportLines.push('- Monitor system temperature during extended use')
    
    return reportLines.join('\n')
  }
}

// Utility functions for common optimizations
export function optimizeForLatency(baseConfig: Partial<LLMConfig>): Partial<LLMConfig> {
  return {
    ...baseConfig,
    model: 'qwen2.5-coder:3b',
    timeout: 15000,
    maxRetries: 1,
    confidenceThreshold: 0.5
  }
}

export function optimizeForAccuracy(baseConfig: Partial<LLMConfig>): Partial<LLMConfig> {
  return {
    ...baseConfig,
    model: 'qwen2.5-coder:14b',
    timeout: 40000,
    maxRetries: 3,
    confidenceThreshold: 0.7
  }
}

export function optimizeForMemory(baseConfig: Partial<LLMConfig>): Partial<LLMConfig> {
  return {
    ...baseConfig,
    model: 'llama3.2:3b',
    timeout: 20000,
    maxRetries: 1,
    confidenceThreshold: 0.4
  }
}

// Performance monitoring utilities
export class PerformanceMonitor {
  private measurements: Array<{
    timestamp: number
    operation: string
    duration: number
    success: boolean
    modelUsed?: string
  }> = []

  recordMeasurement(operation: string, duration: number, success: boolean, modelUsed?: string) {
    this.measurements.push({
      timestamp: Date.now(),
      operation,
      duration,
      success,
      modelUsed
    })
    
    // Keep only last 100 measurements
    if (this.measurements.length > 100) {
      this.measurements.shift()
    }
  }

  getAveragePerformance(operation?: string): {
    averageDuration: number
    successRate: number
    totalMeasurements: number
  } {
    const filtered = operation 
      ? this.measurements.filter(m => m.operation === operation)
      : this.measurements
    
    if (filtered.length === 0) {
      return { averageDuration: 0, successRate: 0, totalMeasurements: 0 }
    }
    
    const averageDuration = filtered.reduce((sum, m) => sum + m.duration, 0) / filtered.length
    const successRate = filtered.filter(m => m.success).length / filtered.length
    
    return {
      averageDuration: Math.round(averageDuration),
      successRate: Math.round(successRate * 100) / 100,
      totalMeasurements: filtered.length
    }
  }

  generatePerformanceReport(): string {
    const overall = this.getAveragePerformance()
    const parseOp = this.getAveragePerformance('parse')
    
    return [
      '# Performance Report',
      `Generated: ${new Date().toISOString()}`,
      '',
      '## Overall Performance',
      `- Average Duration: ${overall.averageDuration}ms`,
      `- Success Rate: ${Math.round(overall.successRate * 100)}%`,
      `- Total Operations: ${overall.totalMeasurements}`,
      '',
      '## Parsing Operations',
      `- Average Parse Time: ${parseOp.averageDuration}ms`,
      `- Parse Success Rate: ${Math.round(parseOp.successRate * 100)}%`,
      `- Total Parses: ${parseOp.totalMeasurements}`
    ].join('\n')
  }

  clearMeasurements() {
    this.measurements = []
  }
}
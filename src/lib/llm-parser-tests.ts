// Comprehensive Test Scenarios for LLM Command Parsing

import { HybridWorkflowParser } from './hybrid-workflow-parser'
import { OllamaCommandParser } from './llm-command-parser'

export interface TestScenario {
  id: string
  name: string
  description: string
  input: string
  expectedOutputs: {
    primaryAction: string
    stepCount: number
    hasStyle?: string
    hasQuality?: string
    hasParameters?: string[]
    confidenceThreshold?: number
  }
  category: 'simple' | 'complex' | 'ambiguous' | 'technical' | 'creative'
  difficulty: 'easy' | 'medium' | 'hard'
}

export const TEST_SCENARIOS: TestScenario[] = [
  // Simple scenarios
  {
    id: 'simple-001',
    name: 'Basic Generation',
    description: 'Simple image generation request',
    input: 'Generate a cat sitting on a table',
    expectedOutputs: {
      primaryAction: 'generate',
      stepCount: 1,
      confidenceThreshold: 0.8
    },
    category: 'simple',
    difficulty: 'easy'
  },
  {
    id: 'simple-002',
    name: 'Basic Upscaling',
    description: 'Simple upscaling request',
    input: 'Create a landscape and upscale it 2x',
    expectedOutputs: {
      primaryAction: 'generate',
      stepCount: 2,
      confidenceThreshold: 0.7
    },
    category: 'simple',
    difficulty: 'easy'
  },
  {
    id: 'simple-003',
    name: 'Style Specification',
    description: 'Generation with explicit style',
    input: 'Generate an anime character with blue hair',
    expectedOutputs: {
      primaryAction: 'generate',
      stepCount: 1,
      hasStyle: 'anime',
      confidenceThreshold: 0.8
    },
    category: 'simple',
    difficulty: 'easy'
  },

  // Technical scenarios
  {
    id: 'tech-001',
    name: 'Technical Parameters',
    description: 'Request with specific technical parameters',
    input: 'Generate a portrait using euler sampler with 30 steps and CFG 7',
    expectedOutputs: {
      primaryAction: 'generate',
      stepCount: 1,
      hasParameters: ['euler', '30', '7'],
      confidenceThreshold: 0.9
    },
    category: 'technical',
    difficulty: 'medium'
  },
  {
    id: 'tech-002',
    name: 'Model Specification',
    description: 'Request with specific model',
    input: 'Create a realistic photo using realistic vision model with DPM++ 2M sampler',
    expectedOutputs: {
      primaryAction: 'generate',
      stepCount: 1,
      hasStyle: 'realistic',
      hasParameters: ['realistic vision', 'DPM++ 2M'],
      confidenceThreshold: 0.8
    },
    category: 'technical',
    difficulty: 'medium'
  },
  {
    id: 'tech-003',
    name: 'LoRA Application',
    description: 'Request with LoRA specification',
    input: 'Generate a character and apply watercolor LoRA at 0.8 strength',
    expectedOutputs: {
      primaryAction: 'generate',
      stepCount: 2,
      hasParameters: ['watercolor', '0.8'],
      confidenceThreshold: 0.7
    },
    category: 'technical',
    difficulty: 'medium'
  },

  // Complex scenarios
  {
    id: 'complex-001',
    name: 'Multi-step Workflow',
    description: 'Complex workflow with multiple steps',
    input: 'Create a fantasy landscape with a castle using dreamshaper model, then add film grain effect, and finally upscale it 2x with AI upscaling',
    expectedOutputs: {
      primaryAction: 'generate',
      stepCount: 3,
      hasStyle: 'fantasy',
      hasParameters: ['dreamshaper', 'film grain', '2x'],
      confidenceThreshold: 0.8
    },
    category: 'complex',
    difficulty: 'hard'
  },
  {
    id: 'complex-002',
    name: 'ControlNet Integration',
    description: 'Workflow with ControlNet usage',
    input: 'Generate a person in the same pose as reference image using openpose controlnet, then enhance the face and upscale',
    expectedOutputs: {
      primaryAction: 'generate',
      stepCount: 3,
      hasParameters: ['openpose', 'controlnet', 'face'],
      confidenceThreshold: 0.7
    },
    category: 'complex',
    difficulty: 'hard'
  },
  {
    id: 'complex-003',
    name: 'Style Transfer Chain',
    description: 'Multiple style applications',
    input: 'Start with a realistic portrait, apply anime style LoRA, then add vintage film effect, and finish with soft blur',
    expectedOutputs: {
      primaryAction: 'generate',
      stepCount: 4,
      hasStyle: 'realistic',
      hasParameters: ['anime', 'vintage', 'blur'],
      confidenceThreshold: 0.6
    },
    category: 'complex',
    difficulty: 'hard'
  },

  // Creative scenarios
  {
    id: 'creative-001',
    name: 'Artistic Description',
    description: 'Creative, artistic language',
    input: 'Paint a dreamy watercolor scene of a misty forest at dawn with ethereal lighting',
    expectedOutputs: {
      primaryAction: 'generate',
      stepCount: 1,
      hasStyle: 'artistic',
      hasParameters: ['watercolor', 'forest', 'dawn'],
      confidenceThreshold: 0.7
    },
    category: 'creative',
    difficulty: 'medium'
  },
  {
    id: 'creative-002',
    name: 'Mood-based Request',
    description: 'Request based on mood and atmosphere',
    input: 'Create something cyberpunk and futuristic with neon colors and dark atmosphere, make it feel dystopian',
    expectedOutputs: {
      primaryAction: 'generate',
      stepCount: 1,
      hasStyle: 'cyberpunk',
      hasParameters: ['neon', 'dark', 'dystopian'],
      confidenceThreshold: 0.8
    },
    category: 'creative',
    difficulty: 'medium'
  },

  // Ambiguous scenarios
  {
    id: 'ambiguous-001',
    name: 'Vague Request',
    description: 'Intentionally vague request',
    input: 'Make it look better and more professional',
    expectedOutputs: {
      primaryAction: 'generate',
      stepCount: 1,
      hasQuality: 'high',
      hasParameters: ['professional'],
      confidenceThreshold: 0.3
    },
    category: 'ambiguous',
    difficulty: 'hard'
  },
  {
    id: 'ambiguous-002',
    name: 'Unclear Chain',
    description: 'Ambiguous multi-step request',
    input: 'Do something with effects and then make it bigger',
    expectedOutputs: {
      primaryAction: 'generate',
      stepCount: 2,
      hasParameters: ['effects', 'bigger'],
      confidenceThreshold: 0.4
    },
    category: 'ambiguous',
    difficulty: 'hard'
  },

  // Edge cases
  {
    id: 'edge-001',
    name: 'Very Long Description',
    description: 'Extremely detailed and long description',
    input: 'Generate a highly detailed photorealistic portrait of a young woman with flowing auburn hair, green eyes, wearing a vintage 1940s dress, standing in a sunlit garden with roses and ivy, shot with a 85mm lens at f/1.4, professional lighting setup with soft key light and subtle rim lighting, shot on Kodak Portra 400 film, with a shallow depth of field and beautiful bokeh, then apply a subtle film grain effect at 30% opacity, followed by color grading to enhance the vintage feel, and finally upscale the image to 4K resolution using AI upscaling while preserving fine details',
    expectedOutputs: {
      primaryAction: 'generate',
      stepCount: 4,
      hasStyle: 'realistic',
      hasQuality: 'high',
      hasParameters: ['photorealistic', 'portrait', 'vintage', 'film grain', 'upscale'],
      confidenceThreshold: 0.8
    },
    category: 'complex',
    difficulty: 'medium'
  },
  {
    id: 'edge-002',
    name: 'Technical Jargon',
    description: 'Heavy technical terminology',
    input: 'Initialize latent space with 512x768 dimensions, apply CFG guidance scale of 7.5, use DPM++ 2M Karras scheduler for 25 denoising steps, then post-process with bilateral filtering',
    expectedOutputs: {
      primaryAction: 'generate',
      stepCount: 2,
      hasParameters: ['512x768', '7.5', 'DPM++ 2M Karras', '25'],
      confidenceThreshold: 0.9
    },
    category: 'technical',
    difficulty: 'hard'
  }
]

export interface TestResult {
  scenario: TestScenario
  success: boolean
  confidence: number
  actualStepCount: number
  actualPrimaryAction: string
  processingTime: number
  llmUsed: boolean
  errors: string[]
  details: {
    extractedStyle?: string
    extractedQuality?: string
    extractedParameters?: string[]
    suggestions?: string[]
  }
}

export class LLMParserTester {
  private hybridParser: HybridWorkflowParser
  private results: TestResult[] = []

  constructor(enableDebug = false) {
    this.hybridParser = new HybridWorkflowParser({ 
      debug: enableDebug,
      confidenceThreshold: 0.5 // Lower threshold for testing
    })
  }

  async runSingleTest(scenario: TestScenario): Promise<TestResult> {
    console.log(`Running test: ${scenario.id} - ${scenario.name}`)
    
    const startTime = Date.now()
    
    try {
      const result = await this.hybridParser.parseDescription(scenario.input)
      const processingTime = Date.now() - startTime
      
      // Evaluate success based on expected outputs
      const success = this.evaluateResult(result, scenario)
      
      const testResult: TestResult = {
        scenario,
        success,
        confidence: result.confidence,
        actualStepCount: result.steps.length,
        actualPrimaryAction: result.steps[0]?.action || 'none',
        processingTime,
        llmUsed: result.llmUsed,
        errors: result.errors || [],
        details: {
          extractedStyle: result.context.detectedStyle,
          extractedQuality: result.context.detectedQuality,
          extractedParameters: this.extractParameters(result),
          suggestions: result.suggestions
        }
      }
      
      this.results.push(testResult)
      return testResult
      
    } catch (error) {
      const testResult: TestResult = {
        scenario,
        success: false,
        confidence: 0,
        actualStepCount: 0,
        actualPrimaryAction: 'error',
        processingTime: Date.now() - startTime,
        llmUsed: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        details: {}
      }
      
      this.results.push(testResult)
      return testResult
    }
  }

  async runAllTests(categories?: string[]): Promise<TestResult[]> {
    const testsToRun = categories 
      ? TEST_SCENARIOS.filter(scenario => categories.includes(scenario.category))
      : TEST_SCENARIOS

    console.log(`Running ${testsToRun.length} test scenarios...`)
    
    const results: TestResult[] = []
    
    for (const scenario of testsToRun) {
      const result = await this.runSingleTest(scenario)
      results.push(result)
      
      // Add delay between tests to avoid overwhelming the LLM
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    return results
  }

  async runTestsByDifficulty(difficulty: 'easy' | 'medium' | 'hard'): Promise<TestResult[]> {
    const testsToRun = TEST_SCENARIOS.filter(scenario => scenario.difficulty === difficulty)
    return this.runAllTests(testsToRun.map(t => t.category))
  }

  private evaluateResult(result: any, scenario: TestScenario): boolean {
    const expected = scenario.expectedOutputs
    
    // Check primary action
    if (result.steps.length === 0) return false
    if (result.steps[0].action !== expected.primaryAction) return false
    
    // Check step count
    if (result.steps.length !== expected.stepCount) return false
    
    // Check confidence threshold
    if (expected.confidenceThreshold && result.confidence < expected.confidenceThreshold) {
      return false
    }
    
    // Check style if specified
    if (expected.hasStyle && result.context.detectedStyle !== expected.hasStyle) {
      return false
    }
    
    // Check quality if specified
    if (expected.hasQuality && result.context.detectedQuality !== expected.hasQuality) {
      return false
    }
    
    // Check parameters if specified
    if (expected.hasParameters) {
      const extractedParams = this.extractParameters(result)
      const hasAllParameters = expected.hasParameters.every(param => 
        extractedParams.some(extracted => 
          extracted.toLowerCase().includes(param.toLowerCase())
        )
      )
      if (!hasAllParameters) return false
    }
    
    return true
  }

  private extractParameters(result: any): string[] {
    const parameters: string[] = []
    
    // Extract from context keywords
    if (result.context.keywords) {
      parameters.push(...result.context.keywords)
    }
    
    // Extract from step parameters
    result.steps.forEach((step: any) => {
      Object.values(step.parameters).forEach((value: any) => {
        if (typeof value === 'string') {
          parameters.push(value)
        }
      })
    })
    
    return parameters
  }

  generateReport(): string {
    if (this.results.length === 0) {
      return 'No test results available'
    }
    
    const totalTests = this.results.length
    const successfulTests = this.results.filter(r => r.success).length
    const llmUsedCount = this.results.filter(r => r.llmUsed).length
    const avgConfidence = this.results.reduce((sum, r) => sum + r.confidence, 0) / totalTests
    const avgProcessingTime = this.results.reduce((sum, r) => sum + r.processingTime, 0) / totalTests
    
    const reportLines = [
      '# LLM Command Parser Test Report',
      `Generated: ${new Date().toISOString()}`,
      '',
      '## Summary',
      `- Total Tests: ${totalTests}`,
      `- Successful: ${successfulTests} (${Math.round(successfulTests / totalTests * 100)}%)`,
      `- LLM Used: ${llmUsedCount} (${Math.round(llmUsedCount / totalTests * 100)}%)`,
      `- Average Confidence: ${Math.round(avgConfidence * 100)}%`,
      `- Average Processing Time: ${Math.round(avgProcessingTime)}ms`,
      '',
      '## Results by Category'
    ]
    
    // Group by category
    const categories = ['simple', 'technical', 'complex', 'creative', 'ambiguous']
    categories.forEach(category => {
      const categoryResults = this.results.filter(r => r.scenario.category === category)
      if (categoryResults.length === 0) return
      
      const categorySuccess = categoryResults.filter(r => r.success).length
      const categoryLLM = categoryResults.filter(r => r.llmUsed).length
      
      reportLines.push(`### ${category.charAt(0).toUpperCase() + category.slice(1)}`)
      reportLines.push(`- Tests: ${categoryResults.length}`)
      reportLines.push(`- Success Rate: ${Math.round(categorySuccess / categoryResults.length * 100)}%`)
      reportLines.push(`- LLM Usage: ${Math.round(categoryLLM / categoryResults.length * 100)}%`)
      reportLines.push('')
    })
    
    reportLines.push('## Failed Tests')
    const failedTests = this.results.filter(r => !r.success)
    if (failedTests.length === 0) {
      reportLines.push('🎉 All tests passed!')
    } else {
      failedTests.forEach(result => {
        reportLines.push(`### ${result.scenario.id}: ${result.scenario.name}`)
        reportLines.push(`- Input: "${result.scenario.input}"`)
        reportLines.push(`- Expected: ${result.scenario.expectedOutputs.primaryAction} (${result.scenario.expectedOutputs.stepCount} steps)`)
        reportLines.push(`- Actual: ${result.actualPrimaryAction} (${result.actualStepCount} steps)`)
        reportLines.push(`- Confidence: ${Math.round(result.confidence * 100)}%`)
        if (result.errors.length > 0) {
          reportLines.push(`- Errors: ${result.errors.join(', ')}`)
        }
        reportLines.push('')
      })
    }
    
    return reportLines.join('\n')
  }

  getResults(): TestResult[] {
    return [...this.results]
  }

  clearResults(): void {
    this.results = []
  }
}

// Utility function for quick testing
export async function quickTest(input: string): Promise<void> {
  const parser = new HybridWorkflowParser({ debug: true })
  const result = await parser.parseDescription(input)
  
  console.log('Input:', input)
  console.log('LLM Used:', result.llmUsed)
  console.log('Confidence:', Math.round(result.confidence * 100) + '%')
  console.log('Steps:', result.steps.length)
  console.log('Primary Action:', result.steps[0]?.action || 'none')
  console.log('Processing Time:', result.processingTime + 'ms')
  console.log('Context:', {
    style: result.context.detectedStyle,
    quality: result.context.detectedQuality,
    imageType: result.context.detectedImageType
  })
  if (result.suggestions.length > 0) {
    console.log('Suggestions:', result.suggestions)
  }
}
'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { WorkflowConstructor } from '@/lib/workflow-constructor'
import { downloadJSON, copyToClipboard, generateTimestamp } from '@/lib/utils'
import { ComfyUIWorkflow, WorkflowExplanation } from '@/lib/types'
// import { ParsedWorkflowContext, EnhancedWorkflowStep } from '@/lib/enhanced-workflow-parser'
import { HybridWorkflowParser, HybridParseResult } from '@/lib/hybrid-workflow-parser'
import { quickSetupCheck } from '@/lib/llm-setup'
import { ParameterOptimizer, QualityMetrics } from '@/lib/parameter-optimizer'
import { mlPromptAnalyzer, type PromptAnalysis } from '@/lib/ml-prompt-analyzer'
import { recommendationEngine, type SmartRecommendation } from '@/lib/recommendation-engine'
// import { workflowImporter } from '@/lib/workflow-importer'
import { Download, Copy, ChevronDown, ChevronUp, Wand2, Loader2, Sparkles, Info, Check, Upload, Database, Brain, Zap, AlertCircle } from 'lucide-react'


export function WorkflowGenerator() {
  const [description, setDescription] = useState('')
  const [workflow, setWorkflow] = useState<ComfyUIWorkflow | null>(null)
  const [explanation, setExplanation] = useState<WorkflowExplanation | null>(null)
  // Legacy state for backward compatibility
  // const [context, setContext] = useState<ParsedWorkflowContext | null>(null)
  // const [enhancedSteps, setEnhancedSteps] = useState<EnhancedWorkflowStep[]>([])
  const [qualityMetrics, setQualityMetrics] = useState<QualityMetrics | null>(null)
  const [mlAnalysis, setMlAnalysis] = useState<PromptAnalysis | null>(null)
  const [smartRecommendations, setSmartRecommendations] = useState<SmartRecommendation | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isJsonExpanded, setIsJsonExpanded] = useState(false)
  const [isAnalysisExpanded, setIsAnalysisExpanded] = useState(true)
  const [isRecommendationsExpanded, setIsRecommendationsExpanded] = useState(true)
  const [isCopied, setIsCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [llmAvailable, setLlmAvailable] = useState<boolean | null>(null)
  const [hybridResult, setHybridResult] = useState<HybridParseResult | null>(null)
  const [isLlmExpanded, setIsLlmExpanded] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  const constructor = new WorkflowConstructor()
  const hybridParser = new HybridWorkflowParser({ debug: true })

  const generateWorkflow = async () => {
    if (!description.trim()) {
      setError('Please enter a description for your workflow')
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      // Step 1: ML-powered prompt analysis
      const mlAnalysisResult = await mlPromptAnalyzer.analyzePrompt(description.trim())
      setMlAnalysis(mlAnalysisResult)
      
      // Step 2: Generate smart recommendations
      const recommendations = await recommendationEngine.generateRecommendations({
        prompt: description.trim(),
        analysis: mlAnalysisResult
      })
      setSmartRecommendations(recommendations)
      
      // Step 3: Use hybrid parser for sophisticated command parsing
      const hybridResult = await hybridParser.parseDescription(description.trim())
      setHybridResult(hybridResult)
      // setContext(hybridResult.context)
      // setEnhancedSteps(hybridResult.steps)
      
      // Step 4: Generate workflow using existing constructor
      const result = constructor.generateWorkflow(description.trim())
      
      // Step 5: Calculate quality metrics if we have parameters
      if (hybridResult.steps.length > 0) {
        const firstStep = hybridResult.steps[0]
        if (firstStep.action === 'generate' && firstStep.optimizations) {
          const metrics = ParameterOptimizer.calculateQualityMetrics(
            firstStep.optimizations as unknown as Parameters<typeof ParameterOptimizer.calculateQualityMetrics>[0],
            {
              imageType: mlAnalysisResult.classifications.image_type,
              quality: hybridResult.context.detectedQuality as 'draft' | 'standard' | 'high' | 'ultra',
              style: hybridResult.context.detectedStyle as 'realistic' | 'artistic' | 'anime' | 'fantasy' | 'cyberpunk' | 'vintage',
              complexity: mlAnalysisResult.classifications.complexity_level,
              aspectRatio: hybridResult.context.aspectRatio,
              hasUpscaling: hybridResult.steps.some(s => s.action === 'upscale'),
              hasEffects: hybridResult.steps.some(s => s.action === 'effect')
            },
            hybridResult.steps.filter(s => s.action === 'lora').length
          )
          setQualityMetrics(metrics)
        }
      }
      
      // Step 6: Validate the generated workflow
      const validation = constructor.validateWorkflow(result.workflow)
      if (!validation.isValid) {
        console.warn('Workflow validation warnings:', validation.errors)
      }
      
      setWorkflow(result.workflow)
      setExplanation(result.explanation)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate workflow')
      console.error('Workflow generation error:', err)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownload = () => {
    if (workflow) {
      const timestamp = generateTimestamp()
      downloadJSON(workflow, `comfyui-workflow-${timestamp}.json`)
    }
  }

  const handleCopy = async () => {
    if (!workflow) return
    
    try {
      await copyToClipboard(JSON.stringify(workflow, null, 2))
      setIsCopied(true)
      // Reset the copied state after 2 seconds
      setTimeout(() => setIsCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
      setError('Failed to copy to clipboard')
    }
  }

  const handleImportWorkflow = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsImporting(true)
    setError(null)

    try {
      const text = await file.text()
      const importedWorkflow = JSON.parse(text)
      
      // Set the imported workflow as description (simplified for now)
      const description = `Imported workflow with ${Object.keys(importedWorkflow).length} nodes`
      
      // Set the description in the input field
      setDescription(description)
      
      // Optionally, generate the workflow immediately
      // await generateWorkflow()
    } catch (err) {
      setError('Failed to import workflow. Please check the file format.')
      console.error('Import error:', err)
    } finally {
      setIsImporting(false)
      // Reset the file input
      event.target.value = ''
    }
  }

  // Check LLM availability on component mount
  React.useEffect(() => {
    const checkLLMStatus = async () => {
      try {
        const available = await quickSetupCheck()
        setLlmAvailable(available)
      } catch {
        setLlmAvailable(false)
      }
    }
    
    checkLLMStatus()
  }, [])

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            Describe Your Workflow
          </CardTitle>
          <CardDescription>
            Enter a natural language description of your desired image generation workflow
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Example: Generate a fantasy landscape with a castle using an anime style, high quality, then upscale it 2x and add film grain effect"
            className="min-h-[120px] font-mono text-sm"
            disabled={isGenerating}
          />
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={generateWorkflow}
              disabled={isGenerating || !description.trim()}
              className="flex-1"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4 mr-2" />
                  Generate Workflow
                </>
              )}
            </Button>
            <div className="relative">
              <input
                type="file"
                accept=".json"
                onChange={handleImportWorkflow}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={isImporting}
              />
              <Button variant="outline" disabled={isImporting}>
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Import Workflow
                  </>
                )}
              </Button>
            </div>
          </div>
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-3">
              {error}
            </div>
          )}
          
          {/* LLM Status Indicator */}
          {llmAvailable !== null && (
            <div className={`text-xs px-3 py-2 rounded-md border flex items-center gap-2 ${
              llmAvailable 
                ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-950 dark:border-green-800 dark:text-green-300'
                : 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-300'
            }`}>
              {llmAvailable ? (
                <>
                  <Brain className="h-3 w-3" />
                  <span>🤖 Advanced LLM parsing enabled</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-3 w-3" />
                  <span>Using standard parsing (configure Hugging Face API for enhanced features)</span>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>


      {/* ML-Powered Analysis */}
      {mlAnalysis && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  ML Analysis & Entity Extraction
                </CardTitle>
                <CardDescription>
                  Deep learning analysis of your prompt using Hugging Face Transformers
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsAnalysisExpanded(!isAnalysisExpanded)}
              >
                {isAnalysisExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardHeader>
          {isAnalysisExpanded && (
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
                <div className="bg-muted/50 p-3 rounded-md">
                  <div className="text-xs font-medium text-muted-foreground mb-1">PRIMARY STYLE</div>
                  <div className="text-sm font-medium capitalize">{mlAnalysis.classifications.primary_style}</div>
                </div>
                <div className="bg-muted/50 p-3 rounded-md">
                  <div className="text-xs font-medium text-muted-foreground mb-1">IMAGE TYPE</div>
                  <div className="text-sm font-medium capitalize">{mlAnalysis.classifications.image_type}</div>
                </div>
                <div className="bg-muted/50 p-3 rounded-md">
                  <div className="text-xs font-medium text-muted-foreground mb-1">MOOD</div>
                  <div className="text-sm font-medium capitalize">{mlAnalysis.sentiment.mood}</div>
                </div>
                <div className="bg-muted/50 p-3 rounded-md">
                  <div className="text-xs font-medium text-muted-foreground mb-1">COMPLEXITY</div>
                  <div className="text-sm font-medium capitalize">{mlAnalysis.classifications.complexity_level}</div>
                </div>
              </div>

              {/* Entity Extraction Results */}
              <div className="space-y-3 mb-4">
                {mlAnalysis.entities.artistic_styles.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-muted-foreground mb-2">Detected Artistic Styles</div>
                    <div className="flex flex-wrap gap-2">
                      {mlAnalysis.entities.artistic_styles.map((style, i) => (
                        <span key={i} className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-md">
                          {style}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {mlAnalysis.entities.subjects.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-muted-foreground mb-2">Detected Subjects</div>
                    <div className="flex flex-wrap gap-2">
                      {mlAnalysis.entities.subjects.map((subject, i) => (
                        <span key={i} className="text-xs px-2 py-1 bg-secondary/50 rounded-md">
                          {subject}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Technical Requirements */}
              <div className="bg-muted/50 p-4 rounded-md">
                <h4 className="text-sm font-medium mb-3">AI-Suggested Technical Settings</h4>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-xs">
                  <div>
                    <span className="text-muted-foreground">Recommended Model:</span>
                    <div className="font-medium">{mlAnalysis.technical_requirements.suggested_models[0]}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Sampler:</span>
                    <div className="font-medium">{mlAnalysis.technical_requirements.suggested_samplers[0]}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Steps:</span>
                    <div className="font-medium">{mlAnalysis.technical_requirements.suggested_steps}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">CFG Scale:</span>
                    <div className="font-medium">{mlAnalysis.technical_requirements.suggested_cfg}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Resolution:</span>
                    <div className="font-medium">{mlAnalysis.technical_requirements.suggested_resolution}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Estimated Nodes:</span>
                    <div className="font-medium">{mlAnalysis.workflow_complexity.estimated_nodes}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Smart Recommendations */}
      {smartRecommendations && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  AI Recommendations
                </CardTitle>
                <CardDescription>
                  Intelligent suggestions based on ML analysis
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsRecommendationsExpanded(!isRecommendationsExpanded)}
              >
                {isRecommendationsExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardHeader>
          {isRecommendationsExpanded && (
            <CardContent className="space-y-4">
              {/* Model Recommendations */}
              {smartRecommendations.models.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-3">Recommended Models</h4>
                  <div className="space-y-2">
                    {smartRecommendations.models.slice(0, 3).map((model, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                        <div>
                          <div className="text-sm font-medium">{model.name}</div>
                          <div className="text-xs text-muted-foreground">{model.reasons.join(', ')}</div>
                        </div>
                        <div className="text-xs font-medium bg-primary/10 text-primary px-2 py-1 rounded">
                          {Math.round(model.score * 100)}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* LoRA Recommendations */}
              {smartRecommendations.loras.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-3">Suggested LoRAs</h4>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {smartRecommendations.loras.map((lora, index) => (
                      <div key={index} className="p-3 bg-muted/50 rounded-md">
                        <div className="text-sm font-medium">{lora.name}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Strength: {lora.strength} • {lora.reasons.join(', ')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Optimization Tips */}
              {smartRecommendations.optimization_tips.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-3">Optimization Tips</h4>
                  <div className="space-y-2">
                    {smartRecommendations.optimization_tips.map((tip, index) => (
                      <div key={index} className="text-xs p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md">
                        💡 {tip}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          )}
        </Card>
      )}

      {/* LLM Parsing Results */}
      {hybridResult && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {hybridResult.llmUsed ? <Brain className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
                  {hybridResult.llmUsed ? 'LLM-Enhanced Analysis' : 'Standard Analysis'}
                </CardTitle>
                <CardDescription>
                  {hybridResult.llmUsed 
                    ? `Advanced AI parsing with ${Math.round(hybridResult.confidence * 100)}% confidence` 
                    : 'Pattern-based analysis (configure Hugging Face API for LLM parsing)'}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {hybridResult.llmUsed && (
                  <div className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded dark:bg-green-900 dark:text-green-300">
                    <Zap className="h-3 w-3" />
                    LLM
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAnalysisExpanded(!isAnalysisExpanded)}
                >
                  {isAnalysisExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          {isAnalysisExpanded && (
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
                <div className="bg-muted/50 p-3 rounded-md">
                  <div className="text-xs font-medium text-muted-foreground mb-1">DETECTED STYLE</div>
                  <div className="text-sm font-medium capitalize">{hybridResult.context.detectedStyle}</div>
                </div>
                <div className="bg-muted/50 p-3 rounded-md">
                  <div className="text-xs font-medium text-muted-foreground mb-1">IMAGE TYPE</div>
                  <div className="text-sm font-medium capitalize">{hybridResult.context.detectedImageType}</div>
                </div>
                <div className="bg-muted/50 p-3 rounded-md">
                  <div className="text-xs font-medium text-muted-foreground mb-1">QUALITY LEVEL</div>
                  <div className="text-sm font-medium capitalize">{hybridResult.context.detectedQuality}</div>
                </div>
                <div className="bg-muted/50 p-3 rounded-md">
                  <div className="text-xs font-medium text-muted-foreground mb-1">CONFIDENCE</div>
                  <div className="text-sm font-medium">{Math.round(hybridResult.confidence * 100)}%</div>
                </div>
              </div>
              
              {/* Processing Information */}
              <div className="bg-muted/50 p-4 rounded-md mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Info className="h-4 w-4" />
                  <span className="text-sm font-medium">Processing Details</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
                  <div>
                    <span className="text-muted-foreground">Parsing Method:</span>
                    <div className="font-medium">{hybridResult.llmUsed ? 'LLM + Enhanced' : 'Enhanced Parser'}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Processing Time:</span>
                    <div className="font-medium">{hybridResult.processingTime}ms</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Steps Generated:</span>
                    <div className="font-medium">{hybridResult.steps.length}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Suggestions:</span>
                    <div className="font-medium">{hybridResult.suggestions.length}</div>
                  </div>
                </div>
              </div>

              {qualityMetrics && (
                <div className="bg-muted/50 p-4 rounded-md mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Info className="h-4 w-4" />
                    <span className="text-sm font-medium">Quality Metrics</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
                    <div>
                      <span className="text-muted-foreground">Estimated Time:</span>
                      <div className="font-medium">{qualityMetrics.expectedTime}s</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Memory Usage:</span>
                      <div className="font-medium">{Math.round(qualityMetrics.memoryUsage / 1024)}GB</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Quality Score:</span>
                      <div className="font-medium">{qualityMetrics.qualityScore}/100</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Token Cost:</span>
                      <div className="font-medium">${qualityMetrics.tokenCost}</div>
                    </div>
                  </div>
                </div>
              )}

              {hybridResult.steps.length > 0 && (
                <div className="space-y-3">
                  <div className="text-sm font-medium">Parsed Workflow Steps</div>
                  {hybridResult.steps.map((step, index) => (
                    <div key={index} className="flex gap-3 p-3 bg-background border rounded-md">
                      <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium capitalize">{step.action}</span>
                          <span className="text-xs bg-muted px-2 py-1 rounded">
                            {Math.round(step.confidence * 100)}% confidence
                          </span>
                          {hybridResult.llmUsed && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded dark:bg-blue-900 dark:text-blue-300">
                              LLM
                            </span>
                          )}
                        </div>
                        {step.metadata.detectedStyle && (
                          <div className="text-xs text-muted-foreground">
                            Style: {step.metadata.detectedStyle} | 
                            Quality: {step.metadata.detectedQuality} | 
                            Aspect: {step.metadata.suggestedAspectRatio}
                          </div>
                        )}
                        {step.suggestions.length > 0 && (
                          <div className="text-xs text-muted-foreground">
                            💡 {step.suggestions[0]}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* LLM Debug Information */}
              {hybridResult.debugInfo && (
                <div className="mt-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsLlmExpanded(!isLlmExpanded)}
                    className="text-xs"
                  >
                    {isLlmExpanded ? 'Hide' : 'Show'} Debug Info
                    {isLlmExpanded ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
                  </Button>
                  
                  {isLlmExpanded && (
                    <div className="mt-2 p-3 bg-muted/30 rounded text-xs space-y-2">
                      <div><strong>Enhanced Parser Used:</strong> {hybridResult.debugInfo.enhancedParserUsed ? 'Yes' : 'No'}</div>
                      {hybridResult.debugInfo.fallbackReason && (
                        <div><strong>Fallback Reason:</strong> {hybridResult.debugInfo.fallbackReason}</div>
                      )}
                      {hybridResult.debugInfo.llmResult && (
                        <div><strong>LLM Processing Time:</strong> {hybridResult.debugInfo.llmResult.processingTime}ms</div>
                      )}
                      {hybridResult.errors && hybridResult.errors.length > 0 && (
                        <div><strong>Errors:</strong> {hybridResult.errors.join(', ')}</div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          )}
        </Card>
      )}

      {/* Results Section */}
      {workflow && explanation && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Generated Workflow
            </CardTitle>
            <CardDescription>
              Your ComfyUI workflow has been successfully generated
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Workflow Explanation */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Workflow Steps:</h3>
              <div className="space-y-2">
                {explanation.steps.map((step, index) => (
                  <div key={index} className="flex gap-3 p-3 bg-muted/50 rounded-md">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <p className="text-sm">{typeof step === 'string' ? step : step.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* JSON Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">JSON Preview:</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsJsonExpanded(!isJsonExpanded)}
                >
                  {isJsonExpanded ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-1" />
                      Hide
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-1" />
                      Show
                    </>
                  )}
                </Button>
              </div>
              {isJsonExpanded && (
                <pre className="p-4 bg-muted rounded-md overflow-x-auto text-xs">
                  <code>{JSON.stringify(workflow, null, 2)}</code>
                </pre>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button onClick={handleDownload} className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Download JSON
              </Button>
              <Button onClick={handleCopy} variant="outline" className="flex-1">
                {isCopied ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy JSON
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Example Prompts */}
      <Card>
        <CardHeader>
          <CardTitle>Example Prompts</CardTitle>
          <CardDescription>
            Try these example prompts to see what kinds of workflows you can generate
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <button
              onClick={() => setDescription('Generate a photorealistic portrait of a woman with natural lighting, high quality')}
              className="text-sm text-left p-3 bg-muted/50 hover:bg-muted rounded-md transition-colors w-full"
            >
              <div className="font-medium">Portrait Photography</div>
              <div className="text-muted-foreground">Generate a photorealistic portrait of a woman with natural lighting, high quality</div>
            </button>
            <button
              onClick={() => setDescription('Create an anime-style character in a cyberpunk city, neon lights, high detail, then upscale 2x')}
              className="text-sm text-left p-3 bg-muted/50 hover:bg-muted rounded-md transition-colors w-full"
            >
              <div className="font-medium">Anime Character with Upscaling</div>
              <div className="text-muted-foreground">Create an anime-style character in a cyberpunk city, neon lights, high detail, then upscale 2x</div>
            </button>
            <button
              onClick={() => setDescription('Fantasy landscape with mountains and a castle, painted art style, add film grain and color grading')}
              className="text-sm text-left p-3 bg-muted/50 hover:bg-muted rounded-md transition-colors w-full"
            >
              <div className="font-medium">Fantasy Landscape with Effects</div>
              <div className="text-muted-foreground">Fantasy landscape with mountains and a castle, painted art style, add film grain and color grading</div>
            </button>
            <button
              onClick={() => setDescription('Product photo of a luxury watch, studio lighting, ultra high quality, use multiple LoRAs for detail enhancement')}
              className="text-sm text-left p-3 bg-muted/50 hover:bg-muted rounded-md transition-colors w-full"
            >
              <div className="font-medium">Product Photography with LoRAs</div>
              <div className="text-muted-foreground">Product photo of a luxury watch, studio lighting, ultra high quality, use multiple LoRAs for detail enhancement</div>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
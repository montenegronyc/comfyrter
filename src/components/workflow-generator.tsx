'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { WorkflowConstructor } from '@/lib/workflow-constructor'
import { downloadJSON, copyToClipboard, generateTimestamp } from '@/lib/utils'
import { ComfyUIWorkflow, WorkflowExplanation } from '@/lib/types'
import { EnhancedWorkflowParser, ParsedWorkflowContext, EnhancedWorkflowStep } from '@/lib/enhanced-workflow-parser'
import { ParameterOptimizer, QualityMetrics } from '@/lib/parameter-optimizer'
import { Download, Copy, ChevronDown, ChevronUp, Wand2, Loader2, Sparkles, Info, Check } from 'lucide-react'


export function WorkflowGenerator() {
  const [description, setDescription] = useState('')
  const [workflow, setWorkflow] = useState<ComfyUIWorkflow | null>(null)
  const [explanation, setExplanation] = useState<WorkflowExplanation | null>(null)
  const [context, setContext] = useState<ParsedWorkflowContext | null>(null)
  const [enhancedSteps, setEnhancedSteps] = useState<EnhancedWorkflowStep[]>([])
  const [qualityMetrics, setQualityMetrics] = useState<QualityMetrics | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isJsonExpanded, setIsJsonExpanded] = useState(false)
  const [isAnalysisExpanded, setIsAnalysisExpanded] = useState(true)
  const [isCopied, setIsCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const constructor = new WorkflowConstructor()
  const enhancedParser = new EnhancedWorkflowParser()

  const generateWorkflow = async () => {
    if (!description.trim()) {
      setError('Please enter a description for your workflow')
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      // Simulate some processing time for better UX
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // First, use enhanced parser for intelligent analysis
      const enhanced = enhancedParser.parseDescription(description.trim())
      setContext(enhanced.context)
      setEnhancedSteps(enhanced.steps)
      
      // Generate workflow using existing constructor
      const result = constructor.generateWorkflow(description.trim())
      
      // Calculate quality metrics if we have parameters
      if (enhanced.steps.length > 0) {
        const firstStep = enhanced.steps[0]
        if (firstStep.action === 'generate' && firstStep.optimizations) {
          const metrics = ParameterOptimizer.calculateQualityMetrics(
            firstStep.optimizations as unknown as Parameters<typeof ParameterOptimizer.calculateQualityMetrics>[0],
            {
              imageType: enhanced.context.detectedImageType as 'portrait' | 'landscape' | 'character' | 'scene' | 'product' | 'abstract',
              quality: enhanced.context.detectedQuality as 'draft' | 'standard' | 'high' | 'ultra',
              style: enhanced.context.detectedStyle as 'realistic' | 'artistic' | 'anime' | 'fantasy' | 'cyberpunk' | 'vintage',
              complexity: enhanced.context.detectedComplexity as 'simple' | 'medium' | 'complex',
              aspectRatio: enhanced.context.aspectRatio,
              hasUpscaling: enhanced.steps.some(s => s.action === 'upscale'),
              hasEffects: enhanced.steps.some(s => s.action === 'effect')
            },
            enhanced.steps.filter(s => s.action === 'lora').length
          )
          setQualityMetrics(metrics)
        }
      }
      
      // Validate the generated workflow
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
    if (!workflow) return
    
    const filename = `comfyui-workflow-${generateTimestamp()}.json`
    downloadJSON(workflow, filename)
  }

  const handleCopyJson = async () => {
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
            Describe your desired ComfyUI workflow in natural language. Be specific about models, parameters, and effects you want to apply.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="e.g., Generate a fantasy landscape with a castle using euler sampler with 25 steps, then upscale it 2x and add film grain effect..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-[120px] resize-none"
          />
          <div className="flex flex-col sm:flex-row gap-2">
            <Button 
              onClick={generateWorkflow} 
              disabled={isGenerating || !description.trim()}
              className="flex-1 sm:flex-none"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" />
                  Generate Workflow
                </>
              )}
            </Button>
          </div>
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-3">
              {error}
            </div>
          )}
        </CardContent>
      </Card>


      {/* Intelligent Analysis */}
      {context && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Intelligent Analysis
                </CardTitle>
                <CardDescription>
                  AI-powered analysis of your workflow description
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
                  <div className="text-xs font-medium text-muted-foreground mb-1">DETECTED STYLE</div>
                  <div className="text-sm font-medium capitalize">{context.detectedStyle}</div>
                </div>
                <div className="bg-muted/50 p-3 rounded-md">
                  <div className="text-xs font-medium text-muted-foreground mb-1">IMAGE TYPE</div>
                  <div className="text-sm font-medium capitalize">{context.detectedImageType}</div>
                </div>
                <div className="bg-muted/50 p-3 rounded-md">
                  <div className="text-xs font-medium text-muted-foreground mb-1">QUALITY LEVEL</div>
                  <div className="text-sm font-medium capitalize">{context.detectedQuality}</div>
                </div>
                <div className="bg-muted/50 p-3 rounded-md">
                  <div className="text-xs font-medium text-muted-foreground mb-1">CONFIDENCE</div>
                  <div className="text-sm font-medium">{Math.round(context.confidence * 100)}%</div>
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

              {enhancedSteps.length > 0 && (
                <div className="space-y-3">
                  <div className="text-sm font-medium">Enhanced Workflow Steps</div>
                  {enhancedSteps.map((step, index) => (
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
            </CardContent>
          )}
        </Card>
      )}

      {/* Results Section */}
      {explanation && (
        <Card>
          <CardHeader>
            <CardTitle>Workflow Explanation</CardTitle>
            <CardDescription>{explanation.summary}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {explanation.steps.map((step) => (
                <div key={step.step} className="flex gap-3 p-3 bg-muted/50 rounded-md">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                    {step.step}
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{step.description}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="bg-background px-2 py-1 rounded border">
                        {step.nodeType}
                      </span>
                      {Object.keys(step.parameters).length > 0 && (
                        <span>
                          {Object.entries(step.parameters)
                            .slice(0, 2)
                            .map(([key, value]) => `${key}: ${value}`)
                            .join(', ')}
                          {Object.keys(step.parameters).length > 2 && '...'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* JSON Output */}
      {workflow && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Generated Workflow JSON</CardTitle>
                <CardDescription>
                  ComfyUI workflow file ready for import ({Object.keys(workflow).length} nodes)
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCopyJson}>
                  {isCopied ? (
                    <>
                      <Check className="h-4 w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy
                    </>
                  )}
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="h-4 w-4" />
                  Download
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsJsonExpanded(!isJsonExpanded)}
                >
                  {isJsonExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          {isJsonExpanded && (
            <CardContent>
              <pre className="bg-muted p-4 rounded-md overflow-auto text-xs">
                <code>{JSON.stringify(workflow, null, 2)}</code>
              </pre>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  )
}
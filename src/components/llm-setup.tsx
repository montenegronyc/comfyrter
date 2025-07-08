'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LLMSetupManager, SetupStatus, RECOMMENDED_MODELS } from '@/lib/llm-setup'
// Removed unused imports: isLLMParsingAvailable, getAvailableModels
import { 
  Brain, 
  Download, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  RefreshCw, 
  Terminal, 
  Info,
  ExternalLink,
  Loader2,
  Zap
} from 'lucide-react'

export function LLMSetup() {
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [systemReport, setSystemReport] = useState<string>('')
  const [showReport, setShowReport] = useState(false)

  const setupManager = useMemo(() => new LLMSetupManager(), [])

  const checkSetup = useCallback(async () => {
    setIsLoading(true)
    try {
      const status = await setupManager.checkSetupStatus()
      setSetupStatus(status)
      
      const report = await setupManager.generateSystemReport()
      setSystemReport(report)
    } catch (error) {
      console.error('Failed to check LLM setup:', error)
    } finally {
      setIsLoading(false)
    }
  }, [setupManager])

  useEffect(() => {
    checkSetup()
  }, [checkSetup])

  const refreshStatus = async () => {
    setIsRefreshing(true)
    await checkSetup()
    setIsRefreshing(false)
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Checking LLM setup...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!setupStatus) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <XCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
            <p className="text-muted-foreground">Failed to check LLM setup</p>
            <Button variant="outline" onClick={checkSetup} className="mt-2">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                LLM Enhanced Parsing Setup
              </CardTitle>
              <CardDescription>
                Configure local LLM for advanced command parsing capabilities
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={refreshStatus}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Ollama Status */}
            <div className="flex items-center gap-3 p-3 border rounded-md">
              {setupStatus.ollamaInstalled ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <div className="flex-1">
                <div className="font-medium">Ollama Service</div>
                <div className="text-sm text-muted-foreground">
                  {setupStatus.ollamaInstalled ? 'Running' : 'Not available'}
                </div>
              </div>
            </div>

            {/* Model Status */}
            <div className="flex items-center gap-3 p-3 border rounded-md">
              {setupStatus.modelAvailable ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <div className="flex-1">
                <div className="font-medium">Recommended Model</div>
                <div className="text-sm text-muted-foreground">
                  {setupStatus.modelAvailable 
                    ? `${setupStatus.recommendedModel}` 
                    : 'Not installed'
                  }
                </div>
              </div>
            </div>
          </div>

          {/* Overall Status */}
          <div className={`mt-4 p-3 rounded-md border-l-4 ${
            setupStatus.ollamaInstalled && setupStatus.modelAvailable
              ? 'bg-green-50 border-green-400 dark:bg-green-950'
              : 'bg-amber-50 border-amber-400 dark:bg-amber-950'
          }`}>
            <div className="flex items-center gap-2">
              {setupStatus.ollamaInstalled && setupStatus.modelAvailable ? (
                <>
                  <Zap className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-800 dark:text-green-200">
                    🎉 LLM parsing is ready!
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <span className="font-medium text-amber-800 dark:text-amber-200">
                    Setup required for enhanced parsing
                  </span>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Setup Instructions */}
      {(!setupStatus.ollamaInstalled || !setupStatus.modelAvailable) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Terminal className="h-5 w-5" />
              Setup Instructions
            </CardTitle>
            <CardDescription>
              Follow these steps to enable LLM-enhanced command parsing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!setupStatus.ollamaInstalled && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                    1
                  </div>
                  <span className="font-medium">Install Ollama</span>
                </div>
                <div className="ml-8 space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Download and install Ollama from the official website
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://ollama.ai" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Download Ollama
                    </a>
                  </Button>
                </div>
              </div>
            )}

            {setupStatus.ollamaInstalled && !setupStatus.modelAvailable && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                    2
                  </div>
                  <span className="font-medium">Install a Model</span>
                </div>
                <div className="ml-8 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Install a recommended model for optimal parsing performance
                  </p>
                  
                  {/* Model Selection */}
                  <div className="space-y-2">
                    {RECOMMENDED_MODELS.filter(m => m.recommended).map((model) => (
                      <div key={model.name} className="flex items-center justify-between p-3 border rounded-md">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{model.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {model.description} • {model.size}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {model.memoryRequirement}
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => copyToClipboard(`ollama pull ${model.name}`)}
                        >
                          Copy Command
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div className="bg-muted p-3 rounded-md">
                    <div className="font-medium text-sm mb-2">Installation Commands:</div>
                    <div className="space-y-1 font-mono text-xs">
                      <div># For best performance (8GB+ RAM recommended)</div>
                      <div className="bg-background p-2 rounded border">
                        ollama pull qwen2.5-coder:7b
                      </div>
                      <div># For lower memory systems (4GB+ RAM)</div>
                      <div className="bg-background p-2 rounded border">
                        ollama pull qwen2.5-coder:3b
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                  3
                </div>
                <span className="font-medium">Start Using Enhanced Parsing</span>
              </div>
              <div className="ml-8 text-sm text-muted-foreground">
                Once setup is complete, refresh this page and try generating a workflow. 
                You&apos;ll see the 🤖 LLM indicator when enhanced parsing is active.
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Models */}
      {setupStatus.availableModels.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Installed Models
            </CardTitle>
            <CardDescription>
              Models available for command parsing ({setupStatus.availableModels.length} total)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {setupStatus.availableModels.map((modelName) => {
                const isRecommended = RECOMMENDED_MODELS.some(rec => modelName.includes(rec.name))
                const modelInfo = RECOMMENDED_MODELS.find(rec => modelName.includes(rec.name))
                
                return (
                  <div key={modelName} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center gap-2">
                      <div className="font-medium text-sm">{modelName}</div>
                      {isRecommended && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded dark:bg-green-900 dark:text-green-300">
                          Recommended
                        </span>
                      )}
                    </div>
                    {modelInfo && (
                      <div className="text-xs text-muted-foreground">
                        {modelInfo.size}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Report */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                System Report
              </CardTitle>
              <CardDescription>
                Detailed system information and troubleshooting data
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowReport(!showReport)}
            >
              {showReport ? 'Hide' : 'Show'} Report
            </Button>
          </div>
        </CardHeader>
        {showReport && (
          <CardContent>
            <div className="space-y-3">
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => copyToClipboard(systemReport)}
                >
                  Copy Report
                </Button>
              </div>
              <pre className="bg-muted p-4 rounded-md overflow-auto text-xs whitespace-pre-wrap">
                {systemReport}
              </pre>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Benefits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Enhanced Parsing Benefits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <div className="font-medium text-sm">🧠 Natural Language Understanding</div>
              <div className="text-xs text-muted-foreground">
                Understands complex, ambiguous descriptions and user intent
              </div>
            </div>
            <div className="space-y-2">
              <div className="font-medium text-sm">🎯 Context-Aware Parsing</div>
              <div className="text-xs text-muted-foreground">
                Extracts parameters and relationships from conversational input
              </div>
            </div>
            <div className="space-y-2">
              <div className="font-medium text-sm">💡 Intelligent Suggestions</div>
              <div className="text-xs text-muted-foreground">
                Provides smart recommendations for workflow improvements
              </div>
            </div>
            <div className="space-y-2">
              <div className="font-medium text-sm">🔒 Privacy-First</div>
              <div className="text-xs text-muted-foreground">
                Runs completely local - your data never leaves your machine
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
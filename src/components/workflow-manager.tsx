'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { workflowImporter, type WorkflowAnalysis } from '@/lib/workflow-importer'
import { Download, Trash2, Eye, Database, Upload, Loader2, FileText, Brain, Cpu } from 'lucide-react'
import { downloadJSON } from '@/lib/utils'

export function WorkflowManager() {
  const [workflows, setWorkflows] = useState<WorkflowAnalysis[]>([])
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowAnalysis | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isImporting, setIsImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadWorkflows()
  }, [])

  const loadWorkflows = async () => {
    try {
      await workflowImporter.initialize()
      const workflowDb = workflowImporter.getWorkflowDatabase()
      setWorkflows(workflowDb)
    } catch (err) {
      setError('Failed to load workflows')
      console.error('Error loading workflows:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleImportWorkflow = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsImporting(true)
    setError(null)

    try {
      const text = await file.text()
      const workflowData = JSON.parse(text)
      
      await workflowImporter.importWorkflow(workflowData, {
        name: file.name.replace('.json', ''),
        description: `Imported from ${file.name}`,
        tags: ['imported']
      })
      
      // Reload workflows
      await loadWorkflows()
      setError('Workflow imported successfully!')
      setTimeout(() => setError(null), 3000)
    } catch (err) {
      setError('Failed to import workflow. Please check the file format.')
      console.error('Import error:', err)
    } finally {
      setIsImporting(false)
      event.target.value = ''
    }
  }

  const handleDeleteWorkflow = async (id: string) => {
    if (confirm('Are you sure you want to delete this workflow?')) {
      const success = workflowImporter.deleteWorkflow(id)
      if (success) {
        await loadWorkflows()
        if (selectedWorkflow?.id === id) {
          setSelectedWorkflow(null)
        }
      }
    }
  }

  const handleExportWorkflow = (workflow: WorkflowAnalysis) => {
    const exportData = {
      workflow,
      exported_at: new Date().toISOString(),
      version: '1.0'
    }
    
    downloadJSON(exportData, `workflow-analysis-${workflow.id}.json`)
  }

  const handleExportDatabase = () => {
    const data = workflowImporter.exportDatabase()
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `workflow-database-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Workflow Database
              </CardTitle>
              <CardDescription>
                Manage your imported ComfyUI workflows and their analysis data ({workflows.length} workflows)
              </CardDescription>
            </div>
            <div className="flex gap-2">
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
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Import Workflow
                    </>
                  )}
                </Button>
              </div>
              <Button variant="outline" onClick={handleExportDatabase}>
                <Download className="h-4 w-4" />
                Export Database
              </Button>
            </div>
          </div>
        </CardHeader>
        {error && (
          <CardContent>
            <div className={`text-sm p-3 rounded-md ${
              error.includes('successfully') 
                ? 'text-green-600 bg-green-50 border border-green-200 dark:bg-green-950/30 dark:border-green-800' 
                : 'text-destructive bg-destructive/10 border border-destructive/20'
            }`}>
              {error}
            </div>
          </CardContent>
        )}
      </Card>

      {workflows.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Database className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No Workflows Yet</h3>
            <p className="text-muted-foreground mb-4">
              Import ComfyUI workflow JSON files to start building your database
            </p>
            <div className="relative inline-block">
              <input
                type="file"
                accept=".json"
                onChange={handleImportWorkflow}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={isImporting}
              />
              <Button>
                <Upload className="h-4 w-4 mr-2" />
                Import Your First Workflow
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Workflow List */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Workflow Library</h3>
            <div className="space-y-3">
              {workflows.map((workflow) => (
                <Card
                  key={workflow.id}
                  className={`cursor-pointer transition-colors ${
                    selectedWorkflow?.id === workflow.id ? 'ring-2 ring-primary' : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedWorkflow(workflow)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium">{workflow.name}</h4>
                        <p className="text-sm text-muted-foreground">{workflow.description}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleExportWorkflow(workflow)
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteWorkflow(workflow.id)
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="bg-muted px-2 py-1 rounded">{workflow.complexity}</span>
                      <span className="bg-muted px-2 py-1 rounded">{workflow.category}</span>
                      <span className="bg-muted px-2 py-1 rounded">{workflow.nodes.total} nodes</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {workflow.tags.slice(0, 3).map((tag, index) => (
                        <span key={index} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                          {tag}
                        </span>
                      ))}
                      {workflow.tags.length > 3 && (
                        <span className="text-xs text-muted-foreground">+{workflow.tags.length - 3} more</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Workflow Details */}
          <div className="space-y-4">
            {selectedWorkflow ? (
              <>
                <h3 className="text-lg font-medium">Workflow Analysis</h3>
                
                {/* Basic Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      {selectedWorkflow.name}
                    </CardTitle>
                    <CardDescription>{selectedWorkflow.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3 sm:grid-cols-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Category:</span>
                        <div className="font-medium">{selectedWorkflow.category}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Complexity:</span>
                        <div className="font-medium capitalize">{selectedWorkflow.complexity}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Total Nodes:</span>
                        <div className="font-medium">{selectedWorkflow.nodes.total}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Source:</span>
                        <div className="font-medium capitalize">{selectedWorkflow.source}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Techniques */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="h-5 w-5" />
                      Techniques & Style
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <div className="text-sm font-medium mb-2">Techniques Used</div>
                        <div className="flex flex-wrap gap-1">
                          {selectedWorkflow.techniques.map((technique, index) => (
                            <span key={index} className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                              {technique}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      {selectedWorkflow.style_indicators.length > 0 && (
                        <div>
                          <div className="text-sm font-medium mb-2">Style Indicators</div>
                          <div className="flex flex-wrap gap-1">
                            {selectedWorkflow.style_indicators.map((style, index) => (
                              <span key={index} className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-1 rounded">
                                {style}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Performance Metrics */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Cpu className="h-5 w-5" />
                      Performance Metrics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3 sm:grid-cols-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Estimated Time:</span>
                        <div className="font-medium">{selectedWorkflow.performance_metrics.estimated_time}s</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Memory Usage:</span>
                        <div className="font-medium capitalize">{selectedWorkflow.performance_metrics.memory_usage}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">GPU Requirements:</span>
                        <div className="font-medium capitalize">{selectedWorkflow.performance_metrics.gpu_requirements}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Processing Stages:</span>
                        <div className="font-medium">{selectedWorkflow.workflow_structure.stages.length}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Parameters */}
                {(selectedWorkflow.parameters.models.length > 0 || selectedWorkflow.parameters.loras.length > 0) && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Parameters Used</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 text-sm">
                        {selectedWorkflow.parameters.models.length > 0 && (
                          <div>
                            <span className="text-muted-foreground">Models:</span>
                            <div className="font-medium">{selectedWorkflow.parameters.models.join(', ')}</div>
                          </div>
                        )}
                        
                        {selectedWorkflow.parameters.loras.length > 0 && (
                          <div>
                            <span className="text-muted-foreground">LoRAs:</span>
                            <div className="font-medium">{selectedWorkflow.parameters.loras.join(', ')}</div>
                          </div>
                        )}
                        
                        {selectedWorkflow.parameters.samplers.length > 0 && (
                          <div>
                            <span className="text-muted-foreground">Samplers:</span>
                            <div className="font-medium">{selectedWorkflow.parameters.samplers.join(', ')}</div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Node Types */}
                <Card>
                  <CardHeader>
                    <CardTitle>Node Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(selectedWorkflow.nodes.types)
                        .sort(([,a], [,b]) => b - a)
                        .map(([nodeType, count]) => (
                          <div key={nodeType} className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{nodeType}</span>
                            <span className="font-medium">{count}</span>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Eye className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">Select a Workflow</h3>
                  <p className="text-muted-foreground">
                    Choose a workflow from the left to view its detailed analysis
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
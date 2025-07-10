import { mlPromptAnalyzer } from './ml-prompt-analyzer';

export interface ComfyUIWorkflow {
  version: string;
  nodes: ComfyUINode[];
  links: number[][];
  groups: unknown[];
  config: Record<string, unknown>;
  extra: Record<string, unknown>;
}

export interface ComfyUINode {
  id: number;
  type: string;
  pos: [number, number];
  size: [number, number];
  flags: Record<string, unknown>;
  order: number;
  mode: number;
  inputs?: unknown[];
  outputs?: unknown[];
  properties?: Record<string, unknown>;
  widgets_values?: unknown[];
  color?: string;
  bgcolor?: string;
  title?: string;
}

export interface WorkflowAnalysis {
  id: string;
  name: string;
  description: string;
  tags: string[];
  complexity: 'simple' | 'medium' | 'complex';
  category: string;
  nodes: {
    total: number;
    types: Record<string, number>;
    key_nodes: string[];
  };
  parameters: {
    models: string[];
    loras: string[];
    samplers: string[];
    steps: number[];
    cfg: number[];
    resolutions: string[];
  };
  techniques: string[];
  style_indicators: string[];
  estimated_prompt_patterns: string[];
  workflow_structure: {
    stages: string[];
    parallel_branches: number;
    post_processing: string[];
  };
  performance_metrics: {
    estimated_time: number;
    memory_usage: 'low' | 'medium' | 'high';
    gpu_requirements: 'low' | 'medium' | 'high';
  };
  similarity_embedding: number[];
  created_at: string;
  source: 'imported' | 'generated';
}

export class WorkflowImporter {
  private workflowDatabase: WorkflowAnalysis[] = [];
  private initialized = false;

  async initialize() {
    if (this.initialized) return;
    
    // Load existing workflow database from localStorage
    try {
      const stored = localStorage.getItem('comfyui-workflow-database');
      if (stored) {
        this.workflowDatabase = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading workflow database:', error);
    }
    
    this.initialized = true;
  }

  async importWorkflow(workflowJson: ComfyUIWorkflow, metadata?: {
    name?: string;
    description?: string;
    tags?: string[];
  }): Promise<WorkflowAnalysis> {
    await this.initialize();
    
    try {
      const analysis = await this.analyzeWorkflow(workflowJson, metadata);
      
      // Add to database
      this.workflowDatabase.push(analysis);
      
      // Save to localStorage
      this.saveDatabase();
      
      return analysis;
    } catch (error) {
      console.error('Error importing workflow:', error);
      throw error;
    }
  }

  async importMultipleWorkflows(workflows: Array<{
    workflow: ComfyUIWorkflow;
    metadata?: { name?: string; description?: string; tags?: string[] };
  }>): Promise<WorkflowAnalysis[]> {
    const results = [];
    
    for (const { workflow, metadata } of workflows) {
      try {
        const analysis = await this.importWorkflow(workflow, metadata);
        results.push(analysis);
      } catch (error) {
        console.error('Error importing workflow:', error);
      }
    }
    
    return results;
  }

  private async analyzeWorkflow(workflow: ComfyUIWorkflow, metadata?: {
    name?: string;
    description?: string;
    tags?: string[];
  }): Promise<WorkflowAnalysis> {
    const id = this.generateWorkflowId();
    const nodes = this.extractNodes(workflow);
    const parameters = this.extractParameters(workflow);
    const techniques = this.identifyTechniques(workflow);
    const styleIndicators = this.extractStyleIndicators(workflow);
    const workflowStructure = this.analyzeWorkflowStructure(workflow);
    const performanceMetrics = this.estimatePerformanceMetrics(workflow);
    const estimatedPromptPatterns = this.generatePromptPatterns(workflow);
    
    // Create a description of the workflow for embedding
    const workflowDescription = this.createWorkflowDescription(workflow, techniques, styleIndicators);
    const similarityEmbedding = await mlPromptAnalyzer.getPromptEmbedding(workflowDescription);
    
    const complexity = this.determineComplexity(workflow);
    const category = this.categorizeWorkflow(workflow);
    
    return {
      id,
      name: metadata?.name || `Workflow ${id}`,
      description: metadata?.description || workflowDescription,
      tags: metadata?.tags || this.generateTags(workflow),
      complexity,
      category,
      nodes,
      parameters,
      techniques,
      style_indicators: styleIndicators,
      estimated_prompt_patterns: estimatedPromptPatterns,
      workflow_structure: workflowStructure,
      performance_metrics: performanceMetrics,
      similarity_embedding: similarityEmbedding,
      created_at: new Date().toISOString(),
      source: 'imported'
    };
  }

  private generateWorkflowId(): string {
    return `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private extractNodes(workflow: ComfyUIWorkflow) {
    const nodeTypes: Record<string, number> = {};
    const keyNodes: string[] = [];
    
    workflow.nodes.forEach(node => {
      nodeTypes[node.type] = (nodeTypes[node.type] || 0) + 1;
      
      // Identify key nodes that define the workflow
      if (this.isKeyNode(node.type)) {
        keyNodes.push(node.type);
      }
    });
    
    return {
      total: workflow.nodes.length,
      types: nodeTypes,
      key_nodes: keyNodes
    };
  }

  private isKeyNode(nodeType: string): boolean {
    const keyNodeTypes = [
      'KSampler', 'KSamplerAdvanced', 'CheckpointLoaderSimple', 'LoadCheckpoint',
      'LoraLoader', 'ControlNetLoader', 'VAEDecode', 'VAEEncode',
      'UpscaleModelLoader', 'ImageUpscaleWithModel', 'CLIPTextEncode'
    ];
    
    return keyNodeTypes.includes(nodeType);
  }

  private extractParameters(workflow: ComfyUIWorkflow) {
    const parameters = {
      models: [] as string[],
      loras: [] as string[],
      samplers: [] as string[],
      steps: [] as number[],
      cfg: [] as number[],
      resolutions: [] as string[]
    };
    
    workflow.nodes.forEach(node => {
      // Extract model information
      if (node.type.includes('Checkpoint') || node.type.includes('LoadCheckpoint')) {
        const modelName = this.extractModelName(node);
        if (modelName) parameters.models.push(modelName);
      }
      
      // Extract LoRA information
      if (node.type.includes('LoraLoader') || node.type.includes('Lora')) {
        const loraName = this.extractLoraName(node);
        if (loraName) parameters.loras.push(loraName);
      }
      
      // Extract sampler information
      if (node.type.includes('KSampler')) {
        const samplerName = this.extractSamplerName(node);
        if (samplerName) parameters.samplers.push(samplerName);
        
        const steps = this.extractSteps(node);
        if (steps) parameters.steps.push(steps);
        
        const cfg = this.extractCFG(node);
        if (cfg) parameters.cfg.push(cfg);
      }
      
      // Extract resolution information
      if (node.type.includes('EmptyLatentImage') || node.type.includes('LatentImage')) {
        const resolution = this.extractResolution(node);
        if (resolution) parameters.resolutions.push(resolution);
      }
    });
    
    return parameters;
  }

  private extractModelName(node: ComfyUINode): string | null {
    try {
      if (node.widgets_values && node.widgets_values.length > 0) {
        return String(node.widgets_values[0]);
      }
      return null;
    } catch {
      return null;
    }
  }

  private extractLoraName(node: ComfyUINode): string | null {
    try {
      if (node.widgets_values && node.widgets_values.length > 0) {
        return String(node.widgets_values[0]);
      }
      return null;
    } catch {
      return null;
    }
  }

  private extractSamplerName(node: ComfyUINode): string | null {
    try {
      if (node.widgets_values && node.widgets_values.length > 0) {
        return String(node.widgets_values[0]);
      }
      return null;
    } catch {
      return null;
    }
  }

  private extractSteps(node: ComfyUINode): number | null {
    try {
      if (node.widgets_values && node.widgets_values.length > 1) {
        return Number(node.widgets_values[1]);
      }
      return null;
    } catch {
      return null;
    }
  }

  private extractCFG(node: ComfyUINode): number | null {
    try {
      if (node.widgets_values && node.widgets_values.length > 2) {
        return Number(node.widgets_values[2]);
      }
      return null;
    } catch {
      return null;
    }
  }

  private extractResolution(node: ComfyUINode): string | null {
    try {
      if (node.widgets_values && node.widgets_values.length >= 2) {
        const width = Number(node.widgets_values[0]);
        const height = Number(node.widgets_values[1]);
        return `${width}x${height}`;
      }
      return null;
    } catch {
      return null;
    }
  }

  private identifyTechniques(workflow: ComfyUIWorkflow): string[] {
    const techniques: string[] = [];
    
    workflow.nodes.forEach(node => {
      // Identify techniques based on node types
      if (node.type.includes('ControlNet')) {
        techniques.push('ControlNet');
      }
      if (node.type.includes('Upscale')) {
        techniques.push('Upscaling');
      }
      if (node.type.includes('Lora')) {
        techniques.push('LoRA');
      }
      if (node.type.includes('VAE')) {
        techniques.push('VAE');
      }
      if (node.type.includes('Blend') || node.type.includes('Mix')) {
        techniques.push('Blending');
      }
      if (node.type.includes('Mask')) {
        techniques.push('Masking');
      }
      if (node.type.includes('Condition')) {
        techniques.push('Conditioning');
      }
    });
    
    return [...new Set(techniques)];
  }

  private extractStyleIndicators(workflow: ComfyUIWorkflow): string[] {
    const styleIndicators: string[] = [];
    
    workflow.nodes.forEach(node => {
      // Look for style indicators in model names and parameters
      if (node.widgets_values) {
        node.widgets_values.forEach(value => {
          const strValue = String(value).toLowerCase();
          
          if (strValue.includes('anime')) styleIndicators.push('anime');
          if (strValue.includes('realistic')) styleIndicators.push('realistic');
          if (strValue.includes('cartoon')) styleIndicators.push('cartoon');
          if (strValue.includes('photo')) styleIndicators.push('photographic');
          if (strValue.includes('art')) styleIndicators.push('artistic');
          if (strValue.includes('portrait')) styleIndicators.push('portrait');
          if (strValue.includes('landscape')) styleIndicators.push('landscape');
        });
      }
    });
    
    return [...new Set(styleIndicators)];
  }

  private analyzeWorkflowStructure(workflow: ComfyUIWorkflow) {
    const stages = this.identifyProcessingStages(workflow);
    const parallelBranches = this.countParallelBranches(workflow);
    const postProcessing = this.identifyPostProcessing(workflow);
    
    return {
      stages,
      parallel_branches: parallelBranches,
      post_processing: postProcessing
    };
  }

  private identifyProcessingStages(workflow: ComfyUIWorkflow): string[] {
    const stages: string[] = [];
    
    // Analyze node order to identify stages
    const sortedNodes = workflow.nodes.sort((a, b) => a.order - b.order);
    
    let hasGeneration = false;
    let hasUpscaling = false;
    let hasPostProcessing = false;
    
    sortedNodes.forEach(node => {
      if (node.type.includes('KSampler') && !hasGeneration) {
        stages.push('Generation');
        hasGeneration = true;
      }
      if (node.type.includes('Upscale') && !hasUpscaling) {
        stages.push('Upscaling');
        hasUpscaling = true;
      }
      if ((node.type.includes('Blend') || node.type.includes('Effect')) && !hasPostProcessing) {
        stages.push('Post-processing');
        hasPostProcessing = true;
      }
    });
    
    return stages;
  }

  private countParallelBranches(workflow: ComfyUIWorkflow): number {
    // Simplified analysis - count nodes with multiple outputs
    let branches = 0;
    
    workflow.nodes.forEach(node => {
      if (node.outputs && node.outputs.length > 1) {
        branches++;
      }
    });
    
    return Math.max(1, branches);
  }

  private identifyPostProcessing(workflow: ComfyUIWorkflow): string[] {
    const postProcessing: string[] = [];
    
    workflow.nodes.forEach(node => {
      if (node.type.includes('ColorCorrect')) postProcessing.push('color_correction');
      if (node.type.includes('Blur')) postProcessing.push('blur');
      if (node.type.includes('Sharpen')) postProcessing.push('sharpen');
      if (node.type.includes('Noise')) postProcessing.push('noise');
      if (node.type.includes('Grain')) postProcessing.push('film_grain');
    });
    
    return [...new Set(postProcessing)];
  }

  private estimatePerformanceMetrics(workflow: ComfyUIWorkflow) {
    const nodeCount = workflow.nodes.length;
    const hasUpscaling = workflow.nodes.some(n => n.type.includes('Upscale'));
    const hasControlNet = workflow.nodes.some(n => n.type.includes('ControlNet'));
    const hasMultipleModels = workflow.nodes.filter(n => n.type.includes('Checkpoint')).length > 1;
    
    let estimatedTime = 30; // Base time in seconds
    let memoryUsage: 'low' | 'medium' | 'high' = 'low';
    let gpuRequirements: 'low' | 'medium' | 'high' = 'low';
    
    // Adjust based on complexity
    if (nodeCount > 10) {
      estimatedTime += 30;
      memoryUsage = 'medium';
    }
    if (nodeCount > 20) {
      estimatedTime += 60;
      memoryUsage = 'high';
    }
    
    if (hasUpscaling) {
      estimatedTime += 45;
      gpuRequirements = 'medium';
    }
    
    if (hasControlNet) {
      estimatedTime += 30;
      gpuRequirements = 'medium';
    }
    
    if (hasMultipleModels) {
      estimatedTime += 20;
      memoryUsage = 'high';
      gpuRequirements = 'high';
    }
    
    return {
      estimated_time: estimatedTime,
      memory_usage: memoryUsage,
      gpu_requirements: gpuRequirements
    };
  }

  private generatePromptPatterns(workflow: ComfyUIWorkflow): string[] {
    const patterns: string[] = [];
    
    // Extract prompt patterns from CLIP text encode nodes
    workflow.nodes.forEach(node => {
      if (node.type.includes('CLIPTextEncode')) {
        if (node.widgets_values && node.widgets_values.length > 0) {
          const prompt = String(node.widgets_values[0]);
          if (prompt && prompt.length > 10) {
            patterns.push(prompt);
          }
        }
      }
    });
    
    return patterns;
  }

  private createWorkflowDescription(workflow: ComfyUIWorkflow, techniques: string[], styleIndicators: string[]): string {
    const nodeCount = workflow.nodes.length;
    const keyTechniques = techniques.slice(0, 3).join(', ');
    const keyStyles = styleIndicators.slice(0, 2).join(', ');
    
    return `ComfyUI workflow with ${nodeCount} nodes. Techniques: ${keyTechniques}. Style: ${keyStyles}`;
  }

  private determineComplexity(workflow: ComfyUIWorkflow): 'simple' | 'medium' | 'complex' {
    const nodeCount = workflow.nodes.length;
    const linkCount = workflow.links.length;
    
    if (nodeCount <= 8 && linkCount <= 10) return 'simple';
    if (nodeCount <= 16 && linkCount <= 25) return 'medium';
    return 'complex';
  }

  private categorizeWorkflow(workflow: ComfyUIWorkflow): string {
    const nodes = workflow.nodes;
    
    if (nodes.some(n => n.type.includes('ControlNet'))) return 'ControlNet';
    if (nodes.some(n => n.type.includes('Upscale'))) return 'Upscaling';
    if (nodes.some(n => n.type.includes('Lora'))) return 'LoRA';
    if (nodes.some(n => n.type.includes('Blend'))) return 'Blending';
    
    return 'Generation';
  }

  private generateTags(workflow: ComfyUIWorkflow): string[] {
    const tags: string[] = [];
    
    const techniques = this.identifyTechniques(workflow);
    const styleIndicators = this.extractStyleIndicators(workflow);
    const complexity = this.determineComplexity(workflow);
    
    tags.push(...techniques);
    tags.push(...styleIndicators);
    tags.push(complexity);
    
    return [...new Set(tags)];
  }

  private saveDatabase() {
    try {
      localStorage.setItem('comfyui-workflow-database', JSON.stringify(this.workflowDatabase));
    } catch (error) {
      console.error('Error saving workflow database:', error);
    }
  }

  getWorkflowDatabase(): WorkflowAnalysis[] {
    return this.workflowDatabase;
  }

  async findSimilarWorkflows(prompt: string, limit: number = 5): Promise<WorkflowAnalysis[]> {
    await this.initialize();
    
    if (this.workflowDatabase.length === 0) {
      return [];
    }
    
    try {
      const promptEmbedding = await mlPromptAnalyzer.getPromptEmbedding(prompt);
      
      const similarities = this.workflowDatabase.map(workflow => ({
        workflow,
        similarity: this.cosineSimilarity(promptEmbedding, workflow.similarity_embedding)
      }));
      
      return similarities
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit)
        .map(item => item.workflow);
    } catch (error) {
      console.error('Error finding similar workflows:', error);
      return [];
    }
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;
    
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    
    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    
    return dotProduct / (magnitudeA * magnitudeB);
  }

  deleteWorkflow(id: string): boolean {
    const index = this.workflowDatabase.findIndex(w => w.id === id);
    if (index !== -1) {
      this.workflowDatabase.splice(index, 1);
      this.saveDatabase();
      return true;
    }
    return false;
  }

  updateWorkflow(id: string, updates: Partial<WorkflowAnalysis>): boolean {
    const index = this.workflowDatabase.findIndex(w => w.id === id);
    if (index !== -1) {
      this.workflowDatabase[index] = { ...this.workflowDatabase[index], ...updates };
      this.saveDatabase();
      return true;
    }
    return false;
  }

  exportDatabase(): string {
    return JSON.stringify(this.workflowDatabase, null, 2);
  }

  importDatabase(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      if (Array.isArray(data)) {
        this.workflowDatabase = data;
        this.saveDatabase();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error importing database:', error);
      return false;
    }
  }
}

export const workflowImporter = new WorkflowImporter();
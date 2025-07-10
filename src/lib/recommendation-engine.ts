import type { PromptAnalysis } from './ml-prompt-analyzer';
import { workflowImporter, type WorkflowAnalysis } from './workflow-importer';

export interface WorkflowRecommendation {
  workflow: WorkflowAnalysis;
  score: number;
  reasons: string[];
  confidence: number;
  adaptations: string[];
}

export interface RecommendationContext {
  prompt: string;
  analysis: PromptAnalysis;
  preferences?: {
    complexity?: 'simple' | 'medium' | 'complex';
    speed?: 'fast' | 'balanced' | 'quality';
    style?: string;
    avoid_techniques?: string[];
  };
  constraints?: {
    max_nodes?: number;
    max_time?: number;
    memory_limit?: 'low' | 'medium' | 'high';
  };
}

export interface SmartRecommendation {
  models: Array<{
    name: string;
    score: number;
    reasons: string[];
  }>;
  loras: Array<{
    name: string;
    strength: number;
    reasons: string[];
  }>;
  parameters: {
    sampler: string;
    steps: number;
    cfg: number;
    resolution: string;
    denoise?: number;
  };
  workflow_suggestions: WorkflowRecommendation[];
  optimization_tips: string[];
  style_enhancements: string[];
}

export class RecommendationEngine {
  private initialized = false;
  private modelPerformanceData: Map<string, unknown> = new Map();
  private userPreferences: Record<string, unknown> = {};

  async initialize() {
    if (this.initialized) return;
    
    await workflowImporter.initialize();
    
    // Load user preferences
    try {
      const prefs = localStorage.getItem('comfyui-user-preferences');
      if (prefs) {
        this.userPreferences = JSON.parse(prefs);
      }
    } catch (error) {
      console.error('Error loading user preferences:', error);
    }
    
    this.initialized = true;
  }

  async generateRecommendations(context: RecommendationContext): Promise<SmartRecommendation> {
    await this.initialize();
    
    try {
      const [modelRecs, loraRecs, paramRecs, workflowRecs] = await Promise.all([
        this.recommendModels(context),
        this.recommendLoras(context),
        this.recommendParameters(context),
        this.recommendWorkflows(context)
      ]);

      const optimizationTips = this.generateOptimizationTips(context);
      const styleEnhancements = this.generateStyleEnhancements(context);

      return {
        models: modelRecs,
        loras: loraRecs,
        parameters: paramRecs,
        workflow_suggestions: workflowRecs,
        optimization_tips: optimizationTips,
        style_enhancements: styleEnhancements
      };
    } catch (error) {
      console.error('Error generating recommendations:', error);
      throw error;
    }
  }

  private async recommendModels(context: RecommendationContext) {
    const { analysis } = context;

    // Score models based on analysis
    const modelScores = new Map<string, { score: number; reasons: string[] }>();

    // Base models for different styles
    const baseModels = {
      photorealistic: [
        { name: 'realvisxl-v4.0.safetensors', base_score: 0.9 },
        { name: 'juggernaut-xl-v9.safetensors', base_score: 0.8 },
        { name: 'copax-realistic-xl-v1.safetensors', base_score: 0.7 }
      ],
      anime: [
        { name: 'animagine-xl-3.1.safetensors', base_score: 0.9 },
        { name: 'pony-diffusion-v6-xl.safetensors', base_score: 0.8 },
        { name: 'counterfeit-v3.0.safetensors', base_score: 0.7 }
      ],
      artistic: [
        { name: 'sd_xl_base_1.0.safetensors', base_score: 0.8 },
        { name: 'dreamshaperxl-v2.safetensors', base_score: 0.7 },
        { name: 'protovision-xl-v6.safetensors', base_score: 0.6 }
      ]
    };

    // Determine primary style
    const primaryStyle = analysis.classifications.primary_style;
    const relevantModels = baseModels[primaryStyle as keyof typeof baseModels] || baseModels.artistic;

    for (const model of relevantModels) {
      let score = model.base_score;
      const reasons = [];

      // Adjust score based on image type
      if (analysis.classifications.image_type === 'portrait' && model.name.includes('realistic')) {
        score += 0.1;
        reasons.push('Excellent for portraits');
      }

      // Adjust based on quality requirements
      if (analysis.classifications.quality_level === 'professional') {
        if (model.name.includes('realvis') || model.name.includes('juggernaut')) {
          score += 0.15;
          reasons.push('Professional quality output');
        }
      }

      // Adjust based on user preferences
      if (context.preferences?.speed === 'fast' && model.name.includes('xl')) {
        score -= 0.1;
        reasons.push('May be slower due to XL model');
      }

      // Adjust based on complexity
      if (analysis.classifications.complexity_level === 'simple') {
        score += 0.05;
        reasons.push('Good for simple workflows');
      }

      modelScores.set(model.name, { score, reasons });
    }

    // Convert to sorted array
    const sortedModels = Array.from(modelScores.entries())
      .sort(([, a], [, b]) => b.score - a.score)
      .slice(0, 3);

    return sortedModels.map(([name, { score, reasons }]) => ({
      name,
      score,
      reasons
    }));
  }

  private async recommendLoras(context: RecommendationContext) {
    const { analysis } = context;

    // Base LoRA recommendations
    const loraRecommendations = [];

    // Detail enhancement
    if (analysis.classifications.quality_level === 'high' || analysis.classifications.quality_level === 'professional') {
      loraRecommendations.push({
        name: 'add_detail_xl.safetensors',
        strength: 0.7,
        reasons: ['Enhances image detail and sharpness']
      });
    }

    // Style-specific LoRAs
    if (analysis.entities.artistic_styles.includes('film') || analysis.entities.moods.includes('vintage')) {
      loraRecommendations.push({
        name: 'film_grain_v1.safetensors',
        strength: 0.5,
        reasons: ['Adds authentic film grain texture']
      });
    }

    // Face enhancement for portraits
    if (analysis.classifications.image_type === 'portrait' || analysis.entities.subjects.includes('face')) {
      loraRecommendations.push({
        name: 'face_enhance_v1.safetensors',
        strength: 0.6,
        reasons: ['Improves facial features and realism']
      });
    }

    // Watercolor style
    if (analysis.entities.artistic_styles.includes('watercolor') || analysis.entities.techniques.includes('watercolor')) {
      loraRecommendations.push({
        name: 'watercolor_v2.safetensors',
        strength: 0.8,
        reasons: ['Creates authentic watercolor painting style']
      });
    }

    // Lighting enhancement
    if (analysis.entities.lighting.length > 0) {
      loraRecommendations.push({
        name: 'lighting_enhance_v1.safetensors',
        strength: 0.5,
        reasons: ['Improves lighting quality and atmosphere']
      });
    }

    // Sort by relevance and limit
    return loraRecommendations.slice(0, 3);
  }

  private async recommendParameters(context: RecommendationContext) {
    const { analysis, preferences, constraints } = context;
    
    // Base parameters
    const parameters = {
      sampler: 'euler',
      steps: 20,
      cfg: 7,
      resolution: '1024x1024',
      denoise: undefined as number | undefined
    };

    // Adjust sampler based on quality and speed preferences
    if (preferences?.speed === 'fast') {
      parameters.sampler = 'euler_a';
      parameters.steps = 15;
    } else if (preferences?.speed === 'quality') {
      parameters.sampler = 'dpmpp_2m_karras';
      parameters.steps = 30;
    }

    // Adjust based on complexity
    if (analysis.classifications.complexity_level === 'complex') {
      parameters.steps += 5;
      parameters.cfg = 6; // Lower CFG for complex prompts
    }

    // Adjust resolution based on image type
    if (analysis.classifications.image_type === 'portrait') {
      parameters.resolution = '768x1024';
    } else if (analysis.classifications.image_type === 'landscape') {
      parameters.resolution = '1024x768';
    }

    // Quality-based adjustments
    if (analysis.classifications.quality_level === 'professional') {
      parameters.steps = Math.max(parameters.steps, 25);
      parameters.sampler = 'dpmpp_2m_karras';
    }

    // Apply constraints
    if (constraints?.max_time && parameters.steps > 20) {
      parameters.steps = Math.min(parameters.steps, 20);
    }

    return parameters;
  }

  private async recommendWorkflows(context: RecommendationContext): Promise<WorkflowRecommendation[]> {
    const { prompt, analysis, preferences } = context;
    
    // Find similar workflows from the database
    const similarWorkflows = await workflowImporter.findSimilarWorkflows(prompt, 10);
    
    const recommendations: WorkflowRecommendation[] = [];
    
    for (const workflow of similarWorkflows) {
      const score = this.calculateWorkflowScore(workflow, analysis, preferences);
      const reasons = this.generateWorkflowReasons(workflow, analysis);
      const adaptations = this.generateAdaptations(workflow, analysis);
      const confidence = this.calculateConfidence(workflow, analysis);
      
      if (score > 0.3) { // Minimum threshold
        recommendations.push({
          workflow,
          score,
          reasons,
          confidence,
          adaptations
        });
      }
    }
    
    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }

  private calculateWorkflowScore(workflow: WorkflowAnalysis, analysis: PromptAnalysis, preferences?: Record<string, unknown>): number {
    let score = 0;
    
    // Style matching
    const styleMatch = this.calculateStyleMatch(workflow, analysis);
    score += styleMatch * 0.3;
    
    // Complexity matching
    const complexityMatch = workflow.complexity === analysis.classifications.complexity_level ? 0.2 : 0;
    score += complexityMatch;
    
    // Technique relevance
    const techniqueMatch = this.calculateTechniqueMatch(workflow, analysis);
    score += techniqueMatch * 0.25;
    
    // Quality level matching
    const qualityMatch = this.calculateQualityMatch(workflow, analysis);
    score += qualityMatch * 0.15;
    
    // User preference bonus
    if (preferences) {
      const prefMatch = this.calculatePreferenceMatch(workflow, preferences);
      score += prefMatch * 0.1;
    }
    
    return Math.min(score, 1);
  }

  private calculateStyleMatch(workflow: WorkflowAnalysis, analysis: PromptAnalysis): number {
    const workflowStyles = workflow.style_indicators;
    const promptStyles = analysis.entities.artistic_styles;
    
    if (workflowStyles.length === 0 || promptStyles.length === 0) {
      return 0.5; // Neutral score
    }
    
    const matches = workflowStyles.filter(style => 
      promptStyles.some(pStyle => 
        pStyle.toLowerCase().includes(style.toLowerCase()) ||
        style.toLowerCase().includes(pStyle.toLowerCase())
      )
    ).length;
    
    return matches / Math.max(workflowStyles.length, promptStyles.length);
  }

  private calculateTechniqueMatch(workflow: WorkflowAnalysis, analysis: PromptAnalysis): number {
    const requiredTechniques = [];
    
    if (analysis.entities.parameters.includes('upscale')) {
      requiredTechniques.push('Upscaling');
    }
    if (analysis.entities.parameters.includes('lora')) {
      requiredTechniques.push('LoRA');
    }
    if (analysis.entities.parameters.includes('controlnet')) {
      requiredTechniques.push('ControlNet');
    }
    
    if (requiredTechniques.length === 0) {
      return 0.5;
    }
    
    const matches = requiredTechniques.filter(tech => 
      workflow.techniques.includes(tech)
    ).length;
    
    return matches / requiredTechniques.length;
  }

  private calculateQualityMatch(workflow: WorkflowAnalysis, analysis: PromptAnalysis): number {
    const qualityLevel = analysis.classifications.quality_level;
    
    if (qualityLevel === 'professional' && workflow.performance_metrics.gpu_requirements === 'high') {
      return 1;
    }
    if (qualityLevel === 'high' && workflow.performance_metrics.gpu_requirements === 'medium') {
      return 0.8;
    }
    if (qualityLevel === 'standard' && workflow.performance_metrics.gpu_requirements === 'low') {
      return 0.6;
    }
    
    return 0.5;
  }

  private calculatePreferenceMatch(workflow: WorkflowAnalysis, preferences: Record<string, unknown>): number {
    let score = 0;
    
    if (preferences.complexity && workflow.complexity === preferences.complexity) {
      score += 0.5;
    }
    
    if (preferences.speed === 'fast' && workflow.performance_metrics.estimated_time < 60) {
      score += 0.3;
    }
    
    if (preferences.avoid_techniques && Array.isArray(preferences.avoid_techniques)) {
      const hasAvoidedTechniques = (preferences.avoid_techniques as string[]).some((tech: string) => 
        workflow.techniques.includes(tech)
      );
      if (hasAvoidedTechniques) {
        score -= 0.5;
      }
    }
    
    return Math.max(0, Math.min(1, score));
  }

  private generateWorkflowReasons(workflow: WorkflowAnalysis, analysis: PromptAnalysis): string[] {
    const reasons = [];
    
    if (workflow.complexity === analysis.classifications.complexity_level) {
      reasons.push(`Matches ${analysis.classifications.complexity_level} complexity requirement`);
    }
    
    if (workflow.style_indicators.some(style => 
      analysis.entities.artistic_styles.includes(style)
    )) {
      reasons.push('Compatible with requested art style');
    }
    
    if (workflow.techniques.length > 0) {
      reasons.push(`Uses advanced techniques: ${workflow.techniques.slice(0, 2).join(', ')}`);
    }
    
    if (workflow.performance_metrics.estimated_time < 120) {
      reasons.push('Optimized for fast generation');
    }
    
    return reasons;
  }

  private generateAdaptations(workflow: WorkflowAnalysis, analysis: PromptAnalysis): string[] {
    const adaptations = [];
    
    if (analysis.entities.parameters.includes('upscale') && !workflow.techniques.includes('Upscaling')) {
      adaptations.push('Add upscaling nodes for higher resolution');
    }
    
    if (analysis.classifications.quality_level === 'professional' && workflow.performance_metrics.gpu_requirements === 'low') {
      adaptations.push('Increase sampling steps for higher quality');
    }
    
    if (analysis.entities.artistic_styles.length > 0 && workflow.style_indicators.length === 0) {
      adaptations.push('Add style-specific LoRAs for better style matching');
    }
    
    return adaptations;
  }

  private calculateConfidence(workflow: WorkflowAnalysis, analysis: PromptAnalysis): number {
    // Calculate confidence based on how well the workflow matches the analysis
    const styleMatch = this.calculateStyleMatch(workflow, analysis);
    const techniqueMatch = this.calculateTechniqueMatch(workflow, analysis);
    const qualityMatch = this.calculateQualityMatch(workflow, analysis);
    
    return (styleMatch + techniqueMatch + qualityMatch) / 3;
  }

  private generateOptimizationTips(context: RecommendationContext): string[] {
    const { analysis, preferences, constraints } = context;
    const tips = [];
    
    if (analysis.classifications.complexity_level === 'complex') {
      tips.push('Consider breaking down complex prompts into multiple stages');
    }
    
    if (preferences?.speed === 'fast') {
      tips.push('Use Euler A sampler with 15-20 steps for faster generation');
    }
    
    if (constraints?.memory_limit === 'low') {
      tips.push('Avoid multiple high-resolution upscaling steps');
    }
    
    if (analysis.entities.parameters.includes('cfg')) {
      tips.push('Lower CFG (5-7) for complex prompts, higher CFG (8-12) for simple prompts');
    }
    
    return tips;
  }

  private generateStyleEnhancements(context: RecommendationContext): string[] {
    const { analysis } = context;
    const enhancements = [];
    
    if (analysis.entities.artistic_styles.includes('photorealistic')) {
      enhancements.push('Add negative prompts: "cartoon, anime, painting, sketch"');
    }
    
    if (analysis.entities.moods.includes('dramatic')) {
      enhancements.push('Enhance with dramatic lighting and high contrast');
    }
    
    if (analysis.classifications.image_type === 'portrait') {
      enhancements.push('Use portrait-optimized aspect ratios (3:4 or 4:5)');
    }
    
    if (analysis.sentiment.mood === 'calm') {
      enhancements.push('Add soft lighting and muted colors for peaceful atmosphere');
    }
    
    return enhancements;
  }

  saveUserPreferences(preferences: Record<string, unknown>) {
    this.userPreferences = { ...this.userPreferences, ...preferences };
    try {
      localStorage.setItem('comfyui-user-preferences', JSON.stringify(this.userPreferences));
    } catch (error) {
      console.error('Error saving user preferences:', error);
    }
  }

  getUserPreferences() {
    return this.userPreferences;
  }

  async learnFromWorkflow(workflowId: string, userRating: number, feedback?: string) {
    // Learn from user feedback to improve future recommendations
    const workflow = workflowImporter.getWorkflowDatabase().find(w => w.id === workflowId);
    
    if (workflow) {
      // Update workflow metadata with user feedback
      const updates = {
        ...workflow,
        user_rating: userRating,
        user_feedback: feedback
      };
      
      workflowImporter.updateWorkflow(workflowId, updates);
      
      // Update model performance data
      if (workflow.parameters.models.length > 0) {
        const modelName = workflow.parameters.models[0];
        const currentData = (this.modelPerformanceData.get(modelName) as { ratings: number[]; count: number }) || { ratings: [], count: 0 };
        
        currentData.ratings.push(userRating);
        currentData.count++;
        
        this.modelPerformanceData.set(modelName, currentData);
      }
    }
  }
}

export const recommendationEngine = new RecommendationEngine();
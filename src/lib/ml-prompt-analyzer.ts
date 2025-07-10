import { pipeline, env } from '@huggingface/transformers';

// Configure to use local models for better performance
env.allowRemoteModels = false;
env.allowLocalModels = true;

export interface PromptAnalysis {
  entities: {
    artistic_styles: string[];
    subjects: string[];
    techniques: string[];
    moods: string[];
    colors: string[];
    compositions: string[];
    lighting: string[];
    models: string[];
    parameters: string[];
  };
  classifications: {
    primary_style: string;
    complexity_level: 'simple' | 'medium' | 'complex';
    image_type: 'portrait' | 'landscape' | 'character' | 'scene' | 'product' | 'abstract';
    art_movement: string;
    quality_level: 'standard' | 'high' | 'professional';
  };
  sentiment: {
    mood: 'calm' | 'energetic' | 'dramatic' | 'mysterious' | 'joyful' | 'melancholic';
    intensity: number; // 0-1
    confidence: number; // 0-1
  };
  technical_requirements: {
    suggested_models: string[];
    suggested_loras: string[];
    suggested_samplers: string[];
    suggested_steps: number;
    suggested_cfg: number;
    suggested_resolution: string;
  };
  workflow_complexity: {
    estimated_nodes: number;
    processing_stages: string[];
    post_processing: string[];
  };
}

export class MLPromptAnalyzer {
  private nerPipeline: unknown = null;
  private classificationPipeline: unknown = null;
  private sentimentPipeline: unknown = null;
  private embeddingPipeline: unknown = null;
  private initialized = false;

  async initialize() {
    if (this.initialized) return;

    try {
      // Initialize NER pipeline for entity extraction
      this.nerPipeline = await pipeline('ner', 'Xenova/bert-base-NER');
      
      // Initialize classification pipeline for style detection
      this.classificationPipeline = await pipeline('zero-shot-classification', 'Xenova/nli-deberta-v3-xsmall');
      
      // Initialize sentiment analysis
      this.sentimentPipeline = await pipeline('sentiment-analysis', 'Xenova/distilbert-base-uncased-finetuned-sst-2-english');
      
      // Initialize embedding pipeline for similarity
      this.embeddingPipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
      
      this.initialized = true;
      console.log('ML Prompt Analyzer initialized successfully');
    } catch (error) {
      console.error('Failed to initialize ML models:', error);
      throw error;
    }
  }

  async analyzePrompt(prompt: string): Promise<PromptAnalysis> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Run all analyses in parallel for better performance
      const [entities, classifications, sentiment, technical] = await Promise.all([
        this.extractEntities(prompt),
        this.classifyPrompt(prompt),
        this.analyzeSentiment(prompt),
        this.analyzeTechnicalRequirements(prompt)
      ]);

      const workflowComplexity = this.estimateWorkflowComplexity(prompt, entities, classifications);

      return {
        entities,
        classifications,
        sentiment,
        technical_requirements: technical,
        workflow_complexity: workflowComplexity
      };
    } catch (error) {
      console.error('Error analyzing prompt:', error);
      throw error;
    }
  }

  private async extractEntities(prompt: string) {
    const entities = {
      artistic_styles: [] as string[],
      subjects: [] as string[],
      techniques: [] as string[],
      moods: [] as string[],
      colors: [] as string[],
      compositions: [] as string[],
      lighting: [] as string[],
      models: [] as string[],
      parameters: [] as string[]
    };

    try {
      // Use NER to extract named entities
      const nerResults = await (this.nerPipeline as (text: string) => Promise<Array<{ word: string; entity: string }>>)(prompt);
      
      // Process NER results and categorize them
      for (const result of nerResults) {
        const entity = result.word.toLowerCase();
        const entityType = this.categorizeEntity(entity);
        
        if (entityType && entities[entityType as keyof typeof entities] && !entities[entityType as keyof typeof entities].includes(entity)) {
          entities[entityType as keyof typeof entities].push(entity);
        }
      }

      // Use pattern matching for artistic terms not caught by NER
      this.extractArtisticTerms(prompt, entities);
      
      return entities;
    } catch (error) {
      console.error('Error extracting entities:', error);
      return entities;
    }
  }

  private categorizeEntity(entity: string): keyof PromptAnalysis['entities'] | null {
    const styleKeywords = ['photorealistic', 'anime', 'cartoon', 'realistic', 'abstract', 'impressionist', 'surreal'];
    const subjectKeywords = ['portrait', 'landscape', 'character', 'person', 'face', 'building', 'nature'];
    const techniqueKeywords = ['oil painting', 'watercolor', 'digital art', 'pencil drawing', 'photography'];
    const moodKeywords = ['dramatic', 'peaceful', 'energetic', 'mysterious', 'joyful', 'melancholic'];
    const colorKeywords = ['vibrant', 'muted', 'warm', 'cool', 'monochrome', 'colorful'];
    const lightingKeywords = ['soft lighting', 'harsh lighting', 'natural light', 'studio lighting', 'golden hour'];
    const modelKeywords = ['sd1.5', 'sdxl', 'checkpoint', 'lora', 'embedding'];
    const parameterKeywords = ['steps', 'cfg', 'sampler', 'seed', 'denoise'];

    if (styleKeywords.some(keyword => entity.includes(keyword))) return 'artistic_styles';
    if (subjectKeywords.some(keyword => entity.includes(keyword))) return 'subjects';
    if (techniqueKeywords.some(keyword => entity.includes(keyword))) return 'techniques';
    if (moodKeywords.some(keyword => entity.includes(keyword))) return 'moods';
    if (colorKeywords.some(keyword => entity.includes(keyword))) return 'colors';
    if (lightingKeywords.some(keyword => entity.includes(keyword))) return 'lighting';
    if (modelKeywords.some(keyword => entity.includes(keyword))) return 'models';
    if (parameterKeywords.some(keyword => entity.includes(keyword))) return 'parameters';

    return null;
  }

  private extractArtisticTerms(prompt: string, entities: PromptAnalysis['entities']) {
    const lowerPrompt = prompt.toLowerCase();
    
    // Art styles
    const artStyles = ['photorealistic', 'anime', 'cartoon', 'realistic', 'abstract', 'impressionist', 'surreal', 'cyberpunk', 'steampunk', 'fantasy'];
    artStyles.forEach(style => {
      if (lowerPrompt.includes(style) && !entities.artistic_styles.includes(style)) {
        entities.artistic_styles.push(style);
      }
    });

    // Technical parameters
    const technicalTerms = ['upscale', 'denoise', 'cfg', 'steps', 'sampler', 'seed'];
    technicalTerms.forEach(term => {
      if (lowerPrompt.includes(term) && !entities.parameters.includes(term)) {
        entities.parameters.push(term);
      }
    });

    // Lighting and composition
    const lightingTerms = ['soft light', 'harsh light', 'golden hour', 'studio lighting', 'natural light'];
    lightingTerms.forEach(term => {
      if (lowerPrompt.includes(term) && !entities.lighting.includes(term)) {
        entities.lighting.push(term);
      }
    });
  }

  private async classifyPrompt(prompt: string) {
    try {
      const styleLabels = ['photorealistic', 'anime', 'artistic', 'abstract', 'fantasy', 'cyberpunk', 'vintage'];
      const imageTypeLabels = ['portrait', 'landscape', 'character', 'scene', 'product', 'abstract'];
      const artMovementLabels = ['impressionist', 'surreal', 'modern', 'classical', 'contemporary'];
      const qualityLabels = ['standard', 'high quality', 'professional'];

      const [styleResult, imageTypeResult, artMovementResult, qualityResult] = await Promise.all([
        (this.classificationPipeline as (text: string, labels: string[]) => Promise<{ labels: string[] }>)(prompt, styleLabels),
        (this.classificationPipeline as (text: string, labels: string[]) => Promise<{ labels: string[] }>)(prompt, imageTypeLabels),
        (this.classificationPipeline as (text: string, labels: string[]) => Promise<{ labels: string[] }>)(prompt, artMovementLabels),
        (this.classificationPipeline as (text: string, labels: string[]) => Promise<{ labels: string[] }>)(prompt, qualityLabels)
      ]);

      const complexity = this.determineComplexity(prompt);

      return {
        primary_style: styleResult.labels[0],
        complexity_level: complexity,
        image_type: imageTypeResult.labels[0] as 'portrait' | 'landscape' | 'character' | 'scene' | 'product' | 'abstract',
        art_movement: artMovementResult.labels[0],
        quality_level: (qualityResult.labels[0] === 'standard' ? 'standard' : 
                      qualityResult.labels[0] === 'high quality' ? 'high' : 'professional') as 'standard' | 'high' | 'professional'
      };
    } catch (error) {
      console.error('Error in classification:', error);
      return {
        primary_style: 'realistic',
        complexity_level: 'medium' as const,
        image_type: 'scene' as const,
        art_movement: 'contemporary',
        quality_level: 'standard' as const
      };
    }
  }

  private determineComplexity(prompt: string): 'simple' | 'medium' | 'complex' {
    const complexityIndicators = prompt.toLowerCase().split(/[,;.]/).length;
    const advancedTerms = ['lora', 'controlnet', 'upscale', 'denoise', 'blend', 'composite'];
    const advancedCount = advancedTerms.filter(term => prompt.toLowerCase().includes(term)).length;

    if (complexityIndicators <= 2 && advancedCount === 0) return 'simple';
    if (complexityIndicators <= 4 && advancedCount <= 2) return 'medium';
    return 'complex';
  }

  private async analyzeSentiment(prompt: string) {
    try {
      const sentimentResult = await (this.sentimentPipeline as (text: string) => Promise<Array<{ label: string; score: number }>>)(prompt);
      
      // Map sentiment to mood
      const moodMapping = {
        'POSITIVE': ['joyful', 'energetic', 'calm'][Math.floor(Math.random() * 3)],
        'NEGATIVE': ['melancholic', 'mysterious', 'dramatic'][Math.floor(Math.random() * 3)]
      };

      const mood = moodMapping[sentimentResult[0].label as keyof typeof moodMapping] || 'calm';
      
      return {
        mood: mood as 'calm' | 'energetic' | 'dramatic' | 'mysterious' | 'joyful' | 'melancholic',
        intensity: sentimentResult[0].score,
        confidence: sentimentResult[0].score
      };
    } catch (error) {
      console.error('Error analyzing sentiment:', error);
      return {
        mood: 'calm' as const,
        intensity: 0.5,
        confidence: 0.5
      };
    }
  }

  private async analyzeTechnicalRequirements(prompt: string) {
    // Extract technical requirements based on prompt analysis
    const lowerPrompt = prompt.toLowerCase();
    
    const suggested_models = this.suggestModels(lowerPrompt);
    const suggested_loras = this.suggestLoras(lowerPrompt);
    const suggested_samplers = this.suggestSamplers(lowerPrompt);
    const suggested_steps = this.suggestSteps(lowerPrompt);
    const suggested_cfg = this.suggestCFG(lowerPrompt);
    const suggested_resolution = this.suggestResolution(lowerPrompt);

    return {
      suggested_models,
      suggested_loras,
      suggested_samplers,
      suggested_steps,
      suggested_cfg,
      suggested_resolution
    };
  }

  private suggestModels(prompt: string): string[] {
    if (prompt.includes('anime')) return ['animagine-xl-3.1.safetensors'];
    if (prompt.includes('portrait')) return ['realvisxl-v4.0.safetensors'];
    if (prompt.includes('photorealistic')) return ['juggernaut-xl-v9.safetensors'];
    return ['sd_xl_base_1.0.safetensors'];
  }

  private suggestLoras(prompt: string): string[] {
    const loras = [];
    if (prompt.includes('detail')) loras.push('add_detail_xl.safetensors');
    if (prompt.includes('film grain')) loras.push('film_grain_v1.safetensors');
    if (prompt.includes('face')) loras.push('face_enhance_v1.safetensors');
    return loras;
  }

  private suggestSamplers(prompt: string): string[] {
    if (prompt.includes('high quality')) return ['dpmpp_2m_karras'];
    if (prompt.includes('fast')) return ['euler_a'];
    return ['euler', 'dpmpp_2m'];
  }

  private suggestSteps(prompt: string): number {
    if (prompt.includes('high quality')) return 30;
    if (prompt.includes('fast')) return 15;
    return 20;
  }

  private suggestCFG(prompt: string): number {
    if (prompt.includes('creative')) return 9;
    if (prompt.includes('precise')) return 5;
    return 7;
  }

  private suggestResolution(prompt: string): string {
    if (prompt.includes('portrait')) return '768x1024';
    if (prompt.includes('landscape')) return '1024x768';
    return '1024x1024';
  }

  private estimateWorkflowComplexity(prompt: string, entities: PromptAnalysis['entities'], classifications: PromptAnalysis['classifications']) {
    const baseNodes = 5; // Basic generation workflow
    let additionalNodes = 0;

    // Add nodes based on entities and requirements
    if (entities.parameters.includes('upscale')) additionalNodes += 3;
    if (entities.lighting.length > 0) additionalNodes += 2;
    if (classifications.complexity_level === 'complex') additionalNodes += 4;

    const processingStages = ['generation'];
    if (entities.parameters.includes('upscale')) processingStages.push('upscaling');
    if (entities.techniques.length > 0) processingStages.push('styling');

    const postProcessing = [];
    if (prompt.toLowerCase().includes('grain')) postProcessing.push('film_grain');
    if (prompt.toLowerCase().includes('enhance')) postProcessing.push('detail_enhancement');

    return {
      estimated_nodes: baseNodes + additionalNodes,
      processing_stages: processingStages,
      post_processing: postProcessing
    };
  }

  async getPromptEmbedding(prompt: string): Promise<number[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const result = await (this.embeddingPipeline as (text: string) => Promise<{ data: Float32Array }>)(prompt);
      return Array.from(result.data);
    } catch (error) {
      console.error('Error getting prompt embedding:', error);
      return [];
    }
  }

  async findSimilarPrompts(prompt: string, existingPrompts: string[]): Promise<Array<{prompt: string, similarity: number}>> {
    try {
      const targetEmbedding = await this.getPromptEmbedding(prompt);
      const similarities = [];

      for (const existingPrompt of existingPrompts) {
        const embedding = await this.getPromptEmbedding(existingPrompt);
        const similarity = this.cosineSimilarity(targetEmbedding, embedding);
        similarities.push({ prompt: existingPrompt, similarity });
      }

      return similarities.sort((a, b) => b.similarity - a.similarity);
    } catch (error) {
      console.error('Error finding similar prompts:', error);
      return [];
    }
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    
    return dotProduct / (magnitudeA * magnitudeB);
  }
}

export const mlPromptAnalyzer = new MLPromptAnalyzer();
// Hugging Face Inference API client
class HuggingFaceInference {
  private readonly apiKey: string | null;
  private readonly baseUrl = 'https://api-inference.huggingface.co/models';

  constructor() {
    this.apiKey = process.env.HUGGINGFACE_API_KEY || null;
  }

  async query(model: string, inputs: string | Record<string, unknown>, options: Record<string, unknown> = {}) {
    if (!this.apiKey) {
      throw new Error('Hugging Face API key not configured');
    }

    const response = await fetch(`${this.baseUrl}/${model}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs,
        options: {
          wait_for_model: true,
          ...options
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`HF API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }
}

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
  private hf: HuggingFaceInference;
  private initialized = false;

  constructor() {
    this.hf = new HuggingFaceInference();
  }

  async initialize() {
    if (this.initialized) return;
    
    // No heavy model loading needed - just mark as initialized
    this.initialized = true;
    console.log('ML Prompt Analyzer initialized (using HF Inference API)');
  }

  async analyzePrompt(prompt: string): Promise<PromptAnalysis> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Run all analyses in parallel using HF Inference API
      const [entities, classifications, sentiment, technical] = await Promise.all([
        this.extractEntities(prompt),
        this.classifyPrompt(prompt),
        this.analyzeSentiment(prompt),
        Promise.resolve(this.analyzeTechnicalRequirements(prompt))
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
      console.error('Error analyzing prompt with HF API:', error);
      // Fallback to basic analysis if API fails
      return await this.getBasicAnalysis(prompt);
    }
  }

  private async getBasicAnalysis(prompt: string): Promise<PromptAnalysis> {
    // Basic pattern-based analysis as fallback
    const lowerPrompt = prompt.toLowerCase();
    
    const entities = {
      artistic_styles: [],
      subjects: [],
      techniques: [],
      moods: [],
      colors: [],
      compositions: [],
      lighting: [],
      models: [],
      parameters: []
    };

    // Extract basic patterns
    this.extractArtisticTerms(prompt, entities);

    const classifications = {
      primary_style: lowerPrompt.includes('anime') ? 'anime' : 
                    lowerPrompt.includes('photo') ? 'photorealistic' : 'artistic',
      complexity_level: this.determineComplexity(prompt),
      image_type: (lowerPrompt.includes('portrait') ? 'portrait' : 
                 lowerPrompt.includes('landscape') ? 'landscape' : 'scene') as 'portrait' | 'landscape' | 'character' | 'scene' | 'product' | 'abstract',
      art_movement: 'contemporary',
      quality_level: (lowerPrompt.includes('high') ? 'high' : 'standard') as 'standard' | 'high' | 'professional'
    };

    const sentiment = {
      mood: 'calm' as const,
      intensity: 0.5,
      confidence: 0.5
    };

    const technical_requirements = await this.analyzeTechnicalRequirements(prompt);
    const workflow_complexity = this.estimateWorkflowComplexity(prompt, entities, classifications);

    return {
      entities,
      classifications,
      sentiment,
      technical_requirements,
      workflow_complexity
    };
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
      // Use HF Inference API for NER
      const nerResults = await this.hf.query('dbmdz/bert-large-cased-finetuned-conll03-english', prompt);
      
      // Process NER results and categorize them
      if (Array.isArray(nerResults)) {
        for (const result of nerResults) {
          if (result.word) {
            const entity = result.word.toLowerCase();
            const entityType = this.categorizeEntity(entity);
            
            if (entityType && entities[entityType as keyof typeof entities] && !entities[entityType as keyof typeof entities].includes(entity)) {
              entities[entityType as keyof typeof entities].push(entity);
            }
          }
        }
      }

      // Use pattern matching for artistic terms not caught by NER
      this.extractArtisticTerms(prompt, entities);
      
      return entities;
    } catch (error) {
      console.error('Error extracting entities with HF API:', error);
      // Fallback to pattern matching only
      this.extractArtisticTerms(prompt, entities);
      return entities;
    }
  }

  private getBasicClassification(prompt: string) {
    const lowerPrompt = prompt.toLowerCase();
    const complexity = this.determineComplexity(prompt);

    return {
      primary_style: lowerPrompt.includes('anime') ? 'anime' : 
                    lowerPrompt.includes('photo') ? 'photorealistic' : 'realistic',
      complexity_level: complexity,
      image_type: lowerPrompt.includes('portrait') ? 'portrait' : 
                 lowerPrompt.includes('landscape') ? 'landscape' : 'scene' as 'portrait' | 'landscape' | 'character' | 'scene' | 'product' | 'abstract',
      art_movement: 'contemporary',
      quality_level: lowerPrompt.includes('high') ? 'high' : 'standard' as 'standard' | 'high' | 'professional'
    };
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

      // Use HF Inference API for zero-shot classification
      const [styleResult, imageTypeResult, artMovementResult, qualityResult] = await Promise.all([
        this.hf.query('facebook/bart-large-mnli', { candidate_labels: styleLabels, inputs: prompt }),
        this.hf.query('facebook/bart-large-mnli', { candidate_labels: imageTypeLabels, inputs: prompt }),
        this.hf.query('facebook/bart-large-mnli', { candidate_labels: artMovementLabels, inputs: prompt }),
        this.hf.query('facebook/bart-large-mnli', { candidate_labels: qualityLabels, inputs: prompt })
      ]);

      const complexity = this.determineComplexity(prompt);

      return {
        primary_style: styleResult.labels?.[0] || 'realistic',
        complexity_level: complexity,
        image_type: (imageTypeResult.labels?.[0] || 'scene') as 'portrait' | 'landscape' | 'character' | 'scene' | 'product' | 'abstract',
        art_movement: artMovementResult.labels?.[0] || 'contemporary',
        quality_level: ((qualityResult.labels?.[0] === 'standard' ? 'standard' : 
                       qualityResult.labels?.[0] === 'high quality' ? 'high' : 'professional')) as 'standard' | 'high' | 'professional'
      };
    } catch (error) {
      console.error('Error in classification with HF API:', error);
      return this.getBasicClassification(prompt);
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
      // Use HF Inference API for sentiment analysis
      const sentimentResult = await this.hf.query('cardiffnlp/twitter-roberta-base-sentiment-latest', prompt);
      
      // Map sentiment to mood
      const moodMapping = {
        'LABEL_2': ['joyful', 'energetic', 'calm'][Math.floor(Math.random() * 3)], // Positive
        'LABEL_0': ['melancholic', 'mysterious', 'dramatic'][Math.floor(Math.random() * 3)], // Negative
        'LABEL_1': 'calm' // Neutral
      };

      let mood = 'calm';
      let intensity = 0.5;
      let confidence = 0.5;

      if (Array.isArray(sentimentResult) && sentimentResult.length > 0) {
        const topResult = sentimentResult[0];
        mood = moodMapping[topResult.label as keyof typeof moodMapping] || 'calm';
        intensity = topResult.score || 0.5;
        confidence = topResult.score || 0.5;
      }
      
      return {
        mood: mood as 'calm' | 'energetic' | 'dramatic' | 'mysterious' | 'joyful' | 'melancholic',
        intensity,
        confidence
      };
    } catch (error) {
      console.error('Error analyzing sentiment with HF API:', error);
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
      // Use HF Inference API for feature extraction
      const result = await this.hf.query('sentence-transformers/all-MiniLM-L6-v2', prompt);
      
      if (Array.isArray(result) && result.length > 0) {
        return result[0];
      }
      return [];
    } catch (error) {
      console.error('Error getting prompt embedding with HF API:', error);
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
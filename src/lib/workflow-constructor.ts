import { ComfyUIWorkflow, ComfyUINode, ParsedWorkflowStep, WorkflowExplanation } from './types';
import { getNodeDefinition } from './node-definitions';
import { WorkflowParser } from './workflow-parser';
import { EnhancedWorkflowParser } from './enhanced-workflow-parser';
import { ModelSelector } from './model-knowledge-base';
import { ParameterOptimizer } from './parameter-optimizer';

export class WorkflowConstructor {
  private parser: WorkflowParser;
  private enhancedParser: EnhancedWorkflowParser;
  private nodeCounter: number = 1;
  
  constructor() {
    this.parser = new WorkflowParser();
    this.enhancedParser = new EnhancedWorkflowParser();
  }
  
  public generateWorkflow(description: string): { workflow: ComfyUIWorkflow; explanation: WorkflowExplanation } {
    // Use intelligent workflow generation
    try {
      return this.generateIntelligentWorkflow(description);
    } catch (error) {
      console.warn('Falling back to basic workflow generation:', error);
      // Fallback to basic workflow generation
      const steps = this.parser.parseDescription(description);
      const prompts = this.parser.extractPrompt(description);
    
    const nodes: Record<string, ComfyUINode> = {};
    const explanationSteps: WorkflowExplanation['steps'] = [];
    
    // Always start with model loading
    const modelLoadNode = this.createNode('CheckpointLoaderSimple', {
      ckpt_name: steps[0]?.parameters?.model || 'v1-5-pruned-emaonly.safetensors'
    });
    nodes[modelLoadNode.id] = modelLoadNode;
    
    // Create text encoding nodes
    const positiveTextNode = this.createNode('CLIPTextEncode', {
      text: prompts.positive,
      clip: [modelLoadNode.id, 1]
    });
    nodes[positiveTextNode.id] = positiveTextNode;
    
    const negativeTextNode = this.createNode('CLIPTextEncode', {
      text: prompts.negative,
      clip: [modelLoadNode.id, 1]
    });
    nodes[negativeTextNode.id] = negativeTextNode;
    
    // Track the current model and conditioning nodes for chaining
    let currentModel: [string, number] = [modelLoadNode.id, 0];
    let currentPositive: [string, number] = [positiveTextNode.id, 0];
    let currentNegative: [string, number] = [negativeTextNode.id, 0];
    const currentVAE: [string, number] = [modelLoadNode.id, 2];
    let currentImage: [string, number] | null = null;
    
    explanationSteps.push({
      step: 1,
      description: `Load checkpoint model: ${steps[0]?.parameters?.model || 'v1-5-pruned-emaonly.safetensors'}`,
      nodeType: 'CheckpointLoaderSimple',
      parameters: { model: steps[0]?.parameters?.model || 'v1-5-pruned-emaonly.safetensors' }
    });
    
    explanationSteps.push({
      step: 2,
      description: `Encode positive prompt: "${prompts.positive}"`,
      nodeType: 'CLIPTextEncode',
      parameters: { text: prompts.positive }
    });
    
    explanationSteps.push({
      step: 3,
      description: `Encode negative prompt: "${prompts.negative}"`,
      nodeType: 'CLIPTextEncode',
      parameters: { text: prompts.negative }
    });
    
    let stepCounter = 4;
    
    // Process each workflow step
    for (const step of steps) {
      switch (step.action) {
        case 'generate':
          const result = this.addGenerationNodes(
            nodes, 
            step, 
            currentModel, 
            currentPositive, 
            currentNegative, 
            currentVAE
          );
          currentImage = result.image;
          
          explanationSteps.push({
            step: stepCounter++,
            description: `Generate image using ${step.parameters.sampler || 'euler'} sampler with ${step.parameters.steps || 20} steps`,
            nodeType: 'KSampler',
            parameters: step.parameters
          });
          
          explanationSteps.push({
            step: stepCounter++,
            description: 'Decode latent to final image',
            nodeType: 'VAEDecode',
            parameters: {}
          });
          break;
          
        case 'lora':
          const loraResult = this.addLoRANode(nodes, step, currentModel, [modelLoadNode.id, 1]);
          currentModel = loraResult.model;
          currentPositive = [positiveTextNode.id, 0]; // Re-encode with new CLIP
          currentNegative = [negativeTextNode.id, 0];
          
          explanationSteps.push({
            step: stepCounter++,
            description: `Apply LoRA: ${step.parameters.name} with strength ${step.parameters.strength_model || 1.0}`,
            nodeType: 'LoraLoader',
            parameters: step.parameters
          });
          break;
          
        case 'upscale':
          if (currentImage) {
            currentImage = this.addUpscaleNode(nodes, step, currentImage);
            explanationSteps.push({
              step: stepCounter++,
              description: `Upscale image by ${step.parameters.factor || 2}x using ${step.parameters.method || 'latent'} method`,
              nodeType: step.parameters.method === 'model' ? 'ImageUpscaleWithModel' : 'ImageScale',
              parameters: step.parameters
            });
          }
          break;
          
        case 'effect':
          if (currentImage) {
            currentImage = this.addEffectNode(nodes, step, currentImage);
            explanationSteps.push({
              step: stepCounter++,
              description: `Apply ${step.parameters.type} effect with strength ${step.parameters.strength || 0.5}`,
              nodeType: 'ImageBlend',
              parameters: step.parameters
            });
          }
          break;
          
        case 'controlnet':
          if (currentImage) {
            const controlResult = this.addControlNetNode(nodes, step, currentPositive, currentNegative, currentImage);
            currentPositive = controlResult.positive;
            currentNegative = controlResult.negative;
            
            explanationSteps.push({
              step: stepCounter++,
              description: `Apply ControlNet ${step.parameters.type} with strength ${step.parameters.strength || 1.0}`,
              nodeType: 'ControlNetApply',
              parameters: step.parameters
            });
          }
          break;
      }
    }
    
    // Add final preview/save node if we have an image
    if (currentImage) {
      const previewNode = this.createNode('PreviewImage', {
        images: currentImage
      });
      nodes[previewNode.id] = previewNode;
      
      explanationSteps.push({
        step: stepCounter++,
        description: 'Preview final image',
        nodeType: 'PreviewImage',
        parameters: {}
      });
    }
    
    const workflow: ComfyUIWorkflow = {
      version: 1.0,
      nodes,
      state: {}
    };
    
    const explanation: WorkflowExplanation = {
      title: 'ComfyUI Workflow',
      steps: explanationSteps,
      summary: `Generated workflow with ${Object.keys(nodes).length} nodes to create: ${prompts.positive}`
    };
    
    return { workflow, explanation };
    } // End of fallback catch block
  }
  
  // Enhanced workflow generation with intelligent model selection
  public generateIntelligentWorkflow(description: string): { workflow: ComfyUIWorkflow; explanation: WorkflowExplanation } {
    const enhanced = this.enhancedParser.parseDescription(description);
    const prompts = this.enhancedParser.extractPrompt(description);
    
    const nodes: Record<string, ComfyUINode> = {};
    const explanationSteps: WorkflowExplanation['steps'] = [];
    
    // Select optimal model based on context
    const selectedModel = ModelSelector.selectBestModel(enhanced.context.keywords, enhanced.context.detectedStyle);
    const modelName = selectedModel?.name || 'v1-5-pruned-emaonly.safetensors';
    
    // Always start with model loading
    const modelLoadNode = this.createNode('CheckpointLoaderSimple', {
      ckpt_name: modelName
    });
    nodes[modelLoadNode.id] = modelLoadNode;
    
    // Create text encoding nodes
    const positiveTextNode = this.createNode('CLIPTextEncode', {
      text: prompts.positive,
      clip: [modelLoadNode.id, 1]
    });
    nodes[positiveTextNode.id] = positiveTextNode;
    
    const negativeTextNode = this.createNode('CLIPTextEncode', {
      text: prompts.negative,
      clip: [modelLoadNode.id, 1]
    });
    nodes[negativeTextNode.id] = negativeTextNode;
    
    // Track the current model and conditioning nodes for chaining
    let currentModel: [string, number] = [modelLoadNode.id, 0];
    let currentClip: [string, number] = [modelLoadNode.id, 1];
    let currentPositive: [string, number] = [positiveTextNode.id, 0];
    let currentNegative: [string, number] = [negativeTextNode.id, 0];
    const currentVAE: [string, number] = [modelLoadNode.id, 2];
    let currentImage: [string, number] | null = null;
    
    explanationSteps.push({
      step: 1,
      description: `Load intelligent model selection: ${modelName}`,
      nodeType: 'CheckpointLoaderSimple',
      parameters: { model: modelName }
    });
    
    explanationSteps.push({
      step: 2,
      description: `Enhanced prompt: "${prompts.positive}"`,
      nodeType: 'CLIPTextEncode',
      parameters: { text: prompts.positive }
    });
    
    explanationSteps.push({
      step: 3,
      description: `Intelligent negative prompt: "${prompts.negative}"`,
      nodeType: 'CLIPTextEncode',
      parameters: { text: prompts.negative }
    });
    
    let stepCounter = 4;
    
    // Select and apply optimal LoRAs first
    const selectedLoras = ModelSelector.selectLoras(enhanced.context.keywords, enhanced.context.detectedStyle);
    for (const { model: loraModel, strength } of selectedLoras) {
      const loraResult = this.addLoRANode(nodes, {
        action: 'lora',
        parameters: {
          name: loraModel.name,
          strength_model: strength,
          strength_clip: strength
        },
        dependencies: [],
        keywords: []
      } as ParsedWorkflowStep, currentModel, currentClip);
      
      currentModel = loraResult.model;
      currentClip = loraResult.clip;
      
      // Re-encode text with new CLIP
      const newPositiveTextNode = this.createNode('CLIPTextEncode', {
        text: prompts.positive,
        clip: currentClip
      });
      nodes[newPositiveTextNode.id] = newPositiveTextNode;
      
      const newNegativeTextNode = this.createNode('CLIPTextEncode', {
        text: prompts.negative,
        clip: currentClip
      });
      nodes[newNegativeTextNode.id] = newNegativeTextNode;
      
      currentPositive = [newPositiveTextNode.id, 0];
      currentNegative = [newNegativeTextNode.id, 0];
      
      explanationSteps.push({
        step: stepCounter++,
        description: `Apply intelligent LoRA: ${loraModel.name} (strength: ${strength})`,
        nodeType: 'LoraLoader',
        parameters: { name: loraModel.name, strength }
      });
    }
    
    // Process enhanced workflow steps
    for (const step of enhanced.steps) {
      switch (step.action) {
        case 'generate':
          const result = this.addIntelligentGenerationNodes(
            nodes, 
            step, 
            currentModel, 
            currentPositive, 
            currentNegative, 
            currentVAE,
            enhanced.context,
            selectedModel,
            selectedLoras
          );
          currentImage = result.image;
          
          explanationSteps.push({
            step: stepCounter++,
            description: `Generate with optimized parameters (${Math.round(step.confidence * 100)}% confidence)`,
            nodeType: 'KSampler',
            parameters: step.parameters
          });
          
          explanationSteps.push({
            step: stepCounter++,
            description: 'Decode latent to final image',
            nodeType: 'VAEDecode',
            parameters: {}
          });
          break;
          
        case 'upscale':
          if (currentImage) {
            currentImage = this.addUpscaleNode(nodes, step, currentImage);
            explanationSteps.push({
              step: stepCounter++,
              description: `Upscale image by ${step.parameters.factor || 2}x using ${step.parameters.method || 'latent'} method`,
              nodeType: step.parameters.method === 'model' ? 'ImageUpscaleWithModel' : 'ImageScale',
              parameters: step.parameters
            });
          }
          break;
          
        case 'effect':
          if (currentImage) {
            currentImage = this.addEffectNode(nodes, step, currentImage);
            explanationSteps.push({
              step: stepCounter++,
              description: `Apply ${step.parameters.type} effect with strength ${step.parameters.strength || 0.5}`,
              nodeType: 'ImageBlend',
              parameters: step.parameters
            });
          }
          break;
          
        case 'controlnet':
          if (currentImage) {
            const controlResult = this.addControlNetNode(nodes, step, currentPositive, currentNegative, currentImage);
            currentPositive = controlResult.positive;
            currentNegative = controlResult.negative;
            
            explanationSteps.push({
              step: stepCounter++,
              description: `Apply ControlNet ${step.parameters.type} with strength ${step.parameters.strength || 1.0}`,
              nodeType: 'ControlNetApply',
              parameters: step.parameters
            });
          }
          break;
      }
    }
    
    // Add final preview/save node if we have an image
    if (currentImage) {
      const previewNode = this.createNode('PreviewImage', {
        images: currentImage
      });
      nodes[previewNode.id] = previewNode;
      
      explanationSteps.push({
        step: stepCounter++,
        description: 'Preview final image',
        nodeType: 'PreviewImage',
        parameters: {}
      });
    }
    
    const workflow: ComfyUIWorkflow = {
      version: 1.0,
      nodes,
      state: {}
    };
    
    const explanation: WorkflowExplanation = {
      title: 'Intelligent ComfyUI Workflow',
      steps: explanationSteps,
      summary: `Generated intelligent workflow with ${Object.keys(nodes).length} nodes using ${selectedModel?.name || 'default model'} and ${selectedLoras.length} LoRAs`
    };
    
    return { workflow, explanation };
  }
  
  private createNode(classType: string, inputs: Record<string, unknown>): ComfyUINode {
    const nodeId = this.nodeCounter.toString();
    this.nodeCounter++;
    
    return {
      id: nodeId,
      class_type: classType,
      inputs: inputs,
      _meta: {
        title: classType
      }
    };
  }
  
  private addIntelligentGenerationNodes(
    nodes: Record<string, ComfyUINode>,
    _step: unknown,
    model: [string, number],
    positive: [string, number],
    negative: [string, number],
    vae: [string, number],
    context: unknown,
    selectedModel: unknown,
    selectedLoras: unknown[]
  ): { latent: [string, number]; image: [string, number] } {
    // Use parameter optimization for intelligent generation
    const optimizedParams = ParameterOptimizer.optimizeParameters(
      {
        imageType: (context as { detectedImageType: string }).detectedImageType as 'portrait' | 'landscape' | 'character' | 'scene' | 'product' | 'abstract',
        quality: (context as { detectedQuality: string }).detectedQuality as 'draft' | 'standard' | 'high' | 'ultra',
        style: (context as { detectedStyle: string }).detectedStyle as 'realistic' | 'artistic' | 'anime' | 'fantasy' | 'cyberpunk' | 'vintage',
        complexity: (context as { detectedComplexity: string }).detectedComplexity as 'simple' | 'medium' | 'complex',
        aspectRatio: (context as { aspectRatio: string }).aspectRatio,
        hasUpscaling: false,
        hasEffects: false
      },
      selectedModel as Parameters<typeof ParameterOptimizer.optimizeParameters>[1],
      selectedLoras as Parameters<typeof ParameterOptimizer.optimizeParameters>[2]
    );
    
    // Create empty latent with optimized dimensions
    const emptyLatentNode = this.createNode('EmptyLatentImage', {
      width: optimizedParams.width,
      height: optimizedParams.height,
      batch_size: 1
    });
    nodes[emptyLatentNode.id] = emptyLatentNode;
    
    // Create sampler with optimized parameters
    const samplerNode = this.createNode('KSampler', {
      model: model,
      positive: positive,
      negative: negative,
      latent_image: [emptyLatentNode.id, 0],
      seed: optimizedParams.seed || -1,
      steps: optimizedParams.steps,
      cfg: optimizedParams.cfg,
      sampler_name: optimizedParams.sampler,
      scheduler: optimizedParams.scheduler,
      denoise: optimizedParams.denoise
    });
    nodes[samplerNode.id] = samplerNode;
    
    // Create VAE decode
    const vaeDecodeNode = this.createNode('VAEDecode', {
      samples: [samplerNode.id, 0],
      vae: vae
    });
    nodes[vaeDecodeNode.id] = vaeDecodeNode;
    
    return {
      latent: [samplerNode.id, 0],
      image: [vaeDecodeNode.id, 0]
    };
  }
  
  private addGenerationNodes(
    nodes: Record<string, ComfyUINode>,
    step: ParsedWorkflowStep,
    model: [string, number],
    positive: [string, number],
    negative: [string, number],
    vae: [string, number]
  ): { latent: [string, number]; image: [string, number] } {
    // Create empty latent
    const emptyLatentNode = this.createNode('EmptyLatentImage', {
      width: step.parameters.width || 512,
      height: step.parameters.height || 512,
      batch_size: 1
    });
    nodes[emptyLatentNode.id] = emptyLatentNode;
    
    // Create sampler
    const samplerNode = this.createNode('KSampler', {
      model: model,
      positive: positive,
      negative: negative,
      latent_image: [emptyLatentNode.id, 0],
      seed: step.parameters.seed || -1,
      steps: step.parameters.steps || 20,
      cfg: step.parameters.cfg || 8.0,
      sampler_name: step.parameters.sampler || 'euler',
      scheduler: step.parameters.scheduler || 'normal',
      denoise: step.parameters.denoise || 1.0
    });
    nodes[samplerNode.id] = samplerNode;
    
    // Create VAE decode
    const vaeDecodeNode = this.createNode('VAEDecode', {
      samples: [samplerNode.id, 0],
      vae: vae
    });
    nodes[vaeDecodeNode.id] = vaeDecodeNode;
    
    return {
      latent: [samplerNode.id, 0],
      image: [vaeDecodeNode.id, 0]
    };
  }
  
  private addLoRANode(
    nodes: Record<string, ComfyUINode>,
    step: ParsedWorkflowStep,
    model: [string, number],
    clip: [string, number]
  ): { model: [string, number]; clip: [string, number] } {
    const loraNode = this.createNode('LoraLoader', {
      model: model,
      clip: clip,
      lora_name: step.parameters.name || 'lora.safetensors',
      strength_model: step.parameters.strength_model || 1.0,
      strength_clip: step.parameters.strength_clip || 1.0
    });
    nodes[loraNode.id] = loraNode;
    
    return {
      model: [loraNode.id, 0],
      clip: [loraNode.id, 1]
    };
  }
  
  private addUpscaleNode(
    nodes: Record<string, ComfyUINode>,
    step: ParsedWorkflowStep,
    image: [string, number]
  ): [string, number] {
    if (step.parameters.method === 'model') {
      // Use upscale model
      const upscaleModelNode = this.createNode('UpscaleModelLoader', {
        model_name: step.parameters.model || 'RealESRGAN_x4plus.pth'
      });
      nodes[upscaleModelNode.id] = upscaleModelNode;
      
      const upscaleNode = this.createNode('ImageUpscaleWithModel', {
        upscale_model: [upscaleModelNode.id, 0],
        image: image
      });
      nodes[upscaleNode.id] = upscaleNode;
      
      return [upscaleNode.id, 0];
    } else {
      // Use simple scaling
      const factor = step.parameters.factor || 2;
      const currentWidth = 512; // This should ideally be tracked
      const currentHeight = 512;
      
      const scaleNode = this.createNode('ImageScale', {
        image: image,
        upscale_method: step.parameters.algorithm || 'nearest-exact',
        width: Math.round(currentWidth * (factor as number)),
        height: Math.round(currentHeight * (factor as number)),
        crop: 'disabled'
      });
      nodes[scaleNode.id] = scaleNode;
      
      return [scaleNode.id, 0];
    }
  }
  
  private addEffectNode(
    nodes: Record<string, ComfyUINode>,
    step: ParsedWorkflowStep,
    image: [string, number]
  ): [string, number] {
    // For now, we'll create a simple blend node as a placeholder for effects
    // In a real implementation, you'd have specific nodes for different effects
    const blendNode = this.createNode('ImageBlend', {
      image1: image,
      image2: image, // Blend with itself for effect
      blend_factor: step.parameters.strength || 0.5,
      blend_mode: 'overlay'
    });
    nodes[blendNode.id] = blendNode;
    
    return [blendNode.id, 0];
  }
  
  private addControlNetNode(
    nodes: Record<string, ComfyUINode>,
    step: ParsedWorkflowStep,
    positive: [string, number],
    negative: [string, number],
    image: [string, number]
  ): { positive: [string, number]; negative: [string, number] } {
    // Load ControlNet model
    const controlNetLoader = this.createNode('ControlNetLoader', {
      control_net_name: `control_v11p_sd15_${step.parameters.type || 'canny'}.pth`
    });
    nodes[controlNetLoader.id] = controlNetLoader;
    
    // Apply ControlNet
    const controlNetApply = this.createNode('ControlNetApplyAdvanced', {
      positive: positive,
      negative: negative,
      control_net: [controlNetLoader.id, 0],
      image: image,
      strength: step.parameters.strength || 1.0,
      start_percent: 0.0,
      end_percent: 1.0
    });
    nodes[controlNetApply.id] = controlNetApply;
    
    return {
      positive: [controlNetApply.id, 0],
      negative: [controlNetApply.id, 1]
    };
  }
  
  // Utility method to validate and clean workflow
  public validateWorkflow(workflow: ComfyUIWorkflow): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check required top-level fields
    if (!workflow.version) {
      errors.push('Missing required field: version');
    }
    if (!workflow.nodes) {
      errors.push('Missing required field: nodes');
    }
    if (!workflow.state) {
      errors.push('Missing required field: state');
    }
    
    if (!workflow.nodes) {
      return { isValid: false, errors };
    }
    
    for (const [nodeId, node] of Object.entries(workflow.nodes)) {
      const definition = getNodeDefinition(node.class_type);
      if (!definition) {
        errors.push(`Unknown node type: ${node.class_type}`);
        continue;
      }
      
      // Check required inputs
      for (const [inputName, inputDef] of Object.entries(definition.inputs)) {
        if (inputDef.required && !(inputName in node.inputs)) {
          errors.push(`Node ${nodeId} (${node.class_type}) missing required input: ${inputName}`);
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
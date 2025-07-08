import { ComfyUIWorkflow, ComfyUINode, ComfyUILink, ParsedWorkflowStep, WorkflowExplanation } from './types';
import { getNodeDefinition } from './node-definitions';
import { WorkflowParser } from './workflow-parser';
import { EnhancedWorkflowParser } from './enhanced-workflow-parser';
import { ModelSelector } from './model-knowledge-base';
import { ParameterOptimizer } from './parameter-optimizer';

export class WorkflowConstructor {
  private parser: WorkflowParser;
  private enhancedParser: EnhancedWorkflowParser;
  private nodeCounter: number = 1;
  private linkCounter: number = 1;
  private currentLinks: ComfyUILink[] = [];
  
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
      // Reset counters and links for fresh workflow generation
      this.nodeCounter = 1;
      this.linkCounter = 1;
      this.currentLinks = [];
      
      const steps = this.parser.parseDescription(description);
      const prompts = this.parser.extractPrompt(description);
    
    const nodes: ComfyUINode[] = [];
    const explanationSteps: WorkflowExplanation['steps'] = [];
    
    // Always start with model loading
    const modelLoadNode = this.createNode('CheckpointLoaderSimple', {
      ckpt_name: steps[0]?.parameters?.model || 'v1-5-pruned-emaonly.safetensors'
    });
    nodes.push(modelLoadNode);
    
    // Create text encoding nodes
    const positiveTextNode = this.createNode('CLIPTextEncode', {
      text: prompts.positive,
      clip: [modelLoadNode.id as number, 1]
    });
    nodes.push(positiveTextNode);
    
    const negativeTextNode = this.createNode('CLIPTextEncode', {
      text: prompts.negative,
      clip: [modelLoadNode.id as number, 1]
    });
    nodes.push(negativeTextNode);
    
    // Track the current model and conditioning nodes for chaining
    let currentModel: [number, number] = [modelLoadNode.id as number, 0];
    let currentPositive: [number, number] = [positiveTextNode.id as number, 0];
    let currentNegative: [number, number] = [negativeTextNode.id as number, 0];
    const currentVAE: [number, number] = [modelLoadNode.id as number, 2];
    let currentImage: [number, number] | null = null;
    
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
    
    // Check if we need ControlNet and prepare it before generation
    const controlNetSteps = steps.filter(step => step.action === 'controlnet');
    if (controlNetSteps.length > 0) {
      for (const step of controlNetSteps) {
        // For ControlNet, we need a reference image. We'll create a LoadImage node
        const controlImageNode = this.createNode('LoadImage', {
          image: step.parameters.image || 'reference_image.png'
        });
        nodes.push(controlImageNode);
        
        const controlResult = this.addControlNetNode(nodes, step, currentPositive, currentNegative, [controlImageNode.id as number, 0]);
        currentPositive = controlResult.positive;
        currentNegative = controlResult.negative;
        
        explanationSteps.push({
          step: stepCounter++,
          description: `Setup ControlNet ${step.parameters.type} with strength ${step.parameters.strength || 1.0}`,
          nodeType: 'ControlNetApplyAdvanced',
          parameters: step.parameters
        });
      }
    }
    
    // Process non-ControlNet steps
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
          const loraResult = this.addLoRANode(nodes, step, currentModel, [modelLoadNode.id as number, 1]);
          currentModel = loraResult.model;
          currentPositive = [positiveTextNode.id as number, 0]; // Re-encode with new CLIP
          currentNegative = [negativeTextNode.id as number, 0];
          
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
          // Skip - already handled above
          break;
      }
    }
    
    // Add final preview/save node if we have an image
    if (currentImage) {
      const previewNode = this.createNode('PreviewImage', {
        images: currentImage
      });
      nodes.push(previewNode);
      
      explanationSteps.push({
        step: stepCounter++,
        description: 'Preview final image',
        nodeType: 'PreviewImage',
        parameters: {}
      });
    }
    
    // Update output links arrays based on created links
    this.updateOutputLinks(nodes, this.currentLinks);
    
    // Convert nodes array to ComfyUI workflow format
    const workflow: ComfyUIWorkflow = {
      version: 1,
      state: {
        lastNodeId: this.nodeCounter - 1,
        lastLinkId: this.linkCounter - 1
      },
      nodes: nodes,
      links: this.currentLinks,
      groups: [],
      config: {},
      extra: {}
    };
    
    const explanation: WorkflowExplanation = {
      title: 'ComfyUI Workflow',
      steps: explanationSteps,
      summary: `Generated workflow with ${nodes.length} nodes to create: ${prompts.positive}`
    };
    
    return { workflow, explanation };
    } // End of fallback catch block
  }
  
  // Enhanced workflow generation with intelligent model selection
  public generateIntelligentWorkflow(description: string): { workflow: ComfyUIWorkflow; explanation: WorkflowExplanation } {
    // Reset counters and links for fresh workflow generation
    this.nodeCounter = 1;
    this.linkCounter = 1;
    this.currentLinks = [];
    
    const enhanced = this.enhancedParser.parseDescription(description);
    const prompts = this.enhancedParser.extractPrompt(description);
    
    const nodes: ComfyUINode[] = [];
    const explanationSteps: WorkflowExplanation['steps'] = [];
    
    // Select optimal model based on context
    const selectedModel = ModelSelector.selectBestModel(enhanced.context.keywords, enhanced.context.detectedStyle);
    const selectedModelKey = ModelSelector.getModelKeyByInfo(selectedModel);
    const modelName = selectedModelKey || 'v1-5-pruned-emaonly.safetensors';
    
    // Always start with model loading
    const modelLoadNode = this.createNode('CheckpointLoaderSimple', {
      ckpt_name: modelName
    });
    nodes.push(modelLoadNode);
    
    // Create text encoding nodes
    const positiveTextNode = this.createNode('CLIPTextEncode', {
      text: prompts.positive,
      clip: [modelLoadNode.id as number, 1]
    });
    nodes.push(positiveTextNode);
    
    const negativeTextNode = this.createNode('CLIPTextEncode', {
      text: prompts.negative,
      clip: [modelLoadNode.id as number, 1]
    });
    nodes.push(negativeTextNode);
    
    // Track the current model and conditioning nodes for chaining
    let currentModel: [number, number] = [modelLoadNode.id as number, 0];
    let currentClip: [number, number] = [modelLoadNode.id as number, 1];
    let currentPositive: [number, number] = [positiveTextNode.id as number, 0];
    let currentNegative: [number, number] = [negativeTextNode.id as number, 0];
    const currentVAE: [number, number] = [modelLoadNode.id as number, 2];
    let currentImage: [number, number] | null = null;
    
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
      const loraKey = ModelSelector.getModelKeyByInfo(loraModel);
      const loraResult = this.addLoRANode(nodes, {
        action: 'lora',
        parameters: {
          name: loraKey || loraModel.name,
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
      nodes.push(newPositiveTextNode);
      
      const newNegativeTextNode = this.createNode('CLIPTextEncode', {
        text: prompts.negative,
        clip: currentClip
      });
      nodes.push(newNegativeTextNode);
      
      currentPositive = [newPositiveTextNode.id as number, 0];
      currentNegative = [newNegativeTextNode.id as number, 0];
      
      explanationSteps.push({
        step: stepCounter++,
        description: `Apply intelligent LoRA: ${loraModel.name} (strength: ${strength})`,
        nodeType: 'LoraLoader',
        parameters: { name: loraModel.name, strength }
      });
    }
    
    // Check if we need ControlNet and prepare it before generation
    const enhancedControlNetSteps = enhanced.steps.filter(step => step.action === 'controlnet');
    if (enhancedControlNetSteps.length > 0) {
      for (const step of enhancedControlNetSteps) {
        // For ControlNet, we need a reference image. We'll create a LoadImage node
        const controlImageNode = this.createNode('LoadImage', {
          image: step.parameters.image || 'reference_image.png'
        });
        nodes.push(controlImageNode);
        
        const controlResult = this.addControlNetNode(nodes, step, currentPositive, currentNegative, [controlImageNode.id as number, 0]);
        currentPositive = controlResult.positive;
        currentNegative = controlResult.negative;
        
        explanationSteps.push({
          step: stepCounter++,
          description: `Setup ControlNet ${step.parameters.type} with strength ${step.parameters.strength || 1.0}`,
          nodeType: 'ControlNetApplyAdvanced',
          parameters: step.parameters
        });
      }
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
          // Skip - already handled above
          break;
      }
    }
    
    // Add final preview/save node if we have an image
    if (currentImage) {
      const previewNode = this.createNode('PreviewImage', {
        images: currentImage
      });
      nodes.push(previewNode);
      
      explanationSteps.push({
        step: stepCounter++,
        description: 'Preview final image',
        nodeType: 'PreviewImage',
        parameters: {}
      });
    }
    
    // Update output links arrays based on created links
    this.updateOutputLinks(nodes, this.currentLinks);
    
    // Convert nodes array to ComfyUI workflow format
    const workflow: ComfyUIWorkflow = {
      version: 1,
      state: {
        lastNodeId: this.nodeCounter - 1,
        lastLinkId: this.linkCounter - 1
      },
      nodes: nodes,
      links: this.currentLinks,
      groups: [],
      config: {},
      extra: {}
    };
    
    const explanation: WorkflowExplanation = {
      title: 'Intelligent ComfyUI Workflow',
      steps: explanationSteps,
      summary: `Generated intelligent workflow with ${nodes.length} nodes using ${modelName} and ${selectedLoras.length} LoRAs`
    };
    
    return { workflow, explanation };
  }
  
  
  private createNode(classType: string, inputs: Record<string, unknown>): ComfyUINode {
    const nodeId = this.nodeCounter;
    this.nodeCounter++;
    
    // Create inputs array for schema compliance
    const inputsArray: Array<{
      name: string;
      type: string;
      link?: number | null;
    }> = [];
    
    // Create widgets_values array for non-connection inputs
    const widgetValues: unknown[] = [];
    
    // Process inputs
    for (const [key, value] of Object.entries(inputs)) {
      if (Array.isArray(value) && value.length === 2) {
        // This is a connection: [sourceNodeId, outputSlot]
        const sourceNodeId = value[0] as string | number;
        const outputSlot = value[1] as number;
        const linkId = this.linkCounter++;
        
        // Create a proper ComfyUILink
        const link: ComfyUILink = {
          id: linkId,
          origin_id: typeof sourceNodeId === 'string' ? parseInt(sourceNodeId) : sourceNodeId,
          origin_slot: outputSlot,
          target_id: nodeId,
          target_slot: inputsArray.length,
          type: this.getInputTypeForConnection(classType, key)
        };
        this.currentLinks.push(link);
        
        inputsArray.push({
          name: key,
          type: this.getInputTypeForConnection(classType, key),
          link: linkId
        });
      } else {
        // This is a widget value - add to inputs but not as connection
        inputsArray.push({
          name: key,
          type: this.inferInputType(value),
          link: null
        });
      }
    }
    
    // Create widgets_values in the correct order for specific node types
    if (classType === 'KSampler') {
      // KSampler expects widgets in this order: [seed, steps, cfg, sampler_name, scheduler, denoise]
      const cfg = inputs.cfg || 8.0;
      const safeCfg = isNaN(Number(cfg)) ? 8.0 : Number(cfg);
      
      widgetValues.push(
        inputs.seed || Math.floor(Math.random() * 2147483647),
        inputs.steps || 20,
        safeCfg,
        inputs.sampler_name || 'euler',
        inputs.scheduler || 'normal',
        inputs.denoise || 1.0
      );
    } else {
      // For other nodes, add widget values in input order
      for (const [, value] of Object.entries(inputs)) {
        if (!Array.isArray(value) || value.length !== 2) {
          widgetValues.push(value);
        }
      }
    }
    
    const position = this.calculateNodePosition(classType, nodeId);
    
    const node: ComfyUINode = {
      id: nodeId,
      type: classType,
      pos: position,
      size: this.getNodeSize(classType),
      flags: {},
      order: nodeId,
      mode: 0,
      inputs: inputsArray,
      outputs: this.getOutputsForNodeType(classType),
      properties: {},
      widgets_values: widgetValues.length > 0 ? widgetValues : undefined
    };
    
    return node;
  }
  
  private inferInputType(value: unknown): string {
    if (typeof value === 'string') return 'STRING';
    if (typeof value === 'number') return 'NUMBER';
    if (typeof value === 'boolean') return 'BOOLEAN';
    if (Array.isArray(value)) return 'CONNECTION';
    return 'UNKNOWN';
  }
  
  private getOutputsForNodeType(classType: string): Array<{
    name: string;
    type: string;
    links?: number[] | null;
  }> {
    // Define outputs based on node type - this is a simplified version
    const outputMap: Record<string, Array<{ name: string; type: string }>> = {
      'CheckpointLoaderSimple': [
        { name: 'MODEL', type: 'MODEL' },
        { name: 'CLIP', type: 'CLIP' },
        { name: 'VAE', type: 'VAE' }
      ],
      'CLIPTextEncode': [
        { name: 'CONDITIONING', type: 'CONDITIONING' }
      ],
      'KSampler': [
        { name: 'LATENT', type: 'LATENT' }
      ],
      'VAEDecode': [
        { name: 'IMAGE', type: 'IMAGE' }
      ],
      'LoraLoader': [
        { name: 'MODEL', type: 'MODEL' },
        { name: 'CLIP', type: 'CLIP' }
      ],
      'PreviewImage': [],
      'EmptyLatentImage': [
        { name: 'LATENT', type: 'LATENT' }
      ],
      'ControlNetLoader': [
        { name: 'CONTROL_NET', type: 'CONTROL_NET' }
      ],
      'ControlNetApplyAdvanced': [
        { name: 'positive', type: 'CONDITIONING' },
        { name: 'negative', type: 'CONDITIONING' }
      ],
      'ControlNetApply': [
        { name: 'CONDITIONING', type: 'CONDITIONING' }
      ],
      'LoadImage': [
        { name: 'IMAGE', type: 'IMAGE' },
        { name: 'MASK', type: 'MASK' }
      ]
    };
    
    const outputs = outputMap[classType] || [];
    return outputs.map(output => ({
      ...output,
      links: []  // Initialize as empty array instead of null
    }));
  }
  
  private getInputTypeForConnection(classType: string, inputName: string): string {
    // Define input types based on node type and input name
    const typeMap: Record<string, Record<string, string>> = {
      'CLIPTextEncode': {
        'clip': 'CLIP'
      },
      'KSampler': {
        'model': 'MODEL',
        'positive': 'CONDITIONING',
        'negative': 'CONDITIONING',
        'latent_image': 'LATENT'
      },
      'VAEDecode': {
        'samples': 'LATENT',
        'vae': 'VAE'
      },
      'LoraLoader': {
        'model': 'MODEL',
        'clip': 'CLIP'
      },
      'PreviewImage': {
        'images': 'IMAGE'
      },
      'ControlNetApplyAdvanced': {
        'positive': 'CONDITIONING',
        'negative': 'CONDITIONING',
        'control_net': 'CONTROL_NET',
        'image': 'IMAGE'
      },
      'ControlNetApply': {
        'conditioning': 'CONDITIONING',
        'control_net': 'CONTROL_NET',
        'image': 'IMAGE'
      }
    };
    
    return typeMap[classType]?.[inputName] || 'UNKNOWN';
  }
  
  private addIntelligentGenerationNodes(
    nodes: ComfyUINode[],
    _step: unknown,
    model: [number, number],
    positive: [number, number],
    negative: [number, number],
    vae: [number, number],
    context: unknown,
    selectedModel: unknown,
    selectedLoras: unknown[]
  ): { latent: [number, number]; image: [number, number] } {
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
    
    // Ensure CFG is a valid number
    const safeCfg = isNaN(optimizedParams.cfg) || optimizedParams.cfg === null || optimizedParams.cfg === undefined 
      ? 8.0 
      : Number(optimizedParams.cfg);
    
    // Create empty latent with optimized dimensions
    const emptyLatentNode = this.createNode('EmptyLatentImage', {
      width: optimizedParams.width,
      height: optimizedParams.height,
      batch_size: 1
    });
    nodes.push(emptyLatentNode);
    
    // Create sampler with optimized parameters
    const samplerNode = this.createNode('KSampler', {
      model: model,
      positive: positive,
      negative: negative,
      latent_image: [emptyLatentNode.id as number, 0],
      seed: optimizedParams.seed || Math.floor(Math.random() * 2147483647),
      steps: optimizedParams.steps,
      cfg: safeCfg,
      sampler_name: optimizedParams.sampler,
      scheduler: optimizedParams.scheduler,
      denoise: optimizedParams.denoise
    });
    nodes.push(samplerNode);
    
    // Create VAE decode
    const vaeDecodeNode = this.createNode('VAEDecode', {
      samples: [samplerNode.id as number, 0],
      vae: vae
    });
    nodes.push(vaeDecodeNode);
    
    return {
      latent: [samplerNode.id as number, 0],
      image: [vaeDecodeNode.id as number, 0]
    };
  }
  
  private addGenerationNodes(
    nodes: ComfyUINode[],
    step: ParsedWorkflowStep,
    model: [number, number],
    positive: [number, number],
    negative: [number, number],
    vae: [number, number]
  ): { latent: [number, number]; image: [number, number] } {
    // Create empty latent
    const emptyLatentNode = this.createNode('EmptyLatentImage', {
      width: step.parameters.width || 512,
      height: step.parameters.height || 512,
      batch_size: 1
    });
    nodes.push(emptyLatentNode);
    
    // Create sampler
    const samplerNode = this.createNode('KSampler', {
      model: model,
      positive: positive,
      negative: negative,
      latent_image: [emptyLatentNode.id as number, 0],
      seed: step.parameters.seed || Math.floor(Math.random() * 2147483647),
      steps: step.parameters.steps || 20,
      cfg: step.parameters.cfg || 8.0,
      sampler_name: step.parameters.sampler || 'euler',
      scheduler: step.parameters.scheduler || 'normal',
      denoise: step.parameters.denoise || 1.0
    });
    nodes.push(samplerNode);
    
    // Create VAE decode
    const vaeDecodeNode = this.createNode('VAEDecode', {
      samples: [samplerNode.id as number, 0],
      vae: vae
    });
    nodes.push(vaeDecodeNode);
    
    return {
      latent: [samplerNode.id as number, 0],
      image: [vaeDecodeNode.id as number, 0]
    };
  }
  
  private addLoRANode(
    nodes: ComfyUINode[],
    step: ParsedWorkflowStep,
    model: [number, number],
    clip: [number, number]
  ): { model: [number, number]; clip: [number, number] } {
    const loraNode = this.createNode('LoraLoader', {
      model: model,
      clip: clip,
      lora_name: step.parameters.name || 'lora.safetensors',
      strength_model: step.parameters.strength_model || 1.0,
      strength_clip: step.parameters.strength_clip || 1.0
    });
    nodes.push(loraNode);
    
    return {
      model: [loraNode.id as number, 0],
      clip: [loraNode.id as number, 1]
    };
  }
  
  private addUpscaleNode(
    nodes: ComfyUINode[],
    step: ParsedWorkflowStep,
    image: [number, number]
  ): [number, number] {
    if (step.parameters.method === 'model') {
      // Use upscale model
      const upscaleModelNode = this.createNode('UpscaleModelLoader', {
        model_name: step.parameters.model || 'RealESRGAN_x4plus.pth'
      });
      nodes.push(upscaleModelNode);
      
      const upscaleNode = this.createNode('ImageUpscaleWithModel', {
        upscale_model: [upscaleModelNode.id as number, 0],
        image: image
      });
      nodes.push(upscaleNode);
      
      return [upscaleNode.id as number, 0];
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
      nodes.push(scaleNode);
      
      return [scaleNode.id as number, 0];
    }
  }
  
  private addEffectNode(
    nodes: ComfyUINode[],
    step: ParsedWorkflowStep,
    image: [number, number]
  ): [number, number] {
    // For now, we'll create a simple blend node as a placeholder for effects
    // In a real implementation, you'd have specific nodes for different effects
    const blendNode = this.createNode('ImageBlend', {
      image1: image,
      image2: image, // Blend with itself for effect
      blend_factor: step.parameters.strength || 0.5,
      blend_mode: 'overlay'
    });
    nodes.push(blendNode);
    
    return [blendNode.id as number, 0];
  }
  
  private addControlNetNode(
    nodes: ComfyUINode[],
    step: ParsedWorkflowStep,
    positive: [number, number],
    negative: [number, number],
    image: [number, number]
  ): { positive: [number, number]; negative: [number, number] } {
    // Load ControlNet model
    const controlNetLoader = this.createNode('ControlNetLoader', {
      control_net_name: `control_v11p_sd15_${step.parameters.type || 'canny'}.pth`
    });
    nodes.push(controlNetLoader);
    
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
    nodes.push(controlNetApply);
    
    return {
      positive: [controlNetApply.id as number, 0],
      negative: [controlNetApply.id as number, 1]
    };
  }
  
  // Calculate proper node position based on workflow flow
  private calculateNodePosition(classType: string, nodeId: number): [number, number] {
    // Define workflow stages and their positions
    const stagePositions: Record<string, { x: number; y: number; width: number }> = {
      // Stage 1: Model Loading (leftmost)
      'CheckpointLoaderSimple': { x: 50, y: 200, width: 250 },
      'LoraLoader': { x: 50, y: 400, width: 250 },
      
      // Stage 2: Text Processing
      'CLIPTextEncode': { x: 350, y: 150, width: 200 },
      
      // Stage 3: ControlNet (if used)
      'LoadImage': { x: 350, y: 350, width: 200 },
      'ControlNetLoader': { x: 350, y: 500, width: 200 },
      'ControlNetApplyAdvanced': { x: 600, y: 400, width: 250 },
      
      // Stage 4: Generation Setup
      'EmptyLatentImage': { x: 600, y: 50, width: 200 },
      
      // Stage 5: Main Generation
      'KSampler': { x: 850, y: 200, width: 300 },
      
      // Stage 6: Decoding
      'VAEDecode': { x: 1200, y: 200, width: 200 },
      
      // Stage 7: Post-processing
      'ImageScale': { x: 1450, y: 150, width: 200 },
      'ImageUpscaleWithModel': { x: 1450, y: 300, width: 250 },
      'UpscaleModelLoader': { x: 1450, y: 450, width: 200 },
      'ImageBlend': { x: 1450, y: 600, width: 200 },
      
      // Stage 8: Output
      'PreviewImage': { x: 1700, y: 200, width: 200 }
    };
    
    const stage = stagePositions[classType];
    if (stage) {
      // Count nodes of same type to stack them vertically
      const sameTypeCount = Math.floor((nodeId - 1) / 10); // Rough estimation
      return [stage.x, stage.y + (sameTypeCount * 150)];
    }
    
    // Fallback to flow-based positioning
    const column = Math.floor((nodeId - 1) / 3);
    const row = (nodeId - 1) % 3;
    return [200 + column * 300, 100 + row * 200];
  }
  
  // Get appropriate node size based on type
  private getNodeSize(classType: string): [number, number] {
    const sizeMap: Record<string, [number, number]> = {
      'CheckpointLoaderSimple': [320, 98],
      'CLIPTextEncode': [210, 76],
      'KSampler': [315, 262],
      'VAEDecode': [210, 46],
      'EmptyLatentImage': [210, 106],
      'LoraLoader': [315, 126],
      'PreviewImage': [210, 246],
      'ControlNetLoader': [315, 58],
      'ControlNetApplyAdvanced': [315, 186],
      'LoadImage': [315, 314],
      'ImageScale': [315, 130],
      'ImageUpscaleWithModel': [241, 46],
      'UpscaleModelLoader': [315, 58],
      'ImageBlend': [315, 102]
    };
    
    return sizeMap[classType] || [200, 100];
  }

  // Update output links arrays for all nodes based on created links
  private updateOutputLinks(nodes: ComfyUINode[], links: ComfyUILink[]): void {
    // First, ensure all nodes have their outputs initialized with empty links arrays
    nodes.forEach(node => {
      if (node.outputs) {
        node.outputs.forEach(output => {
          if (!output.links) {
            output.links = [];
          }
        });
      }
    });
    
    // Now populate the links arrays based on the links
    links.forEach(link => {
      const originNode = nodes.find(node => node.id === link.origin_id);
      if (originNode && originNode.outputs) {
        const outputSlot = typeof link.origin_slot === 'number' ? link.origin_slot : parseInt(link.origin_slot as string);
        if (originNode.outputs[outputSlot]) {
          if (!originNode.outputs[outputSlot].links) {
            originNode.outputs[outputSlot].links = [];
          }
          originNode.outputs[outputSlot].links!.push(link.id);
        }
      }
    });
  }
  
  
  // Utility method to validate and clean workflow
  public validateWorkflow(workflow: ComfyUIWorkflow): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check required version field
    if (!workflow.version) {
      errors.push('Workflow missing required version field');
    } else if (workflow.version !== 1) {
      errors.push(`Workflow version must be 1, got ${workflow.version}`);
    }
    
    // Check required state field
    if (!workflow.state) {
      errors.push('Workflow missing required state field');
    } else {
      if (workflow.state.lastNodeId === undefined) {
        errors.push('Workflow state missing lastNodeId');
      }
      if (workflow.state.lastLinkId === undefined) {
        errors.push('Workflow state missing lastLinkId');
      }
    }
    
    // Check required nodes field
    if (!workflow.nodes) {
      errors.push('Workflow missing required nodes field');
      return { isValid: false, errors };
    }
    
    if (workflow.nodes.length === 0) {
      errors.push('Workflow contains no nodes');
      return { isValid: false, errors };
    }
    
    // Validate each node
    for (const node of workflow.nodes) {
      if (!node.type) {
        errors.push(`Node ${node.id} missing type`);
        continue;
      }
      
      if (!node.inputs) {
        errors.push(`Node ${node.id} missing inputs`);
        continue;
      }
      
      const definition = getNodeDefinition(node.type);
      if (!definition) {
        errors.push(`Unknown node type: ${node.type}`);
        continue;
      }
      
      // Check required inputs
      const nodeInputNames = node.inputs.map((input: unknown) => 
        typeof input === 'object' && input !== null && 'name' in input 
          ? (input as { name: string }).name 
          : ''
      );
      for (const [inputName, inputDef] of Object.entries(definition.inputs)) {
        if (inputDef.required && !nodeInputNames.includes(inputName)) {
          errors.push(`Node ${node.id} (${node.type}) missing required input: ${inputName}`);
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
import { ComfyUIWorkflow, ComfyUINode, ParsedWorkflowStep, WorkflowExplanation } from './types';
import { getNodeDefinition } from './node-definitions';
import { WorkflowParser } from './workflow-parser';

export class WorkflowConstructor {
  private parser: WorkflowParser;
  private nodeCounter: number = 1;
  
  constructor() {
    this.parser = new WorkflowParser();
  }
  
  public generateWorkflow(description: string): { workflow: ComfyUIWorkflow; explanation: WorkflowExplanation } {
    const steps = this.parser.parseDescription(description);
    const prompts = this.parser.extractPrompt(description);
    
    const workflow: ComfyUIWorkflow = {};
    const explanationSteps: WorkflowExplanation['steps'] = [];
    
    // Always start with model loading
    const modelLoadNode = this.createNode('CheckpointLoaderSimple', {
      ckpt_name: steps[0]?.parameters?.model || 'v1-5-pruned-emaonly.safetensors'
    });
    workflow[modelLoadNode.id] = modelLoadNode;
    
    // Create text encoding nodes
    const positiveTextNode = this.createNode('CLIPTextEncode', {
      text: prompts.positive,
      clip: [modelLoadNode.id, 1]
    });
    workflow[positiveTextNode.id] = positiveTextNode;
    
    const negativeTextNode = this.createNode('CLIPTextEncode', {
      text: prompts.negative,
      clip: [modelLoadNode.id, 1]
    });
    workflow[negativeTextNode.id] = negativeTextNode;
    
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
            workflow, 
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
          const loraResult = this.addLoRANode(workflow, step, currentModel, [modelLoadNode.id, 1]);
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
            currentImage = this.addUpscaleNode(workflow, step, currentImage);
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
            currentImage = this.addEffectNode(workflow, step, currentImage);
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
            const controlResult = this.addControlNetNode(workflow, step, currentPositive, currentNegative, currentImage);
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
      workflow[previewNode.id] = previewNode;
      
      explanationSteps.push({
        step: stepCounter++,
        description: 'Preview final image',
        nodeType: 'PreviewImage',
        parameters: {}
      });
    }
    
    const explanation: WorkflowExplanation = {
      title: 'ComfyUI Workflow',
      steps: explanationSteps,
      summary: `Generated workflow with ${Object.keys(workflow).length} nodes to create: ${prompts.positive}`
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
  
  private addGenerationNodes(
    workflow: ComfyUIWorkflow,
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
    workflow[emptyLatentNode.id] = emptyLatentNode;
    
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
    workflow[samplerNode.id] = samplerNode;
    
    // Create VAE decode
    const vaeDecodeNode = this.createNode('VAEDecode', {
      samples: [samplerNode.id, 0],
      vae: vae
    });
    workflow[vaeDecodeNode.id] = vaeDecodeNode;
    
    return {
      latent: [samplerNode.id, 0],
      image: [vaeDecodeNode.id, 0]
    };
  }
  
  private addLoRANode(
    workflow: ComfyUIWorkflow,
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
    workflow[loraNode.id] = loraNode;
    
    return {
      model: [loraNode.id, 0],
      clip: [loraNode.id, 1]
    };
  }
  
  private addUpscaleNode(
    workflow: ComfyUIWorkflow,
    step: ParsedWorkflowStep,
    image: [string, number]
  ): [string, number] {
    if (step.parameters.method === 'model') {
      // Use upscale model
      const upscaleModelNode = this.createNode('UpscaleModelLoader', {
        model_name: step.parameters.model || 'RealESRGAN_x4plus.pth'
      });
      workflow[upscaleModelNode.id] = upscaleModelNode;
      
      const upscaleNode = this.createNode('ImageUpscaleWithModel', {
        upscale_model: [upscaleModelNode.id, 0],
        image: image
      });
      workflow[upscaleNode.id] = upscaleNode;
      
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
      workflow[scaleNode.id] = scaleNode;
      
      return [scaleNode.id, 0];
    }
  }
  
  private addEffectNode(
    workflow: ComfyUIWorkflow,
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
    workflow[blendNode.id] = blendNode;
    
    return [blendNode.id, 0];
  }
  
  private addControlNetNode(
    workflow: ComfyUIWorkflow,
    step: ParsedWorkflowStep,
    positive: [string, number],
    negative: [string, number],
    image: [string, number]
  ): { positive: [string, number]; negative: [string, number] } {
    // Load ControlNet model
    const controlNetLoader = this.createNode('ControlNetLoader', {
      control_net_name: `control_v11p_sd15_${step.parameters.type || 'canny'}.pth`
    });
    workflow[controlNetLoader.id] = controlNetLoader;
    
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
    workflow[controlNetApply.id] = controlNetApply;
    
    return {
      positive: [controlNetApply.id, 0],
      negative: [controlNetApply.id, 1]
    };
  }
  
  // Utility method to validate and clean workflow
  public validateWorkflow(workflow: ComfyUIWorkflow): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    for (const [nodeId, node] of Object.entries(workflow)) {
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
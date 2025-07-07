// Core types for ComfyUI workflow generation

export interface ComfyUINode {
  id: string;
  type: string;
  pos: [number, number];
  size: [number, number];
  flags: Record<string, unknown>;
  order: number;
  mode: number;
  inputs: unknown[];
  outputs: unknown[];
  properties: Record<string, unknown>;
  widgets_values?: unknown[];
  color?: string;
  bgcolor?: string;
  title?: string;
}

// ComfyUI API Format (for execution)
export interface ComfyUIWorkflow {
  [nodeId: string]: {
    inputs: Record<string, unknown>;
    class_type: string;
    _meta?: {
      title?: string;
    };
  };
}

export interface WorkflowConnection {
  from: string;
  to: string;
  output: string | number;
  input: string;
}

export interface NodeDefinition {
  class_type: string;
  category: string;
  description: string;
  inputs: Record<string, {
    type: string;
    required: boolean;
    default?: unknown;
    options?: unknown[];
  }>;
  outputs: Record<string, string>;
  keywords: string[];
}

export interface ParsedWorkflowStep {
  action: string;
  parameters: Record<string, unknown>;
  dependencies: string[];
  keywords: string[];
}

export interface WorkflowExplanation {
  title: string;
  steps: Array<{
    step: number;
    description: string;
    nodeType: string;
    parameters: Record<string, unknown>;
  }>;
  summary: string;
}

// Generation parameters
export interface GenerationParams {
  model?: string;
  steps?: number;
  cfg?: number;
  sampler?: string;
  scheduler?: string;
  seed?: number;
  width?: number;
  height?: number;
  denoise?: number;
}

// Effect parameters
export interface EffectParams {
  type: string;
  strength?: number;
  parameters?: Record<string, unknown>;
}

// LoRA parameters
export interface LoRAParams {
  name: string;
  strength_model?: number;
  strength_clip?: number;
}
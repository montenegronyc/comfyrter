// Core types for ComfyUI workflow generation

export interface ComfyUINode {
  id: string;
  class_type: string;
  inputs: Record<string, unknown>;
  _meta?: {
    title?: string;
  };
}

export interface ComfyUIWorkflow {
  version: number;
  nodes: Record<string, ComfyUINode>;
  state: Record<string, unknown>;
  extra?: {
    ds?: {
      scale?: number;
      offset?: [number, number];
    };
    groupNodes?: Record<string, unknown>;
  };
  workflow?: {
    last_node_id?: number;
    last_link_id?: number;
    nodes?: unknown[];
    links?: unknown[];
    groups?: unknown[];
    config?: Record<string, unknown>;
    extra?: Record<string, unknown>;
    version?: number;
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
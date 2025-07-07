// Core types for ComfyUI workflow generation

export interface ComfyUINode {
  id: number | string;
  type: string;
  pos: [number, number];
  size: [number, number];
  flags: Record<string, unknown>;
  order: number;
  mode: number;
  inputs?: Array<{
    name: string;
    type: string | string[] | number;
    link?: number | null;
    slot_index?: number | string;
  }>;
  outputs?: Array<{
    name: string;
    type: string | string[] | number;
    links?: number[] | null;
    slot_index?: number | string;
  }>;
  properties: Record<string, unknown>;
  widgets_values?: unknown[] | Record<string, unknown>;
  color?: string;
  bgcolor?: string;
}

export interface ComfyUILink {
  id: number;
  origin_id: number | string;
  origin_slot: number | string;
  target_id: number | string;
  target_slot: number | string;
  type: string | string[] | number;
  parentId?: number;
}

// ComfyUI Workflow Format (for UI/import) - matches official schema
export interface ComfyUIWorkflow {
  version: number; // const: 1
  state: {
    lastGroupid?: number;
    lastNodeId?: number;
    lastLinkId?: number;
    lastRerouteId?: number;
  };
  nodes: ComfyUINode[];
  links?: ComfyUILink[];
  groups?: Array<{
    title: string;
    bounding: [number, number, number, number];
    color?: string;
    font_size?: number;
    locked?: boolean;
  }>;
  config?: {
    links_ontop?: boolean;
    align_to_grid?: boolean;
  } | null;
  extra?: {
    ds?: {
      scale: number;
      offset: [number, number];
    };
    info?: {
      name: string;
      author: string;
      description: string;
      version: string;
      created: string;
      modified: string;
      software: string;
    };
  } | null;
  reroutes?: Array<{
    id: number;
    pos: [number, number];
    linkIds?: number[] | null;
  }>;
  models?: Array<{
    name: string;
    url: string;
    hash?: string;
    hash_type?: string;
    directory: string;
  }>;
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
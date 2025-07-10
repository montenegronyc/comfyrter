import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';

export interface CivitAIModel {
  id: number;
  name: string;
  description: string;
  type: string;
  nsfw: boolean;
  tags: string[];
  creator: {
    username: string;
  };
  stats: {
    downloadCount: number;
    favoriteCount: number;
    commentCount: number;
    ratingCount: number;
    rating: number;
  };
  modelVersions: Array<{
    id: number;
    name: string;
    description: string;
    baseModel: string;
    files: Array<{
      id: number;
      name: string;
      type: string;
      sizeKB: number;
      metadata: {
        format?: string;
        size?: string;
        fp?: string;
      };
    }>;
    images: Array<{
      url: string;
      nsfw: boolean;
      width: number;
      height: number;
      meta?: Record<string, unknown>;
    }>;
  }>;
}

export interface ProcessedModel {
  id: number;
  name: string;
  type: string;
  category: string;
  tags: string[];
  baseModel: 'sd15' | 'sdxl' | 'sd3' | 'pony' | 'flux' | 'unknown';
  compatibleControlNets: string[];
  compatibleDetailers: string[];
  recommendedVAE: string;
  optimalResolution: { width: number; height: number };
  yearReleased: number;
  downloadCount: number;
  rating: number;
  filename: string;
  creator: string;
}

// Cache the API call for 24 hours
const getCivitAIModels = unstable_cache(
  async (): Promise<CivitAIModel[]> => {
    try {
      const url = new URL('https://civitai.com/api/v1/models');
      url.searchParams.set('limit', '20');
      url.searchParams.set('sort', 'Highest Rated');
      url.searchParams.set('period', 'Month');
      url.searchParams.set('primaryFileOnly', 'true');
      url.searchParams.set('types', 'Checkpoint');

      const response = await fetch(url.toString(), {
        headers: {
          'User-Agent': 'Comfyrter/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`CivitAI API error: ${response.status}`);
      }

      const data = await response.json();
      return data.items || [];
    } catch (error) {
      console.error('Error fetching from CivitAI:', error);
      return [];
    }
  },
  ['civitai-trending-models'],
  {
    revalidate: 24 * 60 * 60, // 24 hours
    tags: ['civitai-models']
  }
);

function detectBaseModel(modelVersion: CivitAIModel['modelVersions'][0]): ProcessedModel['baseModel'] {
  const baseModel = modelVersion.baseModel?.toLowerCase() || '';
  const name = modelVersion.name.toLowerCase();
  const description = modelVersion.description?.toLowerCase() || '';
  
  // Check for explicit base model indicators
  if (baseModel.includes('sd 3') || baseModel.includes('sd3')) return 'sd3';
  if (baseModel.includes('flux')) return 'flux';
  if (baseModel.includes('pony') || name.includes('pony') || description.includes('pony')) return 'pony';
  if (baseModel.includes('sdxl') || baseModel.includes('xl') || name.includes('xl')) return 'sdxl';
  if (baseModel.includes('sd 1.5') || baseModel.includes('sd15')) return 'sd15';
  
  // Filename pattern detection
  const filename = modelVersion.files[0]?.name.toLowerCase() || '';
  if (filename.includes('xl') || filename.includes('sdxl')) return 'sdxl';
  if (filename.includes('pony') || filename.includes('v6')) return 'pony';
  if (filename.includes('sd3')) return 'sd3';
  if (filename.includes('flux')) return 'flux';
  
  // Default to SD1.5 for older models, SDXL for newer ones
  const year = new Date().getFullYear();
  return year >= 2024 ? 'sdxl' : 'sd15';
}

function getCompatibleControlNets(baseModel: ProcessedModel['baseModel']): string[] {
  const controlNets = {
    sd15: [
      'control_v11p_sd15_canny',
      'control_v11p_sd15_openpose',
      'control_v11p_sd15_depth',
      'control_v11f1p_sd15_depth',
      'control_v11p_sd15_normalbae',
      'control_v11p_sd15_seg',
      'control_v11p_sd15_inpaint',
      'control_v11p_sd15_lineart',
      'control_v11p_sd15_mlsd',
      'control_v11p_sd15_scribble',
      'control_v11p_sd15_softedge'
    ],
    sdxl: [
      'control-lora-canny-xl',
      'control-lora-openpose-xl',
      'control-lora-depth-xl',
      'controlnet-openpose-sdxl-1.0',
      'controlnet-canny-sdxl-1.0',
      'controlnet-depth-sdxl-1.0',
      'diffusers-xl-canny-mid',
      'sai-controlnet-xl-canny-256lora',
      'sai-controlnet-xl-depth-256lora'
    ],
    pony: [
      'control-lora-openpose-xl',
      'control-lora-canny-xl',
      'controlnet-openpose-sdxl-1.0',
      'pony-controlnet-openpose',
      'pony-controlnet-depth'
    ],
    sd3: [
      'sd3-controlnet-canny',
      'sd3-controlnet-depth',
      'sd3-controlnet-openpose'
    ],
    flux: [
      'flux-controlnet-canny',
      'flux-controlnet-depth'
    ],
    unknown: []
  };
  
  return controlNets[baseModel] || [];
}

function getCompatibleDetailers(baseModel: ProcessedModel['baseModel']): string[] {
  const detailers = {
    sd15: [
      'yolov5l-face.pt',
      'yolov5s-face.pt',
      'yolov8n-face.pt',
      'yolov8s-face.pt'
    ],
    sdxl: [
      'bbox/yolov8n.pt',
      'face_yolov8n.pt',
      'face_yolov8s.pt',
      'person_yolov8n-seg.pt',
      'hand_yolov8n.pt'
    ],
    pony: [
      'bbox/yolov8n.pt',
      'face_yolov8n.pt',
      'face_yolov8s.pt'
    ],
    sd3: [
      'face_yolov8n.pt',
      'bbox/yolov8n.pt'
    ],
    flux: [
      'face_yolov8n.pt',
      'bbox/yolov8n.pt'
    ],
    unknown: []
  };
  
  return detailers[baseModel] || [];
}

function getRecommendedVAE(baseModel: ProcessedModel['baseModel']): string {
  const vaes = {
    sd15: 'vae-ft-mse-840000-ema-pruned.safetensors',
    sdxl: 'sdxl_vae.safetensors',
    pony: 'sdxl_vae.safetensors',
    sd3: 'sd3_vae.safetensors',
    flux: 'flux_vae.safetensors',
    unknown: 'vae-ft-mse-840000-ema-pruned.safetensors'
  };
  
  return vaes[baseModel];
}

function getOptimalResolution(baseModel: ProcessedModel['baseModel']): { width: number; height: number } {
  const resolutions = {
    sd15: { width: 512, height: 768 },
    sdxl: { width: 1024, height: 1024 },
    pony: { width: 1024, height: 1024 },
    sd3: { width: 1024, height: 1024 },
    flux: { width: 1024, height: 1024 },
    unknown: { width: 512, height: 512 }
  };
  
  return resolutions[baseModel];
}

function processModel(model: CivitAIModel): ProcessedModel | null {
  // Filter out NSFW models
  if (model.nsfw) return null;
  
  const latestVersion = model.modelVersions[0];
  if (!latestVersion || !latestVersion.files.length) return null;
  
  const primaryFile = latestVersion.files[0];
  const baseModel = detectBaseModel(latestVersion);
  
  // Estimate year from model name patterns and current date
  const currentYear = new Date().getFullYear();
  let yearReleased = currentYear;
  
  // Look for year patterns in name/description
  const yearMatch = (model.name + ' ' + latestVersion.description).match(/20\d{2}/);
  if (yearMatch) {
    yearReleased = parseInt(yearMatch[0]);
  } else {
    // Estimate based on base model
    if (baseModel === 'sd15') yearReleased = 2023;
    if (baseModel === 'sdxl' || baseModel === 'pony') yearReleased = 2024;
    if (baseModel === 'sd3' || baseModel === 'flux') yearReleased = 2024;
  }
  
  return {
    id: model.id,
    name: model.name,
    type: model.type,
    category: model.type,
    tags: model.tags || [],
    baseModel,
    compatibleControlNets: getCompatibleControlNets(baseModel),
    compatibleDetailers: getCompatibleDetailers(baseModel),
    recommendedVAE: getRecommendedVAE(baseModel),
    optimalResolution: getOptimalResolution(baseModel),
    yearReleased,
    downloadCount: model.stats?.downloadCount || 0,
    rating: model.stats?.rating || 0,
    filename: primaryFile.name,
    creator: model.creator?.username || 'Unknown'
  };
}

export async function GET() {
  try {
    const civitaiModels = await getCivitAIModels();
    
    const processedModels = civitaiModels
      .map(processModel)
      .filter((model): model is ProcessedModel => model !== null)
      .sort((a, b) => b.rating - a.rating); // Sort by rating descending
    
    return NextResponse.json({
      models: processedModels,
      count: processedModels.length,
      lastUpdated: new Date().toISOString(),
      source: 'civitai'
    });
  } catch (error) {
    console.error('Error in trending models API:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to fetch trending models',
        fallback: true,
        models: [], // Could return static fallback models here
        count: 0
      },
      { status: 500 }
    );
  }
}
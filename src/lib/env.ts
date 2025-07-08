// Environment Configuration for LLM Integration

export function getHuggingFaceToken(): string | null {
  // Check server-side environment first
  if (typeof process !== 'undefined' && process.env) {
    return process.env.HUGGINGFACE_API_TOKEN || null;
  }
  
  // Check client-side environment (for development)
  if (typeof window !== 'undefined' && process.env) {
    return process.env.NEXT_PUBLIC_HUGGINGFACE_API_TOKEN || null;
  }
  
  return null;
}

export function isHuggingFaceAvailable(): boolean {
  return getHuggingFaceToken() !== null;
}

export function getDefaultHuggingFaceModel(): string {
  return 'microsoft/DialoGPT-medium';
}

export function getHuggingFaceBaseUrl(): string {
  return 'https://api-inference.huggingface.co/models';
}
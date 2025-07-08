// Environment Configuration for LLM Integration

export function getHuggingFaceToken(): string | null {
  // Only check server-side environment (client-side should use API routes)
  if (typeof process !== 'undefined' && process.env) {
    return process.env.HUGGINGFACE_API_TOKEN || null;
  }
  
  return null;
}

export function isHuggingFaceAvailable(): boolean {
  // On server-side, check if token exists
  if (typeof window === 'undefined') {
    return getHuggingFaceToken() !== null;
  }
  
  // On client-side, we need to check via API route
  // This is a sync function, so we can't do async checks here
  // The actual availability check should be done via isLLMParsingAvailable()
  return true; // Assume available, let the API route handle the actual check
}

export function getDefaultHuggingFaceModel(): string {
  return 'gpt2';
}

export function getHuggingFaceBaseUrl(): string {
  return 'https://api-inference.huggingface.co/models';
}
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const token = process.env.HUGGINGFACE_API_TOKEN;
    
    console.log('HF API Check - Token present:', !!token);
    console.log('HF API Check - Token length:', token?.length || 0);
    
    if (!token) {
      console.log('HF API Check - No token found');
      return NextResponse.json({ 
        available: false, 
        error: 'HUGGINGFACE_API_TOKEN not configured',
        debug: {
          tokenPresent: false,
          envVars: Object.keys(process.env).filter(key => key.includes('HUGGING'))
        }
      }, { status: 200 });
    }

    // Test API accessibility with a simple request
    console.log('HF API Check - Testing API connection...');
    console.log('HF API Check - Token starts with:', token.substring(0, 10));
    console.log('HF API Check - Token format valid:', token.startsWith('hf_'));
    console.log('HF API Check - Full URL:', 'https://api-inference.huggingface.co/models/gpt2');
    
    // First try to validate the token with the user info endpoint
    const userInfoResponse = await fetch('https://huggingface.co/api/whoami', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      signal: AbortSignal.timeout(5000)
    });
    
    console.log('HF API Check - User info status:', userInfoResponse.status);
    
    let userInfo = '';
    if (userInfoResponse.ok) {
      userInfo = await userInfoResponse.text();
      console.log('HF API Check - User info:', userInfo);
    } else {
      const errorText = await userInfoResponse.text();
      console.log('HF API Check - User info error:', errorText);
    }
    
    // Then try a simple GET request to check if the model exists
    const modelCheckResponse = await fetch('https://huggingface.co/api/models/gpt2', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      signal: AbortSignal.timeout(5000)
    });
    
    console.log('HF API Check - Model check status:', modelCheckResponse.status);
    
    if (modelCheckResponse.ok) {
      const modelInfo = await modelCheckResponse.text();
      console.log('HF API Check - Model info:', modelInfo.substring(0, 200));
    }
    
    // Try multiple endpoint formats to find the correct one
    const endpoints = [
      'https://api-inference.huggingface.co/models/gpt2',
      'https://api-inference.huggingface.co/models/openai-community/gpt2',
      'https://api-inference.huggingface.co/models/distilgpt2'
    ];
    
    let response;
    let workingEndpoint = '';
    
    for (const endpoint of endpoints) {
      try {
        console.log('HF API Check - Trying endpoint:', endpoint);
        
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            inputs: "Hello world",
            options: { wait_for_model: true }
          }),
          signal: AbortSignal.timeout(10000)
        });
        
        console.log('HF API Check - Endpoint response status:', response.status);
        
        if (response.status !== 404) {
          workingEndpoint = endpoint;
          break;
        }
      } catch (error) {
        console.log('HF API Check - Endpoint error:', error);
      }
    }
    
    if (!response) {
      throw new Error('All endpoints failed');
    }
    
    const responseText = await response.text();
    console.log('HF API Check - Response status:', response.status);
    console.log('HF API Check - Response headers:', Object.fromEntries(response.headers.entries()));
    console.log('HF API Check - Response text:', responseText.substring(0, 500));
    
    // HF API returns 200 for success, or specific error codes
    const available = response.status === 200 || response.status === 422; // 422 is validation error but API is accessible
    
    return NextResponse.json({ 
      available,
      status: response.status,
      statusText: response.statusText,
      debug: {
        tokenPresent: true,
        tokenLength: token.length,
        tokenFormat: token.startsWith('hf_'),
        responsePreview: responseText.substring(0, 200),
        userInfoStatus: userInfoResponse.status,
        userInfo: userInfo.substring(0, 100),
        modelCheckStatus: modelCheckResponse.status,
        workingEndpoint: workingEndpoint || 'none',
        testedEndpoints: endpoints
      }
    });
    
  } catch (error) {
    console.error('HuggingFace API check error:', error);
    return NextResponse.json({ 
      available: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      debug: {
        errorType: error instanceof Error ? error.constructor.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      }
    }, { status: 200 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = process.env.HUGGINGFACE_API_TOKEN;
    
    if (!token) {
      return NextResponse.json({ 
        error: 'HUGGINGFACE_API_TOKEN not configured' 
      }, { status: 500 });
    }

    const { model, inputs, parameters } = await request.json();
    
    const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs,
        parameters
      }),
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ 
        error: `Hugging Face request failed: ${response.status} ${response.statusText} - ${errorText}` 
      }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('HuggingFace API request error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
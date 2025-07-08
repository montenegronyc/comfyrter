import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const token = process.env.HUGGINGFACE_API_TOKEN;
    
    if (!token) {
      return NextResponse.json({ 
        available: false, 
        error: 'HUGGINGFACE_API_TOKEN not configured' 
      }, { status: 200 });
    }

    // Test API accessibility with a simple request
    const response = await fetch('https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: "test",
        parameters: {
          max_new_tokens: 10,
          temperature: 0.1
        }
      }),
      signal: AbortSignal.timeout(5000)
    });
    
    // HF API returns 200 for success, or specific error codes
    const available = response.status === 200 || response.status === 422; // 422 is validation error but API is accessible
    
    return NextResponse.json({ 
      available,
      status: response.status,
      statusText: response.statusText
    });
    
  } catch (error) {
    console.error('HuggingFace API check error:', error);
    return NextResponse.json({ 
      available: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
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
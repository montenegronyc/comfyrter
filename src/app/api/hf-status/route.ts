import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check if Hugging Face API key is configured
    const apiKey = process.env.HUGGINGFACE_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ available: false, reason: 'API key not configured' }, { status: 200 });
    }

    // Test the API key with a simple request
    const response = await fetch('https://api-inference.huggingface.co/models/cardiffnlp/twitter-roberta-base-sentiment-latest', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: 'test',
        options: { wait_for_model: true }
      }),
    });

    if (response.ok || response.status === 503) {
      // 503 means model is loading, which is still a valid API key
      return NextResponse.json({ available: true });
    }

    return NextResponse.json({ available: false, reason: 'Invalid API key' }, { status: 200 });
  } catch (error) {
    console.error('Error checking HF API status:', error);
    return NextResponse.json({ available: false, reason: 'Network error' }, { status: 200 });
  }
}
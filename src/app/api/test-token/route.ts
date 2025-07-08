import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const token = process.env.HUGGINGFACE_API_TOKEN;
    
    if (!token) {
      return NextResponse.json({ 
        error: 'No token found' 
      });
    }
    
    console.log('Token test - Token present:', !!token);
    console.log('Token test - Token length:', token.length);
    console.log('Token test - Token format:', token.startsWith('hf_'));
    
    // Test the token with the whoami endpoint
    const response = await fetch('https://huggingface.co/api/whoami', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const responseText = await response.text();
    console.log('Token test - Response status:', response.status);
    console.log('Token test - Response:', responseText);
    
    return NextResponse.json({
      tokenValid: response.ok,
      status: response.status,
      response: responseText,
      tokenInfo: {
        present: true,
        length: token.length,
        format: token.startsWith('hf_'),
        prefix: token.substring(0, 10)
      }
    });
    
  } catch (error) {
    console.error('Token test error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}
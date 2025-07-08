'use client';

import { useState } from 'react';

interface DebugResult {
  available?: boolean;
  error?: string;
  status?: number;
  statusText?: string;
  debug?: {
    tokenPresent?: boolean;
    tokenLength?: number;
    responsePreview?: string;
    envVars?: string[];
    errorType?: string;
    errorMessage?: string;
  };
}

export default function DebugHFPage() {
  const [result, setResult] = useState<DebugResult | null>(null);
  const [loading, setLoading] = useState(false);

  const testAPI = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/huggingface', {
        method: 'GET',
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  const testToken = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/test-token', {
        method: 'GET',
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Hugging Face API Debug</h1>
      
      <div className="space-x-4">
        <button
          onClick={testAPI}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test HF API'}
        </button>
        
        <button
          onClick={testToken}
          disabled={loading}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test Token Only'}
        </button>
      </div>

      {result && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-2">API Response:</h2>
          <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      <div className="mt-6 text-sm text-gray-600">
        <p>This page helps debug the Hugging Face API integration.</p>
        <p>Check the browser console and server logs for additional details.</p>
      </div>
    </div>
  );
}
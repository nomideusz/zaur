import { json } from '@sveltejs/kit';

export const GET = async ({ url, fetch }) => {
  try {
    const targetUrl = url.searchParams.get('url');
    
    if (!targetUrl) {
      return json({ error: 'No URL provided' }, { status: 400 });
    }
    
    const response = await fetch(`https://api.allorigins.win/raw?url=${targetUrl}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch from proxy: ${response.statusText}`);
    }
    
    const data = await response.text();
    
    return new Response(data, {
      headers: {
        'Content-Type': 'application/xml',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error('Error in CORS proxy:', error);
    return json(
      { 
        error: 'Failed to proxy request',
        details: error instanceof Error ? error.message : String(error)
      }, 
      { status: 500 }
    );
  }
}; 
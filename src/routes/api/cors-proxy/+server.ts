import { json } from '@sveltejs/kit';

export const GET = async ({ url, fetch }) => {
  try {
    const targetUrl = url.searchParams.get('url');
    
    if (!targetUrl) {
      console.log('No URL provided to CORS proxy');
      return json({ error: 'No URL provided' }, { status: 400 });
    }
    
    console.log(`CORS proxy fetching: ${targetUrl}`);
    
    // Try corsanywhere as an alternative proxy
    const response = await fetch(`https://cors-anywhere.herokuapp.com/${targetUrl}`);
    
    if (!response.ok) {
      console.error(`Proxy fetch failed with status: ${response.status}`);
      throw new Error(`Failed to fetch from proxy: ${response.statusText}`);
    }
    
    const data = await response.text();
    console.log(`CORS proxy successfully fetched ${data.length} bytes`);
    
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
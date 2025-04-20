import { json } from '@sveltejs/kit';

export const GET = async ({ url, fetch, request }) => {
  try {
    const targetUrl = url.searchParams.get('url');
    
    if (!targetUrl) {
      console.log('No URL provided to CORS proxy');
      return json({ error: 'No URL provided' }, { status: 400 });
    }
    
    console.log(`CORS proxy fetching: ${targetUrl}`);
    
    // Use direct fetch with appropriate headers
    const response = await fetch(targetUrl, {
      headers: {
        // Forward user agent to avoid blocking
        'User-Agent': request.headers.get('User-Agent') || 'Mozilla/5.0 (compatible; NewsApp/1.0)',
        // Accept various content types
        'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml, application/json, text/plain',
      },
      // Avoid caching issues
      cache: 'no-cache'
    });
    
    if (!response.ok) {
      console.error(`Direct fetch failed with status: ${response.status}`);
      
      // Try alternative proxy services if direct fails
      const proxyResponse = await tryAlternativeProxies(targetUrl, fetch);
      if (!proxyResponse) {
        throw new Error(`Failed to fetch from all proxy services: ${response.statusText}`);
      }
      
      return proxyResponse;
    }
    
    const data = await response.text();
    console.log(`CORS proxy successfully fetched ${data.length} bytes`);
    
    return new Response(data, {
      headers: {
        // Determine content type based on response
        'Content-Type': determineContentType(response),
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
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

// Try multiple proxy services
async function tryAlternativeProxies(targetUrl: string, fetch: any): Promise<Response | null> {
  // List of public proxy services
  const proxyServices = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
    `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
    `https://thingproxy.freeboard.io/fetch/${targetUrl}`
  ];
  
  for (const proxyUrl of proxyServices) {
    try {
      console.log(`Trying alternative proxy: ${proxyUrl}`);
      const response = await fetch(proxyUrl, {
        cache: 'no-cache',
        headers: {
          'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml, application/json, text/plain',
        }
      });
      
      if (response.ok) {
        const data = await response.text();
        console.log(`Alternative proxy success with ${data.length} bytes`);
        
        return new Response(data, {
          headers: {
            'Content-Type': determineContentType(response),
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          }
        });
      }
    } catch (error) {
      console.error(`Alternative proxy failed:`, error);
    }
  }
  
  return null;
}

// Determine content type based on response headers or content
function determineContentType(response: Response): string {
  // First try to get it from the response headers
  const contentType = response.headers.get('Content-Type');
  if (contentType) {
    // Extract just the MIME type without charset
    const mimeType = contentType.split(';')[0].trim();
    if (mimeType) return mimeType;
  }
  
  // Default to XML for RSS feeds
  return 'application/xml';
} 
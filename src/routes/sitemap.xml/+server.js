import { apps } from '$lib/config/apps.js';

export async function GET() {
    const baseUrl = 'https://zaur.app';
    
    // Define external websites
    const externalWebsites = [
        {
            url: 'https://kurcz.pl',
            name: 'Kurcz',
            description: 'Website about cramps'
        }
        // Add more external websites here as needed
    ];
    
    // Start with the XML declaration and root element
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    
    // Add the main page
    xml += `  <url>
    <loc>${baseUrl}</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>\n`;
    
    // Add each project page (open source apps)
    for (const app of apps) {
        xml += `  <url>
    <loc>${baseUrl}/${app.id}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>\n`;
    }
    
    // We don't include external websites in the sitemap as they are not part of this domain
    // They will have their own sitemaps
    
    // Close the root element
    xml += '</urlset>';
    
    // Return the XML with appropriate headers
    return new Response(xml, {
        headers: {
            'Content-Type': 'application/xml',
            'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
        }
    });
} 
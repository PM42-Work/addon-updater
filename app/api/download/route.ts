export async function GET(request: Request) {
  const authHeader = request.headers.get('X-Addon-Auth');
  
  // Validate against both allowed hashes
  const isAdvLighting = authHeader === process.env.ADDON_SECRET_HASH;
  const isBetterColour = authHeader === process.env.BETTERCOLOUR_SECRET_HASH;

  if (!isAdvLighting && !isBetterColour) {
    return new Response('Unauthorized', { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const assetUrl = searchParams.get('assetUrl');
  const filename = searchParams.get('filename') || 'Update.zip';

  if (!assetUrl) return new Response('Missing asset URL', { status: 400 });

  // Fetch the actual zip binary from GitHub
  const ghResponse = await fetch(assetUrl, {
    headers: {
      'Authorization': `Bearer ${process.env.GITHUB_PAT}`,
      'Accept': 'application/octet-stream', 
      'User-Agent': 'Vercel-Addon-Updater'
    },
    redirect: 'follow'
  });

  if (!ghResponse.ok) return new Response('GitHub fetch failed', { status: ghResponse.status });

  // Stream the zip directly back to Blender with the dynamic filename
  return new Response(ghResponse.body, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${filename}"`
    }
  });
}
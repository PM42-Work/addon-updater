import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const authHeader = request.headers.get('X-Addon-Auth');
  
  // Define our two allowed addons and their specific details
  const addons = {
    [process.env.ADDON_SECRET_HASH as string]: {
      repo: process.env.GITHUB_REPO, // Your Advanced Lighting repo name
      assetName: 'AdvancedLighting.zip'
    },
    [process.env.BETTERCOLOUR_SECRET_HASH as string]: {
      repo: process.env.BETTERCOLOUR_GITHUB_REPO, // e.g. "BetterColour"
      assetName: 'BetterColour.zip'
    }
  };

  const activeAddon = addons[authHeader as string];

  if (!activeAddon || !authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const githubToken = process.env.GITHUB_PAT;
  const repoOwner = process.env.GITHUB_OWNER; 
  const apiUrl = `https://api.github.com/repos/${repoOwner}/${activeAddon.repo}/releases/latest`;

  try {
    const ghResponse = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'User-Agent': 'Vercel-Addon-Updater',
        'Accept': 'application/vnd.github+json',
      },
      next: { revalidate: 60 }
    });

    if (!ghResponse.ok) return NextResponse.json({ error: 'Failed to fetch release' }, { status: ghResponse.status });

    const data = await ghResponse.json();
    const asset = data.assets?.find((a: any) => a.name === activeAddon.assetName);
    
    if (!asset) return NextResponse.json({ error: 'Zip not found' }, { status: 444 });

    // Construct the Vercel Proxy URL, passing both the asset URL AND the required filename
    const host = request.headers.get('host');
    const protocol = host?.includes('localhost') ? 'http' : 'https';
    const proxyUrl = `${protocol}://${host}/api/download?assetUrl=${encodeURIComponent(asset.url)}&filename=${activeAddon.assetName}`;

    return NextResponse.json({
      tag_name: data.tag_name,
      download_url: proxyUrl
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
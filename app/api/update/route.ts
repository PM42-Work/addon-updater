import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const authHeader = request.headers.get('X-Addon-Auth');
  const expectedSecret = process.env.ADDON_SECRET_HASH;

  if (!expectedSecret || authHeader !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const githubToken = process.env.GITHUB_PAT;
  const repoOwner = process.env.GITHUB_OWNER;
  const repoName = process.env.GITHUB_REPO;
  const apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/releases/latest`;

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
    const asset = data.assets?.find((a: any) => a.name === 'AdvancedLighting.zip');
    
    if (!asset) return NextResponse.json({ error: 'Zip not found' }, { status: 444 });

    // Construct the Vercel Proxy URL using the asset's API URL
    const host = request.headers.get('host');
    const protocol = host?.includes('localhost') ? 'http' : 'https';
    const proxyUrl = `${protocol}://${host}/api/download?assetUrl=${encodeURIComponent(asset.url)}`;

    return NextResponse.json({
      tag_name: data.tag_name,
      download_url: proxyUrl
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
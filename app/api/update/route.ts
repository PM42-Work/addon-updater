import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // 1. Verify Secret Auth Header
  const authHeader = request.headers.get('X-Addon-Auth');
  const expectedSecret = process.env.ADDON_SECRET_HASH;

  if (!expectedSecret || authHeader !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // 2. Fetch Release Data from Private GitHub Repo
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
      next: { revalidate: 60 } // Cache results for 60 seconds
    });

    if (!ghResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch release' }, { status: ghResponse.status });
    }

    const data = await ghResponse.json();
    const tagName = data.tag_name;

    // Find the zip asset
    const asset = data.assets?.find((a: any) => a.name === 'AdvancedLighting.zip');
    if (!asset) {
      return NextResponse.json({ error: 'Release asset AdvancedLighting.zip not found' }, { status: 444 });
    }

    // Return version tag and asset download URL to Blender
    return NextResponse.json({
      tag_name: tagName,
      download_url: asset.browser_download_url
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
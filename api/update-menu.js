export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { menu } = req.body;
  if (!menu || !menu.categories) return res.status(400).json({ error: 'Invalid menu payload' });

  const token = process.env.GITHUB_TOKEN;
  if (!token) return res.status(500).json({ error: 'GITHUB_TOKEN not configured' });

  const owner = 'johnnydw-bit';
  const repo  = 'halfway-house';
  const path  = 'public/menu.json';
  const apiBase = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  const headers = {
    Authorization: `token ${token}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'bramley-halfway-house'
  };

  // Get current file SHA (required for update)
  const getRes = await fetch(apiBase, { headers });
  if (!getRes.ok) return res.status(500).json({ error: 'Could not fetch current menu.json from GitHub' });
  const { sha } = await getRes.json();

  const content = Buffer.from(JSON.stringify(menu, null, 2)).toString('base64');

  const putRes = await fetch(apiBase, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'Update menu via admin page',
      content,
      sha
    })
  });

  if (!putRes.ok) {
    const err = await putRes.json();
    return res.status(500).json({ error: err.message || 'GitHub API error' });
  }

  res.status(200).json({ ok: true });
}

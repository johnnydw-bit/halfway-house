export default async function handler(req, res) {
  const KV_REST_API_URL   = process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL;
  const KV_REST_API_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!KV_REST_API_URL || !KV_REST_API_TOKEN) {
    return res.status(500).json({ error: 'KV store not configured' });
  }

  async function kv(command) {
    const r = await fetch(KV_REST_API_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(command),
    });
    return r.json();
  }

  if (req.method === 'POST') {
    const { order } = req.body;
    if (!order?.id) return res.status(400).json({ error: 'Missing order' });
    const score = new Date(order.timestamp).getTime();
    await kv(['ZADD', 'hh:printjobs', score, JSON.stringify(order)]);
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'GET') {
    const since = Date.now() - 86400000;
    const { result } = await kv(['ZRANGEBYSCORE', 'hh:printjobs', since, '+inf']);
    const jobs = (result || []).map(s => JSON.parse(s));
    return res.status(200).json({ jobs });
  }

  if (req.method === 'DELETE') {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'Missing id' });
    // Remove by fetching matching members and deleting
    const { result } = await kv(['ZRANGEBYSCORE', 'hh:printjobs', '-inf', '+inf']);
    const members = (result || []).filter(s => {
      try { return JSON.parse(s).id === id; } catch { return false; }
    });
    for (const m of members) await kv(['ZREM', 'hh:printjobs', m]);
    return res.status(200).json({ ok: true });
  }

  res.status(405).end();
}

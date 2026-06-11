export default async function handler(req, res) {
  const { KV_REST_API_URL, KV_REST_API_TOKEN } = process.env;

  if (!KV_REST_API_URL || !KV_REST_API_TOKEN) {
    return res.status(500).json({ error: 'KV store not configured' });
  }

  async function kv(command) {
    const r = await fetch(KV_REST_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(command)
    });
    return r.json();
  }

  if (req.method === 'POST') {
    const order = req.body;
    if (!order?.id || !order?.timestamp) {
      return res.status(400).json({ error: 'Invalid order' });
    }
    const score = new Date(order.timestamp).getTime();
    await kv(['ZADD', 'orders', score, JSON.stringify(order)]);
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'GET') {
    const since = Number(req.query.since) || (Date.now() - 86400000);
    const { result } = await kv(['ZRANGEBYSCORE', 'orders', since + 1, '+inf']);
    const orders = (result || []).map(s => JSON.parse(s));
    return res.status(200).json({ orders });
  }

  res.status(405).end();
}

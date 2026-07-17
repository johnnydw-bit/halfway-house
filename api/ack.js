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
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'Missing order id' });
    await kv(['SET', `hh:ack:${id}`, '1', 'EX', 3600]);

    // Cancel any pending OneSignal notifications for this order
    const osKey = process.env.ONESIGNAL_REST_API_KEY;
    if (osKey) {
      const { result } = await kv(['GET', `hh:notifs:${id}`]);
      if (result) {
        const notifIds = JSON.parse(result);
        for (const notifId of notifIds) {
          fetch(`https://onesignal.com/api/v1/notifications/${notifId}?app_id=0650da8c-1bca-42ec-8a3c-9274d2a20c70`, {
            method: 'DELETE',
            headers: { 'Authorization': `Key ${osKey}` },
          }).catch(() => {});
        }
        await kv(['DEL', `hh:notifs:${id}`]);
      }
    }

    return res.status(200).json({ ok: true });
  }

  if (req.method === 'GET') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'Missing order id' });
    const { result } = await kv(['GET', `hh:ack:${id}`]);
    return res.status(200).json({ acked: result === '1' });
  }

  res.status(405).end();
}

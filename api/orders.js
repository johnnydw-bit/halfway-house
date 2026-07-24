export default async function handler(req, res) {
  const KV_REST_API_URL   = process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL;
  const KV_REST_API_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

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
    await kv(['ZADD', 'hh:orders', score, JSON.stringify(order)]);

    // Schedule 5 push notifications in parallel (0, 10, 20, 30, 40 s) — ack cancels pending ones
    const osKey = process.env.ONESIGNAL_REST_API_KEY;
    if (osKey) {
      const itemCount = order.items.reduce((s, i) => s + i.qty, 0);
      const headings = [
        '🔔 NEW ORDER — Action required',
        '🔔 REMINDER — Order waiting',
        '⚠️ URGENT — Order not acknowledged',
        '⚠️ URGENT — Order not acknowledged',
        '⚠️ URGENT — Order not acknowledged',
      ];
      const sendPush = async (i) => {
        const body = {
          app_id: '0650da8c-1bca-42ec-8a3c-9274d2a20c70',
          included_segments: ['All'],
          headings: { en: headings[i] },
          contents: { en: `${order.name} · ${itemCount} item${itemCount !== 1 ? 's' : ''} · £${order.total.toFixed(2)}` },
          url: 'https://bgchut.vercel.app/kitchen-ipad.html',
          priority: 10,
          web_push_topic: `${order.id}-${i}`,
        };
        if (i > 0) body.send_after = new Date(Date.now() + i * 10000).toISOString();
        try {
          const r = await fetch('https://onesignal.com/api/v1/notifications', {
            method: 'POST',
            headers: { 'Authorization': `Key ${osKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
          const data = await r.json();
          return data.id || null;
        } catch { return null; }
      };

      // Fire all 5 in parallel, store IDs for cancellation
      const notifIds = (await Promise.all([0,1,2,3,4].map(sendPush))).filter(Boolean);
      if (notifIds.length) {
        await kv(['SET', `hh:notifs:${order.id}`, JSON.stringify(notifIds), 'EX', 300]);
      }
    }

    return res.status(200).json({ ok: true });
  }

  if (req.method === 'GET') {
    const since = Number(req.query.since) || (Date.now() - 86400000);
    const { result } = await kv(['ZRANGEBYSCORE', 'hh:orders', since + 1, '+inf']);
    const orders = (result || []).map(s => JSON.parse(s));
    return res.status(200).json({ orders });
  }

  res.status(405).end();
}

// Set AI_API_KEY (your Groq key) in .env (local) or Vercel env vars. Optional: GROQ_MODEL.
const T = 'You are the voice of Rizzorante, a parody delivery app that delivers partners. Gen Z humor, sarcastic, PG, no jokes about religion, caste, body, or real people. Very short.';

const PROMPTS = {
  item: d => `${T} Turn this wish into a menu item: "${d.wish}". Return ONLY JSON: {"name":"funny item name","desc":"max 15 words","price":number between 99 and 999,"warning":"max 8 words, like May contain: ghosting"}`,
  rider: d => `${T} You are the delivery rider, mood: ${d.mood}. The customer ordered: ${d.items}. Customer says: "${d.msg}". Reply in max 25 words, stuck in emotional baggage traffic, never actually helpful.`,
  review: d => `${T} You are a sarcastic delivery rider leaving a short joke review of a customer on a parody app. The customer ordered ${d.items} and tipped ₹${d.tip}, but the app delivered ${d.ex} instead, as a silly twist. Write two short, playful sentences teasing the customer about their order and tip. Keep it light and harmless.`
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    const { type, data } = req.body || {};
    if (!PROMPTS[type]) return res.status(400).json({ error: 'bad type' });
    const key = process.env.AI_API_KEY;
    if (!key) return res.status(500).json({ error: 'missing AI_API_KEY' });
    const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: PROMPTS[type](data || {}) }],
        temperature: 1.1,
        max_tokens: 1000,
        ...(type === 'item' ? { response_format: { type: 'json_object' } } : {})
      })
    });
    const j = await r.json();
    console.log('AI response:', JSON.stringify(j).slice(0, 500));
    const text = j?.choices?.[0]?.message?.content;
    if (!text) return res.status(502).json({ error: 'no text', detail: j });
    res.status(200).json({ text });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
};
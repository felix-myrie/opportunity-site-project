const corsHeaders = (request, env) => ({
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || request.headers.get('Origin') || '*',
  'Content-Type': 'application/json',
});

export default {
  async fetch(request, env) {
    const headers = corsHeaders(request, env);
    if (request.method === 'OPTIONS') return new Response(null, { headers });
    if (request.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });

    try {
      const body = await request.json();
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      const description = typeof body.description === 'string' ? body.description.trim() : '';
      if (!name || !description || name.length > 120 || description.length > 2000) {
        return new Response(JSON.stringify({ error: 'Name and description are required.' }), { status: 400, headers });
      }

      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: env.EMAIL_FROM,
          to: [env.EMAIL_TO],
          subject: `New opportunity submission: ${name}`,
          text: `Name: ${name}\n\nDescription:\n${description}`,
        }),
      });
      if (!emailResponse.ok) return new Response(JSON.stringify({ error: 'Email delivery failed.' }), { status: 502, headers });
      return new Response(JSON.stringify({ ok: true }), { headers });
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Invalid submission.' }), { status: 400, headers });
    }
  },
};

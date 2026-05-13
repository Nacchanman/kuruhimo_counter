export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname !== "/count") {
      return json({ error: "Not found" }, 404);
    }

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    if (request.method !== "POST" && request.method !== "GET") {
      return json({ error: "Method not allowed" }, 405);
    }

    const key = "kuruhimo-times:visitors";
    const current = Number(await env.KURUHIMO_COUNTER.get(key)) || 0;
    const next = request.method === "POST" ? current + 1 : current;

    if (request.method === "POST") {
      await env.KURUHIMO_COUNTER.put(key, String(next));
    }

    return json({ count: next });
  },
};

function corsHeaders() {
  return {
    "access-control-allow-origin": "https://kuruhimo.com",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "cache-control": "no-store",
  };
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders(),
      "content-type": "application/json; charset=utf-8",
    },
  });
}

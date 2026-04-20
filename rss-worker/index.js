export default {
  async fetch(req) {
    const url = new URL(req.url).searchParams.get("url");
    if (!url) return new Response("url param missing", { status: 400 });
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    const text = await res.text();
    return new Response(text, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
};

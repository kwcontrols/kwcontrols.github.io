const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <title>KW Controls Private Portal</title>
  <style>
    :root{--bg:#f5f7fa;--navy:#0c2742;--blue:#2563eb;--text:#1f2937;--muted:#64748b;--line:#e5e7eb;--card:#fff}
    *{box-sizing:border-box}body{margin:0;font-family:Arial,Helvetica,sans-serif;background:var(--bg);color:var(--text);line-height:1.5}
    header{background:#fff;border-bottom:1px solid var(--line);padding:18px 28px;display:flex;align-items:center;justify-content:space-between;gap:20px}
    .brand{font-size:24px;font-weight:700;color:#082b70}.badge{font-size:12px;font-weight:700;background:#dbeafe;color:#1d4ed8;padding:5px 9px;border-radius:999px}
    main{max-width:1100px;margin:0 auto;padding:48px 22px 70px}.eyebrow{color:var(--blue);font-weight:700;margin-bottom:8px}h1{font-size:42px;line-height:1.1;color:var(--navy);margin:0 0 12px}.lead{font-size:18px;color:var(--muted);max-width:760px;margin:0 0 34px}
    .grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:22px;box-shadow:0 8px 24px rgba(15,23,42,.05)}.card h2{font-size:19px;color:var(--navy);margin:0 0 8px}.card p{color:var(--muted);margin:0}.status{margin-top:26px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;padding:16px 18px;color:#065f46;font-weight:600}footer{margin-top:45px;color:var(--muted);font-size:13px}
    @media(max-width:760px){.grid{grid-template-columns:1fr}h1{font-size:34px}header{padding:16px 20px}}
  </style>
</head>
<body>
<header><div class="brand">KW Controls</div><div class="badge">PRIVATE PORTAL</div></header>
<main>
  <div class="eyebrow">Secure workspace</div>
  <h1>KW Controls Private Portal</h1>
  <p class="lead">A protected workspace for internal tools, operational information, and analytics. Access is controlled by Cloudflare Access.</p>
  <section class="grid" aria-label="Portal areas">
    <article class="card"><h2>Analytics</h2><p>Private reporting and website performance views will live here.</p></article>
    <article class="card"><h2>Operations</h2><p>Internal resources, project information, and frequently used controls.</p></article>
    <article class="card"><h2>Administration</h2><p>Protected administrative utilities and portal configuration.</p></article>
  </section>
  <div class="status">Protected session active · KW Controls authorized users only</div>
  <footer>KW Controls · Private system · Do not share portal content outside authorized users.</footer>
</main>
</body>
</html>`;

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return Response.json({ ok: true, service: "kw-controls-portal" }, {
        headers: { "Cache-Control": "no-store" }
      });
    }

    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=UTF-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "Referrer-Policy": "no-referrer",
        "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
        "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
      }
    });
  }
};

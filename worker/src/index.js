const escapeHtml = (value = "") => value.replace(/[&<>"']/g, (char) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#039;",
}[char]));

function renderPortal(email) {
  const safeEmail = escapeHtml(email || "Authorized user");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex,nofollow,noarchive">
  <title>KW Controls Private Portal</title>
  <style>
    :root{--bg:#f5f7fa;--navy:#0c2742;--navy2:#082b70;--blue:#2563eb;--text:#1f2937;--muted:#64748b;--line:#dbe3ec;--card:#fff;--soft:#eef4fb;--green:#0f766e}
    *{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;font-family:Arial,Helvetica,sans-serif;background:var(--bg);color:var(--text);line-height:1.55}
    a{color:inherit}.topbar{background:#fff;border-bottom:1px solid var(--line);position:sticky;top:0;z-index:10}.nav{max-width:1180px;margin:0 auto;padding:16px 22px;display:flex;align-items:center;justify-content:space-between;gap:18px}.brand-wrap{display:flex;align-items:center;gap:12px}.mark{width:38px;height:38px;border:2px solid var(--navy2);border-radius:10px;display:grid;place-items:center;color:var(--navy2);font-weight:800}.brand{font-size:22px;font-weight:800;color:var(--navy2);letter-spacing:.01em}.portal-tag{font-size:11px;font-weight:800;letter-spacing:.09em;color:var(--blue);background:#eaf2ff;border:1px solid #cbdcff;padding:5px 8px;border-radius:999px}.nav-actions{display:flex;align-items:center;gap:10px}.link{font-size:14px;text-decoration:none;color:var(--navy);font-weight:700;padding:9px 12px;border-radius:8px}.link:hover{background:var(--soft)}.logout{border:1px solid var(--line);background:#fff}
    main{max-width:1180px;margin:0 auto;padding:48px 22px 72px}.eyebrow{color:var(--blue);font-size:12px;letter-spacing:.13em;font-weight:800;text-transform:uppercase;margin-bottom:10px}.hero{display:grid;grid-template-columns:1.4fr .8fr;gap:24px;align-items:stretch}.hero-card,.identity{background:#fff;border:1px solid var(--line);border-radius:18px;box-shadow:0 10px 28px rgba(15,23,42,.05)}.hero-card{padding:34px}.hero h1{font-size:44px;line-height:1.08;color:var(--navy);margin:0 0 14px;max-width:760px}.lead{font-size:18px;color:var(--muted);margin:0;max-width:720px}.identity{padding:24px;display:flex;flex-direction:column;justify-content:space-between}.identity-label{font-size:12px;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);font-weight:800}.identity-email{font-weight:800;color:var(--navy);overflow-wrap:anywhere;margin-top:6px}.secure{margin-top:22px;padding:12px 14px;border-radius:10px;background:#ecfdf5;border:1px solid #bbf7d0;color:#166534;font-size:13px;font-weight:700}
    .section-head{display:flex;justify-content:space-between;align-items:end;gap:16px;margin:38px 0 16px}.section-head h2{margin:0;color:var(--navy);font-size:25px}.section-head p{margin:0;color:var(--muted);font-size:14px}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}.card{background:var(--card);border:1px solid var(--line);border-radius:15px;padding:22px;min-height:180px;display:flex;flex-direction:column}.icon{width:38px;height:38px;border-radius:10px;background:var(--soft);display:grid;place-items:center;color:var(--navy2);font-weight:800;margin-bottom:18px}.card h3{margin:0 0 7px;color:var(--navy);font-size:19px}.card p{margin:0;color:var(--muted);font-size:14px}.status-row{margin-top:auto;padding-top:18px;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:var(--green)}
    .info{margin-top:34px;background:#fff;border:1px solid var(--line);border-radius:15px;padding:22px;display:grid;grid-template-columns:1fr 1fr;gap:26px}.info h3{margin:0 0 8px;color:var(--navy);font-size:17px}.info p{margin:0;color:var(--muted);font-size:14px}.footer{margin-top:40px;padding-top:20px;border-top:1px solid var(--line);display:flex;justify-content:space-between;gap:20px;color:var(--muted);font-size:12px}
    @media(max-width:820px){.hero{grid-template-columns:1fr}.grid{grid-template-columns:1fr}.info{grid-template-columns:1fr}.hero h1{font-size:36px}.nav-actions .public{display:none}}
  </style>
</head>
<body>
  <header class="topbar">
    <div class="nav">
      <div class="brand-wrap"><div class="mark">KW</div><div class="brand">KW Controls</div><div class="portal-tag">PRIVATE PORTAL</div></div>
      <div class="nav-actions">
        <a class="link public" href="https://kwcontrols.github.io/" rel="noopener">Public website</a>
        <a class="link logout" href="/cdn-cgi/access/logout">Sign out</a>
      </div>
    </div>
  </header>

  <main>
    <section class="hero">
      <div class="hero-card">
        <div class="eyebrow">Secure workspace</div>
        <h1>KW Controls Private Portal</h1>
        <p class="lead">A protected home for internal analytics, operational references, and administrative tools. The portal is intentionally separate from the public company website.</p>
      </div>
      <aside class="identity">
        <div>
          <div class="identity-label">Signed in as</div>
          <div class="identity-email">${safeEmail}</div>
        </div>
        <div class="secure">Cloudflare Access session verified</div>
      </aside>
    </section>

    <div class="section-head">
      <div><div class="eyebrow">Portal areas</div><h2>Private workspace</h2></div>
      <p>Foundation ready · analytics comes next</p>
    </div>

    <section class="grid" aria-label="Portal areas">
      <article class="card"><div class="icon">A</div><h3>Analytics</h3><p>Private website traffic, realtime visitors, engagement, location, device, and session reporting.</p><div class="status-row">Next build phase</div></article>
      <article class="card"><div class="icon">O</div><h3>Operations</h3><p>A future home for internal references, service notes, recurring checks, and frequently used operational resources.</p><div class="status-row">Ready for content</div></article>
      <article class="card"><div class="icon">M</div><h3>Administration</h3><p>Protected utilities and configuration references that should not live on the public site.</p><div class="status-row">Access protected</div></article>
    </section>

    <section class="info">
      <div><h3>Security model</h3><p>Authentication is enforced by Cloudflare Access before this Worker responds. Only identities allowed by the KW Controls Access policy can reach the portal.</p></div>
      <div><h3>Deployment model</h3><p>The portal source lives in GitHub under <strong>worker/</strong>. Changes to that folder on <strong>main</strong> deploy automatically through GitHub Actions.</p></div>
    </section>

    <footer class="footer"><span>KW Controls · Private system</span><span>Do not share protected portal content outside authorized users.</span></footer>
  </main>
</body>
</html>`;
}

const securityHeaders = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
};

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return Response.json({ ok: true, service: "kw-controls-portal" }, {
        headers: { ...securityHeaders, "Content-Type": "application/json; charset=UTF-8" },
      });
    }

    const email = request.headers.get("Cf-Access-Authenticated-User-Email") || "Authorized user";

    return new Response(renderPortal(email), {
      headers: {
        ...securityHeaders,
        "Content-Type": "text/html; charset=UTF-8",
      },
    });
  },
};

import { getAnalyticsSnapshot } from "./analytics.js";

const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
}[char]));

const formatDuration = (seconds = 0) => {
  const total = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return minutes ? `${minutes}m ${secs}s` : `${secs}s`;
};

const shellStyles = `
:root{--bg:#f5f7fa;--navy:#0c2742;--navy2:#082b70;--blue:#2563eb;--text:#1f2937;--muted:#64748b;--line:#dbe3ec;--card:#fff;--soft:#eef4fb;--green:#0f766e}
*{box-sizing:border-box}body{margin:0;font-family:Arial,Helvetica,sans-serif;background:var(--bg);color:var(--text);line-height:1.55}a{color:inherit}.topbar{background:#fff;border-bottom:1px solid var(--line);position:sticky;top:0;z-index:10}.nav{max-width:1180px;margin:0 auto;padding:16px 22px;display:flex;align-items:center;justify-content:space-between;gap:18px}.brand-wrap{display:flex;align-items:center;gap:12px}.mark{width:38px;height:38px;border:2px solid var(--navy2);border-radius:10px;display:grid;place-items:center;color:var(--navy2);font-weight:800}.brand{font-size:22px;font-weight:800;color:var(--navy2)}.portal-tag{font-size:11px;font-weight:800;letter-spacing:.09em;color:var(--blue);background:#eaf2ff;border:1px solid #cbdcff;padding:5px 8px;border-radius:999px}.nav-actions{display:flex;align-items:center;gap:10px}.link{font-size:14px;text-decoration:none;color:var(--navy);font-weight:700;padding:9px 12px;border-radius:8px}.link:hover{background:var(--soft)}.logout{border:1px solid var(--line);background:#fff}main{max-width:1180px;margin:0 auto;padding:42px 22px 72px}.eyebrow{color:var(--blue);font-size:12px;letter-spacing:.13em;font-weight:800;text-transform:uppercase;margin-bottom:10px}.hero{display:grid;grid-template-columns:1.4fr .8fr;gap:24px}.hero-card,.identity,.panel,.stat,.card{background:#fff;border:1px solid var(--line);border-radius:16px;box-shadow:0 10px 28px rgba(15,23,42,.04)}.hero-card{padding:34px}.hero h1,h1{font-size:42px;line-height:1.08;color:var(--navy);margin:0 0 14px}.lead{font-size:18px;color:var(--muted);margin:0}.identity{padding:24px;display:flex;flex-direction:column;justify-content:space-between}.identity-label{font-size:12px;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);font-weight:800}.identity-email{font-weight:800;color:var(--navy);overflow-wrap:anywhere;margin-top:6px}.secure{margin-top:22px;padding:12px 14px;border-radius:10px;background:#ecfdf5;border:1px solid #bbf7d0;color:#166534;font-size:13px;font-weight:700}.section-head{display:flex;justify-content:space-between;align-items:end;gap:16px;margin:38px 0 16px}.section-head h2{margin:0;color:var(--navy);font-size:25px}.section-head p{margin:0;color:var(--muted);font-size:14px}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}.card{padding:22px;min-height:180px;display:flex;flex-direction:column;text-decoration:none}.card:hover{border-color:#b7c8dd}.icon{width:38px;height:38px;border-radius:10px;background:var(--soft);display:grid;place-items:center;color:var(--navy2);font-weight:800;margin-bottom:18px}.card h3{margin:0 0 7px;color:var(--navy);font-size:19px}.card p{margin:0;color:var(--muted);font-size:14px}.status-row{margin-top:auto;padding-top:18px;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:var(--green)}.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin:24px 0}.stat{padding:20px}.stat-label{font-size:12px;color:var(--muted);text-transform:uppercase;font-weight:800;letter-spacing:.08em}.stat-value{font-size:30px;color:var(--navy);font-weight:800;margin-top:5px}.two-col{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:18px}.panel{padding:22px}.panel h2{font-size:20px;color:var(--navy);margin:0 0 16px}.row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:16px;padding:11px 0;border-top:1px solid #edf1f5}.row:first-of-type{border-top:0}.row-title{font-weight:700;color:var(--navy);overflow-wrap:anywhere}.row-sub{font-size:12px;color:var(--muted)}.row-value{text-align:right;font-weight:800;color:var(--navy)}.empty{color:var(--muted);font-size:14px}.back{display:inline-block;margin-bottom:18px;color:var(--blue);text-decoration:none;font-weight:700}.error{background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;padding:18px;border-radius:12px;margin-top:20px}.footer{margin-top:40px;padding-top:20px;border-top:1px solid var(--line);display:flex;justify-content:space-between;gap:20px;color:var(--muted);font-size:12px}@media(max-width:820px){.hero{grid-template-columns:1fr}.grid,.stats,.two-col{grid-template-columns:1fr}.hero h1,h1{font-size:34px}.nav-actions .public{display:none}}
`;

function header() {
  return `<header class="topbar"><div class="nav"><div class="brand-wrap"><div class="mark">KW</div><div class="brand">KW Controls</div><div class="portal-tag">PRIVATE PORTAL</div></div><div class="nav-actions"><a class="link" href="/">Portal home</a><a class="link public" href="https://kwcontrols.github.io/" rel="noopener">Public website</a><a class="link logout" href="/cdn-cgi/access/logout">Sign out</a></div></div></header>`;
}

function renderPortal(email) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><title>KW Controls Private Portal</title><style>${shellStyles}</style></head><body>${header()}<main>
    <section class="hero"><div class="hero-card"><div class="eyebrow">Secure workspace</div><h1>KW Controls Private Portal</h1><p class="lead">A protected home for internal analytics, operational references, and administrative tools.</p></div><aside class="identity"><div><div class="identity-label">Signed in as</div><div class="identity-email">${escapeHtml(email)}</div></div><div class="secure">Cloudflare Access session verified</div></aside></section>
    <div class="section-head"><div><div class="eyebrow">Portal areas</div><h2>Private workspace</h2></div><p>Analytics is now connected to GA4</p></div>
    <section class="grid"><a class="card" href="/analytics"><div class="icon">A</div><h3>Analytics</h3><p>Private website traffic, realtime visitors, engagement, locations, devices, sessions, and top pages.</p><div class="status-row">Open live dashboard →</div></a><article class="card"><div class="icon">O</div><h3>Operations</h3><p>A future home for internal references, service notes, recurring checks, and frequently used operational resources.</p><div class="status-row">Ready for content</div></article><article class="card"><div class="icon">M</div><h3>Administration</h3><p>Protected utilities and configuration references that should not live on the public site.</p><div class="status-row">Access protected</div></article></section>
    <footer class="footer"><span>KW Controls · Private system</span><span>GitHub → Actions → Cloudflare Worker</span></footer>
  </main></body></html>`;
}

function listPanel(title, items, renderItem) {
  return `<section class="panel"><h2>${title}</h2>${items.length ? items.map(renderItem).join("") : '<div class="empty">No data available yet.</div>'}</section>`;
}

function renderAnalytics(email, data, propertyId, errorMessage = "") {
  const rtTotal = data?.realtime?.reduce((sum, row) => sum + row.activeUsers, 0) || 0;
  const s = data?.summary || { activeUsers: 0, sessions: 0, views: 0, averageSessionDuration: 0 };
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><title>Analytics · KW Controls Private Portal</title><style>${shellStyles}</style></head><body>${header()}<main>
    <a class="back" href="/">← Back to portal</a><div class="eyebrow">Google Analytics 4</div><h1>Website Analytics</h1><p class="lead">Private GA4 reporting for property ${escapeHtml(propertyId || "Not configured")}. Realtime uses GA4's rolling realtime window; processed metrics cover the last 30 days.</p>
    ${errorMessage ? `<div class="error"><strong>Analytics connection needs attention.</strong><br>${escapeHtml(errorMessage)}</div>` : ""}
    <section class="stats"><div class="stat"><div class="stat-label">Realtime active</div><div class="stat-value">${rtTotal}</div></div><div class="stat"><div class="stat-label">Active users · 30d</div><div class="stat-value">${s.activeUsers}</div></div><div class="stat"><div class="stat-label">Sessions · 30d</div><div class="stat-value">${s.sessions}</div></div><div class="stat"><div class="stat-label">Page views · 30d</div><div class="stat-value">${s.views}</div></div></section>
    <section class="stats"><div class="stat"><div class="stat-label">Avg. session · 30d</div><div class="stat-value">${formatDuration(s.averageSessionDuration)}</div></div><div class="stat"><div class="stat-label">Signed in as</div><div class="row-title" style="margin-top:8px">${escapeHtml(email)}</div></div><div class="stat"><div class="stat-label">Generated</div><div class="row-title" style="margin-top:8px">${data?.generatedAt ? escapeHtml(new Date(data.generatedAt).toLocaleString("en-CA", { timeZone: "America/Vancouver" })) + " PT" : "—"}</div></div><div class="stat"><div class="stat-label">Source</div><div class="row-title" style="margin-top:8px">GA4 Data API</div></div></section>
    <div class="two-col">${listPanel("Realtime visitors", data?.realtime || [], (r) => `<div class="row"><div><div class="row-title">${escapeHtml(r.city || "Unknown location")}</div><div class="row-sub">${escapeHtml(r.deviceCategory || "unknown device")}</div></div><div class="row-value">${r.activeUsers} active</div></div>`)}${listPanel("Top pages · 30 days", data?.pages || [], (r) => `<div class="row"><div><div class="row-title">${escapeHtml(r.pagePath || "/")}</div><div class="row-sub">${r.activeUsers} active users</div></div><div class="row-value">${r.views} views</div></div>`)}</div>
    <div class="two-col">${listPanel("Devices · 30 days", data?.devices || [], (r) => `<div class="row"><div><div class="row-title">${escapeHtml(r.deviceCategory)}</div><div class="row-sub">${r.sessions} sessions</div></div><div class="row-value">${r.activeUsers} users</div></div>`)}${listPanel("Locations · 30 days", data?.locations || [], (r) => `<div class="row"><div><div class="row-title">${escapeHtml(r.city || "Unknown")}, ${escapeHtml(r.country || "Unknown")}</div><div class="row-sub">${r.sessions} sessions</div></div><div class="row-value">${r.activeUsers} users</div></div>`)}</div>
    <footer class="footer"><span>KW Controls · Analytics protected by Cloudflare Access</span><span>Credentials remain server-side in Worker secrets.</span></footer>
  </main></body></html>`;
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
  async fetch(request, env) {
    const url = new URL(request.url);
    const email = request.headers.get("Cf-Access-Authenticated-User-Email") || "Authorized user";

    if (url.pathname === "/health") return Response.json({ ok: true, service: "kw-controls-portal" }, { headers: securityHeaders });

    if (url.pathname === "/api/analytics") {
      try {
        return Response.json(await getAnalyticsSnapshot(env), { headers: securityHeaders });
      } catch (error) {
        return Response.json({ error: error.message }, { status: 500, headers: securityHeaders });
      }
    }

    if (url.pathname === "/analytics") {
      try {
        const data = await getAnalyticsSnapshot(env);
        return new Response(renderAnalytics(email, data, env.GA4_PROPERTY_ID), { headers: { ...securityHeaders, "Content-Type": "text/html; charset=UTF-8" } });
      } catch (error) {
        return new Response(renderAnalytics(email, null, env.GA4_PROPERTY_ID, error.message), { status: 200, headers: { ...securityHeaders, "Content-Type": "text/html; charset=UTF-8" } });
      }
    }

    return new Response(renderPortal(email), { headers: { ...securityHeaders, "Content-Type": "text/html; charset=UTF-8" } });
  },
};

import { getAnalyticsSnapshot } from "./analytics.js";
import {
  authenticatePortalIdentity,
  clearPortalSessionCookie,
  createManagedGuest,
  createPortalSessionForIdentity,
  getPortalSession,
  guestManagementConfigured,
  listManagedGuests,
  markGuestLogin,
  portalAuthConfigured,
  portalSessionCookie,
  revokeManagedGuest,
} from "./auth.js";

const PUBLIC_CONTACT_URL = "https://kwcontrols.github.io/contact.html";
const PUBLIC_PORTAL_ANCHOR = `${PUBLIC_CONTACT_URL}#private-portal`;
const LOGO_URL = "https://kwcontrols.github.io/images/pegasus-outline.svg";

const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
}[char]));

const formatDuration = (seconds = 0) => {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return minutes ? `${minutes}m ${secs}s` : `${secs}s`;
};

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("en-CA", { timeZone: "America/Vancouver", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
};

const shellStyles = `
:root{--bg:#f4f7fb;--navy:#0c2742;--navy2:#082b70;--blue:#175dcc;--text:#1f2937;--muted:#64748b;--line:#d7e0ea;--card:#fff;--soft:#eef4fb;--green:#0f766e;--gold:#a66f20;--red:#b42318}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;font-family:Arial,Helvetica,sans-serif;background:var(--bg);color:var(--text);line-height:1.55}a{color:inherit}.topbar{background:#fff;border-bottom:1px solid var(--line);position:sticky;top:0;z-index:10}.nav{max-width:1240px;margin:0 auto;padding:13px 22px;display:flex;align-items:center;justify-content:space-between;gap:22px}.brand-wrap{display:flex;align-items:center;gap:11px;min-width:max-content}.brand-logo{width:42px;height:46px;object-fit:contain}.brand-divider{width:1px;height:39px;background:var(--navy2)}.brand{font-size:23px;font-weight:800;color:var(--navy2);white-space:nowrap}.portal-tag{font-size:10px;font-weight:800;letter-spacing:.1em;color:var(--blue);background:#eaf2ff;border:1px solid #cbdcff;padding:4px 8px;border-radius:999px}.nav-actions{display:flex;align-items:center;justify-content:flex-end;gap:4px;flex-wrap:wrap}.link{font-size:13px;text-decoration:none;color:var(--navy);font-weight:700;padding:9px 10px;border-radius:8px}.link:hover,.link.active{background:var(--soft);color:var(--blue)}.logout{border:1px solid var(--line);background:#fff;margin-left:8px}.page-main{max-width:1180px;margin:0 auto;padding:38px 22px 64px;min-height:calc(100vh - 145px)}.eyebrow,.section-index{color:var(--blue);font-size:12px;letter-spacing:.13em;font-weight:800;text-transform:uppercase;margin:0 0 9px}.hero{display:grid;grid-template-columns:1.45fr .75fr;gap:22px}.hero-card,.identity,.panel,.stat-card,.area-card,.workspace-card,.admin-card{background:#fff;border:1px solid var(--line);border-radius:15px;box-shadow:0 9px 26px rgba(15,23,42,.04)}.hero-card{padding:32px}.hero h1,.page-title{font-size:40px;line-height:1.08;color:var(--navy);margin:0 0 13px}.lead{font-size:17px;color:var(--muted);margin:0}.identity{padding:22px;display:flex;flex-direction:column;justify-content:space-between}.identity-label{font-size:11px;text-transform:uppercase;letter-spacing:.11em;color:var(--muted);font-weight:800}.identity-name{font-weight:800;font-size:17px;color:var(--navy);overflow-wrap:anywhere;margin-top:5px}.secure{margin-top:22px;padding:11px 13px;border-radius:9px;background:#ecfdf5;border:1px solid #bbf7d0;color:#166534;font-size:12px;font-weight:700}.section-head{display:flex;justify-content:space-between;align-items:end;gap:16px;margin:34px 0 15px}.section-head h2{margin:0;color:var(--navy);font-size:24px}.section-head p{margin:0;color:var(--muted);font-size:13px}.workspace-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:17px}.workspace-card{padding:20px;min-height:180px;display:flex;flex-direction:column;text-decoration:none}.workspace-card:hover{border-color:#b7c8dd;transform:translateY(-1px)}.icon{width:35px;height:35px;border-radius:9px;background:var(--soft);display:grid;place-items:center;color:var(--navy2);font-weight:800;margin-bottom:15px}.workspace-card h3{margin:0 0 7px;color:var(--navy);font-size:18px}.workspace-card p{margin:0;color:var(--muted);font-size:13px}.status-row{margin-top:auto;padding-top:16px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:var(--green)}.analytics-hero{padding-bottom:5px}.analytics-hero span{display:inline-block;margin-top:14px;color:var(--muted);font-size:12px}.statistics-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin:25px 0}.stat-card{padding:18px;border-radius:0;position:relative;overflow:hidden}.stat-card:before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--blue)}.stat-card.tone-teal:before{background:#2c8c91}.stat-card.tone-navy:before{background:var(--navy2)}.stat-card.tone-gold:before{background:var(--gold)}.stat-top{display:flex;align-items:center;justify-content:space-between;gap:10px}.stat-top p{margin:0;color:#526b89;font-size:12px;font-weight:700}.stat-top span{color:var(--blue);font-weight:800}.stat-card strong{display:block;color:var(--navy);font-size:29px;margin:9px 0 2px}.stat-card small{color:var(--muted);font-size:11px}.analytics-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.area-card{padding:21px;border-radius:0}.area-card.wide{grid-column:1/-1}.card-heading{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;margin-bottom:14px}.card-heading p{margin:0 0 4px;color:var(--blue);font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.1em}.card-heading h2{margin:0;color:var(--navy);font-size:20px}.card-heading>span{font-size:12px;color:var(--muted)}.data-list{list-style:none;margin:0;padding:0}.data-list li{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:11px 0;border-top:1px solid #edf1f5}.data-list li:first-child{border-top:0}.data-main strong{display:block;color:var(--navy);font-size:13px}.data-main span{display:block;color:var(--muted);font-size:11px}.data-value{text-align:right;color:var(--navy);font-weight:800;font-size:13px}.data-value small{display:block;color:var(--muted);font-size:10px;font-weight:400}.bar{height:7px;background:#edf2f7;margin-top:6px;overflow:hidden}.bar i{display:block;height:100%;background:var(--blue)}.trend-chart{width:100%;height:210px;display:block}.chart-grid{stroke:#dce6f1;stroke-width:1}.chart-line-users{fill:none;stroke:#175dcc;stroke-width:3}.chart-line-sessions{fill:none;stroke:#2c8c91;stroke-width:2}.chart-line-views{fill:none;stroke:#8ba7c7;stroke-width:2}.chart-labels{display:flex;justify-content:space-between;color:var(--muted);font-size:10px;margin-top:5px}.legend{display:flex;gap:14px;flex-wrap:wrap;color:var(--muted);font-size:11px;margin-top:8px}.legend b{display:inline-block;width:10px;height:2px;vertical-align:middle;margin-right:5px}.panel{padding:22px}.empty{color:var(--muted);font-size:13px}.notice{padding:13px 15px;border:1px solid #bfdbfe;background:#eff6ff;color:#1e40af;margin:15px 0;font-size:13px}.error{padding:13px 15px;border:1px solid #fecaca;background:#fff1f2;color:#991b1b;margin:15px 0;font-size:13px}.operations-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}.admin-card{padding:22px;border-radius:0}.admin-card h2{margin:0 0 7px;color:var(--navy)}.admin-card p{color:var(--muted);font-size:13px}.guest-form{display:grid;grid-template-columns:1.4fr 1fr .8fr auto;gap:10px;align-items:end;margin-top:18px}.field label{display:block;font-size:11px;font-weight:800;color:var(--navy);margin-bottom:5px}.field input,.field select{width:100%;padding:10px 11px;border:1px solid #bccadd;background:#fff;color:var(--text);font:inherit;font-size:13px}.btn{display:inline-flex;align-items:center;justify-content:center;border:0;background:#2563eb;color:white;font-weight:800;padding:11px 16px;text-decoration:none;cursor:pointer}.btn.danger{background:#fff;color:var(--red);border:1px solid #fecaca;padding:7px 10px}.guest-code{margin-top:16px;padding:15px;background:#ecfdf5;border:1px solid #a7f3d0;color:#065f46}.guest-code code{display:block;margin-top:8px;background:#fff;border:1px solid #bbf7d0;padding:10px;color:var(--navy);font-size:15px;letter-spacing:.05em}.guest-table{width:100%;border-collapse:collapse;margin-top:18px;font-size:12px}.guest-table th{text-align:left;color:#526b89;font-size:10px;text-transform:uppercase;letter-spacing:.08em;padding:9px;border-bottom:1px solid var(--line)}.guest-table td{padding:11px 9px;border-bottom:1px solid #edf1f5;vertical-align:middle}.pill{display:inline-block;padding:3px 8px;border-radius:999px;background:#ecfdf5;color:#047857;font-weight:800;font-size:10px}.site-footer{background:#0c2c49;color:#fff;text-align:center;padding:18px 20px;font-size:13px}.back{display:inline-block;margin-bottom:17px;color:var(--blue);text-decoration:none;font-weight:700;font-size:13px}@media(max-width:940px){.nav{align-items:flex-start}.nav-actions{gap:1px}.statistics-grid{grid-template-columns:repeat(2,1fr)}.guest-form{grid-template-columns:1fr 1fr}.guest-form .btn{grid-column:1/-1}}@media(max-width:760px){.nav{flex-direction:column}.brand-wrap{width:100%}.nav-actions{width:100%;justify-content:flex-start}.hero,.workspace-grid,.analytics-grid,.operations-grid{grid-template-columns:1fr}.area-card.wide{grid-column:auto}.statistics-grid{grid-template-columns:1fr 1fr}.hero h1,.page-title{font-size:32px}.page-main{padding-top:28px}.guest-form{grid-template-columns:1fr}.guest-table{display:block;overflow-x:auto}.portal-tag{display:none}}@media(max-width:460px){.statistics-grid{grid-template-columns:1fr}.brand{font-size:20px}.link{padding:7px 7px;font-size:12px}}
`;

function header(session, active = "") {
  const adminLink = session?.role === "owner" ? `<a class="link ${active === "administration" ? "active" : ""}" href="/administration">Administration</a>` : "";
  return `<header class="topbar"><div class="nav"><div class="brand-wrap"><img class="brand-logo" src="${LOGO_URL}" alt="KW Controls"><span class="brand-divider"></span><div class="brand">KW Controls</div><div class="portal-tag">PRIVATE PORTAL</div></div><nav class="nav-actions" aria-label="Private portal"><a class="link ${active === "home" ? "active" : ""}" href="/">Home</a><a class="link ${active === "analytics" ? "active" : ""}" href="/analytics">Analytics</a><a class="link ${active === "operations" ? "active" : ""}" href="/operations">Operations</a>${adminLink}<a class="link logout" href="/portal-logout">Sign out</a></nav></div></header>`;
}

function footer() {
  return `<footer class="site-footer">© 2026 KW Controls. All Rights Reserved.</footer>`;
}

function page(title, session, active, body) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><title>${escapeHtml(title)} · KW Controls Private Portal</title><style>${shellStyles}</style></head><body>${header(session, active)}<main class="page-main">${body}</main>${footer()}</body></html>`;
}

function identityCard(session) {
  return `<aside class="identity"><div><div class="identity-label">Signed in as</div><div class="identity-name">${escapeHtml(session?.name || "Authorized user")}</div></div><div class="secure">Private portal session verified</div></aside>`;
}

function renderPortal(session) {
  return page("Home", session, "home", `<section class="hero"><div class="hero-card"><div class="eyebrow">Secure workspace</div><h1>KW Controls Private Portal</h1><p class="lead">A protected home for internal analytics, operational references, and administrative tools.</p></div>${identityCard(session)}</section><div class="section-head"><div><div class="eyebrow">Portal areas</div><h2>Private workspace</h2></div><p>Analytics is connected to GA4</p></div><section class="workspace-grid"><a class="workspace-card" href="/analytics"><div class="icon">A</div><h3>Analytics</h3><p>Private website traffic, realtime visitors, engagement, locations, devices, sessions, and top pages.</p><div class="status-row">Open live dashboard →</div></a><a class="workspace-card" href="/operations"><div class="icon">O</div><h3>Operations</h3><p>Internal references, service notes, recurring checks, and operational resources.</p><div class="status-row">Open operations →</div></a>${session.role === "owner" ? `<a class="workspace-card" href="/administration"><div class="icon">M</div><h3>Administration</h3><p>Guest access management and protected administrative utilities.</p><div class="status-row">Open administration →</div></a>` : `<article class="workspace-card"><div class="icon">M</div><h3>Administration</h3><p>Administrative tools are available to the portal administrator only.</p><div class="status-row">Admin only</div></article>`}</section>`);
}

function metricCard(label, value, note, tone = "blue", icon = "•") {
  return `<article class="stat-card tone-${tone}"><div class="stat-top"><p>${escapeHtml(label)}</p><span>${icon}</span></div><strong>${escapeHtml(value)}</strong><small>${escapeHtml(note)}</small></article>`;
}

function trendPolyline(rows, key, width = 760, height = 180) {
  if (!rows?.length) return "";
  const values = rows.map((row) => Number(row[key]) || 0);
  const max = Math.max(1, ...values);
  return rows.map((row, index) => {
    const x = rows.length === 1 ? width / 2 : (index / (rows.length - 1)) * width;
    const y = height - ((Number(row[key]) || 0) / max) * (height - 18) - 8;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}

function renderAnalytics(session, data, propertyId, errorMessage = "") {
  const s = data?.summary || {};
  const realtimeActive = (data?.realtime || []).reduce((sum, row) => sum + (Number(row.activeUsers) || 0), 0);
  const desktop = (data?.deviceSummary || []).find((d) => String(d.category).toLowerCase() === "desktop");
  const mobile = (data?.deviceSummary || []).find((d) => String(d.category).toLowerCase() === "mobile");
  const trends = data?.trends || [];
  const chart = trends.length ? `<svg class="trend-chart" viewBox="0 0 760 200" role="img" aria-label="Seven day visitor trends"><line class="chart-grid" x1="0" y1="50" x2="760" y2="50"></line><line class="chart-grid" x1="0" y1="100" x2="760" y2="100"></line><line class="chart-grid" x1="0" y1="150" x2="760" y2="150"></line><polyline class="chart-line-views" points="${trendPolyline(trends, "views")}"></polyline><polyline class="chart-line-sessions" points="${trendPolyline(trends, "sessions")}"></polyline><polyline class="chart-line-users" points="${trendPolyline(trends, "activeUsers")}"></polyline></svg><div class="chart-labels">${trends.map((r) => `<span>${escapeHtml(String(r.date).slice(4, 8))}</span>`).join("")}</div><div class="legend"><span><b style="background:#175dcc"></b>Users</span><span><b style="background:#2c8c91"></b>Sessions</span><span><b style="background:#8ba7c7"></b>Page views</span></div>` : `<p class="empty">No trend data yet.</p>`;
  const list = (items, renderer, empty) => items?.length ? `<ol class="data-list">${items.map(renderer).join("")}</ol>` : `<p class="empty">${escapeHtml(empty)}</p>`;
  const body = `<header class="analytics-hero"><p class="section-index">Analytics</p><h1 class="page-title">Private Portal</h1><p class="lead">A private view of KW Controls website traffic, visitor locations, technology, sessions, and engagement powered by Google Analytics.</p><span>GA4 analytics${data?.generatedAt ? ` · Generated ${escapeHtml(formatDate(data.generatedAt))}` : ""}${propertyId ? ` · Property ${escapeHtml(propertyId)}` : ""}</span></header>${errorMessage ? `<div class="error"><strong>Analytics connection needs attention.</strong><br>${escapeHtml(errorMessage)}</div>` : ""}<section class="statistics-grid">${metricCard("Total Users", Math.round(s.totalUsers || 0).toLocaleString(), "Last 30 days", "blue", "◎")}${metricCard("Active Users", Math.round(s.activeUsers || 0).toLocaleString(), "Last 30 days", "teal", "●")}${metricCard("Sessions", Math.round(s.sessions || 0).toLocaleString(), "Last 30 days", "navy", "◫")}${metricCard("Page Views", Math.round(s.views || 0).toLocaleString(), "Last 30 days", "blue", "↗")}${metricCard("Avg. Engagement / User", formatDuration(s.averageEngagementTime), "Last 30 days", "gold", "◷")}${metricCard("Avg. Session Duration", formatDuration(s.averageSessionDuration), "Last 30 days", "teal", "◴")}${metricCard("Desktop Users", String(desktop?.users || 0), `${desktop?.sessions || 0} sessions · Last 30 days`, "navy", "▣")}${metricCard("Mobile Users", String(mobile?.users || 0), `${mobile?.sessions || 0} sessions · Last 30 days`, "teal", "▯")}</section><div class="analytics-grid"><section class="area-card wide"><div class="card-heading"><div><p>Last 30 minutes</p><h2>Recent / Realtime Visitors</h2></div><span>${realtimeActive} active</span></div>${list(data?.realtime, (r) => `<li><div class="data-main"><strong>${escapeHtml(r.city || "Unknown")}, ${escapeHtml(r.country || "Unknown")}</strong><span>${escapeHtml(r.deviceCategory || "unknown device")}</span></div><div class="data-value">${r.activeUsers}<small>active</small></div></li>`, "No active users reported in the last 30 minutes.")}</section><section class="area-card wide"><div class="card-heading"><div><p>Last seven days</p><h2>Visitor Trends</h2></div><span>Processed GA4 data</span></div>${chart}</section><section class="area-card"><div class="card-heading"><div><p>Visitor location</p><h2>Top Cities</h2></div></div>${list(data?.locations, (r) => `<li><div class="data-main"><strong>${escapeHtml(r.city || "Unknown")}</strong><span>${escapeHtml(r.country || "Unknown")}</span></div><div class="data-value">${r.activeUsers}<small>${r.sessions} sessions</small></div></li>`, "No city data yet.")}</section><section class="area-card"><div class="card-heading"><div><p>Technology</p><h2>Devices & Browsers</h2></div></div>${list(data?.devices, (r) => `<li><div class="data-main"><strong>${escapeHtml(r.deviceCategory || "Unknown")}</strong><span>${escapeHtml(r.browser || "Unknown")} · ${escapeHtml(r.operatingSystem || "Unknown")}</span></div><div class="data-value">${r.activeUsers}<small>${r.sessions} sessions</small></div></li>`, "No device data yet.")}</section><section class="area-card"><div class="card-heading"><div><p>Content</p><h2>Top Pages</h2></div></div>${list(data?.pages, (r) => `<li><div class="data-main"><strong>${escapeHtml(r.pageTitle || r.pagePath || "/")}</strong><span>${escapeHtml(r.pagePath || "/")}</span></div><div class="data-value">${r.views}<small>${r.activeUsers} users</small></div></li>`, "No page data yet.")}</section><section class="area-card"><div class="card-heading"><div><p>Acquisition</p><h2>Traffic Sources</h2></div></div>${list(data?.trafficSources, (r) => `<li style="display:block"><div style="display:flex;justify-content:space-between;gap:12px"><div class="data-main"><strong>${escapeHtml(r.source || "Unknown")}</strong></div><div class="data-value">${r.users}<small>${Number(r.percentage || 0).toFixed(1)}%</small></div></div><div class="bar"><i style="width:${Math.min(100, Number(r.percentage || 0)).toFixed(1)}%"></i></div></li>`, "No traffic source data yet.")}</section><section class="area-card"><div class="card-heading"><div><p>Audience</p><h2>New vs Returning</h2></div></div>${list(data?.visitorTypes, (r) => `<li><div class="data-main"><strong>${escapeHtml(r.type === "new" ? "New visitors" : r.type === "returning" ? "Returning visitors" : r.type || "Unclassified")}</strong></div><div class="data-value">${r.users}<small>${Number(r.percentage || 0).toFixed(1)}%</small></div></li>`, "No visitor type data yet.")}</section></div>`;
  return page("Analytics", session, "analytics", body);
}

function renderOperations(session) {
  return page("Operations", session, "operations", `<p class="section-index">Operations</p><h1 class="page-title">Operations</h1><p class="lead">A protected workspace for internal service references, recurring checks, and operational resources.</p><div class="operations-grid" style="margin-top:25px"><section class="admin-card"><h2>Service references</h2><p>Store frequently used commissioning, troubleshooting, and service references here as this portal evolves.</p></section><section class="admin-card"><h2>Recurring checks</h2><p>A future home for recurring operational checks and internal service notes.</p></section></div>`);
}

function renderAdministration(session, guests, created = null, errorMessage = "") {
  const configured = guests !== null;
  const guestRows = configured && guests.length ? guests.map((guest) => `<tr><td><strong>${escapeHtml(guest.name)}</strong></td><td>${escapeHtml(formatDate(guest.createdAt))}</td><td>${escapeHtml(formatDate(guest.expiresAt))}</td><td>${escapeHtml(formatDate(guest.lastLoginAt))}</td><td><span class="pill">${Date.parse(guest.expiresAt) > Date.now() ? "Active" : "Expired"}</span></td><td><form method="POST" action="/administration/guests/revoke"><input type="hidden" name="id" value="${escapeHtml(guest.id)}"><button class="btn danger" type="submit">Revoke</button></form></td></tr>`).join("") : "";
  const body = `<p class="section-index">Administration</p><h1 class="page-title">Administration</h1><p class="lead">Manage private portal guest access and protected administrative settings.</p>${errorMessage ? `<div class="error">${escapeHtml(errorMessage)}</div>` : ""}${created ? `<div class="guest-code"><strong>Guest created: ${escapeHtml(created.guest.name)}</strong><br>This access code is shown once. Copy it now and send it securely.<code>${escapeHtml(created.code)}</code></div>` : ""}<section class="admin-card" style="margin-top:25px"><div class="card-heading"><div><p>Guest management</p><h2>Private portal guests</h2></div><span>${configured ? `${guests.length} guest${guests.length === 1 ? "" : "s"}` : "Storage setup required"}</span></div>${configured ? `<form class="guest-form" method="POST" action="/administration/guests"><div class="field"><label for="guest-name">Guest name</label><input id="guest-name" name="name" required maxlength="80" placeholder="Guest name"></div><div class="field"><label for="guest-expiry">Expires</label><input id="guest-expiry" name="expiresAt" type="datetime-local" required></div><div class="field"><label for="guest-session">Session</label><select id="guest-session" name="sessionHours"><option value="4">4 hours</option><option value="8" selected>8 hours</option><option value="12">12 hours</option><option value="24">24 hours</option></select></div><button class="btn" type="submit">+ Add Guest</button></form>${guestRows ? `<div style="overflow-x:auto"><table class="guest-table"><thead><tr><th>Guest name</th><th>Created</th><th>Expires</th><th>Last login</th><th>Status</th><th>Action</th></tr></thead><tbody>${guestRows}</tbody></table></div>` : `<p class="empty" style="margin-top:18px">No guests have been created yet.</p>`}` : `<div class="notice"><strong>Guest management is ready in code but needs one Cloudflare KV binding.</strong><br>Create a KV namespace for KW Controls guests and bind it to this Worker as <code>KW_CONTROLS_GUESTS</code>. The owner access code and session secret remain unchanged.</div>`}</section>`;
  return page("Administration", session, "administration", body);
}

const securityHeaders = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data: https://kwcontrols.github.io; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
};

function htmlResponse(html, status = 200) {
  return new Response(html, { status, headers: { ...securityHeaders, "Content-Type": "text/html; charset=UTF-8" } });
}

function redirect(location, extraHeaders = {}) {
  return new Response(null, { status: 302, headers: { ...securityHeaders, Location: location, ...extraHeaders } });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/health") return Response.json({ ok: true, service: "kw-controls-portal" }, { headers: securityHeaders });

    if (url.pathname === "/portal-login" && request.method === "POST") {
      if (!portalAuthConfigured(env)) return new Response("Portal authentication is not configured.", { status: 503, headers: securityHeaders });
      const form = await request.formData();
      const identity = await authenticatePortalIdentity(String(form.get("access_code") || ""), env);
      if (!identity) return redirect(`${PUBLIC_CONTACT_URL}?portal_error=1#private-portal`);
      const newSession = await createPortalSessionForIdentity(identity, env);
      if (!newSession) return new Response("Portal session could not be created.", { status: 500, headers: securityHeaders });
      if (identity.role === "guest") await markGuestLogin(identity.id, env);
      return redirect("/", { "Set-Cookie": portalSessionCookie(newSession.token, newSession.maxAge) });
    }

    if (url.pathname === "/portal-logout") return redirect(PUBLIC_CONTACT_URL, { "Set-Cookie": clearPortalSessionCookie() });

    const session = await getPortalSession(request, env);
    if (!session) return redirect(PUBLIC_PORTAL_ANCHOR);

    if (url.pathname === "/api/analytics") {
      try { return Response.json(await getAnalyticsSnapshot(env), { headers: securityHeaders }); }
      catch (error) { return Response.json({ error: error.message }, { status: 500, headers: securityHeaders }); }
    }

    if (url.pathname === "/analytics") {
      try { return htmlResponse(renderAnalytics(session, await getAnalyticsSnapshot(env), env.GA4_PROPERTY_ID)); }
      catch (error) { return htmlResponse(renderAnalytics(session, null, env.GA4_PROPERTY_ID, error.message)); }
    }

    if (url.pathname === "/operations") return htmlResponse(renderOperations(session));

    if (url.pathname === "/administration") {
      if (session.role !== "owner") return redirect("/");
      return htmlResponse(renderAdministration(session, await listManagedGuests(env)));
    }

    if (url.pathname === "/administration/guests" && request.method === "POST") {
      if (session.role !== "owner") return redirect("/");
      if (!guestManagementConfigured(env)) return htmlResponse(renderAdministration(session, null, null, "Guest storage is not configured."), 503);
      const form = await request.formData();
      const created = await createManagedGuest({ name: form.get("name"), expiresAt: form.get("expiresAt"), sessionHours: Number(form.get("sessionHours")) }, env);
      const guests = await listManagedGuests(env);
      return htmlResponse(renderAdministration(session, guests || [], created, created ? "" : "Please provide a valid guest name and future expiration date."), created ? 200 : 400);
    }

    if (url.pathname === "/administration/guests/revoke" && request.method === "POST") {
      if (session.role !== "owner") return redirect("/");
      const form = await request.formData();
      await revokeManagedGuest(String(form.get("id") || ""), env);
      return redirect("/administration");
    }

    return htmlResponse(renderPortal(session));
  },
};

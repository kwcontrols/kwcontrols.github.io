import portal from "./index.js";
import { getPortalSession } from "./auth.js";

const DOC_KEY = "admin-doc:private-portal-reference";
const PUBLIC_CONTACT_URL = "https://kwcontrols.github.io/contact.html";

const securityHeaders = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data: https://kwcontrols.github.io; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
};

const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
}[char]));

function redirect(location) {
  return new Response(null, { status: 302, headers: { ...securityHeaders, Location: location } });
}

function adminStore(env) {
  const store = env?.KW_CONTROLS_GUESTS;
  return store && typeof store.get === "function" && typeof store.put === "function" ? store : null;
}

async function loadReference(env) {
  const store = adminStore(env);
  if (!store) return null;
  const raw = await store.get(DOC_KEY);
  if (!raw) return { title: "KW Controls Private Portal — Operations Reference", revision: 0, updatedAt: null, body: "" };
  try {
    const doc = JSON.parse(raw);
    return {
      title: String(doc?.title || "KW Controls Private Portal — Operations Reference"),
      revision: Number(doc?.revision) || 0,
      updatedAt: doc?.updatedAt || null,
      body: String(doc?.body || ""),
    };
  } catch {
    return { title: "KW Controls Private Portal — Operations Reference", revision: 0, updatedAt: null, body: "" };
  }
}

function formatDate(value) {
  if (!value) return "Not saved yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString("en-CA", {
    timeZone: "America/Vancouver",
    year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

function renderReference(doc, message = "") {
  const revision = doc?.revision ? `R${doc.revision}` : "Draft";
  const body = doc?.body || "";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><title>Operations Reference · KW Controls Private Portal</title><style>
  :root{--bg:#f4f7fb;--navy:#0c2742;--blue:#175dcc;--muted:#64748b;--line:#d7e0ea;--green:#0f766e}
  *{box-sizing:border-box}body{margin:0;font-family:Arial,Helvetica,sans-serif;background:var(--bg);color:#1f2937;line-height:1.55}.top{background:#fff;border-bottom:1px solid var(--line)}.nav{max-width:1180px;margin:0 auto;padding:15px 22px;display:flex;justify-content:space-between;align-items:center;gap:16px}.brand{font-size:21px;font-weight:800;color:#082b70}.nav a{color:var(--navy);text-decoration:none;font-size:13px;font-weight:700;margin-left:14px}.wrap{max-width:1050px;margin:0 auto;padding:38px 22px 64px}.eyebrow{color:var(--blue);font-size:12px;letter-spacing:.13em;font-weight:800;text-transform:uppercase}.title{font-size:36px;line-height:1.1;color:var(--navy);margin:8px 0 8px}.meta{color:var(--muted);font-size:13px;margin-bottom:22px}.panel{background:#fff;border:1px solid var(--line);padding:24px;margin-top:20px}.notice{padding:12px 14px;background:#ecfdf5;border:1px solid #a7f3d0;color:#065f46;margin-bottom:18px}.doc{white-space:pre-wrap;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#20364e}.empty{color:var(--muted);font-style:italic}.edit-title{color:var(--navy);font-size:20px;margin:0 0 6px}.hint{color:var(--muted);font-size:12px;margin:0 0 14px}.field label{display:block;color:var(--navy);font-size:12px;font-weight:800;margin-bottom:6px}.field input,.field textarea{width:100%;border:1px solid #bccadd;background:#fff;padding:10px 12px;font:inherit}.field textarea{min-height:360px;resize:vertical}.actions{display:flex;gap:10px;align-items:center;margin-top:12px}.btn{border:0;background:#2563eb;color:#fff;font-weight:800;padding:10px 16px;cursor:pointer}.back{display:inline-block;color:var(--blue);font-size:13px;font-weight:700;text-decoration:none;margin-bottom:14px}.footer{background:#0c2c49;color:#fff;text-align:center;padding:17px;font-size:13px}
  </style></head><body><header class="top"><div class="nav"><div class="brand">KW Controls · PRIVATE PORTAL</div><nav><a href="/">Home</a><a href="/operations">Operations</a><a href="/administration">Administration</a><a href="/portal-logout">Sign out</a></nav></div></header><main class="wrap"><a class="back" href="/administration">← Back to Administration</a><div class="eyebrow">Owner-only reference</div><h1 class="title">${escapeHtml(doc?.title || "Operations Reference")}</h1><div class="meta"><strong>Revision:</strong> ${escapeHtml(revision)} &nbsp;·&nbsp; <strong>Updated:</strong> ${escapeHtml(formatDate(doc?.updatedAt))} PT</div>${message ? `<div class="notice">${escapeHtml(message)}</div>` : ""}<section class="panel"><div class="doc">${body ? escapeHtml(body) : '<span class="empty">No private reference has been saved yet. Paste the reference into the editor below and save it. The content will be stored in Cloudflare KV, not in the public GitHub repository.</span>'}</div></section><section class="panel"><h2 class="edit-title">Edit private reference</h2><p class="hint">Each save automatically creates the next revision and records the Pacific Time update date. This page and save route are restricted server-side to the owner session.</p><form method="POST" action="/administration/reference"><div class="field"><label for="doc-title">Document title</label><input id="doc-title" name="title" maxlength="120" value="${escapeHtml(doc?.title || "KW Controls Private Portal — Operations Reference")}"></div><div class="field" style="margin-top:12px"><label for="doc-body">Reference content</label><textarea id="doc-body" name="body" maxlength="60000" required>${escapeHtml(body)}</textarea></div><div class="actions"><button class="btn" type="submit">Save next revision</button><span class="hint" style="margin:0">Current: ${escapeHtml(revision)}</span></div></form></section></main><footer class="footer">© 2026 KW Controls. All Rights Reserved.</footer></body></html>`;
}

async function handleReference(request, env, session) {
  if (!session || session.role !== "owner") return redirect("/");
  const store = adminStore(env);
  if (!store) return new Response("Private reference storage is not configured.", { status: 503, headers: securityHeaders });

  if (request.method === "POST") {
    const form = await request.formData();
    const existing = await loadReference(env);
    const title = String(form.get("title") || "KW Controls Private Portal — Operations Reference").trim().slice(0, 120);
    const body = String(form.get("body") || "").trim().slice(0, 60000);
    if (!body) return new Response(renderReference(existing, "Reference content cannot be empty."), { status: 400, headers: { ...securityHeaders, "Content-Type": "text/html; charset=UTF-8" } });
    const doc = {
      title: title || "KW Controls Private Portal — Operations Reference",
      revision: (Number(existing?.revision) || 0) + 1,
      updatedAt: new Date().toISOString(),
      body,
    };
    await store.put(DOC_KEY, JSON.stringify(doc));
    return redirect("/administration/reference?saved=1");
  }

  const doc = await loadReference(env);
  const saved = new URL(request.url).searchParams.get("saved") === "1";
  return new Response(renderReference(doc, saved ? `Saved as revision R${doc.revision}.` : ""), { headers: { ...securityHeaders, "Content-Type": "text/html; charset=UTF-8" } });
}

async function injectAdministrationReference(response, session) {
  if (!session || session.role !== "owner" || !response.headers.get("Content-Type")?.includes("text/html")) return response;
  const html = await response.text();
  const card = `<section class="admin-card" style="margin-top:18px"><div class="card-heading"><div><p>Private reference</p><h2>Operations Reference</h2></div><span>Owner only</span></div><p>Private implementation notes, maintenance procedures, revisions, and troubleshooting history stored in Cloudflare KV.</p><a class="btn" href="/administration/reference" style="margin-top:8px">Open private reference →</a></section>`;
  const updated = html.includes("</main>") ? html.replace("</main>", `${card}</main>`) : html;
  const headers = new Headers(response.headers);
  headers.set("Content-Length", String(new TextEncoder().encode(updated).length));
  return new Response(updated, { status: response.status, statusText: response.statusText, headers });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const session = await getPortalSession(request, env);

    if (url.pathname === "/administration/reference") {
      return handleReference(request, env, session);
    }

    const response = await portal.fetch(request, env, ctx);
    if (url.pathname === "/administration" && request.method === "GET") {
      return injectAdministrationReference(response, session);
    }
    return response;
  },
};

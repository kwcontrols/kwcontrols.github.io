import portal from "./main.js";
import { getPortalSession } from "./auth.js";

const DOC_KEY = "admin-doc:private-portal-reference";
const DEFAULT_TITLE = "KW Controls Private Portal — Operations Reference";

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
  if (!raw) return { title: DEFAULT_TITLE, revision: 0, updatedAt: null, body: "" };
  try {
    const doc = JSON.parse(raw);
    return {
      title: String(doc?.title || DEFAULT_TITLE),
      revision: Number(doc?.revision) || 0,
      updatedAt: doc?.updatedAt || null,
      body: String(doc?.body || ""),
    };
  } catch {
    return { title: DEFAULT_TITLE, revision: 0, updatedAt: null, body: "" };
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

function revisionLabel(doc) {
  return doc?.revision ? `R${doc.revision}` : "Draft";
}

function shellStart(title = "Operations Reference") {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><title>${escapeHtml(title)} · KW Controls Private Portal</title><style>
  :root{--bg:#f4f7fb;--navy:#0c2742;--blue:#175dcc;--muted:#64748b;--line:#d7e0ea;--soft:#eef4fb;--green:#0f766e}
  *{box-sizing:border-box}body{margin:0;font-family:Arial,Helvetica,sans-serif;background:var(--bg);color:#1f2937;line-height:1.55}.top{background:#fff;border-bottom:1px solid var(--line)}.nav{max-width:1180px;margin:0 auto;padding:15px 22px;display:flex;justify-content:space-between;align-items:center;gap:16px}.brand{font-size:21px;font-weight:800;color:#082b70}.nav a{color:var(--navy);text-decoration:none;font-size:13px;font-weight:700;margin-left:14px}.wrap{max-width:1050px;margin:0 auto;padding:38px 22px 64px}.eyebrow{color:var(--blue);font-size:12px;letter-spacing:.13em;font-weight:800;text-transform:uppercase}.title{font-size:36px;line-height:1.1;color:var(--navy);margin:8px 0 8px}.meta{color:var(--muted);font-size:13px;margin-bottom:22px}.panel{background:#fff;border:1px solid var(--line);padding:24px;margin-top:20px}.notice{padding:12px 14px;background:#ecfdf5;border:1px solid #a7f3d0;color:#065f46;margin-bottom:18px}.hint{color:var(--muted);font-size:12px;margin:0 0 14px}.field label{display:block;color:var(--navy);font-size:12px;font-weight:800;margin-bottom:6px}.field input,.field textarea{width:100%;border:1px solid #bccadd;background:#fff;padding:10px 12px;font:inherit}.field textarea{min-height:300px;resize:vertical}.actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:12px}.btn{display:inline-flex;align-items:center;justify-content:center;border:0;background:#2563eb;color:#fff;font-weight:800;padding:10px 16px;cursor:pointer;text-decoration:none}.btn.secondary{background:#fff;color:var(--blue);border:1px solid #a9c5ef}.back{display:inline-block;color:var(--blue);font-size:13px;font-weight:700;text-decoration:none;margin-bottom:14px}.file-card{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:20px;background:#fff;border:1px solid var(--line)}.file-main{display:flex;align-items:center;gap:16px;min-width:0}.file-icon{width:52px;height:62px;border:1px solid #a9c5ef;background:#f7fbff;color:var(--blue);display:grid;place-items:center;font-size:29px;text-decoration:none}.file-title{font-size:17px;font-weight:800;color:var(--navy);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.file-meta{font-size:12px;color:var(--muted);margin-top:3px}.file-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.icon-btn{display:inline-flex;width:38px;height:38px;align-items:center;justify-content:center;border:1px solid #a9c5ef;background:#fff;color:var(--blue);text-decoration:none;font-size:18px}.doc{white-space:pre-wrap;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#20364e}.footer{background:#0c2c49;color:#fff;text-align:center;padding:17px;font-size:13px}
  </style></head><body><header class="top"><div class="nav"><div class="brand">KW Controls · PRIVATE PORTAL</div><nav><a href="/">Home</a><a href="/operations">Operations</a><a href="/administration">Administration</a><a href="/portal-logout">Sign out</a></nav></div></header>`;
}

function shellEnd() {
  return `<footer class="footer">© 2026 KW Controls. All Rights Reserved.</footer></body></html>`;
}

function renderReferenceManager(doc, { message = "", editing = false, error = "" } = {}) {
  const revision = revisionLabel(doc);
  const editTitle = editing ? doc?.title || DEFAULT_TITLE : "";
  const editBody = editing ? doc?.body || "" : "";
  const hasDoc = Boolean(doc?.revision && doc?.body);
  return `${shellStart("Operations Reference")}<main class="wrap"><a class="back" href="/administration">← Back to Administration</a><div class="eyebrow">Owner-only reference</div><h1 class="title">${escapeHtml(doc?.title || DEFAULT_TITLE)}</h1><div class="meta"><strong>Revision:</strong> ${escapeHtml(revision)} &nbsp;·&nbsp; <strong>Updated:</strong> ${escapeHtml(formatDate(doc?.updatedAt))} PT</div>${message ? `<div class="notice">${escapeHtml(message)}</div>` : ""}${error ? `<div class="notice" style="background:#fff1f2;border-color:#fecaca;color:#991b1b">${escapeHtml(error)}</div>` : ""}<section class="file-card"><div class="file-main">${hasDoc ? `<a class="file-icon" href="/administration/reference?view=1" title="Open document" aria-label="Open document">📄</a>` : `<div class="file-icon" aria-hidden="true">📄</div>`}<div><div class="file-title">${escapeHtml(doc?.title || DEFAULT_TITLE)}</div><div class="file-meta">${hasDoc ? `${escapeHtml(revision)} · Updated ${escapeHtml(formatDate(doc.updatedAt))} PT` : "No saved revision yet"}</div></div></div><div class="file-actions">${hasDoc ? `<a class="icon-btn" href="/administration/reference?view=1" title="Review document" aria-label="Review document">↗</a><a class="icon-btn" href="/administration/reference?edit=1" title="Edit document" aria-label="Edit document">✎</a><a class="btn secondary" href="/administration/reference.pdf">Download PDF</a>` : ""}</div></section><section class="panel"><h2 style="color:var(--navy);margin:0 0 6px">Edit private reference</h2><p class="hint">Fields stay clear after saving. Click the edit icon above when you want to load the current revision for editing. Saving creates the next revision and records Pacific Time.</p><form method="POST" action="/administration/reference"><div class="field"><label for="doc-title">Document title</label><input id="doc-title" name="title" maxlength="120" placeholder="${escapeHtml(doc?.title || DEFAULT_TITLE)}" value="${escapeHtml(editTitle)}"></div><div class="field" style="margin-top:12px"><label for="doc-body">Reference content</label><textarea id="doc-body" name="body" maxlength="60000" required placeholder="Click the edit icon above to load the current reference, or enter new content for the next revision.">${escapeHtml(editBody)}</textarea></div><div class="actions"><button class="btn" type="submit">Save next revision</button><span class="hint" style="margin:0">Current: ${escapeHtml(revision)}</span></div></form></section></main>${shellEnd()}`;
}

function renderReferenceView(doc) {
  const revision = revisionLabel(doc);
  return `${shellStart("Review Operations Reference")}<main class="wrap"><a class="back" href="/administration/reference">← Back to Operations Reference</a><div class="eyebrow">Owner-only document</div><h1 class="title">${escapeHtml(doc?.title || DEFAULT_TITLE)}</h1><div class="meta"><strong>Revision:</strong> ${escapeHtml(revision)} &nbsp;·&nbsp; <strong>Updated:</strong> ${escapeHtml(formatDate(doc?.updatedAt))} PT</div><div class="actions" style="margin:0 0 18px"><a class="btn secondary" href="/administration/reference.pdf">Download PDF</a><a class="btn secondary" href="/administration/reference?edit=1">✎ Edit</a></div><section class="panel"><div class="doc">${escapeHtml(doc?.body || "No reference content has been saved yet.")}</div></section></main>${shellEnd()}`;
}

function normalizePdfText(value = "") {
  return String(value)
    .replace(/—|–/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/•/g, "-")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "?");
}

function wrapPdfText(text, max = 92) {
  const output = [];
  for (const rawLine of normalizePdfText(text).replace(/\r/g, "").split("\n")) {
    if (!rawLine.trim()) { output.push(""); continue; }
    const indent = rawLine.match(/^\s*/)?.[0] || "";
    const words = rawLine.trim().split(/\s+/);
    let line = indent;
    for (const word of words) {
      const candidate = line.trim() ? `${line} ${word}` : `${indent}${word}`;
      if (candidate.length > max && line.trim()) {
        output.push(line);
        line = `${indent}${word}`;
      } else {
        line = candidate;
      }
    }
    output.push(line);
  }
  return output;
}

function pdfEscape(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function buildPdf(doc) {
  const revision = revisionLabel(doc);
  const text = `${doc?.title || DEFAULT_TITLE}\nRevision: ${revision}\nUpdated: ${formatDate(doc?.updatedAt)} PT\n\n${doc?.body || ""}`;
  const lines = wrapPdfText(text);
  const linesPerPage = 48;
  const pages = [];
  for (let i = 0; i < lines.length; i += linesPerPage) pages.push(lines.slice(i, i + linesPerPage));
  if (!pages.length) pages.push(["No content."]);

  const objects = [];
  const addObject = (body) => { objects.push(body); return objects.length; };
  const catalogId = addObject("");
  const pagesId = addObject("");
  const fontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const pageIds = [];

  for (const pageLines of pages) {
    const commands = ["BT", "/F1 10 Tf", "50 760 Td", "14 TL"];
    for (const line of pageLines) {
      commands.push(`(${pdfEscape(line)}) Tj`);
      commands.push("T*");
    }
    commands.push("ET");
    const stream = commands.join("\n");
    const contentId = addObject(`<< /Length ${new TextEncoder().encode(stream).length} >>\nstream\n${stream}\nendstream`);
    const pageId = addObject(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`);
    pageIds.push(pageId);
  }

  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (let i = 0; i < objects.length; i += 1) {
    offsets.push(new TextEncoder().encode(pdf).length);
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefOffset = new TextEncoder().encode(pdf).length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i += 1) pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}

async function handleReference(request, env, session) {
  if (!session || session.role !== "owner") return redirect("/");
  const store = adminStore(env);
  if (!store) return new Response("Private reference storage is not configured.", { status: 503, headers: securityHeaders });

  if (request.method === "POST") {
    const form = await request.formData();
    const existing = await loadReference(env);
    const submittedTitle = String(form.get("title") || "").trim().slice(0, 120);
    const body = String(form.get("body") || "").trim().slice(0, 60000);
    if (!body) return new Response(renderReferenceManager(existing, { editing: true, error: "Reference content cannot be empty." }), { status: 400, headers: { ...securityHeaders, "Content-Type": "text/html; charset=UTF-8" } });
    const doc = {
      title: submittedTitle || existing?.title || DEFAULT_TITLE,
      revision: (Number(existing?.revision) || 0) + 1,
      updatedAt: new Date().toISOString(),
      body,
    };
    await store.put(DOC_KEY, JSON.stringify(doc));
    return redirect("/administration/reference?saved=1");
  }

  const doc = await loadReference(env);
  const params = new URL(request.url).searchParams;
  if (params.get("view") === "1") {
    return new Response(renderReferenceView(doc), { headers: { ...securityHeaders, "Content-Type": "text/html; charset=UTF-8" } });
  }
  const saved = params.get("saved") === "1";
  const editing = params.get("edit") === "1";
  return new Response(renderReferenceManager(doc, { message: saved ? `Saved as revision R${doc.revision}.` : "", editing }), { headers: { ...securityHeaders, "Content-Type": "text/html; charset=UTF-8" } });
}

async function handleReferencePdf(request, env, session) {
  if (!session || session.role !== "owner") return redirect("/");
  const doc = await loadReference(env);
  if (!doc?.revision || !doc?.body) return new Response("No saved Operations Reference is available.", { status: 404, headers: securityHeaders });
  const pdf = buildPdf(doc);
  const filename = `kw-controls-private-portal-operations-reference-R${doc.revision}.pdf`;
  return new Response(pdf, {
    headers: {
      ...securityHeaders,
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(pdf.byteLength),
    },
  });
}

async function injectAdministrationReference(response, session) {
  if (!session || session.role !== "owner" || !response.headers.get("Content-Type")?.includes("text/html")) return response;
  const html = await response.text();
  const card = `<section class="admin-card" style="margin-top:18px"><div class="card-heading"><div><p>Private reference</p><h2>Operations Reference</h2></div><span>Owner only</span></div><p>Private implementation notes, maintenance procedures, revision history, and troubleshooting reference stored in Cloudflare KV.</p><a class="btn" href="/administration/reference" style="margin-top:8px">Open private reference →</a></section>`;
  const updated = html.includes("</main>") ? html.replace("</main>", `${card}</main>`) : html;
  const headers = new Headers(response.headers);
  headers.delete("Content-Length");
  return new Response(updated, { status: response.status, statusText: response.statusText, headers });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const session = await getPortalSession(request, env);

    if (url.pathname === "/administration/reference.pdf") {
      return handleReferencePdf(request, env, session);
    }
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

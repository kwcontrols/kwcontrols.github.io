import portal from "./index.js";
import {
  createManagedGuest,
  getPortalSession,
  guestManagementConfigured,
} from "./auth.js";

const FLASH_COOKIE = "kw_guest_created";

const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
}[char]));

function readCookie(request, name) {
  const raw = request.headers.get("Cookie") || "";
  for (const part of raw.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return null;
}

function flashCookie(value) {
  return `${FLASH_COOKIE}=${encodeURIComponent(JSON.stringify(value))}; Path=/administration; Max-Age=90; HttpOnly; Secure; SameSite=Lax`;
}

function clearFlashCookie() {
  return `${FLASH_COOKIE}=; Path=/administration; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}

function readFlash(request) {
  const raw = readCookie(request, FLASH_COOKIE);
  if (!raw) return null;
  try { return JSON.parse(decodeURIComponent(raw)); } catch { return null; }
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("en-CA", {
    timeZone: "America/Vancouver",
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
  });
}

function injectCreatedGuest(html, created) {
  if (!created?.guest?.id || !created?.code) return html;
  const guest = created.guest;
  const banner = `<div class="guest-code"><strong>Guest created: ${escapeHtml(guest.name)}</strong><br>This access code is shown once. Copy it now and send it securely.<code>${escapeHtml(created.code)}</code></div>`;
  let output = html.replace('<section class="admin-card" style="margin-top:25px">', `${banner}<section class="admin-card" style="margin-top:25px">`);

  // If KV listing already caught up, do not add a duplicate display row.
  if (output.includes(`value="${escapeHtml(guest.id)}"`)) return output;

  const row = `<tr><td><strong>${escapeHtml(guest.name)}</strong></td><td>${escapeHtml(formatDate(guest.createdAt))}</td><td>${escapeHtml(formatDate(guest.expiresAt))}</td><td>—</td><td><span class="pill">Active</span></td><td><form method="POST" action="/administration/guests/revoke"><input type="hidden" name="id" value="${escapeHtml(guest.id)}"><button class="btn danger" type="submit">Revoke</button></form></td></tr>`;

  if (output.includes("<tbody>")) {
    output = output.replace("<tbody>", `<tbody>${row}`);
  } else {
    const empty = '<p class="empty" style="margin-top:18px">No guests have been created yet.</p>';
    const table = `<div style="overflow-x:auto"><table class="guest-table"><thead><tr><th>Guest name</th><th>Created</th><th>Expires</th><th>Last login</th><th>Status</th><th>Action</th></tr></thead><tbody>${row}</tbody></table></div>`;
    output = output.replace(empty, table);
  }

  output = output.replace(/<span>(\d+) guests?<\/span>/, (_, count) => {
    const next = Number(count) + 1;
    return `<span>${next} guest${next === 1 ? "" : "s"}</span>`;
  });
  return output;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/administration/guests" && request.method === "POST") {
      const fallback = request.clone();
      const session = await getPortalSession(request, env);
      if (!session || session.role !== "owner" || !guestManagementConfigured(env)) {
        return portal.fetch(fallback, env, ctx);
      }

      const form = await request.formData();
      const created = await createManagedGuest({
        name: form.get("name"),
        expiresAt: form.get("expiresAt"),
        sessionHours: Number(form.get("sessionHours")),
      }, env);

      if (!created) return portal.fetch(fallback, env, ctx);

      // Post/Redirect/Get prevents browser refresh from submitting the Add Guest form twice.
      return new Response(null, {
        status: 303,
        headers: {
          Location: "/administration",
          "Cache-Control": "no-store",
          "Set-Cookie": flashCookie(created),
        },
      });
    }

    if (url.pathname === "/administration" && request.method === "GET") {
      const created = readFlash(request);
      const response = await portal.fetch(request, env, ctx);
      if (!created || response.status !== 200) return response;

      const headers = new Headers(response.headers);
      headers.append("Set-Cookie", clearFlashCookie());
      const html = injectCreatedGuest(await response.text(), created);
      return new Response(html, { status: response.status, headers });
    }

    return portal.fetch(request, env, ctx);
  },
};

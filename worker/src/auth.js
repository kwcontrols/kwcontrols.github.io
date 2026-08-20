const SESSION_COOKIE = "kw_controls_session";
const encoder = new TextEncoder();
const GUEST_KEY_PREFIX = "guest:";
const CODE_KEY_PREFIX = "code:";

function configuredValue(env, name) {
  const value = env?.[name];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function portalAuthConfigured(env) {
  return Boolean(
    configuredValue(env, "KW_PORTAL_ACCESS_CODE") &&
    configuredValue(env, "KW_PORTAL_SESSION_SECRET"),
  );
}

function guestStore(env) {
  const store = env?.KW_CONTROLS_GUESTS;
  return store && typeof store.get === "function" ? store : null;
}

export function guestManagementConfigured(env) {
  return Boolean(guestStore(env));
}

async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return new Uint8Array(digest);
}

async function sha256Hex(value) {
  const bytes = await sha256(value);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function equalBytes(a, b) {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) difference |= a[index] ^ b[index];
  return difference === 0;
}

function activeGuest(guest, now = Date.now()) {
  if (!guest?.id || !guest?.name || !guest?.expiresAt) return false;
  const expires = Date.parse(guest.expiresAt);
  return Number.isFinite(expires) && expires > now;
}

async function getGuestById(id, env) {
  const store = guestStore(env);
  if (!store || !id) return null;
  const raw = await store.get(`${GUEST_KEY_PREFIX}${id}`);
  if (!raw) return null;
  try {
    const guest = JSON.parse(raw);
    return activeGuest(guest) ? guest : null;
  } catch {
    return null;
  }
}

export async function authenticatePortalIdentity(submittedCode, env) {
  if (!submittedCode) return null;
  const code = String(submittedCode);
  const ownerCode = configuredValue(env, "KW_PORTAL_ACCESS_CODE");
  if (ownerCode) {
    const [submittedHash, ownerHash] = await Promise.all([sha256(code), sha256(ownerCode)]);
    if (equalBytes(submittedHash, ownerHash)) {
      return { id: "owner", name: "Admin", role: "owner", sessionHours: 8 };
    }
  }

  const store = guestStore(env);
  if (!store) return null;
  const id = await store.get(`${CODE_KEY_PREFIX}${await sha256Hex(code)}`);
  if (!id) return null;
  const guest = await getGuestById(id, env);
  if (!guest) return null;
  return {
    id: guest.id,
    name: guest.name,
    role: "guest",
    expiresAt: guest.expiresAt,
    sessionHours: guest.sessionHours || 8,
  };
}

export async function authenticatePortalCode(submittedCode, env) {
  return Boolean(await authenticatePortalIdentity(submittedCode, env));
}

function toBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value) {
  try {
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const binary = atob(padded);
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
}

async function hmac(value, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}

export async function createPortalSessionForIdentity(identity, env) {
  const secret = configuredValue(env, "KW_PORTAL_SESSION_SECRET");
  if (!secret || !identity?.id || !identity?.name) return null;
  const nowMs = Date.now();
  const requestedMs = Math.max(0.25, Math.min(Number(identity.sessionHours) || 8, 168)) * 3600000;
  const accessExpiry = identity.expiresAt ? Date.parse(identity.expiresAt) : Infinity;
  const expMs = Math.min(nowMs + requestedMs, accessExpiry);
  if (!Number.isFinite(expMs) && expMs !== Infinity) return null;
  const finalExpMs = expMs === Infinity ? nowMs + requestedMs : expMs;
  if (finalExpMs <= nowMs) return null;

  const payload = {
    id: String(identity.id),
    name: String(identity.name).slice(0, 100),
    role: identity.role === "guest" ? "guest" : "owner",
    exp: Math.floor(finalExpMs / 1000),
  };
  const payloadPart = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const signaturePart = toBase64Url(await hmac(payloadPart, secret));
  return { token: `${payloadPart}.${signaturePart}`, maxAge: Math.max(1, Math.floor((finalExpMs - nowMs) / 1000)) };
}

export async function createPortalSession(env, hours = 8) {
  return createPortalSessionForIdentity({ id: "owner", name: "Admin", role: "owner", sessionHours: hours }, env);
}

function readCookie(request, name) {
  const raw = request.headers.get("Cookie") || "";
  for (const part of raw.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return null;
}

export async function getPortalSession(request, env) {
  const secret = configuredValue(env, "KW_PORTAL_SESSION_SECRET");
  const token = readCookie(request, SESSION_COOKIE);
  if (!secret || !token) return null;
  const [payloadPart, signaturePart, extra] = token.split(".");
  if (!payloadPart || !signaturePart || extra) return null;
  const provided = fromBase64Url(signaturePart);
  if (!provided) return null;
  const expected = await hmac(payloadPart, secret);
  if (!equalBytes(provided, expected)) return null;

  try {
    const payloadBytes = fromBase64Url(payloadPart);
    if (!payloadBytes) return null;
    const payload = JSON.parse(new TextDecoder().decode(payloadBytes));
    if (
      !payload?.id || !payload?.name ||
      (payload.role !== "owner" && payload.role !== "guest") ||
      !Number.isFinite(payload.exp) || payload.exp <= Math.floor(Date.now() / 1000)
    ) return null;
    if (payload.role === "owner") return payload.id === "owner" ? payload : null;
    return (await getGuestById(payload.id, env)) ? payload : null;
  } catch {
    return null;
  }
}

export async function verifyPortalSession(request, env) {
  return Boolean(await getPortalSession(request, env));
}

export function portalSessionCookie(token, maxAge) {
  return `${SESSION_COOKIE}=${token}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}

export function clearPortalSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}

function randomAccessCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
  return `${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}`;
}

function parseVancouverLocalDateTime(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return NaN;
  const [, year, month, day, hour, minute, second = "0"] = match;
  const target = Date.UTC(+year, +month - 1, +day, +hour, +minute, +second);
  let candidate = target;
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Vancouver",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hourCycle: "h23",
  });
  for (let pass = 0; pass < 2; pass += 1) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(candidate)).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
    const shownAsUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
    candidate += target - shownAsUtc;
  }
  return candidate;
}

export async function listManagedGuests(env) {
  const store = guestStore(env);
  if (!store) return null;
  const result = await store.list({ prefix: GUEST_KEY_PREFIX });
  const guests = await Promise.all(result.keys.map(async ({ name }) => {
    const raw = await store.get(name);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }));
  return guests.filter(Boolean).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

export async function createManagedGuest(input, env) {
  const store = guestStore(env);
  if (!store) return null;
  const name = String(input?.name || "").trim().slice(0, 80);
  const expires = parseVancouverLocalDateTime(input?.expiresAt);
  const sessionHours = Math.max(0.25, Math.min(Number(input?.sessionHours) || 8, 168));
  if (!name || !Number.isFinite(expires) || expires <= Date.now()) return null;
  const id = crypto.randomUUID();
  const code = randomAccessCode();
  const guest = {
    id,
    name,
    expiresAt: new Date(expires).toISOString(),
    sessionHours,
    createdAt: new Date().toISOString(),
    lastLoginAt: null,
  };
  await store.put(`${GUEST_KEY_PREFIX}${id}`, JSON.stringify(guest));
  await store.put(`${CODE_KEY_PREFIX}${await sha256Hex(code)}`, id);
  return { guest, code };
}

export async function markGuestLogin(id, env) {
  const store = guestStore(env);
  if (!store || !id || id === "owner") return;
  const raw = await store.get(`${GUEST_KEY_PREFIX}${id}`);
  if (!raw) return;
  try {
    const guest = JSON.parse(raw);
    guest.lastLoginAt = new Date().toISOString();
    await store.put(`${GUEST_KEY_PREFIX}${id}`, JSON.stringify(guest));
  } catch {}
}

export async function regenerateManagedGuestCode(id, env) {
  const store = guestStore(env);
  if (!store || !id) return null;
  const raw = await store.get(`${GUEST_KEY_PREFIX}${id}`);
  if (!raw) return null;
  let guest;
  try { guest = JSON.parse(raw); } catch { return null; }
  if (!guest?.id || !guest?.name) return null;

  const existing = await store.list({ prefix: CODE_KEY_PREFIX });
  for (const key of existing.keys) {
    if ((await store.get(key.name)) === id) await store.delete(key.name);
  }

  const code = randomAccessCode();
  await store.put(`${CODE_KEY_PREFIX}${await sha256Hex(code)}`, id);
  return { guest, code };
}

export async function revokeManagedGuest(id, env) {
  const store = guestStore(env);
  if (!store || !id) return false;
  const raw = await store.get(`${GUEST_KEY_PREFIX}${id}`);
  if (!raw) return false;
  const list = await store.list({ prefix: CODE_KEY_PREFIX });
  for (const key of list.keys) {
    if ((await store.get(key.name)) === id) await store.delete(key.name);
  }
  await store.delete(`${GUEST_KEY_PREFIX}${id}`);
  return true;
}

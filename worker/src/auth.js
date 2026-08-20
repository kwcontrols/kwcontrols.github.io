const SESSION_COOKIE = "kw_controls_session";
const encoder = new TextEncoder();

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

async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return new Uint8Array(digest);
}

function equalBytes(a, b) {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) {
    difference |= a[index] ^ b[index];
  }
  return difference === 0;
}

export async function authenticatePortalCode(submittedCode, env) {
  const expectedCode = configuredValue(env, "KW_PORTAL_ACCESS_CODE");
  if (!expectedCode || !submittedCode) return false;
  const [submittedHash, expectedHash] = await Promise.all([
    sha256(String(submittedCode)),
    sha256(expectedCode),
  ]);
  return equalBytes(submittedHash, expectedHash);
}

function toBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
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

export async function createPortalSession(env, hours = 8) {
  const secret = configuredValue(env, "KW_PORTAL_SESSION_SECRET");
  if (!secret) return null;

  const now = Math.floor(Date.now() / 1000);
  const exp = now + Math.max(1, Math.min(hours, 24)) * 60 * 60;
  const payloadPart = toBase64Url(encoder.encode(JSON.stringify({ exp })));
  const signaturePart = toBase64Url(await hmac(payloadPart, secret));
  return {
    token: `${payloadPart}.${signaturePart}`,
    maxAge: exp - now,
  };
}

function readCookie(request, name) {
  const raw = request.headers.get("Cookie") || "";
  for (const part of raw.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return null;
}

export async function verifyPortalSession(request, env) {
  const secret = configuredValue(env, "KW_PORTAL_SESSION_SECRET");
  const token = readCookie(request, SESSION_COOKIE);
  if (!secret || !token) return false;

  const [payloadPart, signaturePart, extra] = token.split(".");
  if (!payloadPart || !signaturePart || extra) return false;

  const provided = fromBase64Url(signaturePart);
  if (!provided) return false;
  const expected = await hmac(payloadPart, secret);
  if (!equalBytes(provided, expected)) return false;

  try {
    const payloadBytes = fromBase64Url(payloadPart);
    if (!payloadBytes) return false;
    const payload = JSON.parse(new TextDecoder().decode(payloadBytes));
    return Number.isFinite(payload?.exp) && payload.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export function portalSessionCookie(token, maxAge) {
  return `${SESSION_COOKIE}=${token}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}

export function clearPortalSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}

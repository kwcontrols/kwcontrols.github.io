import { importPKCS8, SignJWT } from "jose";

async function getAccessToken(serviceAccountJson) {
  const credentials = JSON.parse(serviceAccountJson);
  const key = await importPKCS8(credentials.private_key, "RS256");
  const now = Math.floor(Date.now() / 1000);
  const assertion = await new SignJWT({
    scope: "https://www.googleapis.com/auth/analytics.readonly",
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(credentials.client_email)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key);

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!response.ok) throw new Error(`Google OAuth failed (${response.status})`);
  return (await response.json()).access_token;
}

async function gaRequest(token, propertyId, method, body) {
  const response = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:${method}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) throw new Error(`GA4 ${method} failed (${response.status})`);
  return response.json();
}

function firstMetric(report, name) {
  const index = report.metricHeaders?.findIndex((item) => item.name === name) ?? -1;
  return index >= 0 ? Number(report.rows?.[0]?.metricValues?.[index]?.value || 0) : 0;
}

function mapRows(report, dimensions, metrics) {
  return (report.rows || []).map((row) => ({
    ...Object.fromEntries(dimensions.map((name, i) => [name, row.dimensionValues?.[i]?.value || ""])),
    ...Object.fromEntries(metrics.map((name, i) => [name, Number(row.metricValues?.[i]?.value || 0)])),
  }));
}

export async function getAnalyticsSnapshot(env) {
  if (!env.GA4_PROPERTY_ID || !env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    throw new Error("GA4 Worker variables are missing");
  }

  const token = await getAccessToken(env.GOOGLE_SERVICE_ACCOUNT_JSON);

  const [summary, pages, devices, locations, realtime] = await Promise.all([
    gaRequest(token, env.GA4_PROPERTY_ID, "runReport", {
      dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
      metrics: [
        { name: "activeUsers" },
        { name: "sessions" },
        { name: "screenPageViews" },
        { name: "averageSessionDuration" },
      ],
    }),
    gaRequest(token, env.GA4_PROPERTY_ID, "runReport", {
      dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
      dimensions: [{ name: "pagePath" }],
      metrics: [{ name: "screenPageViews" }, { name: "activeUsers" }],
      orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
      limit: 8,
    }),
    gaRequest(token, env.GA4_PROPERTY_ID, "runReport", {
      dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
      dimensions: [{ name: "deviceCategory" }],
      metrics: [{ name: "activeUsers" }, { name: "sessions" }],
      orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
      limit: 6,
    }),
    gaRequest(token, env.GA4_PROPERTY_ID, "runReport", {
      dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
      dimensions: [{ name: "city" }, { name: "country" }],
      metrics: [{ name: "activeUsers" }, { name: "sessions" }],
      orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
      limit: 8,
    }),
    gaRequest(token, env.GA4_PROPERTY_ID, "runRealtimeReport", {
      dimensions: [{ name: "city" }, { name: "deviceCategory" }],
      metrics: [{ name: "activeUsers" }],
      limit: 20,
    }),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      activeUsers: firstMetric(summary, "activeUsers"),
      sessions: firstMetric(summary, "sessions"),
      views: firstMetric(summary, "screenPageViews"),
      averageSessionDuration: firstMetric(summary, "averageSessionDuration"),
    },
    pages: mapRows(pages, ["pagePath"], ["views", "activeUsers"]),
    devices: mapRows(devices, ["deviceCategory"], ["activeUsers", "sessions"]),
    locations: mapRows(locations, ["city", "country"], ["activeUsers", "sessions"]),
    realtime: mapRows(realtime, ["city", "deviceCategory"], ["activeUsers"]),
  };
}

import { importPKCS8, SignJWT } from "jose";

async function getAccessToken(serviceAccountJson) {
  const credentials = JSON.parse(serviceAccountJson);
  const key = await importPKCS8(credentials.private_key, "RS256");
  const now = Math.floor(Date.now() / 1000);
  const assertion = await new SignJWT({ scope: "https://www.googleapis.com/auth/analytics.readonly" })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(credentials.client_email)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key);

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  if (!response.ok) throw new Error(`Google OAuth failed (${response.status})`);
  return (await response.json()).access_token;
}

async function gaRequest(token, propertyId, method, body) {
  const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:${method}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`GA4 ${method} failed (${response.status})${detail ? `: ${detail.slice(0, 180)}` : ""}`);
  }
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

async function safeReport(promise) {
  try { return await promise; } catch { return { rows: [], metricHeaders: [], dimensionHeaders: [] }; }
}

export async function getAnalyticsSnapshot(env) {
  if (!env.GA4_PROPERTY_ID || !env.GOOGLE_SERVICE_ACCOUNT_JSON) throw new Error("GA4 Worker variables are missing");
  const token = await getAccessToken(env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const propertyId = env.GA4_PROPERTY_ID;

  const [summary, pages, devices, locations, realtime, trends, sources, visitorTypes, activityDetail] = await Promise.all([
    gaRequest(token, propertyId, "runReport", {
      dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
      metrics: [
        { name: "totalUsers" }, { name: "activeUsers" }, { name: "sessions" },
        { name: "screenPageViews" }, { name: "averageSessionDuration" }, { name: "userEngagementDuration" },
      ],
    }),
    gaRequest(token, propertyId, "runReport", {
      dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
      dimensions: [{ name: "pageTitle" }, { name: "pagePath" }],
      metrics: [{ name: "screenPageViews" }, { name: "activeUsers" }],
      orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }], limit: 10,
    }),
    gaRequest(token, propertyId, "runReport", {
      dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
      dimensions: [{ name: "deviceCategory" }, { name: "browser" }, { name: "operatingSystem" }],
      metrics: [{ name: "activeUsers" }, { name: "sessions" }],
      orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }], limit: 12,
    }),
    gaRequest(token, propertyId, "runReport", {
      dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
      dimensions: [{ name: "city" }, { name: "region" }, { name: "country" }],
      metrics: [{ name: "activeUsers" }, { name: "sessions" }],
      orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }], limit: 10,
    }),
    gaRequest(token, propertyId, "runRealtimeReport", {
      dimensions: [{ name: "city" }, { name: "region" }, { name: "country" }, { name: "deviceCategory" }],
      metrics: [{ name: "activeUsers" }], limit: 20,
    }),
    gaRequest(token, propertyId, "runReport", {
      dateRanges: [{ startDate: "6daysAgo", endDate: "today" }],
      dimensions: [{ name: "date" }],
      metrics: [{ name: "activeUsers" }, { name: "sessions" }, { name: "screenPageViews" }],
      orderBys: [{ dimension: { dimensionName: "date" } }],
    }),
    safeReport(gaRequest(token, propertyId, "runReport", {
      dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
      dimensions: [{ name: "sessionDefaultChannelGroup" }],
      metrics: [{ name: "activeUsers" }],
      orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }], limit: 8,
    })),
    safeReport(gaRequest(token, propertyId, "runReport", {
      dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
      dimensions: [{ name: "newVsReturning" }],
      metrics: [{ name: "activeUsers" }],
      orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
    })),
    safeReport(gaRequest(token, propertyId, "runReport", {
      dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
      dimensions: [
        { name: "dateHourMinute" }, { name: "city" }, { name: "region" }, { name: "country" },
        { name: "deviceCategory" }, { name: "operatingSystem" }, { name: "browser" },
        { name: "landingPagePlusQueryString" },
      ],
      metrics: [
        { name: "activeUsers" }, { name: "sessions" },
        { name: "screenPageViews" }, { name: "averageSessionDuration" },
      ],
      orderBys: [{ dimension: { dimensionName: "dateHourMinute" }, desc: true }],
      limit: 50,
    })),
  ]);

  const totalUsers = firstMetric(summary, "totalUsers");
  const activeUsers = firstMetric(summary, "activeUsers");
  const sessions = firstMetric(summary, "sessions");
  const views = firstMetric(summary, "screenPageViews");
  const userEngagementDuration = firstMetric(summary, "userEngagementDuration");
  const averageSessionDuration = firstMetric(summary, "averageSessionDuration");
  const deviceRows = mapRows(devices, ["deviceCategory", "browser", "operatingSystem"], ["activeUsers", "sessions"]);
  const deviceSummary = Object.values(deviceRows.reduce((acc, row) => {
    const key = row.deviceCategory || "unknown";
    if (!acc[key]) acc[key] = { category: key, users: 0, sessions: 0 };
    acc[key].users += row.activeUsers;
    acc[key].sessions += row.sessions;
    return acc;
  }, {}));
  const visitorRows = mapRows(visitorTypes, ["type"], ["users"]);
  const visitorTotal = visitorRows.reduce((sum, row) => sum + row.users, 0) || 1;
  const sourceRows = mapRows(sources, ["source"], ["users"]);
  const sourceTotal = sourceRows.reduce((sum, row) => sum + row.users, 0) || 1;

  return {
    generatedAt: new Date().toISOString(),
    period: "Last 30 days",
    summary: {
      totalUsers,
      activeUsers,
      sessions,
      views,
      averageEngagementTime: activeUsers ? userEngagementDuration / activeUsers : 0,
      averageSessionDuration,
    },
    pages: mapRows(pages, ["pageTitle", "pagePath"], ["views", "activeUsers"]),
    devices: deviceRows,
    deviceSummary,
    locations: mapRows(locations, ["city", "region", "country"], ["activeUsers", "sessions"]),
    realtime: mapRows(realtime, ["city", "region", "country", "deviceCategory"], ["activeUsers"]),
    trends: mapRows(trends, ["date"], ["activeUsers", "sessions", "views"]),
    trafficSources: sourceRows.map((row) => ({ ...row, percentage: (row.users / sourceTotal) * 100 })),
    visitorTypes: visitorRows.map((row) => ({ ...row, percentage: (row.users / visitorTotal) * 100 })),
    activityDetail: mapRows(
      activityDetail,
      ["dateHourMinute", "city", "region", "country", "deviceCategory", "operatingSystem", "browser", "landingPage"],
      ["activeUsers", "sessions", "views", "averageSessionDuration"],
    ),
  };
}

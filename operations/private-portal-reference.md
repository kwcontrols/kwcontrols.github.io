# KW Controls Private Portal — Operations Reference

**Last updated:** August 20, 2026  
**Repository:** `kwcontrols/kwcontrols.github.io`  
**Portal runtime:** Cloudflare Worker  
**Primary Worker entrypoint:** `worker/src/index.js`

## Purpose

This document records the current private portal implementation so future maintenance can be done without reconstructing the design from Git history.

The private portal provides a protected workspace for KW Controls with:

- authenticated owner and guest access;
- private analytics backed by Google Analytics 4 (GA4);
- an Operations area for internal references;
- an owner-only Administration area;
- managed guest creation, expiry, login tracking, and revocation;
- CSV export of processed analytics activity.

## Public and private entry points

The public website remains hosted at `kwcontrols.github.io`.

The public contact page contains the private portal entry point. Authentication is handled by the Cloudflare Worker. A successful login creates a private portal session and redirects the user into the protected portal. A failed or missing session redirects back to the public portal anchor.

Important constants in `worker/src/index.js`:

- `PUBLIC_CONTACT_URL` — public contact page;
- `PUBLIC_PORTAL_ANCHOR` — private portal section on the public contact page;
- `LOGO_URL` — KW Controls Pegasus logo used by the portal shell.

## Authentication model

Authentication logic lives primarily in `worker/src/auth.js`.

The portal supports two identity roles:

### Owner

The owner uses the configured portal owner access code. Owner sessions can access all private areas, including Administration and guest management.

### Guest

Guests are managed identities stored in Cloudflare KV. A guest has a generated access code, an expiry date, a configured session duration, creation metadata, and last-login information.

Guest access codes are intended to be shown once at creation and sent securely to the guest. The Administration UI does not provide a Regenerate action. If access must be replaced, revoke the old guest and create a new guest entry.

## Session handling

After successful authentication, the Worker creates a portal session and sets the portal session cookie. Protected routes call `getPortalSession()` before rendering content.

Logout clears the portal session cookie and redirects to the public contact page.

Security-related response headers include:

- `Cache-Control: no-store`;
- `X-Content-Type-Options: nosniff`;
- `X-Frame-Options: DENY`;
- `Referrer-Policy: no-referrer`;
- a restrictive `Permissions-Policy`;
- a restrictive Content Security Policy.

Private portal pages also use `noindex`, `nofollow`, and `noarchive` robots directives.

## Guest management

Guest management is available only to the owner under **Administration**.

The current guest workflow is:

1. Enter the guest name.
2. Choose a future expiry date/time.
3. Choose the guest session duration.
4. Select **Add Guest**.
5. Copy the generated access code immediately and send it securely.
6. The guest appears in the guest table with creation, expiry, last-login, status, and revoke controls.
7. Use **Revoke** to invalidate a guest when access is no longer required.

### Cloudflare KV binding

Guest records use the Worker KV binding:

`KW_CONTROLS_GUESTS`

The binding is declared in `worker/wrangler.toml`. The namespace ID currently configured there is:

`5a91ab738391421faae4a6d3eab24690`

If guest management reports that storage is not configured, verify that this KV namespace still exists and that the Worker deployment includes the `KW_CONTROLS_GUESTS` binding.

## Guest creation consistency fix

During implementation, a newly created guest could be successfully written to KV but not appear immediately in the guest table. This was caused by the timing/consistency behavior of the immediate KV list operation after creation.

The guest creation flow was updated so that the newly created guest is available to the response immediately instead of depending solely on an immediately refreshed KV listing.

The flow was also changed to a **Post → Redirect → Get** pattern. This prevents a browser refresh from resubmitting the Add Guest form and accidentally creating a duplicate guest.

Relevant stabilization commits include:

- `3adfffa` — restore stable guest management UI;
- `bce5776b` — route guest creation through the duplicate-safe portal entrypoint.

Operational expectation: after adding a guest, the guest should appear immediately, and refreshing the page afterward should not create a second copy.

## Analytics

Analytics logic lives primarily in `worker/src/analytics.js`, with rendering and routes in `worker/src/index.js`.

The Analytics area provides processed GA4 information including:

- active users;
- total users;
- sessions;
- page views;
- average engagement per user;
- average session duration;
- desktop and mobile usage;
- realtime visitors;
- seven-day visitor trends;
- top cities;
- devices, browsers, and operating systems;
- top pages;
- traffic sources;
- new versus returning visitors.

The Active Users & Details page provides processed 30-day activity detail with approximate location, technology, landing page, users, sessions, views, and average session duration.

The CSV export route is:

`/analytics/activity.csv`

Location information is GA4-estimated and should be treated as approximate. The portal is not intended to provide an IP-address or personally identifiable visitor log.

## Portal routes

Current principal routes include:

- `/` — private portal home;
- `/portal-login` — login POST endpoint;
- `/portal-logout` — logout;
- `/health` — Worker health response;
- `/analytics` — analytics dashboard;
- `/analytics/details` — processed activity detail;
- `/analytics/activity.csv` — analytics CSV export;
- `/api/analytics` — analytics JSON endpoint;
- `/operations` — internal Operations area;
- `/administration` — owner-only Administration area;
- `/administration/guests` — guest creation;
- `/administration/guests/revoke` — guest revocation.

## Deployment

Deployment is handled through GitHub Actions using:

`.github/workflows/deploy-private-portal.yml`

The Worker configuration is in:

`worker/wrangler.toml`

The Worker package is in:

`worker/package.json`

Normal maintenance flow:

1. Make and review the required repository change.
2. Commit to the deployment branch (`main` in the current setup).
3. Confirm the **Deploy KW Controls Private Portal** GitHub Actions workflow completes successfully.
4. Test the affected portal function in the deployed environment.
5. For authentication or guest-management changes, test both owner access and a disposable guest before considering the change complete.

## Troubleshooting checklist

### Guest creation succeeds but the guest is not visible

Confirm the deployed Worker includes the duplicate-safe guest creation flow. Check the latest deployment workflow and verify the deployment contains the current `worker/src/index.js` and `worker/src/auth.js`.

### Refresh creates another guest

This indicates the old direct POST-render flow may be deployed. Confirm the deployment includes the Post → Redirect → Get guest creation behavior.

### Guest management says storage is not configured

Verify the `KW_CONTROLS_GUESTS` KV namespace and binding in Cloudflare and `worker/wrangler.toml`.

### Guest cannot log in

Check that the guest has not expired or been revoked, that the access code was copied correctly, and that the current Worker deployment is using the expected KV namespace and session configuration.

### Analytics reports a connection error

Verify the GA4-related Worker configuration/secrets and `GA4_PROPERTY_ID`, then check the GitHub Actions deployment and Worker logs/observability.

### Portal redirects to the public contact page unexpectedly

The session may be absent, expired, invalid, or cleared. Authenticate again through the private portal entry point. If the problem persists, inspect the session configuration and Worker logs.

## Maintenance principles

- Keep owner-only controls restricted by role on the server side, not only hidden in the UI.
- Do not expose guest access codes after their intended one-time display.
- Prefer revoking and recreating guest access over adding a Regenerate-code feature.
- Preserve the Post → Redirect → Get pattern for guest creation to avoid duplicate form submissions.
- Keep private responses non-cacheable and protected by the existing security headers.
- Treat GA4 location information as approximate analytics data, not precise visitor location.
- After changes to authentication, sessions, KV, or deployment configuration, run a real deployed smoke test rather than relying only on the source diff.

## Key source files

- `worker/src/index.js` — routes, portal UI, analytics UI, Administration UI, response security headers;
- `worker/src/auth.js` — owner/guest authentication, sessions, guest storage and lifecycle;
- `worker/src/analytics.js` — GA4 data retrieval and processing;
- `worker/wrangler.toml` — Worker configuration and KV binding;
- `.github/workflows/deploy-private-portal.yml` — deployment workflow;
- `contact.html` — public website entry point for private portal login.

---

**Document owner:** KW Controls  
**Recommended update policy:** Update this reference whenever authentication, guest lifecycle, analytics, Worker bindings, routes, or deployment behavior changes materially.

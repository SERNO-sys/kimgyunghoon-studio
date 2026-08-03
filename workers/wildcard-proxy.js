/**
 * Wildcard subdomain proxy Worker.
 *
 * Cloudflare Pages cannot serve wildcard subdomains (`*.lucidworker.com`).
 * This Worker is attached to the `*.lucidworker.com/*` route and forwards
 * every request to the Cloudflare Pages project, preserving the original
 * `Host` header so the app's middleware can resolve the tenant subdomain
 * (e.g. `50bd00da` from `50bd00da.lucidworker.com`) via D1.
 *
 * The Pages project handles all D1/R2 bindings and the Next.js rendering.
 *
 * NOTE: Cloudflare Pages may overwrite the `Host` header to the pages.dev
 * domain during its own routing. To guarantee the app's middleware can always
 * recover the original tenant subdomain, we ALSO forward it in the
 * `x-forwarded-host` and `x-original-host` headers. The middleware reads these
 * first (see src/middleware.ts -> resolveHostname).
 */
const PAGES_PROJECT_URL = "https://kimgyunghoon-studio.pages.dev";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Build the upstream URL against the Pages project, keeping the path/query.
    const upstream = new URL(url.pathname + url.search, PAGES_PROJECT_URL);

    // Preserve the original Host header so the app's middleware can read the
    // tenant subdomain. Cloudflare Pages uses the Host header for routing, so
    // we must keep the incoming hostname.
    const headers = new Headers(request.headers);
    headers.set("Host", url.host);

    // Cloudflare Pages may overwrite the Host header to the pages.dev domain
    // during routing. To guarantee the app's middleware can recover the
    // original tenant subdomain, also forward it in x-forwarded-host and
    // x-original-host (the middleware reads these first).
    headers.set("x-forwarded-host", url.host);
    headers.set("x-original-host", url.host);
    headers.set("x-forwarded-proto", url.protocol.replace(":", ""));

    const proxyRequest = new Request(upstream.toString(), {
      method: request.method,
      headers,
      body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
      redirect: "manual",
    });

    try {
      const response = await fetch(proxyRequest);
      return response;
    } catch (err) {
      return new Response("Origin unreachable", { status: 502 });
    }
  },
};

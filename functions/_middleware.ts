// Cloudflare Pages middleware to handle redirects and SPA routing
export async function onRequest(context: {
  request: Request;
  next: () => Promise<Response>;
  env: { ASSETS: { fetch: (request: Request) => Promise<Response> } };
}) {
  const url = new URL(context.request.url);
  const hostname = url.hostname;
  const pathname = url.pathname;

  // Redirect ALL .pages.dev URLs to appropriate custom domain
  if (hostname.endsWith('.pages.dev')) {
    // Main production deployment
    if (hostname === 'zefile-frontend.pages.dev') {
      return Response.redirect(`https://zefile.io${pathname}${url.search}`, 301);
    }

    // Main staging/dev deployment
    if (hostname === 'zefile-dev.pages.dev') {
      return Response.redirect(`https://demo.zefile.io${pathname}${url.search}`, 301);
    }

    // All preview deployments (commit-based URLs like 8f53e346.zefile-frontend.pages.dev)
    // Redirect based on which project they belong to
    if (hostname.includes('zefile-frontend.pages.dev')) {
      return Response.redirect(`https://zefile.io${pathname}${url.search}`, 301);
    }

    if (hostname.includes('zefile-dev.pages.dev')) {
      return Response.redirect(`https://demo.zefile.io${pathname}${url.search}`, 301);
    }
  }

  // Continue to next middleware or page
  // Note: /z-* routes are handled by Cloudflare Page Rules
  return context.next();
}

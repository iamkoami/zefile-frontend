// Cloudflare Pages middleware to redirect .pages.dev to custom domains
export async function onRequest(context: {
  request: Request;
  next: () => Promise<Response>;
}) {
  const url = new URL(context.request.url);
  const hostname = url.hostname;

  // Redirect zefile-frontend.pages.dev to zefile.io
  if (hostname === 'zefile-frontend.pages.dev') {
    return Response.redirect(`https://zefile.io${url.pathname}${url.search}`, 301);
  }

  // Redirect zefile-dev.pages.dev to demo.zefile.io
  if (hostname === 'zefile-dev.pages.dev') {
    return Response.redirect(`https://demo.zefile.io${url.pathname}${url.search}`, 301);
  }

  // Continue to next middleware or page
  return context.next();
}

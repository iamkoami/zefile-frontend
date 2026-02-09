export const runtime = "edge";

/**
 * Custom 404 Not Found Page
 *
 * Returns a complete HTML document to BYPASS the root layout.
 * This is required because @cloudflare/next-on-pages compiles _not-found
 * as Node.js when the root layout is dynamic (next-intl getLocale/getMessages).
 * A standalone not-found with its own <html>/<body> avoids layout inheritance.
 *
 * Short link redirects (/z-{code}, /downloads/{code}) are handled in middleware.
 */
export default function NotFound() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>404 - Page Not Found | ZeFile</title>
        <style
          dangerouslySetInnerHTML={{
            __html: `
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body {
                font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
                background: #fff;
                color: #171717;
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
              }
              .container {
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 1rem;
                text-align: center;
              }
              .code {
                font-size: 8rem;
                font-weight: 700;
                color: #5E53E0;
                line-height: 1;
                margin-bottom: 1rem;
              }
              .title {
                font-size: 1.5rem;
                font-weight: 700;
                margin-bottom: 0.75rem;
              }
              .subtitle {
                color: #6b7280;
                margin-bottom: 2rem;
                max-width: 28rem;
                line-height: 1.6;
              }
              .cta {
                display: inline-flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.875rem 2rem;
                background: #87E64B;
                color: #171717;
                font-weight: 500;
                border-radius: 4px;
                text-decoration: none;
                transition: background 0.15s;
              }
              .cta:hover { background: #78d43f; }
              .secondary {
                margin-top: 1rem;
              }
              .secondary a {
                font-size: 0.875rem;
                color: #9ca3af;
                text-decoration: none;
                transition: color 0.15s;
              }
              .secondary a:hover { color: #5E53E0; }
              @media (max-width: 640px) {
                .code { font-size: 5rem; }
              }
            `,
          }}
        />
      </head>
      <body>
        <div className="container">
          <h1 className="code">404</h1>
          <h2 className="title">Page Not Found</h2>
          <p className="subtitle">
            The page you&apos;re looking for doesn&apos;t exist or has been
            moved.
          </p>
          <a href="/" className="cta">
            Start Transfer
          </a>
          <div className="secondary">
            <a href="/">Go to Homepage</a>
          </div>
        </div>
      </body>
    </html>
  );
}

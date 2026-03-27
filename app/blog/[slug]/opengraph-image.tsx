import { ImageResponse } from 'next/og';

export const alt = 'ZeFile Blog';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let title = 'ZeFile Blog';
  let tag = '';

  try {
    const response = await fetch(`${API_URL}/blog/${slug}?locale=en`, {
      next: { revalidate: 3600 },
    });
    if (response.ok) {
      const post = await response.json();
      title = post.title || title;
      tag = post.tags?.[0] || '';
    }
  } catch {
    // Fallback to default title
  }

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: '#FDFAF4',
          padding: '60px 80px',
        }}
      >
        {/* Top: tag badge */}
        {tag && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <div
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: '#5E53E0',
              }}
            />
            <span
              style={{
                fontSize: '20px',
                color: '#5E53E0',
                fontWeight: 600,
              }}
            >
              {tag}
            </span>
          </div>
        )}

        {/* Center: title */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              fontSize: title.length > 60 ? 42 : 56,
              fontWeight: 700,
              color: '#171717',
              lineHeight: 1.2,
              maxWidth: '900px',
            }}
          >
            {title}
          </div>
        </div>

        {/* Bottom: branding bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                backgroundColor: '#5E53E0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                fontSize: '20px',
                fontWeight: 700,
              }}
            >
              Z
            </div>
            <span
              style={{
                fontSize: '24px',
                fontWeight: 700,
                color: '#171717',
              }}
            >
              ZeFile Blog
            </span>
          </div>
          <span
            style={{
              fontSize: '18px',
              color: '#9CA3AF',
            }}
          >
            zefile.io/blog
          </span>
        </div>
      </div>
    ),
    { ...size },
  );
}

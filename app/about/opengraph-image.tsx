import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'About ZeFile';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
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
        {/* Top: subtitle */}
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
            Made in Africa
          </span>
        </div>

        {/* Center: messaging */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            justifyContent: 'center',
            gap: '20px',
          }}
        >
          <div
            style={{
              fontSize: 52,
              fontWeight: 700,
              color: '#171717',
              lineHeight: 1.2,
              maxWidth: '800px',
            }}
          >
            Secure File Delivery for Creatives
          </div>
          <div
            style={{
              fontSize: 22,
              color: '#6B7280',
              lineHeight: 1.5,
              maxWidth: '700px',
            }}
          >
            Upload files, set a price, get paid before download. Built for photographers, videographers, designers, and musicians.
          </div>
        </div>

        {/* Bottom: branding */}
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
              ZeFile
            </span>
          </div>
          <span
            style={{
              fontSize: '18px',
              color: '#9CA3AF',
            }}
          >
            zefile.io/about
          </span>
        </div>
      </div>
    ),
    { ...size },
  );
}

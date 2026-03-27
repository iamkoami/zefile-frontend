import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Contact ZeFile';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  const channels = [
    { label: 'Chat', desc: 'Quick answers from our team' },
    { label: 'Email', desc: 'hello@zefile.io' },
    { label: 'Social', desc: '@zefilehq' },
  ];

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
              backgroundColor: '#87E64B',
            }}
          />
          <span
            style={{
              fontSize: '20px',
              color: '#87E64B',
              fontWeight: 600,
            }}
          >
            We reply within 24h
          </span>
        </div>

        {/* Center: title + channels */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            justifyContent: 'center',
            gap: '36px',
          }}
        >
          <div
            style={{
              fontSize: 48,
              fontWeight: 700,
              color: '#171717',
              lineHeight: 1.2,
            }}
          >
            Get in Touch
          </div>

          <div style={{ display: 'flex', gap: '40px' }}>
            {channels.map((ch) => (
              <div
                key={ch.label}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <span
                  style={{
                    fontSize: '20px',
                    fontWeight: 700,
                    color: '#171717',
                  }}
                >
                  {ch.label}
                </span>
                <span
                  style={{
                    fontSize: '16px',
                    color: '#9CA3AF',
                  }}
                >
                  {ch.desc}
                </span>
              </div>
            ))}
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
            zefile.io/contact-us
          </span>
        </div>
      </div>
    ),
    { ...size },
  );
}

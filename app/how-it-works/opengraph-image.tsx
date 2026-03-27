import { ImageResponse } from 'next/og';

export const alt = 'How ZeFile Works';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  const steps = [
    { num: '1', label: 'Upload', desc: 'Add files & set a price' },
    { num: '2', label: 'Share', desc: 'Send a secure link' },
    { num: '3', label: 'Get Paid', desc: 'Payment unlocks download' },
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
            3 simple steps
          </span>
        </div>

        {/* Center: title + steps */}
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
            Upload, Share, Get Paid
          </div>

          <div style={{ display: 'flex', gap: '32px' }}>
            {steps.map((step) => (
              <div
                key={step.num}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    backgroundColor: '#5E53E0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    fontSize: '22px',
                    fontWeight: 700,
                  }}
                >
                  {step.num}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span
                    style={{
                      fontSize: '20px',
                      fontWeight: 700,
                      color: '#171717',
                    }}
                  >
                    {step.label}
                  </span>
                  <span
                    style={{
                      fontSize: '16px',
                      color: '#9CA3AF',
                    }}
                  >
                    {step.desc}
                  </span>
                </div>
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
            zefile.io/how-it-works
          </span>
        </div>
      </div>
    ),
    { ...size },
  );
}

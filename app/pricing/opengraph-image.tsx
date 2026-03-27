import { ImageResponse } from 'next/og';

export const alt = 'ZeFile Pricing';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  const plans = [
    { name: 'Free', price: '0', storage: '5GB' },
    { name: 'Starter', price: '4.99', storage: '20GB' },
    { name: 'Pro', price: '9.99', storage: '50GB' },
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
            Simple pricing
          </span>
        </div>

        {/* Center: title + plan cards */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            justifyContent: 'center',
            gap: '32px',
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
            Choose Your Perfect Plan
          </div>

          <div style={{ display: 'flex', gap: '24px' }}>
            {plans.map((plan) => (
              <div
                key={plan.name}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '20px 28px',
                  borderRadius: '12px',
                  backgroundColor: plan.name === 'Pro' ? '#5E53E0' : '#FFFFFF',
                  border: plan.name === 'Pro' ? 'none' : '1px solid #E5E7EB',
                  width: '200px',
                }}
              >
                <span
                  style={{
                    fontSize: '16px',
                    fontWeight: 600,
                    color: plan.name === 'Pro' ? '#FFFFFF' : '#171717',
                  }}
                >
                  {plan.name}
                </span>
                <span
                  style={{
                    fontSize: '28px',
                    fontWeight: 700,
                    color: plan.name === 'Pro' ? '#FFFFFF' : '#171717',
                    marginTop: '4px',
                  }}
                >
                  {plan.price === '0' ? 'Free' : `$${plan.price}/mo`}
                </span>
                <span
                  style={{
                    fontSize: '14px',
                    color: plan.name === 'Pro' ? 'rgba(255,255,255,0.7)' : '#9CA3AF',
                    marginTop: '4px',
                  }}
                >
                  {plan.storage} per transfer
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
            zefile.io/pricing
          </span>
        </div>
      </div>
    ),
    { ...size },
  );
}

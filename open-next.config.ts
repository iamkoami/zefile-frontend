import type { OpenNextConfig } from 'open-next/types/open-next';

const config: OpenNextConfig = {
  default: {
    override: {
      wrapper: 'cloudflare',
    },
  },
};

export default config;

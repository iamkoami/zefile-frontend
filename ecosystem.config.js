/**
 * PM2 Ecosystem Configuration for ZeFile Frontend
 *
 * Usage:
 *   Development: pm2 start ecosystem.config.js --env development
 *   Production:  pm2 start ecosystem.config.js --env production
 *
 * Management:
 *   pm2 status        - View all processes
 *   pm2 logs          - View logs
 *   pm2 restart all   - Restart all processes
 *   pm2 stop all      - Stop all processes
 */

module.exports = {
  apps: [
    {
      name: 'zefile-frontend',
      script: 'npm',
      args: 'start',
      cwd: '/Users/iamkoami/Code/zefile-frontend',
      instances: 1,
      exec_mode: 'cluster',

      // Restart strategy
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,

      // Logging
      error_file: 'logs/pm2-error.log',
      out_file: 'logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // Environment variables - Development
      env_development: {
        NODE_ENV: 'development',
        PORT: 3000,
        NEXT_PUBLIC_API_URL: 'http://localhost:3001',
      },

      // Environment variables - Production
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        NEXT_PUBLIC_API_URL: 'https://api.zefile.io',
      },
    },
  ],
};

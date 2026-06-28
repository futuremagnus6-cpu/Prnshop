module.exports = {
  apps: [
    {
      name: 'prandhara-api',
      script: 'src/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      // Log configuration
      log_date_format: 'YYYY-MM-DD HH:mm:ss.SSS',
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      merge_logs: true,
      // Restart behavior
      max_restarts: 10,
      restart_delay: 4000,
      min_uptime: 5000,
      // Memory
      max_memory_restart: '500M',
      // Watch for file changes (disable in production)
      watch: false,
    },
  ],
};

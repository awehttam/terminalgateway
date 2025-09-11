module.exports = {
  apps: [{
    name: 'terminal-gateway',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    log_file: './logs/terminal-gateway.log',
    error_file: './logs/terminal-gateway-error.log',
    out_file: './logs/terminal-gateway-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
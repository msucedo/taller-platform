// PM2 Configuration for Multiple Environments
module.exports = {
  apps: [{
    name: 'taller-platform',
    script: 'server.js',
    instances: 1, // Puede aumentar según la capacidad del servidor
    autorestart: true,
    watch: false,
    max_memory_restart: '512M',
    env: {
      NODE_ENV: 'development'
    },
    env_development: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_staging: {
      NODE_ENV: 'staging',
      PORT: 3001
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    // Configuración de logging
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Configuración de monitoreo
    min_uptime: '10s',
    max_restarts: 10,
    
    // Health check
    health_check_grace_period: 3000,
    health_check_interval: 30000
  }]
};
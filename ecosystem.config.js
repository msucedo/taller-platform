// PM2 Configuration for Production
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
    max_restarts: 10
  }]
};
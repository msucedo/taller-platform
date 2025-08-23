const path = require('path');
require('dotenv').config();

const environments = {
  development: {
    NODE_ENV: 'development',
    port: process.env.PORT || 3000,
    database: {
      path: process.env.DB_PATH || './database/taller-dev.db'
    },
    security: {
      bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 10,
      sessionSecret: process.env.SESSION_SECRET || 'dev-secret',
      sessionExpiryHours: parseInt(process.env.SESSION_EXPIRY_HOURS) || 24
    },
    features: {
      enableDebugEndpoints: process.env.ENABLE_DEBUG_ENDPOINTS === 'true',
      enableMockData: process.env.ENABLE_MOCK_DATA === 'true'
    },
    logging: {
      level: process.env.LOG_LEVEL || 'debug',
      debug: process.env.DEBUG === 'true'
    },
    urls: {
      base: process.env.BASE_URL || 'http://localhost:3000',
      frontend: process.env.FRONTEND_URL || 'http://localhost:3000'
    }
  },
  
  staging: {
    NODE_ENV: 'staging',
    port: process.env.PORT || 3000,
    database: {
      path: process.env.DB_PATH || './database/taller-staging.db'
    },
    security: {
      bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12,
      sessionSecret: process.env.SESSION_SECRET,
      sessionExpiryHours: parseInt(process.env.SESSION_EXPIRY_HOURS) || 8
    },
    features: {
      enableDebugEndpoints: process.env.ENABLE_DEBUG_ENDPOINTS === 'true',
      enableMockData: false
    },
    logging: {
      level: process.env.LOG_LEVEL || 'info',
      debug: false
    },
    urls: {
      base: process.env.BASE_URL,
      frontend: process.env.FRONTEND_URL
    }
  },
  
  production: {
    NODE_ENV: 'production',
    port: process.env.PORT || 3000,
    database: {
      path: process.env.DB_PATH || './database/taller-production.db'
    },
    security: {
      bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 14,
      sessionSecret: process.env.SESSION_SECRET,
      sessionExpiryHours: parseInt(process.env.SESSION_EXPIRY_HOURS) || 4
    },
    features: {
      enableDebugEndpoints: false,
      enableMockData: false
    },
    logging: {
      level: process.env.LOG_LEVEL || 'error',
      debug: false
    },
    urls: {
      base: process.env.BASE_URL,
      frontend: process.env.FRONTEND_URL
    },
    ssl: {
      enabled: process.env.SSL_ENABLED === 'true',
      forceHttps: process.env.FORCE_HTTPS === 'true'
    }
  }
};

function getConfig() {
  const env = process.env.NODE_ENV || 'development';
  const config = environments[env];
  
  if (!config) {
    throw new Error(`Environment ${env} is not supported`);
  }
  
  // Validaciones críticas para producción
  if (env === 'production') {
    if (!config.security.sessionSecret || config.security.sessionSecret.includes('CAMBIA')) {
      throw new Error('SESSION_SECRET must be set for production environment');
    }
    
    if (!config.urls.base || config.urls.base.includes('localhost')) {
      throw new Error('BASE_URL must be set for production environment');
    }
  }
  
  return {
    ...config,
    isDevelopment: env === 'development',
    isStaging: env === 'staging',
    isProduction: env === 'production',
    environment: env
  };
}

module.exports = {
  getConfig,
  environments
};
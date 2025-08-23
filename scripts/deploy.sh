#!/bin/bash
# Script de deployment para producción

set -e # Salir si hay algún error

echo "🚀 Iniciando deployment de Taller Platform..."

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para logs
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    error "No se encuentra package.json. Ejecuta desde el directorio del proyecto."
fi

# Verificar que existe el archivo de producción
if [ ! -f ".env.production" ]; then
    error "No se encuentra .env.production. Crea este archivo antes del deployment."
fi

log "Verificando Node.js y npm..."
node --version || error "Node.js no está instalado"
npm --version || error "npm no está instalado"

log "Instalando dependencias..."
npm ci --only=production

log "Verificando configuración de producción..."
if [ ! -f ".env.production" ]; then
    error "Archivo .env.production no encontrado"
fi

# Backup de base de datos si existe
if [ -f "database/taller.db" ]; then
    log "Haciendo backup de la base de datos..."
    cp database/taller.db "database/taller.db.backup.$(date +%Y%m%d_%H%M%S)"
fi

log "Inicializando base de datos..."
NODE_ENV=production node database/init.js

log "Verificando que el servidor puede iniciar..."
timeout 10s node -e "
require('dotenv').config({path: '.env.production'});
const app = require('./server.js');
console.log('✅ Servidor verificado correctamente');
process.exit(0);
" || error "El servidor no pudo iniciar correctamente"

log "✅ Deployment completado exitosamente!"
log "Para iniciar la aplicación:"
log "  Opción 1 (Desarrollo): NODE_ENV=production node server.js"
log "  Opción 2 (PM2): pm2 start ecosystem.config.js --env production"
log "  Opción 3 (Docker): docker-compose up -d"

warning "RECORDATORIO DE SEGURIDAD:"
warning "1. Cambia las contraseñas por defecto en .env.production"
warning "2. Configura HTTPS en el proxy/load balancer"
warning "3. Configura firewall para exponer solo los puertos necesarios"
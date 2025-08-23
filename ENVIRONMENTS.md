# 🌍 Gestión de Ambientes - Taller Platform

## 📁 Estructura de Ambientes

Este proyecto maneja **3 ambientes distintos**:

### 🔧 Development (Desarrollo)
- **Archivo**: `.env.development`
- **Base de datos**: `taller-dev.db`
- **Puerto**: 3000
- **Debug**: Habilitado
- **Endpoints debug**: Habilitados

### 🧪 Staging (Pruebas)
- **Archivo**: `.env.staging`  
- **Base de datos**: `taller-staging.db`
- **Puerto**: 3001
- **Debug**: Limitado
- **Endpoints debug**: Deshabilitados

### 🚀 Production (Producción)
- **Archivo**: `.env.production`
- **Base de datos**: `taller-production.db`
- **Puerto**: 3000
- **Debug**: Deshabilitado
- **Seguridad**: Máxima

## 🚀 Comandos Principales

### Ejecutar en diferentes ambientes:
```bash
# Desarrollo (recomendado para trabajar)
npm run dev

# Staging (para pruebas)
npm run staging

# Producción
npm run prod
```

### Inicializar base de datos por ambiente:
```bash
# Desarrollo
npm run db:dev

# Staging  
npm run db:staging

# Producción
npm run db:prod
```

### PM2 (Servidor de producción):
```bash
# Desarrollo
npm run pm2:dev

# Staging
npm run pm2:staging

# Producción
npm run pm2:prod

# Ver logs
npm run pm2:logs

# Parar servidor
npm run pm2:stop
```

## ⚙️ Configuración por Ambiente

### Development (.env.development)
```env
NODE_ENV=development
DEBUG=true
ENABLE_DEBUG_ENDPOINTS=true
BCRYPT_ROUNDS=10
SESSION_EXPIRY_HOURS=24
```

### Staging (.env.staging)
```env
NODE_ENV=staging
DEBUG=false
ENABLE_DEBUG_ENDPOINTS=false
BCRYPT_ROUNDS=12
SESSION_EXPIRY_HOURS=8
SSL_ENABLED=true
```

### Production (.env.production)
```env
NODE_ENV=production
DEBUG=false
ENABLE_DEBUG_ENDPOINTS=false
BCRYPT_ROUNDS=14
SESSION_EXPIRY_HOURS=4
SSL_ENABLED=true
FORCE_HTTPS=true
```

## 🔐 Seguridad por Ambiente

| Característica | Development | Staging | Production |
|---------------|-------------|---------|-----------|
| BCRYPT Rounds | 10 | 12 | 14 |
| Session Expiry | 24h | 8h | 4h |
| Debug Endpoints | ✅ | ❌ | ❌ |
| HTTPS Force | ❌ | ✅ | ✅ |
| Logs Level | debug | info | error |

## 📋 Checklist de Despliegue

### Antes de pasar a Staging:
- [ ] Probar todas las funcionalidades en Development
- [ ] Ejecutar `npm run security-audit`
- [ ] Verificar que no hay secrets hardcodeados
- [ ] Hacer backup de la base de datos

### Antes de pasar a Production:
- [ ] ⚠️  **CAMBIAR** todas las contraseñas en `.env.production`
- [ ] ⚠️  **CAMBIAR** `SESSION_SECRET` por algo ultra-seguro
- [ ] ⚠️  **CONFIGURAR** URLs reales del dominio
- [ ] ⚠️  **CONFIGURAR** SSL/HTTPS correctamente
- [ ] ⚠️  **HACER BACKUP** completo del sistema
- [ ] Probar completamente en Staging primero

## ⚠️  IMPORTANTE - Seguridad

### Nunca hagas esto:
- ❌ Subir archivos `.env.*` al repositorio
- ❌ Usar contraseñas por defecto en producción
- ❌ Exponer endpoints de debug en producción
- ❌ Usar HTTP en producción (solo HTTPS)

### Siempre haz esto:
- ✅ Cambiar contraseñas antes de producción
- ✅ Usar HTTPS en staging y producción  
- ✅ Hacer backups regulares
- ✅ Monitorear logs de producción
- ✅ Mantener secrets fuera del código

## 🐳 Docker (Opcional)

```bash
# Desarrollo
npm run docker:run:dev

# Producción
npm run docker:run:prod
```

## 🆘 Troubleshooting

### Error "Environment not supported":
- Verifica que `NODE_ENV` esté correctamente configurado
- Asegúrate de que el archivo `.env.*` correspondiente exista

### Error "SESSION_SECRET must be set":
- En producción, cambia `SESSION_SECRET` por un valor real y seguro

### Error de base de datos:
- Ejecuta `npm run db:[ambiente]` para inicializar la BD
- Verifica permisos de la carpeta `database/`

---
📞 **¿Necesitas ayuda?** Revisa los logs con `npm run pm2:logs`
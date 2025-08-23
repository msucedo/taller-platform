# 🔒 Checklist de Seguridad para Producción

## ⚡ **CRÍTICO - Antes del Launch**

### 🔑 **Credenciales**
- [ ] Cambiar `ADMIN_PASSWORD` en `.env.production`
- [ ] Generar `SESSION_SECRET` único (mín. 32 caracteres)
- [ ] Cambiar `ADMIN_EMAIL` al email real del administrador
- [ ] Verificar que `.env` está en `.gitignore`
- [ ] NO commitear archivos `.env*` al repositorio

### 🌐 **HTTPS/SSL**
- [ ] Configurar certificado SSL (Let's Encrypt recomendado)
- [ ] Forzar redirección HTTP → HTTPS
- [ ] Verificar que cookies se envían solo por HTTPS
- [ ] Headers de seguridad configurados

### 🚪 **Acceso al Servidor**
- [ ] Cambiar puerto SSH por defecto (no usar 22)
- [ ] Configurar autenticación por llaves SSH
- [ ] Deshabilitar login root directo
- [ ] Configurar fail2ban contra ataques de fuerza bruta

---

## 🛡️ **ALTO - Primera Semana**

### 🔥 **Firewall**
- [ ] Configurar UFW/iptables
- [ ] Abrir solo puertos necesarios (80, 443, SSH)
- [ ] Bloquear acceso directo al puerto 3000 desde internet
- [ ] Configurar rate limiting en Nginx/proxy

### 📊 **Monitoreo**
- [ ] Configurar logs de aplicación
- [ ] Monitoreo de uso de CPU/memoria
- [ ] Alertas por fallos de servicio
- [ ] Backup automático de base de datos

### 👤 **Usuarios por Defecto**
- [ ] Obligar cambio de contraseña en primer login
- [ ] Verificar que todos los empleados están activos
- [ ] Eliminar usuarios de prueba si existen

---

## 🔧 **MEDIO - Primer Mes**

### 🗄️ **Base de Datos**
- [ ] Backup diario automático
- [ ] Probar restauración de backups
- [ ] Configurar retención de backups (30 días)
- [ ] Monitorear tamaño de base de datos

### 🌐 **Headers de Seguridad**
- [ ] `X-Content-Type-Options: nosniff`
- [ ] `X-Frame-Options: DENY`
- [ ] `X-XSS-Protection: 1; mode=block`
- [ ] `Strict-Transport-Security` (HSTS)
- [ ] `Content-Security-Policy`

### 📝 **Logging**
- [ ] Logs de login/logout
- [ ] Logs de acciones administrativas
- [ ] Logs de errores de aplicación
- [ ] Rotación de logs automática

---

## ⚖️ **BAJO - Mantenimiento Continuo**

### 🔄 **Actualizaciones**
- [ ] Plan de actualización de dependencias
- [ ] Actualización mensual del SO
- [ ] Monitoreo de vulnerabilidades (npm audit)
- [ ] Documentar proceso de rollback

### 📋 **Políticas**
- [ ] Política de contraseñas fuertes
- [ ] Procedimiento de revocación de acceso
- [ ] Protocolo de respuesta a incidentes
- [ ] Capacitación de usuarios en seguridad

---

## 🚨 **Script de Validación**

Crea un script para verificar la seguridad automáticamente:

```bash
#!/bin/bash
# security-check.sh

echo "🔒 Verificando seguridad de la aplicación..."

# Verificar HTTPS
echo "Verificando SSL..."
curl -I https://tu-dominio.com | grep "HTTP/2 200" || echo "❌ HTTPS no funciona"

# Verificar headers de seguridad  
echo "Verificando headers..."
curl -I https://tu-dominio.com | grep -i "strict-transport-security" || echo "⚠️  HSTS no configurado"

# Verificar que HTTP redirige a HTTPS
echo "Verificando redirección..."
curl -I http://tu-dominio.com | grep "301\|302" || echo "⚠️  No redirige HTTP→HTTPS"

# Verificar que la app está corriendo
echo "Verificando aplicación..."
curl -f https://tu-dominio.com/empleado/login || echo "❌ App no responde"

echo "✅ Verificación completada"
```

---

## 🎯 **Configuración Nginx Segura**

```nginx
# /etc/nginx/sites-available/taller-platform
server {
    listen 80;
    server_name tu-dominio.com www.tu-dominio.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name tu-dominio.com www.tu-dominio.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/tu-dominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tu-dominio.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;

    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin";

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;
    
    location /api/empleado/login {
        limit_req zone=login burst=3 nodelay;
        proxy_pass http://localhost:3000;
        # ... otros headers proxy
    }

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 🚨 **En Caso de Incidente**

### **Pasos Inmediatos**:
1. **Aislar**: Desconectar del internet si es necesario
2. **Documentar**: Capturar logs antes de que se pierdan  
3. **Restaurar**: Desde backup más reciente conocido como limpio
4. **Investigar**: Analizar cómo ocurrió la brecha
5. **Parchear**: Corregir la vulnerabilidad
6. **Comunicar**: Notificar a usuarios si es necesario

### **Contactos de Emergencia**:
- [ ] Proveedor de hosting: `______________`
- [ ] Administrador de sistemas: `______________`
- [ ] Contacto técnico: `______________`

---

## ✅ **Verificación Final**

Antes de declarar el sistema "listo para producción":

- [ ] Todos los ítems CRÍTICOS completados
- [ ] Al menos 80% de ítems ALTO completados  
- [ ] Script de seguridad ejecutado sin errores
- [ ] Backup y restauración probados
- [ ] Plan de respuesta a incidentes documentado
- [ ] Usuarios entrenados en mejores prácticas

**Fecha de última verificación**: _______________  
**Responsable**: _______________  
**Próxima revisión**: _______________
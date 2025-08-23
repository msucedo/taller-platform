# 🚀 Guía de Deployment a Producción

## 📋 **Opciones de Hosting**

### 1. **🌐 VPS/Servidor Dedicado** ⭐ (Recomendado)
**Ideal para**: Control total, mejor rendimiento, datos sensibles

**Proveedores sugeridos**:
- **DigitalOcean Droplet**: $6-12/mes (1-2GB RAM)
- **Linode**: $5-10/mes
- **Vultr**: $5-10/mes  
- **AWS EC2**: $10-20/mes (t3.micro/small)

**Pros**: Control total, mejor seguridad, escalable
**Contras**: Requiere conocimiento de administración de servidores

---

### 2. **☁️ Plataformas Serverless** ⭐
**Ideal para**: Fácil deployment, auto-escalado

**Proveedores**:
- **Railway**: $5/mes, muy fácil deployment
- **Render**: $7/mes, incluye SSL gratis
- **Heroku**: $7/mes (Hobby tier)
- **Fly.io**: $0-5/mes según uso

**Pros**: Muy fácil, SSL gratis, auto-scaling
**Contras**: Menos control, posibles limitaciones

---

### 3. **🐳 Contenedores** ⭐⭐
**Ideal para**: Consistencia, fácil escalado

**Proveedores**:
- **Railway** (Docker support)
- **Google Cloud Run**: Pay per use
- **AWS Fargate**: $15-30/mes
- **DigitalOcean App Platform**: $12/mes

---

## 🛠️ **Métodos de Deployment**

## **Método 1: VPS con PM2** (Más popular)

### **Paso 1: Preparar el Servidor**
```bash
# Conectar al servidor
ssh usuario@tu-servidor.com

# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar PM2 globalmente
sudo npm install -g pm2

# Instalar Nginx (opcional para HTTPS)
sudo apt install nginx
```

### **Paso 2: Deploy la Aplicación**
```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/taller-platform.git
cd taller-platform

# Configurar variables de entorno
cp .env.production .env
nano .env  # Editar con tus valores

# Ejecutar script de deployment
./scripts/deploy.sh

# Iniciar con PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

### **Paso 3: Configurar Nginx (HTTPS)**
```bash
# Crear configuración de Nginx
sudo nano /etc/nginx/sites-available/taller-platform
```

```nginx
server {
    listen 80;
    server_name tu-dominio.com www.tu-dominio.com;
    
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

```bash
# Activar sitio
sudo ln -s /etc/nginx/sites-available/taller-platform /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# SSL con Let's Encrypt
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d tu-dominio.com -d www.tu-dominio.com
```

---

## **Método 2: Docker** 

### **Deployment Local**
```bash
# Construir imagen
docker build -t taller-platform .

# Ejecutar contenedor
docker run -d \
  --name taller-app \
  -p 3000:3000 \
  --env-file .env.production \
  -v taller_data:/app/data \
  taller-platform
```

### **Con Docker Compose**
```bash
# Configurar variables
cp .env.production .env

# Iniciar servicios
docker-compose up -d

# Ver logs
docker-compose logs -f
```

---

## **Método 3: Railway** ⚡ (Más Fácil)

### **Deployment de 1-Click**
1. **Conectar GitHub**: railway.app → Connect GitHub repo
2. **Variables de entorno**: Agregar todas las de `.env.production`
3. **Deploy**: Railway despliega automáticamente
4. **Dominio**: Railway te da un dominio gratis, o conecta tu propio

### **Variables Requeridas en Railway**:
```
NODE_ENV=production
PORT=3000
ADMIN_EMAIL=tu-email@dominio.com  
ADMIN_PASSWORD=tu-password-seguro
SESSION_SECRET=clave-super-secreta-32-caracteres
BCRYPT_ROUNDS=12
```

---

## **Método 4: Render**

1. **Conectar GitHub**: render.com → Connect repository
2. **Configurar**:
   - Build Command: `npm install`
   - Start Command: `node server.js`
3. **Variables**: Agregar las mismas de Railway
4. **Deploy**: Automático en cada push

---

## 🔧 **Configuración Post-Deployment**

### **1. Verificar que funciona**
```bash
curl https://tu-dominio.com/
curl https://tu-dominio.com/empleado/login
```

### **2. Backup Automático**
```bash
# Programar backup diario
crontab -e

# Agregar línea (backup a las 2 AM)
0 2 * * * cd /path/to/taller-platform && ./scripts/backup.sh
```

### **3. Monitoreo**
```bash
# Ver logs con PM2
pm2 logs

# Monitoreo en tiempo real
pm2 monit

# Restart si falla
pm2 restart taller-platform
```

---

## 🌍 **Configuración de Dominio**

### **1. DNS Records**
En tu proveedor de dominios (Namecheap, GoDaddy, etc.):
```
A     @              IP_DE_TU_SERVIDOR
A     www            IP_DE_TU_SERVIDOR
CNAME taller         tu-dominio.com
```

### **2. SSL Certificate**
- **Automático**: Railway, Render, Heroku incluyen SSL
- **Manual**: Let's Encrypt (gratis)
- **Cloudflare**: SSL gratis + CDN

---

## 📊 **Costos Estimados**

| Opción | Costo Mensual | SSL | Complejidad |
|--------|---------------|-----|-------------|
| Railway | $5-10 | ✅ Gratis | ⭐ Muy Fácil |
| Render | $7 | ✅ Gratis | ⭐ Muy Fácil |
| DigitalOcean | $6 + dominio | Let's Encrypt | ⭐⭐ Medio |
| AWS EC2 | $10-20 | Let's Encrypt | ⭐⭐⭐ Difícil |

---

## 🎯 **Recomendación por Caso**

### **🚀 Quiero algo rápido y fácil**
→ **Railway** o **Render** (5-10 minutos de setup)

### **💰 Necesito el menor costo**
→ **DigitalOcean Droplet** + PM2 ($6/mes)

### **🏢 Para negocio serio**
→ **AWS/Google Cloud** con balanceador de carga

### **🔒 Máxima seguridad**
→ **VPS propio** con configuración personalizada

---

¿Qué método prefieres? Te puedo ayudar con el deployment paso a paso del que elijas.
# 🚀 **GUÍA PASO A PASO - RAILWAY DEPLOYMENT**

## **PASO 1: Preparar tu Código**

Primero vamos a subir tu código a GitHub (Railway necesita un repositorio):

```bash
# En tu directorio del proyecto
git init
git add .
git commit -m "🚀 Preparando para deployment en Railway"
```

Si no tienes GitHub configurado:
```bash
git config --global user.name "Tu Nombre"
git config --global user.email "tu@email.com"
```

Ahora crea un repositorio en GitHub:
1. Ve a **github.com** → "New Repository"
2. Nombre: `taller-platform` 
3. **NO** marques "Initialize with README"
4. Click "Create Repository"

Luego conecta tu código local:
```bash
git remote add origin https://github.com/TU-USUARIO/taller-platform.git
git branch -M main
git push -u origin main
```

## **PASO 2: Crear Cuenta en Railway**

1. **Ve a railway.app**
2. Click **"Login"** → **"Login with GitHub"**
3. **Autoriza** Railway para acceder a tus repositorios
4. ¡Listo! Ya tienes cuenta

## **PASO 3: Crear el Proyecto**

1. En Railway dashboard, click **"New Project"**
2. Selecciona **"Deploy from GitHub repo"**  
3. **Busca y selecciona** `taller-platform`
4. Railway automáticamente detectará que es una app Node.js
5. Click **"Deploy Now"**

⏳ Railway empezará a construir tu app (toma 2-3 minutos)

## **PASO 4: Configurar Variables de Entorno**

Esto es **CRÍTICO**. Mientras se construye, vamos a configurar las variables:

1. En tu proyecto de Railway, click la pestaña **"Variables"**
2. **Agrega estas variables** una por una:

```
NODE_ENV=production
PORT=3000
ADMIN_EMAIL=admin@tu-taller.com
ADMIN_PASSWORD=TuPasswordSuperSeguro123!
ADMIN_NAME=Administrador Principal
SESSION_SECRET=clave-ultra-secreta-de-al-menos-32-caracteres-para-maxima-seguridad
BCRYPT_ROUNDS=12
DB_PATH=/app/data/taller.db
```

⚠️ **IMPORTANTE**: 
- Cambia `ADMIN_EMAIL` por tu email real
- Cambia `ADMIN_PASSWORD` por una contraseña fuerte
- El `SESSION_SECRET` debe ser único y muy largo

## **PASO 5: Obtener tu URL**

1. **Espera** que termine el build (verás ✅ "Success")
2. En la pestaña **"Settings"**, encuentra **"Domains"**
3. Railway te dará una URL como: `https://taller-platform-production-abc123.up.railway.app`
4. **¡Copia esa URL!** Esa es tu aplicación en vivo

## **PASO 6: Primera Verificación**

Vamos a probar que todo funciona:

1. **Abre tu URL** en el navegador
2. Deberías ver **tu formulario principal** ✅
3. Ve a `TU-URL/empleado/login` 
4. **Intenta hacer login** con:
   - Email: el que pusiste en `ADMIN_EMAIL`
   - Password: el que pusiste en `ADMIN_PASSWORD`

Si todo funciona, ¡**FELICIDADES**! 🎉 Tu aplicación está en línea.

## **PASO 7: Configurar Dominio Personalizado (Opcional)**

Si tienes tu propio dominio (ej: `mi-taller.com`):

1. En Railway → **"Settings"** → **"Domains"**
2. Click **"Custom Domain"**
3. Ingresa tu dominio: `mi-taller.com`
4. Railway te dará un **CNAME record**
5. Ve a tu proveedor de dominio (Namecheap, GoDaddy, etc.)
6. Agrega el CNAME record que Railway te dio
7. **Espera 5-10 minutos** y listo

---

## 🔧 **Troubleshooting Común**

### **❌ Build Falló**
**Solución**: Ve a "Deployments" → click el deployment fallido → revisa los logs
**Causa común**: Falta alguna dependencia en package.json

### **❌ App no responde**
**Solución**: Revisa las variables de entorno, especialmente `PORT=3000`

### **❌ No puedo hacer login**
**Solución**: Verifica `ADMIN_EMAIL` y `ADMIN_PASSWORD` en variables

### **❌ Error de base de datos**
**Solución**: Railway necesita persistir la BD, puede tomar un deploy extra

---

## 📊 **Costo de Railway**

- **$0/mes**: Para proyectos pequeños (límite de horas)
- **$5/mes**: Plan Hobby (recomendado) - sin límites
- **SSL gratis** incluido 🔒
- **Dominio temporal** gratis incluido
- **Auto-scaling** incluido

---

## 🎯 **¿Tienes algún error o necesitas ayuda con algún paso específico?**

Cuéntame:
1. ¿Ya tienes cuenta de GitHub?
2. ¿En qué paso estás?
3. ¿Algún error específico?

¡Te ayudo a resolverlo! Railway es súper fácil, en 10 minutos deberías tener tu taller funcionando online.

---

## ✅ **Checklist de Verificación Final**

Una vez completado el deployment, verifica:

- [ ] La aplicación carga en la URL de Railway
- [ ] Puedes crear una nueva solicitud en la página principal
- [ ] Puedes hacer login como admin en `/empleado/login`
- [ ] El dashboard de admin funciona correctamente
- [ ] Puedes crear nuevos empleados
- [ ] El sistema de asignación funciona
- [ ] Los empleados pueden hacer login con sus credenciales

Si todos estos puntos funcionan, ¡tu aplicación está lista para usar! 🚀
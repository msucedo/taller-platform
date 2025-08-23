# 🚀 Proceso de Despliegue - Taller Platform

## 🔄 Flujo de Desarrollo → Producción

### 1. 💻 **DESARROLLO LOCAL**
```bash
# Tu trabajo diario
git checkout -b feature/nueva-funcionalidad
npm run dev                    # Trabajas aquí
# Desarrollas las mejoras (bitácora, UI móvil, etc.)
git add .
git commit -m "feat: agregar bitácora de asignaciones y UI móvil"
git push origin feature/nueva-funcionalidad
```

### 2. 🔀 **MERGE A MAIN**
```bash
# Pull Request aprobado → merge a main
git checkout main
git pull origin main
```

### 3. 🧪 **DESPLIEGUE A STAGING**
```bash
# En servidor de staging (o tu máquina simulando)
git pull origin main           # Bajas el código nuevo
npm run staging               # Ejecutas con config de staging
# PRUEBAS: Verificas que todo funcione bien
```

### 4. 🚀 **DESPLIEGUE A PRODUCCIÓN**
```bash
# En servidor de producción
git pull origin main          # Bajas el mismo código
npm run prod                  # Ejecutas con config de producción
# O con PM2: npm run pm2:prod
```

## 🗂️ **Lo que SÍ va a GitHub:**
- ✅ `server.js`, `views/`, `public/` (tu código)
- ✅ `database/init.js` (estructura de BD)
- ✅ `package.json` (dependencias y scripts)
- ✅ Nuevas funcionalidades

## 🔒 **Lo que NO va a GitHub:**
- ❌ `.env.production` (configuración de prod)
- ❌ `database/taller-production.db` (datos reales)
- ❌ Logs de producción
- ❌ Secrets, passwords, API keys

## 📊 **Ejemplo práctico:**

### Tu código nuevo (bitácora + UI móvil):
```
📁 Lo que subes a GitHub:
├── server.js (con nueva tabla bitácora)
├── views/tracker.html (UI mejorada)  
├── public/css/styles.css (responsive iPhone)
└── database/init.js (tabla solicitudes_bitacora)
```

### En cada servidor:
```
🖥️  SERVIDOR STAGING:
- git pull (baja tu código)
- Usa .env.staging (BD staging, URLs staging)
- npm run staging

🖥️  SERVIDOR PRODUCCIÓN:  
- git pull (baja el MISMO código)
- Usa .env.production (BD prod, URLs reales)
- npm run prod
```

## 🎯 **Ventajas de este flujo:**

1. **Mismo código, diferentes configuraciones**
2. **Pruebas en staging antes de producción**
3. **Rollback fácil** si algo sale mal
4. **Environments aislados** (no afectas producción)
5. **Secrets seguros** (no en GitHub)

## ⚡ **Comandos prácticos:**

```bash
# DESARROLLO (tu día a día)
npm run dev
git add . && git commit -m "nueva feature"
git push

# STAGING (después del merge)
git pull
npm run staging
# Pruebas...

# PRODUCCIÓN (cuando staging esté OK)
git pull  
npm run prod
# o npm run pm2:prod
```

## 🔄 **Rollback de emergencia:**

```bash
# Si algo sale mal en producción
git log --oneline              # Ves los commits
git checkout abc1234           # Vuelves al commit anterior
npm run prod                   # Restauras funcionamiento
```

## 📋 **Checklist de despliegue:**

### Antes de subir a GitHub:
- [ ] Probaste en development
- [ ] No incluiste secrets en el código
- [ ] Hiciste commit con mensaje claro

### Antes de staging:
- [ ] Pull del código nuevo
- [ ] Verificar que .env.staging esté correcto
- [ ] Probar todas las funcionalidades

### Antes de producción:
- [ ] Todo funcionó en staging
- [ ] Backup de BD de producción
- [ ] Verificar .env.production
- [ ] Plan de rollback listo

---

**🎯 TL;DR:** Tu código va a GitHub → Se despliega igual en todos lados → Cada ambiente usa su propia configuración (.env.*)
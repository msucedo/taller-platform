# 🔧 Plataforma Taller Mecánico

Sistema web para gestión de solicitudes de servicios de taller mecánico con dashboard administrativo y de empleados.

## ✨ Características

- **🎯 Formulario wizard** para solicitudes de clientes
- **📋 Sistema de tracking** con códigos únicos
- **👥 Gestión de empleados** con roles (admin, mecánico, recepcionista)
- **🔐 Autenticación segura** con bcrypt y tokens de sesión
- **📊 Dashboards** diferenciados por rol
- **📝 Sistema de asignación** de solicitudes a empleados
- **🎨 Interfaz responsive** mobile-first

## 🚀 Instalación

1. **Clonar el repositorio**
```bash
git clone <repository-url>
cd taller-platform
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**
```bash
cp .env.example .env
# Editar .env con tus configuraciones
```

4. **Inicializar base de datos**
```bash
node database/init.js
```

5. **Iniciar servidor**
```bash
npm start
# o para desarrollo:
npm run dev
```

## 🔑 Usuarios por Defecto

Después de la instalación, se crean los siguientes usuarios:

| Email | Contraseña | Rol |
|-------|------------|-----|
| admin@taller.com | admin123 | admin |
| carlos.mendez@taller.com | mecanico123 | mecanico |
| maria.gonzalez@taller.com | recepcion123 | recepcionista |

⚠️ **IMPORTANTE**: Cambia estas contraseñas en producción.

## 📱 Acceso

- **Página principal**: http://localhost:3000
- **Dashboard Admin**: http://localhost:3000/admin/dashboard
- **Dashboard Empleados**: http://localhost:3000/empleado/dashboard
- **Login Empleados**: http://localhost:3000/empleado/login

## 🛠️ Tecnologías

- **Backend**: Node.js + Express
- **Base de datos**: SQLite3
- **Autenticación**: bcrypt + tokens de sesión
- **Frontend**: HTML5 + CSS3 + JavaScript (Vanilla)
- **Iconos**: Emojis nativos

## 🏗️ Estructura del Proyecto

```
taller-platform/
├── database/           # Base de datos y migraciones
├── public/            # Archivos estáticos
│   ├── css/          # Estilos
│   └── js/           # JavaScript del frontend
├── views/            # Plantillas HTML
├── server.js         # Servidor principal
└── package.json      # Dependencias
```

## 🔧 Scripts Útiles

```bash
# Resetear contraseñas de usuarios
node reset-passwords.js

# Verificar migración de contraseñas
node migrate-passwords.js
```

## 🔒 Seguridad

- ✅ Contraseñas hasheadas con bcrypt (12 rounds)
- ✅ Tokens de sesión seguros
- ✅ Prepared statements (SQL injection protection)
- ✅ Validación de roles y permisos
- ✅ CORS configurado

## 📝 API Endpoints

### Autenticación
- `POST /api/empleado/login` - Login de empleados
- `POST /api/empleado/logout` - Logout
- `GET /api/empleado/verify` - Verificar token

### Solicitudes
- `GET /api/solicitudes` - Listar solicitudes
- `POST /api/solicitudes` - Crear solicitud
- `PUT /api/solicitudes/:id` - Actualizar solicitud
- `POST /api/solicitudes/:id/asignar` - Asignar a empleado

### Empleados (Solo Admin)
- `GET /api/empleados` - Listar empleados
- `POST /api/empleados` - Crear empleado
- `PUT /api/empleados/:id` - Actualizar empleado
- `PUT /api/empleados/:id/toggle` - Activar/desactivar

## 🐛 Solución de Problemas

### Base de datos corrupta
```bash
rm database/taller.db
node database/init.js
```

### Usuarios desactivados
```bash
sqlite3 database/taller.db "UPDATE usuarios SET activo = 1"
```

## Notas, mejoras
- en la pagina de rastreo, agregar a cada rastreo la evidencia cuando se asigna o reasigna una solicitud


## 📄 Licencia

MIT License - ver [package.json](package.json) para detalles.
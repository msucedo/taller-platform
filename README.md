# 🛣️ Plataforma Llantera

Sistema web para gestión de solicitudes de servicios de llantera con dashboard administrativo y de empleados.

## ✨ Características

- **🎯 Formulario wizard** para solicitudes de clientes
- **📋 Sistema de tracking** con códigos únicos
- **👥 Gestión de empleados** con roles (admin, vendedor, recepcionista)
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
| admin@llantera.com | admin123 | admin |
| carlos.mendez@llantera.com | vendedor123 | vendedor |
| maria.gonzalez@llantera.com | recepcion123 | recepcionista |

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
- en el inventario, despues de actualizar la tabla porque se edito un item por ejemplo, se debe limpiar el buscador
- en el inventario, el boton "cerrar sesion", no lo pongas en el header
- en el portal proveedor, tambien deberia ser posible acceder con un correo de una cotizacion y no solo de una solicitud
- el dashboard de administrador tiene el tipo de header que quiero lleven todas las pantallas del administrador, es decir, la sección inventario deberia tener este mismo header y la seccion cotizaciones tambien
- en la sección de inventario, la tab de movimientos y de reservas deberian de ser su propia pagina y no solo un modal, y con estadisticas reales asi como la pagina de inventario
- mover el mensaje de error de las validaciones a la parte de arriba porque simepre salen hasta abajo y a veces no se ven
    


## 📄 Licencia

MIT License - ver [package.json](package.json) para detalles.
# 🛣️ Plataforma Llantera

Sistema web integral para gestión de solicitudes, inventario, cotizaciones y operaciones de llantera con dashboards administrativos y de empleados.

## ✨ Características Principales

### 🏪 Para Clientes
- **🎯 Formulario wizard** para solicitudes de servicios
- **📋 Sistema de tracking** con códigos únicos
- **📱 Interfaz responsive** optimizada para móviles

### 👨‍💼 Dashboard Administrativo
- **📊 Gestión de solicitudes** con filtros y estadísticas
- **👥 Administración de empleados** con roles y permisos
- **💰 Sistema de cotizaciones** completo con PDF export
- **📦 Gestión de inventario** avanzada con códigos de barras
- **📅 Calendario** de servicios y citas
- **📈 Reportes** financieros y operativos
- **🔒 Reservas de stock** para cotizaciones
- **📊 Movimientos de inventario** con trazabilidad completa

### 🛠️ Dashboard de Empleados
- **📋 Solicitudes asignadas** con gestión de estados
- **💼 Interfaz simplificada** según rol
- **📝 Sistema de notas** y seguimiento

### 🏢 Portal de Proveedores
- **🔍 Acceso con código** de solicitud o cotización
- **📧 Envío automático** de cotizaciones por email
- **👁️ Visualización** de estado y progreso

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

### URLs Principales
- **Página principal**: http://localhost:3000
- **Tracker de solicitudes**: http://localhost:3000/tracker

### Panel Administrativo
- **Dashboard Admin**: http://localhost:3000/admin/dashboard
- **Gestión de Inventario**: http://localhost:3000/admin/inventario
- **Sistema de Cotizaciones**: http://localhost:3000/cotizaciones
- **Movimientos de Inventario**: http://localhost:3000/admin/movimientos
- **Reservas de Stock**: http://localhost:3000/admin/reservas

### Panel de Empleados
- **Login Empleados**: http://localhost:3000/empleado/login
- **Dashboard Empleados**: http://localhost:3000/empleado/dashboard

### Portal de Proveedores
- **Login Proveedores**: http://localhost:3000/proveedor/login
- **Dashboard Proveedores**: http://localhost:3000/proveedor/dashboard

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

### 🔐 Autenticación
- `POST /api/empleado/login` - Login de empleados
- `POST /api/empleado/logout` - Logout
- `GET /api/empleado/verify` - Verificar token
- `POST /api/proveedor/login` - Login de proveedores

### 📋 Solicitudes
- `GET /api/solicitudes` - Listar solicitudes
- `POST /api/solicitudes` - Crear solicitud
- `PUT /api/solicitudes/:id` - Actualizar solicitud
- `POST /api/solicitudes/:id/asignar` - Asignar a empleado
- `GET /api/solicitud/:codigo` - Buscar por código

### 👥 Empleados (Solo Admin)
- `GET /api/empleados` - Listar empleados
- `POST /api/empleados` - Crear empleado
- `PUT /api/empleados/:id` - Actualizar empleado
- `PUT /api/empleados/:id/toggle` - Activar/desactivar

### 💰 Cotizaciones
- `GET /api/cotizaciones` - Listar cotizaciones
- `POST /api/cotizaciones` - Crear cotización
- `PUT /api/cotizaciones/:id` - Actualizar cotización
- `POST /api/cotizaciones/:id/enviar` - Enviar por email
- `POST /api/cotizaciones/:id/aprobar` - Aprobar cotización
- `POST /api/cotizaciones/:id/rechazar` - Rechazar cotización

### 📦 Inventario
- `GET /api/inventario` - Listar productos
- `POST /api/inventario` - Crear producto
- `PUT /api/inventario/:id` - Actualizar producto
- `DELETE /api/inventario/:id` - Eliminar producto
- `POST /api/inventario/importar` - Importación masiva

### 📊 Movimientos de Inventario
- `GET /api/movimientos` - Listar movimientos
- `POST /api/movimientos` - Registrar movimiento

### 🔒 Reservas de Stock
- `GET /api/reservas` - Listar reservas
- `POST /api/reservas` - Crear reserva
- `PUT /api/reservas/:id` - Modificar reserva
- `POST /api/reservas/:id/usar` - Usar stock reservado
- `DELETE /api/reservas/:id` - Cancelar reserva

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

## 📈 Funcionalidades Avanzadas

### 💼 Sistema de Inventario
- **📊 Dashboard de métricas** con estadísticas en tiempo real
- **🏷️ Códigos de barras** automáticos para productos
- **📍 Ubicaciones de almacén** configurables
- **📁 Importación masiva** desde CSV/Excel
- **🔍 Búsqueda avanzada** por marca, modelo, medida
- **👁️ Vista dual** (tarjetas y tabla)
- **📋 Inventario físico** vs sistema

### 💰 Sistema de Cotizaciones
- **📝 Creación wizard** paso a paso
- **📧 Envío automático** por email con PDF
- **💾 Estados avanzados** (borrador, pendiente, aprobada, rechazada)
- **🔗 Integración** con inventario para reservas
- **📊 Reportes financieros** y estadísticas
- **🎯 Filtros inteligentes** por estado y cliente

### 📅 Calendario de Servicios
- **🗓️ Vista múltiple** (día, semana, mes)
- **🎨 Código de colores** por estado
- **➕ Gestión de citas** integrada
- **🔔 Recordatorios** automáticos

### 🔒 Gestión de Reservas
- **📦 Reserva de stock** para cotizaciones
- **⏰ Fechas límite** configurables
- **📈 Uso parcial** de reservas
- **🔄 Liberación automática** de stock vencido

## 🔄 Changelog Reciente

### v2.1.0 (Actual)
- ✅ Removida funcionalidad KPI (simplificación de interfaz)
- ✅ Unificación de menús de navegación
- ✅ Integración completa del botón calendario en todas las pantallas
- ✅ Documentación actualizada del README

### v2.0.0
- ✅ Sistema completo de inventario con códigos de barras
- ✅ Gestión avanzada de cotizaciones con PDF
- ✅ Portal de proveedores con acceso por código
- ✅ Sistema de reservas de stock
- ✅ Movimientos de inventario con trazabilidad
- ✅ Calendario de servicios integrado
- ✅ Reportes financieros

## 🚧 Mejoras Planificadas

- **🔍 Búsqueda mejorada**: Acceso con código de cotización en portal proveedor
- **⚠️ Validaciones UX**: Mensajes de error en posición superior
- **🏗️ Arquitectura**: Considerando migración a React para componentes reutilizables
- **🔄 Auto-refresh**: Limpiar filtros automáticamente después de operaciones
- **📊 Reportes avanzados**: Más métricas y análisis de rendimiento

## todo
- calendario, habilitar boton nueva cita
- despues de aprobar una soolicitud, que se marque en el calendario la cita


## 📄 Licencia

MIT License - ver [package.json](package.json) para detalles.
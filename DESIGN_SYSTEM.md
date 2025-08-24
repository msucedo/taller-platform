# 🎨 Design System - Taller Platform

## 📚 **Guía de Uso de Componentes Consistentes**

### 🎯 **Objetivo**
Mantener consistencia visual y funcional en toda la aplicación usando un sistema unificado de componentes.

---

## 🔘 **BOTONES**

### **Clases Base:**
```html
<!-- Botón base -->
<button class="btn">Botón</button>

<!-- Tamaños -->
<button class="btn btn-sm">Pequeño</button>      <!-- 32px altura -->
<button class="btn">Normal</button>              <!-- 44px altura -->
<button class="btn btn-lg">Grande</button>       <!-- 52px altura -->

<!-- Ancho completo -->
<button class="btn btn-block">Ancho completo</button>
```

### **Variantes de Color:**
```html
<button class="btn btn-primary">Primario</button>    <!-- Azul -->
<button class="btn btn-secondary">Secundario</button> <!-- Gris -->
<button class="btn btn-success">Éxito</button>       <!-- Verde -->
<button class="btn btn-warning">Advertencia</button> <!-- Amarillo -->
<button class="btn btn-danger">Peligro</button>      <!-- Rojo -->
<button class="btn btn-info">Información</button>    <!-- Cyan -->
```

### **Ejemplos de Uso:**
```html
<!-- Formularios -->
<button class="btn btn-success btn-block">Enviar Solicitud</button>

<!-- Exportar -->
<button class="btn btn-danger btn-sm">📄 PDF</button>
<button class="btn btn-success btn-sm">📊 Excel</button>

<!-- Acciones de tarjetas -->
<button class="btn btn-warning btn-sm">Editar</button>
<button class="btn btn-info btn-sm">Asignar</button>
<button class="btn btn-primary btn-sm">Ver Detalles</button>
```

---

## 🃏 **TARJETAS**

### **Estructura Base:**
```html
<div class="card card-pendiente">
  <div class="card-header">
    <h3 class="card-title">Título</h3>
    <div class="badge badge-pendiente">Pendiente</div>
  </div>
  
  <div class="card-body">
    <p><strong>Proveedor:</strong> Nombre del proveedor</p>
    <p><strong>Email:</strong> email@ejemplo.com</p>
    <p><strong>Descripción:</strong> Descripción del servicio...</p>
  </div>
  
  <div class="card-actions">
    <button class="btn btn-warning btn-sm">Editar</button>
    <button class="btn btn-info btn-sm">Asignar</button>
    <button class="btn btn-primary btn-sm">Ver</button>
  </div>
</div>
```

### **Estados de Tarjetas:**
```html
<div class="card card-pendiente">Pendiente</div>     <!-- Amarillo -->
<div class="card card-en_proceso">En Proceso</div>   <!-- Azul -->
<div class="card card-completado">Completado</div>   <!-- Verde -->
<div class="card card-rechazado">Rechazado</div>     <!-- Rojo -->
```

### **Tarjetas de Estadísticas:**
```html
<div class="stat-card">
  <span class="stat-number">42</span>
  <span class="stat-label">Total Solicitudes</span>
</div>
```

---

## 🏷️ **BADGES**

```html
<!-- Estados -->
<span class="badge badge-pendiente">Pendiente</span>
<span class="badge badge-en_proceso">En Proceso</span>
<span class="badge badge-completado">Completado</span>
<span class="badge badge-rechazado">Rechazado</span>

<!-- Estado de usuario -->
<span class="badge badge-activo">Activo</span>
<span class="badge badge-inactivo">Inactivo</span>
```

---

## 🎨 **PALETA DE COLORES**

### **CSS Variables:**
```css
--color-primary: #3498db      /* Azul principal */
--color-secondary: #95a5a6    /* Gris */
--color-success: #27ae60      /* Verde */
--color-warning: #f39c12      /* Amarillo */
--color-danger: #e74c3c       /* Rojo */
--color-info: #17a2b8         /* Cyan */
--color-dark: #2c3e50         /* Azul oscuro */
--color-light: #f8f9fa        /* Gris claro */
```

### **Cuando usar cada color:**
- **Primary (Azul):** Acciones principales, ver detalles
- **Success (Verde):** Enviar, guardar, completado, Excel
- **Warning (Amarillo):** Editar, pendiente, advertencias
- **Danger (Rojo):** Eliminar, rechazar, PDF
- **Info (Cyan):** Asignar, información adicional
- **Secondary (Gris):** Cancelar, limpiar, acciones secundarias

---

## 📏 **ESPACIADO**

```css
--spacing-xs: 4px      /* Muy pequeño */
--spacing-sm: 8px      /* Pequeño */
--spacing-base: 16px   /* Normal */
--spacing-lg: 24px     /* Grande */
--spacing-xl: 32px     /* Muy grande */
--spacing-xxl: 48px    /* Extra grande */
```

---

## 📱 **RESPONSIVO**

Todos los componentes incluyen:
- Touch targets de 44px mínimo en móvil
- Font size 16px para evitar zoom en iOS
- Botones full-width en pantallas pequeñas
- Espaciado reducido en móvil

---

## ✅ **MIGRACIÓN PASO A PASO**

### **1. Reemplazar botones existentes:**
```html
<!-- ANTES -->
<button class="btn-submit">Enviar</button>
<button class="btn-edit">Editar</button>
<button class="btn-pdf">PDF</button>

<!-- DESPUÉS -->
<button class="btn btn-success btn-block">Enviar</button>
<button class="btn btn-warning btn-sm">Editar</button>  
<button class="btn btn-danger btn-sm">📄 PDF</button>
```

### **2. Actualizar tarjetas:**
```html
<!-- ANTES -->
<div class="solicitud-card pendiente">
  <div class="solicitud-header">
    <h3>Título</h3>
    <span class="estado-badge pendiente">Pendiente</span>
  </div>
  <div class="solicitud-body">...</div>
  <div class="solicitud-actions">...</div>
</div>

<!-- DESPUÉS -->
<div class="card card-pendiente">
  <div class="card-header">
    <h3 class="card-title">Título</h3>
    <span class="badge badge-pendiente">Pendiente</span>
  </div>
  <div class="card-body">...</div>
  <div class="card-actions">...</div>
</div>
```

### **3. JavaScript - generar tarjetas:**
```javascript
// Template unificado para todas las pantallas
function crearTarjetaSolicitud(solicitud) {
  return `
    <div class="card card-${solicitud.estado}">
      <div class="card-header">
        <div>
          <h3 class="card-title">${solicitud.nombre_proveedor}</h3>
          <p class="card-subtitle">${solicitud.tracker_code}</p>
        </div>
        <span class="badge badge-${solicitud.estado}">${solicitud.estado}</span>
      </div>
      
      <div class="card-body">
        <p><strong>Email:</strong> ${solicitud.email_proveedor}</p>
        <p><strong>Descripción:</strong> ${solicitud.descripcion_problema}</p>
      </div>
      
      <div class="card-actions">
        <button class="btn btn-warning btn-sm" onclick="editarSolicitud(${solicitud.id})">Editar</button>
        <button class="btn btn-info btn-sm" onclick="asignarSolicitud(${solicitud.id})">Asignar</button>
        <button class="btn btn-primary btn-sm" onclick="verDetalle('${solicitud.tracker_code}')">Ver</button>
      </div>
    </div>
  `;
}
```

---

## 🔧 **HERRAMIENTAS DE DESARROLLO**

### **Verificar consistencia:**
1. Todos los botones deben tener clase `btn`
2. Todas las tarjetas deben usar `card`
3. Usar variables CSS en lugar de colores hardcodeados
4. Verificar responsive en móvil

### **Comando para buscar inconsistencias:**
```bash
# Buscar botones sin la clase base
grep -r "btn-" --include="*.html" --include="*.js" | grep -v "btn btn-"

# Buscar colores hardcodeados
grep -r "#[0-9a-fA-F]\{6\}" --include="*.css" | grep -v "var("
```

---

**🎯 Resultado:** Una aplicación visualmente consistente, fácil de mantener y con excelente UX en todos los dispositivos.
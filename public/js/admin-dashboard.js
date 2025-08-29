let solicitudes = [];
let solicitudesFiltradas = [];
let empleados = [];
let currentTab = 'solicitudes';

document.addEventListener('DOMContentLoaded', function() {
    AppUtils.cargarVersion();
    verificarAutenticacion();
    
    // Event listeners para filtros
    const filtroEstado = document.getElementById('filtroEstado');
    const filtroServicio = document.getElementById('filtroServicio');
    const filtroAsignacion = document.getElementById('filtroAsignacion');
    const buscadorSolicitudes = document.getElementById('buscadorSolicitudes');
    
    filtroEstado.addEventListener('change', filtrarSolicitudes);
    filtroServicio.addEventListener('change', filtrarSolicitudes);
    filtroAsignacion.addEventListener('change', filtrarSolicitudes);
    buscadorSolicitudes.addEventListener('input', filtrarSolicitudes);
    
    // Event listener para el formulario de editar
    document.getElementById('editarForm').addEventListener('submit', guardarEdicion);
    
    // Event listener para el formulario de empleado
    document.getElementById('empleadoForm').addEventListener('submit', guardarEmpleado);
    
    // Event listener para el formulario de asignación
    document.getElementById('asignarForm').addEventListener('submit', confirmarAsignacion);
    
    // Cerrar modales al hacer clic fuera
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                cerrarModal(modal.id);
            }
        });
    });
    
    // Cerrar modales con Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal:not(.hidden)').forEach(modal => {
                cerrarModal(modal.id);
            });
        }
    });
    
    loadSolicitudes();
    
    // Handle hash navigation for direct links
    handleHashNavigation();
});

function handleHashNavigation() {
    const hash = window.location.hash.substring(1); // Remove the #
    if (hash && ['empleados', 'reportes', 'configuracion'].includes(hash)) {
        showTab(hash);
    }
}

function verificarAutenticacion() {
    const token = localStorage.getItem('empleadoToken');
    const empleadoData = JSON.parse(localStorage.getItem('empleadoData') || '{}');
    
    if (!token || empleadoData.rol !== 'admin') {
        window.location.href = '/empleado/login';
        return;
    }
    
    document.getElementById('welcomeMessage').textContent = `Bienvenido, ${empleadoData.nombre}`;
    
    // Verificar token válido
    fetch('/api/empleado/verify', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => {
        if (!response.ok) {
            localStorage.removeItem('empleadoToken');
            localStorage.removeItem('empleadoData');
            window.location.href = '/empleado/login';
        }
    })
    .catch(() => {
        localStorage.removeItem('empleadoToken');
        localStorage.removeItem('empleadoData');
        window.location.href = '/empleado/login';
    });
}

function showTab(tabName) {
    // Actualizar botones
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Mostrar contenido
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    const tabElement = document.getElementById(`tab-${tabName}`);
    if (tabElement) {
        tabElement.classList.add('active');
    }
    
    currentTab = tabName;
    
    // Cargar datos según el tab
    if (tabName === 'empleados') {
        loadEmpleados();
    } else if (tabName === 'reportes') {
        loadReportes();
    } else if (tabName === 'configuracion') {
        loadConfiguracion();
    }
}

async function loadSolicitudes() {
    try {
        const response = await fetch('/api/solicitudes');
        solicitudes = await response.json();
        solicitudesFiltradas = solicitudes;
        
        mostrarEstadisticas();
        mostrarSolicitudes(solicitudes);
    } catch (error) {
        console.error('Error al cargar solicitudes:', error);
        AppUtils.mostrarMensaje('Error al cargar las solicitudes', 'error');
    }
}

function mostrarEstadisticas() {
    const total = solicitudes.length;
    const pendientes = solicitudes.filter(s => s.estado === 'pendiente').length;
    const proceso = solicitudes.filter(s => s.estado === 'en_proceso').length;
    const completado = solicitudes.filter(s => s.estado === 'completado').length;
    const rechazado = solicitudes.filter(s => s.estado === 'rechazado').length;
    
    document.getElementById('totalSolicitudes').textContent = total;
    document.getElementById('pendientesCount').textContent = pendientes;
    document.getElementById('procesoCount').textContent = proceso;
    document.getElementById('completadoCount').textContent = completado;
    document.getElementById('rechazadoCount').textContent = rechazado;
}

function mostrarSolicitudes(solicitudesList) {
    const container = document.getElementById('solicitudesContainer');
    
    if (solicitudesList.length === 0) {
        container.innerHTML = '<div class="no-data">No hay solicitudes para mostrar</div>';
        return;
    }
    
    const html = solicitudesList.map(solicitud => `
        <div class="card card-${solicitud.estado}">
            <div class="card-header">
                <div class="solicitud-info">
                    <h3 class="card-title">${solicitud.proveedor_nombre}</h3>
                    <span class="card-subtitle">📋 ${solicitud.tracker_code}</span>
                </div>
                <span class="badge badge-${solicitud.estado}">${solicitud.estado.toUpperCase()}</span>
            </div>
            <div class="card-body">
                <p><strong>Servicio:</strong> ${solicitud.tipo_servicio}</p>
                <p><strong>Email:</strong> ${solicitud.proveedor_email}</p>
                ${solicitud.proveedor_telefono ? `<p><strong>Teléfono:</strong> ${solicitud.proveedor_telefono}</p>` : ''}
                ${solicitud.empresa ? `<p><strong>Empresa:</strong> ${solicitud.empresa}</p>` : ''}
                <p><strong>Urgencia:</strong> ${solicitud.urgencia}</p>
                <p><strong>Descripción:</strong> ${solicitud.descripcion}</p>
                <p><strong>Fecha:</strong> ${AppUtils.formatearFecha(solicitud.fecha_solicitud)}</p>
                ${solicitud.fecha_preferida ? `<p><strong>Fecha Preferida:</strong> ${AppUtils.formatearFecha(solicitud.fecha_preferida)}</p>` : ''}
                ${solicitud.presupuesto_estimado ? `<p><strong>Presupuesto:</strong> ${solicitud.presupuesto_estimado}</p>` : ''}
                ${solicitud.notas_taller ? `<p><strong>Notas:</strong> ${solicitud.notas_taller}</p>` : ''}
                ${solicitud.empleado_asignado ? `<p><strong>Asignado a:</strong> ${solicitud.empleado_asignado} (${solicitud.empleado_rol})</p>` : '<p><strong>Estado:</strong> Sin asignar</p>'}
                ${solicitud.notas_asignacion ? `<p><strong>Notas de asignación:</strong> ${solicitud.notas_asignacion}</p>` : ''}
            </div>
            <div class="card-actions">
                <button onclick="editarSolicitud(${solicitud.id})" class="btn btn-warning btn-sm">Editar</button>
                <button onclick="asignarSolicitud(${solicitud.id})" class="btn btn-info btn-sm">${solicitud.empleado_asignado ? 'Reasignar' : 'Asignar'}</button>
                <button onclick="verDetalleTracker('${solicitud.tracker_code}')" class="btn btn-primary btn-sm">Ver Tracker</button>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = html;
}

function filtrarSolicitudes() {
    const filtroEstado = document.getElementById('filtroEstado').value;
    const filtroServicio = document.getElementById('filtroServicio').value;
    const filtroAsignacion = document.getElementById('filtroAsignacion').value;
    const terminoBusqueda = document.getElementById('buscadorSolicitudes').value.toLowerCase().trim();
    
    solicitudesFiltradas = solicitudes;
    
    if (filtroEstado) {
        solicitudesFiltradas = solicitudesFiltradas.filter(s => s.estado === filtroEstado);
    }
    
    if (filtroServicio) {
        solicitudesFiltradas = solicitudesFiltradas.filter(s => s.tipo_servicio === filtroServicio);
    }
    
    if (terminoBusqueda) {
        solicitudesFiltradas = solicitudesFiltradas.filter(s => 
            s.proveedor_nombre.toLowerCase().includes(terminoBusqueda) ||
            s.proveedor_email.toLowerCase().includes(terminoBusqueda) ||
            s.descripcion.toLowerCase().includes(terminoBusqueda) ||
            (s.proveedor_telefono && s.proveedor_telefono.includes(terminoBusqueda)) ||
            (s.notas_taller && s.notas_taller.toLowerCase().includes(terminoBusqueda))
        );
    }
    
    mostrarSolicitudes(solicitudesFiltradas);
}

function limpiarBusqueda() {
    document.getElementById('buscadorSolicitudes').value = '';
    document.getElementById('filtroEstado').value = '';
    document.getElementById('filtroServicio').value = '';
    document.getElementById('filtroAsignacion').value = '';
    filtrarSolicitudes();
}

function editarSolicitud(id) {
    const solicitud = solicitudes.find(s => s.id === id);
    if (!solicitud) return;
    
    document.getElementById('editarId').value = id;
    document.getElementById('editarEstado').value = solicitud.estado;
    document.getElementById('editarNotas').value = solicitud.notas_taller || '';
    
    document.getElementById('modalEditarSolicitud').classList.remove('hidden');
}

async function guardarEdicion(e) {
    e.preventDefault();
    
    const id = document.getElementById('editarId').value;
    const estado = document.getElementById('editarEstado').value;
    const notas_taller = document.getElementById('editarNotas').value;
    
    try {
        const response = await fetch(`/api/solicitudes/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ estado, notas_taller })
        });
        
        if (response.ok) {
            cerrarModal('modalEditarSolicitud');
            loadSolicitudes();
            AppUtils.mostrarMensaje('Solicitud actualizada exitosamente', 'success');
        } else {
            AppUtils.mostrarMensaje('Error al actualizar la solicitud', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        AppUtils.mostrarMensaje('Error de conexión', 'error');
    }
}

async function asignarSolicitud(id) {
    const solicitud = solicitudes.find(s => s.id === id);
    if (!solicitud) {
        AppUtils.mostrarMensaje('Solicitud no encontrada', 'error');
        return;
    }
    
    try {
        await loadEmpleados();
        mostrarModalAsignacion(id, solicitud);
    } catch (error) {
        console.error('Error cargando empleados:', error);
        AppUtils.mostrarMensaje('Error al cargar empleados', 'error');
    }
}

function mostrarModalAsignacion(id, solicitud) {
    const empleadosActivos = empleados.filter(emp => emp.activo && emp.rol !== 'admin');
    
    if (empleadosActivos.length === 0) {
        AppUtils.mostrarMensaje('No hay empleados disponibles para asignar', 'error');
        return;
    }

    const optionsHTML = empleadosActivos.map(emp => 
        `<option value="${emp.id}">${emp.nombre} (${emp.rol})</option>`
    ).join('');

    document.getElementById('asignarSolicitudId').value = id;
    document.getElementById('asignarDetalle').innerHTML = `
        <strong>Solicitud #${solicitud.tracker_code}</strong><br>
        <strong>Cliente:</strong> ${solicitud.proveedor_nombre}<br>
        <strong>Servicio:</strong> ${solicitud.tipo_servicio}<br>
        <strong>Urgencia:</strong> ${solicitud.urgencia}
    `;
    document.getElementById('empleadoAsignado').innerHTML = `
        <option value="">Seleccionar empleado...</option>
        ${optionsHTML}
    `;

    abrirModal('modalAsignarSolicitud');
}

async function confirmarAsignacion(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const solicitudId = document.getElementById('asignarSolicitudId').value;
    const empleadoId = formData.get('empleadoId');
    const notas = formData.get('notas');
    
    if (!empleadoId) {
        AppUtils.mostrarMensaje('Debe seleccionar un empleado', 'error');
        return;
    }

    try {
        const token = localStorage.getItem('empleadoToken');
        const response = await fetch(`/api/solicitudes/${solicitudId}/asignar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                empleadoId: parseInt(empleadoId),
                notas: notas
            })
        });

        if (response.ok) {
            const result = await response.json();
            AppUtils.mostrarMensaje('Solicitud asignada correctamente', 'success');
            cerrarModal('modalAsignarSolicitud');
            loadSolicitudes(); // Recargar solicitudes para ver cambios
        } else {
            const error = await response.json();
            AppUtils.mostrarMensaje(error.error || 'Error al asignar solicitud', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        AppUtils.mostrarMensaje('Error de conexión al asignar solicitud', 'error');
    }
}

function verDetalleTracker(trackerCode) {
    window.open(`/tracker?code=${trackerCode}`, '_blank');
}

async function loadEmpleados() {
    try {
        const token = localStorage.getItem('empleadoToken');
        const response = await fetch('/api/empleados', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            empleados = await response.json();
            if (currentTab === 'empleados') {
                mostrarEmpleados();
            }
            return empleados;
        } else {
            AppUtils.mostrarMensaje('Error al cargar empleados', 'error');
            return [];
        }
    } catch (error) {
        console.error('Error:', error);
        AppUtils.mostrarMensaje('Error de conexión al cargar empleados', 'error');
        return [];
    }
}

function mostrarEmpleados() {
    const container = document.getElementById('empleadosContainer');
    
    if (empleados.length === 0) {
        container.innerHTML = '<div class="no-data">No hay empleados registrados</div>';
        return;
    }
    
    const html = empleados.map(empleado => `
        <div class="empleado-card">
            <div class="empleado-header">
                <div class="empleado-info">
                    <h3>${empleado.nombre}</h3>
                    <p>${empleado.email}</p>
                </div>
                <span class="rol-badge ${empleado.rol}">${empleado.rol.toUpperCase()}</span>
            </div>
            <div class="empleado-actions">
                <span class="empleado-status ${empleado.activo ? 'activo' : 'inactivo'}">
                    ${empleado.activo ? '✅ Activo' : '❌ Inactivo'}
                </span>
                <div class="empleado-buttons">
                    <button onclick="editarEmpleado(${empleado.id})" class="btn-edit">Editar</button>
                    <button onclick="toggleEmpleado(${empleado.id}, ${!empleado.activo})" class="btn-toggle">
                        ${empleado.activo ? 'Desactivar' : 'Activar'}
                    </button>
                </div>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = html;
}

function mostrarFormularioEmpleado(empleado = null) {
    document.getElementById('empleadoModalTitle').textContent = empleado ? 'Editar Empleado' : 'Nuevo Empleado';
    
    if (empleado) {
        document.getElementById('empleadoNombre').value = empleado.nombre;
        document.getElementById('empleadoEmail').value = empleado.email;
        document.getElementById('empleadoPassword').value = '';
        document.getElementById('empleadoPassword').placeholder = 'Dejar vacío para mantener actual';
        document.getElementById('empleadoRol').value = empleado.rol;
        document.getElementById('empleadoForm').dataset.empleadoId = empleado.id;
    } else {
        document.getElementById('empleadoForm').reset();
        document.getElementById('empleadoPassword').placeholder = '';
        delete document.getElementById('empleadoForm').dataset.empleadoId;
    }
    
    document.getElementById('modalEmpleado').classList.remove('hidden');
}

async function guardarEmpleado(e) {
    e.preventDefault();
    
    const form = e.target;
    const empleadoId = form.dataset.empleadoId;
    const isEdit = !!empleadoId;
    
    const data = {
        nombre: document.getElementById('empleadoNombre').value,
        email: document.getElementById('empleadoEmail').value,
        password: document.getElementById('empleadoPassword').value,
        rol: document.getElementById('empleadoRol').value
    };
    
    // Si es edición y password está vacío, no enviarlo
    if (isEdit && !data.password) {
        delete data.password;
    }
    
    try {
        const token = localStorage.getItem('empleadoToken');
        const url = isEdit ? `/api/empleados/${empleadoId}` : '/api/empleados';
        const method = isEdit ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            cerrarModal('modalEmpleado');
            loadEmpleados();
            AppUtils.mostrarMensaje(`Empleado ${isEdit ? 'actualizado' : 'creado'} exitosamente`, 'success');
        } else {
            const result = await response.json();
            AppUtils.mostrarMensaje(result.error || 'Error al guardar empleado', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        AppUtils.mostrarMensaje('Error de conexión', 'error');
    }
}

function editarEmpleado(id) {
    const empleado = empleados.find(e => e.id === id);
    if (empleado) {
        mostrarFormularioEmpleado(empleado);
    }
}

async function toggleEmpleado(id, activo) {
    try {
        const token = localStorage.getItem('empleadoToken');
        const response = await fetch(`/api/empleados/${id}/toggle`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ activo })
        });
        
        if (response.ok) {
            loadEmpleados();
            AppUtils.mostrarMensaje(`Empleado ${activo ? 'activado' : 'desactivado'} exitosamente`, 'success');
        } else {
            AppUtils.mostrarMensaje('Error al cambiar estado del empleado', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        AppUtils.mostrarMensaje('Error de conexión', 'error');
    }
}

function abrirModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function cerrarModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

function cerrarSesion() {
    // Usar el servicio centralizado de autenticación
    AuthService.logout();
}

function irAInventario() {
    const token = localStorage.getItem('empleadoToken');
    const empleadoData = JSON.parse(localStorage.getItem('empleadoData') || '{}');
    
    if (!token || empleadoData.rol !== 'admin') {
        AppUtils.mostrarMensaje('No tiene permisos para acceder al inventario', 'error');
        return;
    }
    
    // Navegar a la página de inventario
    window.location.href = '/admin/inventario';
}

function irACotizaciones() {
    const token = localStorage.getItem('empleadoToken');
    const empleadoData = JSON.parse(localStorage.getItem('empleadoData') || '{}');
    
    if (!token || empleadoData.rol !== 'admin') {
        AppUtils.mostrarMensaje('No tiene permisos para acceder a cotizaciones', 'error');
        return;
    }
    
    // Navegar a la página de cotizaciones
    window.location.href = '/cotizaciones';
}



// Funciones de exportación (heredadas del dashboard original)
function exportarPDF() {
    if (solicitudesFiltradas.length === 0) {
        AppUtils.mostrarMensaje('No hay solicitudes para exportar', 'error');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Configuración
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;
    let yPosition = 30;
    
    // Título
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text('Reporte de Solicitudes - Llantera', margin, yPosition);
    
    yPosition += 10;
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.text(`Fecha de generación: ${new Date().toLocaleDateString('es-ES')}`, margin, yPosition);
    doc.text(`Total de solicitudes: ${solicitudesFiltradas.length}`, margin, yPosition + 7);
    
    yPosition += 25;
    
    // Iterar sobre las solicitudes
    solicitudesFiltradas.forEach((solicitud, index) => {
        // Verificar si necesitamos una nueva página
        if (yPosition > 250) {
            doc.addPage();
            yPosition = 30;
        }
        
        // Encabezado de solicitud
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text(`${index + 1}. ${solicitud.proveedor_nombre}`, margin, yPosition);
        
        // Estado
        const estadoColor = getEstadoColor(solicitud.estado);
        doc.setTextColor(estadoColor.r, estadoColor.g, estadoColor.b);
        doc.text(`[${solicitud.estado.toUpperCase()}]`, pageWidth - 60, yPosition);
        doc.setTextColor(0, 0, 0);
        
        yPosition += 10;
        
        // Detalles
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        
        const details = [
            `Email: ${solicitud.proveedor_email}`,
            `Teléfono: ${solicitud.proveedor_telefono || 'No especificado'}`,
            `Servicio: ${solicitud.tipo_servicio}`,
            `Urgencia: ${solicitud.urgencia}`,
            `Fecha: ${AppUtils.formatearFecha(solicitud.fecha_solicitud)}`,
            `Descripción: ${solicitud.descripcion}`,
        ];
        
        if (solicitud.notas_taller) {
            details.push(`Notas: ${solicitud.notas_taller}`);
        }
        
        details.forEach(detail => {
            doc.text(detail, margin + 5, yPosition);
            yPosition += 5;
        });
        
        yPosition += 10;
        
        // Línea separadora
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 10;
    });
    
    // Guardar el PDF
    const fecha = new Date().toISOString().split('T')[0];
    doc.save(`solicitudes-admin-${fecha}.pdf`);
}

function exportarExcel() {
    if (solicitudesFiltradas.length === 0) {
        AppUtils.mostrarMensaje('No hay solicitudes para exportar', 'error');
        return;
    }
    
    // Preparar datos para Excel
    const excelData = solicitudesFiltradas.map(solicitud => ({
        'ID': solicitud.id,
        'Código Tracker': solicitud.tracker_code,
        'Proveedor': solicitud.proveedor_nombre,
        'Email': solicitud.proveedor_email,
        'Teléfono': solicitud.proveedor_telefono || '',
        'Empresa': solicitud.empresa || '',
        'Servicio': solicitud.tipo_servicio,
        'Descripción': solicitud.descripcion,
        'Urgencia': solicitud.urgencia,
        'Estado': solicitud.estado,
        'Fecha Solicitud': AppUtils.formatearFecha(solicitud.fecha_solicitud),
        'Fecha Preferida': solicitud.fecha_preferida ? AppUtils.formatearFecha(solicitud.fecha_preferida) : '',
        'Presupuesto': solicitud.presupuesto_estimado || '',
        'Notas Taller': solicitud.notas_taller || ''
    }));
    
    // Crear el workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);
    
    // Ajustar ancho de columnas
    const colWidths = [
        { wch: 5 },   // ID
        { wch: 10 },  // Tracker
        { wch: 20 },  // Proveedor
        { wch: 25 },  // Email
        { wch: 15 },  // Teléfono
        { wch: 20 },  // Empresa
        { wch: 15 },  // Servicio
        { wch: 40 },  // Descripción
        { wch: 10 },  // Urgencia
        { wch: 12 },  // Estado
        { wch: 20 },  // Fecha
        { wch: 20 },  // Fecha Pref
        { wch: 15 },  // Presupuesto
        { wch: 30 }   // Notas
    ];
    ws['!cols'] = colWidths;
    
    // Agregar la hoja al workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Solicitudes');
    
    // Guardar el archivo
    const fecha = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `solicitudes-admin-${fecha}.xlsx`);
}

function getEstadoColor(estado) {
    const colores = {
        'pendiente': { r: 243, g: 156, b: 18 },    // naranja
        'en_proceso': { r: 52, g: 152, b: 219 },   // azul
        'completado': { r: 39, g: 174, b: 96 },    // verde
        'rechazado': { r: 231, g: 76, b: 60 }      // rojo
    };
    return colores[estado] || { r: 0, g: 0, b: 0 };
}

function loadReportes() {
    console.log('Cargando reportes...');
    
    try {
        // Verificar que solicitudes esté definido
        if (!solicitudes || !Array.isArray(solicitudes)) {
            console.log('Solicitudes no cargadas aún, usando datos vacíos');
            return;
        }
        
        // Generar estadísticas básicas
        const estadisticas = {
            totalSolicitudes: solicitudes.length,
            solicitudesPorEstado: {
                pendiente: solicitudes.filter(s => s.estado === 'pendiente').length,
                en_proceso: solicitudes.filter(s => s.estado === 'en_proceso').length,
                completado: solicitudes.filter(s => s.estado === 'completado').length,
                rechazado: solicitudes.filter(s => s.estado === 'rechazado').length
            },
            solicitudesPorServicio: {}
        };
        
        // Contar por tipo de servicio
        solicitudes.forEach(s => {
            if (s.tipo_servicio) {
                estadisticas.solicitudesPorServicio[s.tipo_servicio] = 
                    (estadisticas.solicitudesPorServicio[s.tipo_servicio] || 0) + 1;
            }
        });
        
        // Actualizar los botones de reportes con funcionalidad real solo si existen
        const reporteCards = document.querySelectorAll('#tab-reportes .reporte-card button');
        if (reporteCards.length >= 4) {
            reporteCards[0].onclick = () => generarReporteSolicitudesPorMes();
            reporteCards[1].onclick = () => generarReporteProveedoresActivos();
            reporteCards[2].onclick = () => generarReporteTiemposRespuesta();
            reporteCards[3].onclick = () => generarReporteServiciosMasSolicitados();
        }
        
        console.log('Reportes cargados correctamente');
    } catch (error) {
        console.error('Error en loadReportes:', error);
    }
}

function loadConfiguracion() {
    console.log('Cargando configuración...');
    
    try {
        // Actualizar los botones de configuración con funcionalidad real solo si existen
        const configCards = document.querySelectorAll('#tab-configuracion .config-card button');
        if (configCards.length >= 4) {
            configCards[0].onclick = () => editarPerfil();
            configCards[1].onclick = () => configurarLlantera();
            configCards[2].onclick = () => gestionarTiposServicio();
            configCards[3].onclick = () => respaldarDatos();
        }
        
        console.log('Configuración cargada correctamente');
    } catch (error) {
        console.error('Error en loadConfiguracion:', error);
    }
}

// Funciones de reportes
function generarReporteSolicitudesPorMes() {
    if (!solicitudes || !Array.isArray(solicitudes)) {
        AppUtils.mostrarMensaje('No hay datos de solicitudes disponibles', 'warning');
        return;
    }
    
    const reporteData = {};
    solicitudes.forEach(s => {
        const mes = new Date(s.fecha_solicitud).toLocaleDateString('es-ES', { 
            year: 'numeric', 
            month: 'long' 
        });
        reporteData[mes] = (reporteData[mes] || 0) + 1;
    });
    
    console.log('Reporte solicitudes por mes:', reporteData);
    AppUtils.mostrarMensaje(`Reporte generado: ${Object.keys(reporteData).length} meses analizados`, 'info');
}

function generarReporteProveedoresActivos() {
    if (!solicitudes || !Array.isArray(solicitudes)) {
        AppUtils.mostrarMensaje('No hay datos de solicitudes disponibles', 'warning');
        return;
    }
    
    const proveedores = {};
    solicitudes.forEach(s => {
        const key = `${s.proveedor_nombre} (${s.proveedor_email})`;
        proveedores[key] = (proveedores[key] || 0) + 1;
    });
    
    const topProveedores = Object.entries(proveedores)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10);
    
    console.log('Top 10 proveedores más activos:', topProveedores);
    AppUtils.mostrarMensaje(`Reporte generado: Top ${topProveedores.length} proveedores identificados`, 'info');
}

function generarReporteTiemposRespuesta() {
    if (!solicitudes || !Array.isArray(solicitudes)) {
        AppUtils.mostrarMensaje('No hay datos de solicitudes disponibles', 'warning');
        return;
    }
    
    const tiempos = solicitudes
        .filter(s => s.estado === 'completado')
        .map(s => {
            const inicio = new Date(s.fecha_solicitud);
            const fin = new Date(); // Simplificado - debería usar fecha_completado
            return Math.ceil((fin - inicio) / (1000 * 60 * 60 * 24)); // días
        });
    
    const promedio = tiempos.length > 0 ? 
        Math.round(tiempos.reduce((a, b) => a + b, 0) / tiempos.length) : 0;
    
    console.log('Análisis tiempos de respuesta:', { tiempos, promedio });
    AppUtils.mostrarMensaje(`Reporte generado: Tiempo promedio ${promedio} días`, 'info');
}

function generarReporteServiciosMasSolicitados() {
    if (!solicitudes || !Array.isArray(solicitudes)) {
        AppUtils.mostrarMensaje('No hay datos de solicitudes disponibles', 'warning');
        return;
    }
    
    const servicios = {};
    solicitudes.forEach(s => {
        servicios[s.tipo_servicio] = (servicios[s.tipo_servicio] || 0) + 1;
    });
    
    const topServicios = Object.entries(servicios)
        .sort(([,a], [,b]) => b - a);
    
    console.log('Servicios más solicitados:', topServicios);
    AppUtils.mostrarMensaje(`Reporte generado: ${topServicios.length} tipos de servicio analizados`, 'info');
}

// Funciones de configuración
function editarPerfil() {
    const empleadoData = JSON.parse(localStorage.getItem('empleadoData') || '{}');
    AppUtils.mostrarMensaje(`Editando perfil de: ${empleadoData.nombre}`, 'info');
    // Aquí se podría abrir un modal para editar perfil
}

function configurarLlantera() {
    AppUtils.mostrarMensaje('Configuración de llantera - Funcionalidad en desarrollo', 'info');
    // Aquí se podría abrir un modal para configurar datos de la llantera
}

function gestionarTiposServicio() {
    const tiposActuales = ['repuestos', 'herramientas', 'pintura', 'grua', 'mecanico', 'otros'];
    console.log('Tipos de servicio actuales:', tiposActuales);
    AppUtils.mostrarMensaje(`Gestión de tipos de servicio - ${tiposActuales.length} tipos disponibles`, 'info');
    // Aquí se podría abrir un modal para gestionar tipos de servicio
}

function respaldarDatos() {
    AppUtils.mostrarMensaje('Iniciando respaldo de datos...', 'info');
    setTimeout(() => {
        AppUtils.mostrarMensaje('Respaldo completado (simulado)', 'success');
    }, 2000);
    // Aquí se podría implementar un respaldo real de la base de datos
}


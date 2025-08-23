let solicitudes = [];
let solicitudesFiltradas = [];

document.addEventListener('DOMContentLoaded', function() {
    loadSolicitudes();
    
    const filtroEstado = document.getElementById('filtroEstado');
    const filtroServicio = document.getElementById('filtroServicio');
    const buscadorSolicitudes = document.getElementById('buscadorSolicitudes');
    
    filtroEstado.addEventListener('change', filtrarSolicitudes);
    filtroServicio.addEventListener('change', filtrarSolicitudes);
    buscadorSolicitudes.addEventListener('input', filtrarSolicitudes);
    
    const editarForm = document.getElementById('editarForm');
    editarForm.addEventListener('submit', guardarEdicion);
    
    // Asegurar que el modal esté cerrado al cargar la página
    const modal = document.getElementById('modalEditarSolicitud');
    modal.classList.add('hidden');
    
    // Cerrar modal al hacer clic fuera de él
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            cerrarModal();
        }
    });
    
    // Cerrar modal con tecla Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
            cerrarModal();
        }
    });
});

async function loadSolicitudes() {
    try {
        const response = await fetch('/api/solicitudes');
        solicitudes = await response.json();
        solicitudesFiltradas = solicitudes;
        mostrarSolicitudes(solicitudes);
    } catch (error) {
        console.error('Error al cargar solicitudes:', error);
        document.getElementById('solicitudesContainer').innerHTML = 
            '<div class="error">Error al cargar las solicitudes</div>';
    }
}

function mostrarSolicitudes(solicitudesList) {
    const container = document.getElementById('solicitudesContainer');
    
    if (solicitudesList.length === 0) {
        container.innerHTML = '<div class="no-data">No hay solicitudes</div>';
        return;
    }
    
    const html = solicitudesList.map(solicitud => `
        <div class="solicitud-card ${solicitud.estado}">
            <div class="solicitud-header">
                <h3>${solicitud.proveedor_nombre}</h3>
                <span class="estado-badge ${solicitud.estado}">${solicitud.estado.toUpperCase()}</span>
            </div>
            <div class="solicitud-body">
                <p><strong>Servicio:</strong> ${solicitud.tipo_servicio}</p>
                <p><strong>Email:</strong> ${solicitud.proveedor_email}</p>
                ${solicitud.proveedor_telefono ? `<p><strong>Teléfono:</strong> ${solicitud.proveedor_telefono}</p>` : ''}
                <p><strong>Urgencia:</strong> ${solicitud.urgencia}</p>
                <p><strong>Descripción:</strong> ${solicitud.descripcion}</p>
                <p><strong>Fecha:</strong> ${formatDate(solicitud.fecha_solicitud)}</p>
                ${solicitud.notas_taller ? `<p><strong>Notas:</strong> ${solicitud.notas_taller}</p>` : ''}
            </div>
            <div class="solicitud-actions">
                <button onclick="editarSolicitud(${solicitud.id})" class="btn-edit">Editar</button>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = html;
}

function filtrarSolicitudes() {
    const filtroEstado = document.getElementById('filtroEstado').value;
    const filtroServicio = document.getElementById('filtroServicio').value;
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

function editarSolicitud(id) {
    const solicitud = solicitudes.find(s => s.id === id);
    if (!solicitud) return;
    
    document.getElementById('editarId').value = id;
    document.getElementById('editarEstado').value = solicitud.estado;
    document.getElementById('editarNotas').value = solicitud.notas_taller || '';
    
    document.getElementById('modalEditarSolicitud').classList.remove('hidden');
}

function cerrarModal() {
    document.getElementById('modalEditarSolicitud').classList.add('hidden');
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
            cerrarModal();
            loadSolicitudes();
        } else {
            alert('Error al actualizar la solicitud');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error de conexión');
    }
}

function limpiarBusqueda() {
    document.getElementById('buscadorSolicitudes').value = '';
    document.getElementById('filtroEstado').value = '';
    document.getElementById('filtroServicio').value = '';
    filtrarSolicitudes();
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES') + ' ' + date.toLocaleTimeString('es-ES');
}

function exportarPDF() {
    if (solicitudesFiltradas.length === 0) {
        alert('No hay solicitudes para exportar');
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
    doc.text('Reporte de Solicitudes - Taller Mecánico', margin, yPosition);
    
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
            `Fecha: ${formatDate(solicitud.fecha_solicitud)}`,
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
    doc.save(`solicitudes-taller-${fecha}.pdf`);
}

function exportarExcel() {
    if (solicitudesFiltradas.length === 0) {
        alert('No hay solicitudes para exportar');
        return;
    }
    
    // Preparar datos para Excel
    const excelData = solicitudesFiltradas.map(solicitud => ({
        'ID': solicitud.id,
        'Proveedor': solicitud.proveedor_nombre,
        'Email': solicitud.proveedor_email,
        'Teléfono': solicitud.proveedor_telefono || '',
        'Servicio': solicitud.tipo_servicio,
        'Descripción': solicitud.descripcion,
        'Urgencia': solicitud.urgencia,
        'Estado': solicitud.estado,
        'Fecha Solicitud': formatDate(solicitud.fecha_solicitud),
        'Notas Taller': solicitud.notas_taller || ''
    }));
    
    // Crear el workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);
    
    // Ajustar ancho de columnas
    const colWidths = [
        { wch: 5 },   // ID
        { wch: 20 },  // Proveedor
        { wch: 25 },  // Email
        { wch: 15 },  // Teléfono
        { wch: 15 },  // Servicio
        { wch: 40 },  // Descripción
        { wch: 10 },  // Urgencia
        { wch: 12 },  // Estado
        { wch: 20 },  // Fecha
        { wch: 30 }   // Notas
    ];
    ws['!cols'] = colWidths;
    
    // Agregar la hoja al workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Solicitudes');
    
    // Guardar el archivo
    const fecha = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `solicitudes-taller-${fecha}.xlsx`);
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
let cotizaciones = [];
let cotizacionesFiltradas = [];
let currentCotizacion = null;
let itemCounter = 0;

document.addEventListener('DOMContentLoaded', function() {
    AppUtils.cargarVersion();
    verificarAutenticacion();
    
    // Event listeners
    document.getElementById('buscadorCotizaciones').addEventListener('input', filtrarCotizaciones);
    document.getElementById('filtroEstado').addEventListener('change', filtrarCotizaciones);
    document.getElementById('cotizacionForm').addEventListener('submit', guardarCotizacion);
    
    // Cerrar modal con Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            cerrarModalCotizacion();
        }
    });
    
    // Cerrar modal al hacer clic fuera
    document.getElementById('modalCotizacion').addEventListener('click', function(e) {
        if (e.target === this) {
            cerrarModalCotizacion();
        }
    });
    
    // Cargar datos iniciales
    loadCotizaciones();
    loadEstadisticas();
});

function verificarAutenticacion() {
    const token = localStorage.getItem('empleadoToken');
    const empleadoData = JSON.parse(localStorage.getItem('empleadoData') || '{}');
    
    if (!token || empleadoData.rol !== 'admin') {
        window.location.href = '/empleado/login';
        return;
    }
    
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

async function loadCotizaciones() {
    try {
        const token = localStorage.getItem('empleadoToken');
        const response = await fetch('/api/cotizaciones', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            cotizaciones = await response.json();
            cotizacionesFiltradas = cotizaciones;
            mostrarCotizaciones();
        } else {
            AppUtils.mostrarMensaje('Error al cargar cotizaciones', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        AppUtils.mostrarMensaje('Error de conexión', 'error');
    }
}

async function loadEstadisticas() {
    try {
        const token = localStorage.getItem('empleadoToken');
        const response = await fetch('/api/cotizaciones/estadisticas', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const stats = await response.json();
            document.getElementById('totalCotizaciones').textContent = stats.total || 0;
            document.getElementById('cotizacionesPendientes').textContent = stats.pendientes || 0;
            document.getElementById('cotizacionesAprobadas').textContent = stats.aprobadas || 0;
            document.getElementById('valorTotal').textContent = `$${AppUtils.formatMoney(stats.valor_total || 0)}`;
        }
    } catch (error) {
        console.error('Error al cargar estadísticas:', error);
    }
}

function mostrarCotizaciones() {
    const container = document.getElementById('cotizacionesContainer');
    
    if (cotizacionesFiltradas.length === 0) {
        container.innerHTML = `
            <div style="padding: 40px; text-align: center; color: #666;">
                <p>No hay cotizaciones para mostrar</p>
                <button onclick="nuevaCotizacion()" class="btn btn-primary">+ Crear Primera Cotización</button>
            </div>
        `;
        return;
    }
    
    const html = cotizacionesFiltradas.map(cotizacion => {
        const fechaCreacion = new Date(cotizacion.fecha_creacion).toLocaleDateString('es-ES');
        const fechaExpiracion = cotizacion.fecha_expiracion ? 
            new Date(cotizacion.fecha_expiracion).toLocaleDateString('es-ES') : 'N/A';
        
        return `
            <div class="cotizacion-card">
                <div class="cotizacion-header">
                    <div class="cotizacion-numero">${cotizacion.numero}</div>
                    <div class="cotizacion-estado estado-${cotizacion.estado}">${cotizacion.estado}</div>
                </div>
                <div class="cotizacion-info">
                    <div>
                        <strong>Cliente:</strong> ${cotizacion.cliente_nombre}<br>
                        <strong>Email:</strong> ${cotizacion.cliente_email}
                        ${cotizacion.cliente_empresa ? `<br><strong>Empresa:</strong> ${cotizacion.cliente_empresa}` : ''}
                    </div>
                    <div>
                        <strong>Título:</strong> ${cotizacion.titulo}<br>
                        <strong>Total:</strong> $${AppUtils.formatMoney(cotizacion.total)}<br>
                        <strong>Creado por:</strong> ${cotizacion.usuario_nombre}
                    </div>
                    <div>
                        <strong>Fecha Creación:</strong> ${fechaCreacion}<br>
                        <strong>Válida hasta:</strong> ${fechaExpiracion}<br>
                        <strong>Versión:</strong> ${cotizacion.version}
                    </div>
                </div>
                <div class="cotizacion-actions">
                    <button onclick="verCotizacion(${cotizacion.id})" class="btn btn-primary btn-sm">Ver</button>
                    ${cotizacion.estado === 'borrador' ? 
                        `<button onclick="editarCotizacion(${cotizacion.id})" class="btn btn-warning btn-sm">Editar</button>` : ''}
                    <button onclick="duplicarCotizacion(${cotizacion.id})" class="btn btn-info btn-sm">Duplicar</button>
                    <button onclick="generarPDF(${cotizacion.id})" class="btn btn-success btn-sm">PDF</button>
                    ${cotizacion.estado === 'borrador' ? 
                        `<button onclick="enviarCotizacion(${cotizacion.id})" class="btn btn-primary btn-sm">Enviar</button>` : ''}
                    ${['pendiente', 'borrador'].includes(cotizacion.estado) ? 
                        `<button onclick="cambiarEstado(${cotizacion.id}, 'aprobada')" class="btn btn-success btn-sm">Aprobar</button>
                         <button onclick="cambiarEstado(${cotizacion.id}, 'rechazada')" class="btn btn-danger btn-sm">Rechazar</button>` : ''}
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = html;
}

function filtrarCotizaciones() {
    const buscador = document.getElementById('buscadorCotizaciones').value.toLowerCase().trim();
    const filtroEstado = document.getElementById('filtroEstado').value;
    
    cotizacionesFiltradas = cotizaciones.filter(cotizacion => {
        const matchBuscador = !buscador || 
            cotizacion.cliente_nombre.toLowerCase().includes(buscador) ||
            cotizacion.cliente_email.toLowerCase().includes(buscador) ||
            cotizacion.numero.toLowerCase().includes(buscador) ||
            cotizacion.titulo.toLowerCase().includes(buscador);
        
        const matchEstado = !filtroEstado || cotizacion.estado === filtroEstado;
        
        return matchBuscador && matchEstado;
    });
    
    mostrarCotizaciones();
}

function limpiarFiltros() {
    document.getElementById('buscadorCotizaciones').value = '';
    document.getElementById('filtroEstado').value = '';
    filtrarCotizaciones();
}

function nuevaCotizacion() {
    currentCotizacion = null;
    document.getElementById('modalTitle').textContent = 'Nueva Cotización';
    document.getElementById('cotizacionForm').reset();
    document.getElementById('cotizacionId').value = '';
    
    // Limpiar items y agregar uno por defecto
    document.getElementById('itemsContainer').innerHTML = '';
    itemCounter = 0;
    agregarItem();
    
    calcularTotales();
    const modal = document.getElementById('modalCotizacion');
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
}

function agregarItem(itemData = null) {
    itemCounter++;
    const itemId = `item-${itemCounter}`;
    
    const itemHtml = `
        <div class="item-row" id="${itemId}">
            <div>
                <input type="text" class="item-nombre" placeholder="Nombre del producto/servicio" 
                       value="${itemData?.nombre || ''}" onchange="calcularTotales()" required>
                <input type="text" class="item-descripcion" placeholder="Descripción detallada" 
                       value="${itemData?.descripcion || ''}" style="margin-top: 5px;">
            </div>
            <div>
                <input type="number" class="item-cantidad" min="1" step="1" 
                       value="${itemData?.cantidad || 1}" onchange="calcularTotales()" required>
            </div>
            <div>
                <input type="number" class="item-precio" min="0" step="0.01" 
                       value="${itemData?.precio_unitario || 0}" onchange="calcularTotales()" required>
            </div>
            <div>
                <input type="number" class="item-descuento" min="0" max="100" step="0.01" 
                       value="${itemData?.descuento_porcentaje || 0}" onchange="calcularTotales()">
            </div>
            <div>
                <span class="item-subtotal">$0.00</span>
            </div>
            <div>
                <button type="button" onclick="eliminarItem('${itemId}')" class="btn btn-danger btn-sm btn-remove-item">×</button>
            </div>
        </div>
    `;
    
    document.getElementById('itemsContainer').insertAdjacentHTML('beforeend', itemHtml);
    calcularTotales();
}

function eliminarItem(itemId) {
    const itemsContainer = document.getElementById('itemsContainer');
    if (itemsContainer.children.length > 1) {
        document.getElementById(itemId).remove();
        calcularTotales();
    } else {
        AppUtils.mostrarMensaje('Debe mantener al menos un item', 'warning');
    }
}

function calcularTotales() {
    let subtotal = 0;
    
    const itemRows = document.querySelectorAll('#itemsContainer .item-row');
    itemRows.forEach(row => {
        const cantidad = parseFloat(row.querySelector('.item-cantidad').value) || 0;
        const precio = parseFloat(row.querySelector('.item-precio').value) || 0;
        const descuentoPorcentaje = parseFloat(row.querySelector('.item-descuento').value) || 0;
        
        const itemSubtotal = cantidad * precio;
        const itemDescuento = (itemSubtotal * descuentoPorcentaje) / 100;
        const itemTotal = itemSubtotal - itemDescuento;
        
        row.querySelector('.item-subtotal').textContent = `$${AppUtils.formatMoney(itemTotal)}`;
        subtotal += itemTotal;
    });
    
    const descuentoGeneral = parseFloat(document.getElementById('descuentoGeneral').value) || 0;
    const impuestoPorcentaje = parseFloat(document.getElementById('impuestoPorcentaje').value) || 0;
    
    const descuentoMonto = (subtotal * descuentoGeneral) / 100;
    const subtotalConDescuento = subtotal - descuentoMonto;
    const impuestoMonto = (subtotalConDescuento * impuestoPorcentaje) / 100;
    const total = subtotalConDescuento + impuestoMonto;
    
    document.getElementById('subtotalMostrar').textContent = `$${AppUtils.formatMoney(subtotal)}`;
    document.getElementById('descuentoMostrar').textContent = `$${AppUtils.formatMoney(descuentoMonto)}`;
    document.getElementById('impuestoMostrar').textContent = `$${AppUtils.formatMoney(impuestoMonto)}`;
    document.getElementById('totalMostrar').textContent = `$${AppUtils.formatMoney(total)}`;
}

function cerrarModalCotizacion() {
    const modal = document.getElementById('modalCotizacion');
    modal.classList.add('hidden');
    modal.style.display = 'none';
    currentCotizacion = null;
}

function volverAlDashboard() {
    window.location.href = '/admin/dashboard';
}

async function guardarCotizacion(e) {
    e.preventDefault();
    
    // Recopilar datos del formulario
    const items = [];
    const itemRows = document.querySelectorAll('#itemsContainer .item-row');
    
    itemRows.forEach((row, index) => {
        const nombre = row.querySelector('.item-nombre').value.trim();
        const descripcion = row.querySelector('.item-descripcion').value.trim();
        const cantidad = parseInt(row.querySelector('.item-cantidad').value);
        const precio_unitario = parseFloat(row.querySelector('.item-precio').value);
        const descuento_porcentaje = parseFloat(row.querySelector('.item-descuento').value) || 0;
        
        if (nombre && cantidad > 0 && precio_unitario >= 0) {
            items.push({
                tipo: 'servicio', // Por ahora todos son servicios
                nombre,
                descripcion,
                cantidad,
                precio_unitario,
                descuento_porcentaje
            });
        }
    });
    
    if (items.length === 0) {
        AppUtils.mostrarMensaje('Debe agregar al menos un item válido', 'error');
        return;
    }
    
    const cotizacionData = {
        cliente_nombre: document.getElementById('clienteNombre').value.trim(),
        cliente_email: document.getElementById('clienteEmail').value.trim(),
        cliente_telefono: document.getElementById('clienteTelefono').value.trim(),
        cliente_empresa: document.getElementById('clienteEmpresa').value.trim(),
        titulo: document.getElementById('cotizacionTitulo').value.trim(),
        descripcion: document.getElementById('cotizacionDescripcion').value.trim(),
        validez_dias: parseInt(document.getElementById('validezDias').value) || 30,
        descuento_porcentaje: parseFloat(document.getElementById('descuentoGeneral').value) || 0,
        impuesto_porcentaje: parseFloat(document.getElementById('impuestoPorcentaje').value) || 16,
        terminos_condiciones: document.getElementById('terminosCondiciones').value.trim(),
        notas_internas: document.getElementById('notasInternas').value.trim(),
        items
    };
    
    try {
        const token = localStorage.getItem('empleadoToken');
        const cotizacionId = document.getElementById('cotizacionId').value;
        const isEdit = !!cotizacionId;
        
        const response = await fetch(isEdit ? `/api/cotizaciones/${cotizacionId}` : '/api/cotizaciones', {
            method: isEdit ? 'PUT' : 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(cotizacionData)
        });
        
        if (response.ok) {
            const result = await response.json();
            AppUtils.mostrarMensaje(
                isEdit ? 'Cotización actualizada exitosamente' : 'Cotización creada exitosamente',
                'success'
            );
            cerrarModalCotizacion();
            loadCotizaciones();
            loadEstadisticas();
        } else {
            const error = await response.json();
            AppUtils.mostrarMensaje(error.error || 'Error al guardar cotización', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        AppUtils.mostrarMensaje('Error de conexión', 'error');
    }
}

// ===== FUNCIONES DE COTIZACIONES COMPLETAS =====

// Ver cotización detallada
async function verCotizacion(id) {
    try {
        const token = localStorage.getItem('empleadoToken');
        const response = await fetch(`/api/cotizaciones/${id}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const cotizacion = await response.json();
            mostrarModalDetalleCotizacion(cotizacion);
        } else {
            AppUtils.mostrarMensaje('Error al cargar la cotización', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        AppUtils.mostrarMensaje('Error de conexión', 'error');
    }
}

// Editar cotización existente
async function editarCotizacion(id) {
    try {
        const token = localStorage.getItem('empleadoToken');
        const response = await fetch(`/api/cotizaciones/${id}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const cotizacion = await response.json();
            cargarCotizacionEnFormulario(cotizacion);
        } else {
            AppUtils.mostrarMensaje('Error al cargar la cotización', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        AppUtils.mostrarMensaje('Error de conexión', 'error');
    }
}

// Duplicar cotización como nueva
async function duplicarCotizacion(id) {
    try {
        const token = localStorage.getItem('empleadoToken');
        const response = await fetch(`/api/cotizaciones/${id}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const cotizacion = await response.json();
            duplicarCotizacionEnFormulario(cotizacion);
        } else {
            AppUtils.mostrarMensaje('Error al cargar la cotización', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        AppUtils.mostrarMensaje('Error de conexión', 'error');
    }
}

// Generar PDF de cotización
async function generarPDF(id) {
    try {
        const token = localStorage.getItem('empleadoToken');
        const response = await fetch(`/api/cotizaciones/${id}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const cotizacion = await response.json();
            await generarPDFCotizacion(cotizacion);
        } else {
            AppUtils.mostrarMensaje('Error al cargar la cotización', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        AppUtils.mostrarMensaje('Error de conexión', 'error');
    }
}

// Enviar cotización por email
async function enviarCotizacion(id) {
    mostrarModalEnviar(id);
}

function mostrarModalEnviar(id) {
    document.getElementById('modalEnviarConfirm').classList.remove('hidden');
    document.getElementById('modalEnviarConfirm').style.display = 'flex';
    
    // Configurar botón de confirmación
    const btnConfirmar = document.getElementById('btnConfirmarEnvio');
    btnConfirmar.onclick = () => ejecutarEnvioCotizacion(id);
}

function cerrarModalEnviar() {
    document.getElementById('modalEnviarConfirm').classList.add('hidden');
    document.getElementById('modalEnviarConfirm').style.display = 'none';
}

async function ejecutarEnvioCotizacion(id) {
    cerrarModalEnviar();
    
    try {
        const token = localStorage.getItem('empleadoToken');
        const response = await fetch(`/api/cotizaciones/${id}/enviar`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            AppUtils.mostrarMensaje('Cotización enviada exitosamente al cliente', 'success');
            loadCotizaciones(); // Recargar para actualizar estado
        } else {
            const error = await response.json();
            AppUtils.mostrarMensaje(error.error || 'Error al enviar la cotización', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        AppUtils.mostrarMensaje('Error de conexión', 'error');
    }
}

// Cambiar estado de cotización
async function cambiarEstado(id, estado) {
    if (estado === 'aprobada') {
        mostrarModalAprobar(id);
    } else if (estado === 'rechazada') {
        mostrarModalRechazar(id);
    } else {
        // Para otros estados usar el método original
        const estadosTexto = { 'expirada': 'marcar como expirada' };
        const comentario = prompt(`Comentario para ${estadosTexto[estado]} la cotización (opcional):`);
        if (comentario === null) return; // Usuario canceló
        ejecutarCambioEstado(id, estado, comentario);
    }
}

function mostrarModalAprobar(id) {
    document.getElementById('modalAprobarConfirm').classList.remove('hidden');
    document.getElementById('modalAprobarConfirm').style.display = 'flex';
    document.getElementById('comentarioAprobacion').value = '';
    
    // Configurar botón de confirmación
    const btnConfirmar = document.getElementById('btnConfirmarAprobacion');
    btnConfirmar.onclick = () => {
        const comentario = document.getElementById('comentarioAprobacion').value;
        cerrarModalAprobar();
        ejecutarCambioEstado(id, 'aprobada', comentario);
    };
}

function cerrarModalAprobar() {
    document.getElementById('modalAprobarConfirm').classList.add('hidden');
    document.getElementById('modalAprobarConfirm').style.display = 'none';
}

function mostrarModalRechazar(id) {
    document.getElementById('modalRechazarConfirm').classList.remove('hidden');
    document.getElementById('modalRechazarConfirm').style.display = 'flex';
    document.getElementById('comentarioRechazo').value = '';
    
    // Configurar botón de confirmación
    const btnConfirmar = document.getElementById('btnConfirmarRechazo');
    btnConfirmar.onclick = () => {
        const comentario = document.getElementById('comentarioRechazo').value;
        
        if (!comentario.trim()) {
            AppUtils.mostrarMensaje('Debe especificar un motivo para el rechazo', 'error');
            return;
        }
        
        cerrarModalRechazar();
        ejecutarCambioEstado(id, 'rechazada', comentario);
    };
}

function cerrarModalRechazar() {
    document.getElementById('modalRechazarConfirm').classList.add('hidden');
    document.getElementById('modalRechazarConfirm').style.display = 'none';
}

async function ejecutarCambioEstado(id, estado, comentario) {
    const estadosTexto = {
        'aprobada': 'aprobar',
        'rechazada': 'rechazar',
        'expirada': 'marcar como expirada'
    };
    
    try {
        const token = localStorage.getItem('empleadoToken');
        const response = await fetch(`/api/cotizaciones/${id}/estado`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                estado: estado,
                comentario: comentario || null
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            AppUtils.mostrarMensaje(`Cotización ${estadosTexto[estado]}da exitosamente`, 'success');
            loadCotizaciones();
            loadEstadisticas();
        } else {
            const error = await response.json();
            AppUtils.mostrarMensaje(error.error || 'Error al cambiar estado', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        AppUtils.mostrarMensaje('Error de conexión', 'error');
    }
}

// ===== FUNCIONES AUXILIARES =====

// Mostrar modal con detalles de la cotización
function mostrarModalDetalleCotizacion(cotizacion) {
    const fechaCreacion = new Date(cotizacion.fecha_creacion).toLocaleDateString('es-ES');
    const fechaExpiracion = cotizacion.fecha_expiracion ? 
        new Date(cotizacion.fecha_expiracion).toLocaleDateString('es-ES') : 'No especificada';
    
    let itemsHtml = '';
    if (cotizacion.items && cotizacion.items.length > 0) {
        itemsHtml = cotizacion.items.map(item => `
            <tr>
                <td>${item.nombre}</td>
                <td>${item.cantidad}</td>
                <td>$${AppUtils.formatMoney(item.precio_unitario)}</td>
                <td>${item.descuento_porcentaje}%</td>
                <td>$${AppUtils.formatMoney(item.cantidad * item.precio_unitario * (1 - item.descuento_porcentaje/100))}</td>
            </tr>
        `).join('');
    }
    
    const modalHtml = `
        <div id="modalDetalleCotizacion" class="modal-cotizacion" style="display: flex;">
            <div class="modal-content-cotizacion">
                <div class="modal-header">
                    <h3>📋 Detalle de Cotización ${cotizacion.numero}</h3>
                    <button onclick="cerrarModalDetalle()" class="btn-close">×</button>
                </div>
                <div class="modal-body">
                    <!-- Información del Cliente -->
                    <div class="form-step">
                        <div class="step-title">👤 Información del Cliente</div>
                        <div class="form-grid">
                            <div class="form-group">
                                <label>Nombre:</label>
                                <p><strong>${cotizacion.cliente_nombre}</strong></p>
                            </div>
                            <div class="form-group">
                                <label>Email:</label>
                                <p>${cotizacion.cliente_email}</p>
                            </div>
                            <div class="form-group">
                                <label>Teléfono:</label>
                                <p>${cotizacion.cliente_telefono || 'No especificado'}</p>
                            </div>
                            <div class="form-group">
                                <label>Empresa:</label>
                                <p>${cotizacion.cliente_empresa || 'No especificada'}</p>
                            </div>
                        </div>
                    </div>

                    <!-- Información de la Cotización -->
                    <div class="form-step">
                        <div class="step-title">📄 Información de la Cotización</div>
                        <div class="form-grid">
                            <div class="form-group">
                                <label>Estado:</label>
                                <p><span class="cotizacion-estado estado-${cotizacion.estado}">${cotizacion.estado}</span></p>
                            </div>
                            <div class="form-group">
                                <label>Fecha Creación:</label>
                                <p>${fechaCreacion}</p>
                            </div>
                            <div class="form-group">
                                <label>Válida hasta:</label>
                                <p>${fechaExpiracion}</p>
                            </div>
                            <div class="form-group">
                                <label>Creada por:</label>
                                <p>${cotizacion.usuario_nombre}</p>
                            </div>
                        </div>
                        <div class="form-group form-group-full">
                            <label>Título:</label>
                            <p><strong>${cotizacion.titulo}</strong></p>
                        </div>
                        <div class="form-group form-group-full">
                            <label>Descripción:</label>
                            <p>${cotizacion.descripcion || 'Sin descripción'}</p>
                        </div>
                    </div>

                    <!-- Items -->
                    <div class="form-step">
                        <div class="step-title">📦 Items de la Cotización</div>
                        <div class="items-section">
                            <table style="width: 100%; border-collapse: collapse;">
                                <thead>
                                    <tr style="background: #dee2e6;">
                                        <th style="padding: 8px; text-align: left;">Producto</th>
                                        <th style="padding: 8px;">Cantidad</th>
                                        <th style="padding: 8px;">Precio Unit.</th>
                                        <th style="padding: 8px;">Desc. %</th>
                                        <th style="padding: 8px;">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${itemsHtml}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Totales -->
                    <div class="form-step">
                        <div class="step-title">💰 Totales</div>
                        <div class="totales-section">
                            <div class="total-row">
                                <span>Subtotal:</span>
                                <span>$${AppUtils.formatMoney(cotizacion.subtotal || 0)}</span>
                            </div>
                            <div class="total-row">
                                <span>Descuento (${cotizacion.descuento_porcentaje || 0}%):</span>
                                <span>$${AppUtils.formatMoney(cotizacion.descuento_monto || 0)}</span>
                            </div>
                            <div class="total-row">
                                <span>Impuesto (${cotizacion.impuesto_porcentaje || 0}%):</span>
                                <span>$${AppUtils.formatMoney(cotizacion.impuesto_monto || 0)}</span>
                            </div>
                            <div class="total-row total-final">
                                <span>TOTAL:</span>
                                <span>$${AppUtils.formatMoney(cotizacion.total || 0)}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Términos y Condiciones -->
                    ${cotizacion.terminos_condiciones ? `
                    <div class="form-step">
                        <div class="step-title">📋 Términos y Condiciones</div>
                        <p>${cotizacion.terminos_condiciones}</p>
                    </div>` : ''}

                    <!-- Notas Internas -->
                    ${cotizacion.notas_internas ? `
                    <div class="form-step">
                        <div class="step-title">📝 Notas Internas</div>
                        <p>${cotizacion.notas_internas}</p>
                    </div>` : ''}

                    <div class="form-actions" style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
                        <button onclick="cerrarModalDetalle()" class="btn btn-secondary">Cerrar</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Agregar el modal al body
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// Cerrar modal de detalle
function cerrarModalDetalle() {
    const modal = document.getElementById('modalDetalleCotizacion');
    if (modal) {
        modal.remove();
    }
}

// Cargar cotización en formulario para edición
function cargarCotizacionEnFormulario(cotizacion) {
    currentCotizacion = cotizacion;
    document.getElementById('modalTitle').textContent = 'Editar Cotización';
    
    // Llenar campos básicos
    document.getElementById('cotizacionId').value = cotizacion.id;
    document.getElementById('clienteNombre').value = cotizacion.cliente_nombre;
    document.getElementById('clienteEmail').value = cotizacion.cliente_email;
    document.getElementById('clienteTelefono').value = cotizacion.cliente_telefono || '';
    document.getElementById('clienteEmpresa').value = cotizacion.cliente_empresa || '';
    document.getElementById('cotizacionTitulo').value = cotizacion.titulo;
    document.getElementById('cotizacionDescripcion').value = cotizacion.descripcion || '';
    document.getElementById('validezDias').value = cotizacion.validez_dias || 30;
    document.getElementById('descuentoGeneral').value = cotizacion.descuento_porcentaje || 0;
    document.getElementById('impuestoPorcentaje').value = cotizacion.impuesto_porcentaje || 16;
    document.getElementById('terminosCondiciones').value = cotizacion.terminos_condiciones || '';
    document.getElementById('notasInternas').value = cotizacion.notas_internas || '';
    
    // Limpiar items existentes
    document.getElementById('itemsContainer').innerHTML = '';
    itemCounter = 0;
    
    // Cargar items
    if (cotizacion.items && cotizacion.items.length > 0) {
        cotizacion.items.forEach(item => {
            agregarItem(item);
        });
    } else {
        agregarItem(); // Agregar al menos un item vacío
    }
    
    calcularTotales();
    
    // Mostrar modal
    const modal = document.getElementById('modalCotizacion');
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
}

// Duplicar cotización en formulario
function duplicarCotizacionEnFormulario(cotizacion) {
    document.getElementById('modalTitle').textContent = 'Duplicar Cotización';
    
    // Llenar campos básicos (sin ID para crear nueva)
    document.getElementById('cotizacionId').value = '';
    document.getElementById('clienteNombre').value = cotizacion.cliente_nombre;
    document.getElementById('clienteEmail').value = cotizacion.cliente_email;
    document.getElementById('clienteTelefono').value = cotizacion.cliente_telefono || '';
    document.getElementById('clienteEmpresa').value = cotizacion.cliente_empresa || '';
    document.getElementById('cotizacionTitulo').value = cotizacion.titulo + ' (Copia)';
    document.getElementById('cotizacionDescripcion').value = cotizacion.descripcion || '';
    document.getElementById('validezDias').value = cotizacion.validez_dias || 30;
    document.getElementById('descuentoGeneral').value = cotizacion.descuento_porcentaje || 0;
    document.getElementById('impuestoPorcentaje').value = cotizacion.impuesto_porcentaje || 16;
    document.getElementById('terminosCondiciones').value = cotizacion.terminos_condiciones || '';
    document.getElementById('notasInternas').value = cotizacion.notas_internas || '';
    
    // Limpiar items existentes
    document.getElementById('itemsContainer').innerHTML = '';
    itemCounter = 0;
    
    // Cargar items
    if (cotizacion.items && cotizacion.items.length > 0) {
        cotizacion.items.forEach(item => {
            agregarItem(item);
        });
    } else {
        agregarItem(); // Agregar al menos un item vacío
    }
    
    calcularTotales();
    
    // Mostrar modal
    const modal = document.getElementById('modalCotizacion');
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    
    AppUtils.mostrarMensaje('Cotización duplicada. Modifique los campos necesarios y guarde.', 'info');
}

// Generar PDF de cotización usando jsPDF
async function generarPDFCotizacion(cotizacion) {
    try {
        AppUtils.mostrarMensaje('Generando PDF...', 'info');
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Configuración
        const pageWidth = doc.internal.pageSize.width;
        const margin = 20;
        let yPosition = 20;
        
        // Header - Logo y título
        doc.setFontSize(20);
        doc.setTextColor(0, 100, 200);
        doc.text('COTIZACIÓN', pageWidth/2, yPosition, { align: 'center' });
        yPosition += 10;
        
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(`Número: ${cotizacion.numero}`, pageWidth/2, yPosition, { align: 'center' });
        yPosition += 20;
        
        // Información de la empresa
        doc.setFontSize(10);
        doc.text('Llantera & Servicios Automotrices', margin, yPosition);
        yPosition += 5;
        doc.text('Tel: (555) 123-4567 | Email: info@llantera.com', margin, yPosition);
        yPosition += 15;
        
        // Información del cliente
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('DATOS DEL CLIENTE:', margin, yPosition);
        yPosition += 8;
        
        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        doc.text(`Nombre: ${cotizacion.cliente_nombre}`, margin, yPosition);
        yPosition += 5;
        doc.text(`Email: ${cotizacion.cliente_email}`, margin, yPosition);
        yPosition += 5;
        if (cotizacion.cliente_telefono) {
            doc.text(`Teléfono: ${cotizacion.cliente_telefono}`, margin, yPosition);
            yPosition += 5;
        }
        if (cotizacion.cliente_empresa) {
            doc.text(`Empresa: ${cotizacion.cliente_empresa}`, margin, yPosition);
            yPosition += 5;
        }
        yPosition += 10;
        
        // Información de la cotización
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('INFORMACIÓN DE LA COTIZACIÓN:', margin, yPosition);
        yPosition += 8;
        
        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        doc.text(`Título: ${cotizacion.titulo}`, margin, yPosition);
        yPosition += 5;
        doc.text(`Fecha: ${new Date(cotizacion.fecha_creacion).toLocaleDateString('es-ES')}`, margin, yPosition);
        yPosition += 5;
        if (cotizacion.fecha_expiracion) {
            doc.text(`Válida hasta: ${new Date(cotizacion.fecha_expiracion).toLocaleDateString('es-ES')}`, margin, yPosition);
            yPosition += 5;
        }
        if (cotizacion.descripcion) {
            doc.text(`Descripción: ${cotizacion.descripcion}`, margin, yPosition);
            yPosition += 5;
        }
        yPosition += 10;
        
        // Items - Header de tabla
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text('ITEM', margin, yPosition);
        doc.text('CANT', margin + 80, yPosition);
        doc.text('PRECIO', margin + 110, yPosition);
        doc.text('DESC%', margin + 140, yPosition);
        doc.text('SUBTOTAL', margin + 170, yPosition);
        yPosition += 5;
        
        // Línea separadora
        doc.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 5;
        
        // Items - Contenido
        doc.setFont(undefined, 'normal');
        if (cotizacion.items && cotizacion.items.length > 0) {
            cotizacion.items.forEach(item => {
                const subtotal = item.cantidad * item.precio_unitario * (1 - item.descuento_porcentaje/100);
                
                doc.text(item.nombre.substring(0, 25), margin, yPosition);
                doc.text(item.cantidad.toString(), margin + 80, yPosition);
                doc.text(`$${AppUtils.formatMoney(item.precio_unitario)}`, margin + 110, yPosition);
                doc.text(`${item.descuento_porcentaje}%`, margin + 140, yPosition);
                doc.text(`$${AppUtils.formatMoney(subtotal)}`, margin + 170, yPosition);
                yPosition += 5;
                
                // Descripción del item si existe
                if (item.descripcion) {
                    doc.setFontSize(8);
                    doc.setTextColor(100, 100, 100);
                    doc.text(item.descripcion.substring(0, 50), margin + 5, yPosition);
                    doc.setTextColor(0, 0, 0);
                    doc.setFontSize(10);
                    yPosition += 4;
                }
            });
        }
        
        yPosition += 10;
        
        // Totales
        const totalesX = pageWidth - margin - 60;
        doc.line(totalesX - 10, yPosition, pageWidth - margin, yPosition);
        yPosition += 5;
        
        doc.text('Subtotal:', totalesX, yPosition);
        doc.text(`$${AppUtils.formatMoney(cotizacion.subtotal || 0)}`, totalesX + 35, yPosition);
        yPosition += 5;
        
        if (cotizacion.descuento_monto > 0) {
            doc.text(`Descuento (${cotizacion.descuento_porcentaje}%):`, totalesX, yPosition);
            doc.text(`$${AppUtils.formatMoney(cotizacion.descuento_monto)}`, totalesX + 35, yPosition);
            yPosition += 5;
        }
        
        doc.text(`Impuesto (${cotizacion.impuesto_porcentaje}%):`, totalesX, yPosition);
        doc.text(`$${AppUtils.formatMoney(cotizacion.impuesto_monto || 0)}`, totalesX + 35, yPosition);
        yPosition += 5;
        
        doc.setFont(undefined, 'bold');
        doc.text('TOTAL:', totalesX, yPosition);
        doc.text(`$${AppUtils.formatMoney(cotizacion.total)}`, totalesX + 35, yPosition);
        yPosition += 15;
        
        // Términos y condiciones
        if (cotizacion.terminos_condiciones) {
            doc.setFont(undefined, 'bold');
            doc.setFontSize(10);
            doc.text('TÉRMINOS Y CONDICIONES:', margin, yPosition);
            yPosition += 5;
            
            doc.setFont(undefined, 'normal');
            doc.setFontSize(9);
            const terms = doc.splitTextToSize(cotizacion.terminos_condiciones, pageWidth - 2 * margin);
            doc.text(terms, margin, yPosition);
        }
        
        // Generar y descargar
        doc.save(`Cotizacion-${cotizacion.numero}.pdf`);
        AppUtils.mostrarMensaje('PDF generado exitosamente', 'success');
        
    } catch (error) {
        console.error('Error generando PDF:', error);
        AppUtils.mostrarMensaje('Error al generar el PDF', 'error');
    }
}

// Funciones para datos de vehículos (mantenemos compatibilidad)
async function cargarMarcas() {
    const marcaSelect = document.getElementById('marca');
    
    try {
        // Simulamos datos de marcas - en producción esto vendría de una API
        const marcas = [
            'Toyota', 'Chevrolet', 'Nissan', 'Ford', 'Volkswagen', 
            'Honda', 'Mazda', 'Hyundai', 'Kia', 'Mitsubishi',
            'Suzuki', 'Subaru', 'BMW', 'Mercedes-Benz', 'Audi',
            'Renault', 'Peugeot', 'Citroën', 'Fiat'
        ].sort();
        
        marcaSelect.innerHTML = '<option value="">Seleccionar marca</option>';
        
        marcas.forEach(marca => {
            const option = document.createElement('option');
            option.value = marca.toLowerCase().replace(/[-\s]/g, '');
            option.textContent = marca;
            marcaSelect.appendChild(option);
        });
        
    } catch (error) {
        console.error('Error cargando marcas:', error);
        AppUtils.mostrarMensaje('Error al cargar las marcas', 'error');
    }
}

function onMarcaChange() {
    const marca = this.value;
    const modeloSelect = document.getElementById('modelo');
    const anoSelect = document.getElementById('ano');
    const versionSelect = document.getElementById('version');
    
    // Limpiar selects dependientes
    modeloSelect.innerHTML = '<option value="">Cargando modelos...</option>';
    anoSelect.innerHTML = '<option value="">Seleccione primero modelo</option>';
    versionSelect.innerHTML = '<option value="">Seleccione primero año</option>';
    anoSelect.disabled = true;
    versionSelect.disabled = true;
    
    if (marca) {
        cargarModelos(marca);
        modeloSelect.disabled = false;
    } else {
        modeloSelect.disabled = true;
        modeloSelect.innerHTML = '<option value="">Primero seleccione una marca</option>';
    }
}

function onModeloChange() {
    const modelo = this.value;
    const anoSelect = document.getElementById('ano');
    const versionSelect = document.getElementById('version');
    
    // Limpiar selects dependientes
    anoSelect.innerHTML = '<option value="">Cargando años...</option>';
    versionSelect.innerHTML = '<option value="">Seleccione primero año</option>';
    versionSelect.disabled = true;
    
    if (modelo) {
        cargarAnos(modelo);
        anoSelect.disabled = false;
    } else {
        anoSelect.disabled = true;
        anoSelect.innerHTML = '<option value="">Seleccione primero marca y modelo</option>';
    }
}

function onAnoChange() {
    const ano = this.value;
    const versionSelect = document.getElementById('version');
    
    versionSelect.innerHTML = '<option value="">Cargando versiones...</option>';
    
    if (ano) {
        cargarVersiones(ano);
        versionSelect.disabled = false;
    } else {
        versionSelect.disabled = true;
        versionSelect.innerHTML = '<option value="">Seleccione primero año</option>';
    }
}

async function cargarModelos(marca) {
    const modeloSelect = document.getElementById('modelo');
    
    try {
        // Simulamos modelos por marca - en producción esto vendría de una API
        const modelosPorMarca = {
            'toyota': ['Corolla', 'Camry', 'RAV4', 'Prius', 'Highlander', 'Sienna', 'Tacoma'],
            'chevrolet': ['Spark', 'Sonic', 'Cruze', 'Malibu', 'Equinox', 'Traverse', 'Silverado'],
            'nissan': ['Versa', 'Sentra', 'Altima', 'Rogue', 'Murano', 'Pathfinder', 'Frontier'],
            'ford': ['Fiesta', 'Focus', 'Fusion', 'Escape', 'Explorer', 'F-150', 'Mustang'],
            'volkswagen': ['Gol', 'Polo', 'Jetta', 'Passat', 'Tiguan', 'Atlas', 'Golf']
        };
        
        const modelos = modelosPorMarca[marca] || ['Modelo 1', 'Modelo 2', 'Modelo 3'];
        
        modeloSelect.innerHTML = '<option value="">Seleccionar modelo</option>';
        
        modelos.forEach(modelo => {
            const option = document.createElement('option');
            option.value = modelo.toLowerCase().replace(/[-\s]/g, '');
            option.textContent = modelo;
            modeloSelect.appendChild(option);
        });
        
    } catch (error) {
        console.error('Error cargando modelos:', error);
        modeloSelect.innerHTML = '<option value="">Error al cargar modelos</option>';
    }
}

async function cargarAnos(modelo) {
    const anoSelect = document.getElementById('ano');
    
    try {
        // Generar años desde 2010 hasta el año actual
        const currentYear = new Date().getFullYear();
        const anos = [];
        
        for (let year = currentYear; year >= 2010; year--) {
            anos.push(year.toString());
        }
        
        anoSelect.innerHTML = '<option value="">Seleccionar año</option>';
        
        anos.forEach(ano => {
            const option = document.createElement('option');
            option.value = ano;
            option.textContent = ano;
            anoSelect.appendChild(option);
        });
        
    } catch (error) {
        console.error('Error cargando años:', error);
        anoSelect.innerHTML = '<option value="">Error al cargar años</option>';
    }
}

async function cargarVersiones(ano) {
    const versionSelect = document.getElementById('version');
    
    try {
        // Simulamos versiones - en producción esto vendría de una API
        const versiones = [
            'Base',
            'LE',
            'XLE',
            'Limited',
            'Sport',
            'Hybrid',
            'Premium'
        ];
        
        versionSelect.innerHTML = '<option value="">Seleccionar versión</option>';
        
        versiones.forEach(version => {
            const option = document.createElement('option');
            option.value = version.toLowerCase().replace(/[-\s]/g, '');
            option.textContent = version;
            versionSelect.appendChild(option);
        });
        
    } catch (error) {
        console.error('Error cargando versiones:', error);
        versionSelect.innerHTML = '<option value="">Error al cargar versiones</option>';
    }
}

// Funciones de búsqueda
async function buscarPorVehiculo() {
    const marca = document.getElementById('marca').value;
    const modelo = document.getElementById('modelo').value;
    const ano = document.getElementById('ano').value;
    const version = document.getElementById('version').value;
    
    if (!marca || !modelo || !ano || !version) {
        AppUtils.mostrarMensaje('Por favor complete todos los campos', 'error');
        return;
    }
    
    const vehiculo = {
        marca: document.getElementById('marca').options[document.getElementById('marca').selectedIndex].text,
        modelo: document.getElementById('modelo').options[document.getElementById('modelo').selectedIndex].text,
        ano,
        version: document.getElementById('version').options[document.getElementById('version').selectedIndex].text
    };
    
    AppUtils.mostrarMensaje('Buscando llantas para su vehículo...', 'info');
    
    try {
        // Intentar buscar en la API real
        const response = await fetch(`/api/inventario/buscar-por-vehiculo?marca=${encodeURIComponent(vehiculo.marca)}&modelo=${encodeURIComponent(vehiculo.modelo)}&ano=${ano}`);
        
        let llantas;
        if (response.ok) {
            llantas = await response.json();
            if (llantas.length === 0) {
                // Si no hay resultados en la API, usar datos simulados
                llantas = generarLlantasParaVehiculo(vehiculo);
                AppUtils.mostrarMensaje('Mostrando llantas disponibles (datos de ejemplo)', 'info');
            }
        } else {
            // Si falla la API, usar datos simulados
            llantas = generarLlantasParaVehiculo(vehiculo);
            AppUtils.mostrarMensaje('Mostrando llantas disponibles (datos de ejemplo)', 'info');
        }
        
        mostrarResultados(llantas, `${vehiculo.marca} ${vehiculo.modelo} ${vehiculo.ano} ${vehiculo.version}`);
        
    } catch (error) {
        console.error('Error buscando por vehículo:', error);
        // Fallback a datos simulados
        const llantas = generarLlantasParaVehiculo(vehiculo);
        mostrarResultados(llantas, `${vehiculo.marca} ${vehiculo.modelo} ${vehiculo.ano} ${vehiculo.version}`);
        AppUtils.mostrarMensaje('Mostrando llantas disponibles (datos de ejemplo)', 'info');
    }
}

function buscarPorMedida() {
    const ancho = document.getElementById('ancho').value;
    const serie = document.getElementById('serie').value;
    const rin = document.getElementById('rin').value;
    
    if (!ancho || !serie || !rin) {
        AppUtils.mostrarMensaje('Por favor complete todos los campos de medida', 'error');
        return;
    }
    
    const medida = `${ancho}/${serie}R${rin}`;
    
    AppUtils.mostrarMensaje('Buscando llantas con esa medida...', 'info');
    
    // Simular búsqueda
    setTimeout(() => {
        const llantas = generarLlantasParaMedida(medida);
        mostrarResultados(llantas, `Medida ${medida}`);
    }, 1500);
}

function generarLlantasParaVehiculo(vehiculo) {
    // Simulamos datos de llantas - en producción esto vendría de una API o base de datos
    const marcasLlantas = ['Michelin', 'Bridgestone', 'Continental', 'Goodyear', 'Pirelli', 'Dunlop'];
    const llantas = [];
    
    // Generar medidas posibles para el vehículo
    const medidas = ['205/55R16', '215/60R16', '225/55R17', '235/50R18'];
    
    for (let i = 0; i < 12; i++) {
        const marca = marcasLlantas[Math.floor(Math.random() * marcasLlantas.length)];
        const medida = medidas[Math.floor(Math.random() * medidas.length)];
        const precio = Math.floor(Math.random() * 200000) + 150000; // Entre 150k y 350k
        
        llantas.push({
            id: `llanta-${i}`,
            marca,
            modelo: `${marca} ${getModeloLlanta()}`,
            medida,
            precio,
            stock: Math.floor(Math.random() * 20) + 1,
            imagen: `/images/llantas/${marca.toLowerCase()}-${i % 3 + 1}.jpg`,
            caracteristicas: [
                'Excelente agarre en seco',
                'Buen rendimiento en lluvia', 
                'Larga duración',
                'Bajo nivel de ruido'
            ]
        });
    }
    
    return llantas;
}

function generarLlantasParaMedida(medida) {
    const marcasLlantas = ['Michelin', 'Bridgestone', 'Continental', 'Goodyear', 'Pirelli', 'Dunlop'];
    const llantas = [];
    
    for (let i = 0; i < 8; i++) {
        const marca = marcasLlantas[Math.floor(Math.random() * marcasLlantas.length)];
        const precio = Math.floor(Math.random() * 200000) + 150000;
        
        llantas.push({
            id: `llanta-medida-${i}`,
            marca,
            modelo: `${marca} ${getModeloLlanta()}`,
            medida,
            precio,
            stock: Math.floor(Math.random() * 20) + 1,
            imagen: `/images/llantas/${marca.toLowerCase()}-${i % 3 + 1}.jpg`,
            caracteristicas: [
                'Tecnología avanzada',
                'Máximo rendimiento',
                'Garantía extendida',
                'Fabricación alemana'
            ]
        });
    }
    
    return llantas;
}

function getModeloLlanta() {
    const modelos = ['Energy', 'Turanza', 'PremiumContact', 'EfficientGrip', 'Cinturato', 'SP Sport'];
    return modelos[Math.floor(Math.random() * modelos.length)];
}

function mostrarResultados(llantas, criterio) {
    const resultadosDiv = document.getElementById('resultados');
    const catalogoDiv = document.getElementById('catalogo-llantas');
    
    if (llantas.length === 0) {
        AppUtils.mostrarMensaje('No se encontraron llantas para los criterios seleccionados', 'warning');
        resultadosDiv.style.display = 'none';
        return;
    }
    
    let html = `<div class="search-info"><p><strong>${llantas.length} llantas encontradas</strong> para ${criterio}</p></div>`;
    
    llantas.forEach(llanta => {
        html += `
            <div class="llanta-card">
                <div class="llanta-imagen">
                    <img src="${llanta.imagen}" alt="${llanta.modelo}" 
                         onerror="this.src='/images/llanta-default.png'" loading="lazy">
                </div>
                <div class="llanta-info">
                    <h4>${llanta.modelo}</h4>
                    <p class="medida">${llanta.medida}</p>
                    <div class="precio">
                        <span class="precio-valor">$${llanta.precio.toLocaleString('es-CO')}</span>
                        <small>por llanta</small>
                    </div>
                    <div class="stock ${llanta.stock < 5 ? 'stock-bajo' : ''}">
                        Stock: ${llanta.stock} unidades
                        ${llanta.stock < 5 ? '⚠️' : '✅'}
                    </div>
                    <ul class="caracteristicas">
                        ${llanta.caracteristicas.slice(0, 2).map(c => `<li>${c}</li>`).join('')}
                    </ul>
                    <div class="llanta-acciones">
                        <button class="btn btn-primary btn-sm" onclick="cotizarLlanta('${llanta.id}')">
                            💬 Cotizar
                        </button>
                        <button class="btn btn-secondary btn-sm" onclick="verDetalles('${llanta.id}')">
                            👁️ Ver más
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    
    catalogoDiv.innerHTML = html;
    resultadosDiv.style.display = 'block';
    
    // Scroll suave hacia los resultados
    resultadosDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    AppUtils.mostrarMensaje(`Se encontraron ${llantas.length} llantas disponibles`, 'success');
}

function cotizarLlanta(llantaId) {
    // Simular envío de cotización
    AppUtils.mostrarMensaje('Redirigiendo para solicitar cotización...', 'info');
    
    setTimeout(() => {
        // Aquí podríamos redirigir al formulario de solicitud con datos pre-llenados
        window.location.href = `/?llanta=${llantaId}`;
    }, 1000);
}

function verDetalles(llantaId) {
    // Mostrar modal con detalles de la llanta
    AppUtils.mostrarMensaje('Funcionalidad de detalles próximamente', 'info');
}



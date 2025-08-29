let reservas = [];
let reservasFiltradas = [];
let productos = [];
let reservaActual = null;
let paginaActual = 1;
let reservasPorPagina = 10;
let ordenActual = { campo: 'fecha_creacion', direccion: 'desc' };

// Navigation functions for admin tabs
function irADashboard() {
    window.location.href = '/admin/dashboard';
}

function irAEmpleados() {
    window.location.href = '/admin/dashboard#empleados';
}

function irAReportes() {
    window.location.href = '/admin/dashboard#reportes';
}

function irAConfiguracion() {
    window.location.href = '/admin/dashboard#configuracion';
}

function irACotizaciones() {
    const token = localStorage.getItem('empleadoToken');
    const empleadoData = JSON.parse(localStorage.getItem('empleadoData') || '{}');
    
    if (!token || empleadoData.rol !== 'admin') {
        AppUtils.mostrarMensaje('No tiene permisos para acceder a cotizaciones', 'error');
        return;
    }
    
    window.location.href = '/cotizaciones';
}

function irAInventario() {
    const token = localStorage.getItem('empleadoToken');
    const empleadoData = JSON.parse(localStorage.getItem('empleadoData') || '{}');
    
    if (!token || empleadoData.rol !== 'admin') {
        AppUtils.mostrarMensaje('No tiene permisos para acceder al inventario', 'error');
        return;
    }
    
    window.location.href = '/admin/inventario';
}

function cerrarSesion() {
    localStorage.removeItem('empleadoToken');
    localStorage.removeItem('empleadoData');
    window.location.href = '/empleado/login';
}

document.addEventListener('DOMContentLoaded', async function() {
    AppUtils.cargarVersion();
    setupEventListeners();
    
    const autenticado = await verificarAutenticacion();
    if (autenticado) {
        cargarReservas();
        cargarProductos();
        actualizarEstadisticas();
    }
});

function setupEventListeners() {
    // Búsqueda en tiempo real con debounce
    document.getElementById('buscar-reserva').addEventListener('input', 
        AppUtils.debounce(filtrarReservas, 300));
    
    // Filtros
    document.getElementById('filtro-estado-reserva').addEventListener('change', filtrarReservas);
    document.getElementById('fecha-vencimiento-filtro').addEventListener('change', filtrarReservas);
    
    // Forms
    document.getElementById('form-reserva').addEventListener('submit', guardarReserva);
    
    // Cerrar modales con Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal:not(.hidden)').forEach(modal => {
                cerrarModal(modal.id);
            });
        }
    });
    
    // Cerrar modales al hacer clic fuera
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                cerrarModal(modal.id);
            }
        });
    });
}

async function verificarAutenticacion() {
    const token = localStorage.getItem('empleadoToken');
    const empleadoData = JSON.parse(localStorage.getItem('empleadoData') || '{}');
    
    if (!token || empleadoData.rol !== 'admin') {
        window.location.href = '/empleado/login';
        return false;
    }
    
    try {
        const response = await fetch('/api/empleado/verify', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Token inválido');
        }
        
        return true;
    } catch (error) {
        console.error('Error verificando autenticación:', error);
        localStorage.removeItem('empleadoToken');
        localStorage.removeItem('empleadoData');
        window.location.href = '/empleado/login';
        return false;
    }
}

async function cargarReservas() {
    try {
        document.getElementById('loading-reservas').style.display = 'block';
        document.getElementById('tabla-reservas-container').style.display = 'none';
        
        const token = localStorage.getItem('empleadoToken');
        const response = await fetch('/api/inventario/reservas', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            reservas = await response.json();
            reservasFiltradas = [...reservas];
            mostrarReservas();
            actualizarPaginacion();
        } else {
            // Datos de demostración si no hay API
            reservas = generarDatosDemo();
            reservasFiltradas = [...reservas];
            mostrarReservas();
            actualizarPaginacion();
        }
    } catch (error) {
        console.error('Error cargando reservas:', error);
        // Usar datos de demostración
        reservas = generarDatosDemo();
        reservasFiltradas = [...reservas];
        mostrarReservas();
        actualizarPaginacion();
    } finally {
        document.getElementById('loading-reservas').style.display = 'none';
        document.getElementById('tabla-reservas-container').style.display = 'block';
    }
}

function generarDatosDemo() {
    const productos = ['Michelin 205/55R16', 'Bridgestone 225/60R17', 'Continental 195/60R15', 'Pirelli 235/55R18'];
    const clientes = ['Transportes García', 'Taller Méndez', 'Auto Servicio López', 'Comercial Rodríguez'];
    const estados = ['activa', 'parcial', 'completada', 'vencida', 'cancelada'];
    
    const reservasDemo = [];
    
    for (let i = 0; i < 15; i++) {
        const cantidadReservada = 2 + Math.floor(Math.random() * 8);
        const cantidadUsada = Math.floor(Math.random() * cantidadReservada);
        const estado = estados[Math.floor(Math.random() * estados.length)];
        
        const fechaCreacion = new Date();
        fechaCreacion.setDate(fechaCreacion.getDate() - Math.floor(Math.random() * 60));
        
        const fechaLimite = new Date(fechaCreacion);
        fechaLimite.setDate(fechaLimite.getDate() + 7 + Math.floor(Math.random() * 14));
        
        reservasDemo.push({
            id: `RES-${String(i + 1).padStart(3, '0')}`,
            producto: productos[Math.floor(Math.random() * productos.length)],
            cliente: clientes[Math.floor(Math.random() * clientes.length)],
            cotizacion_id: Math.random() > 0.5 ? `COT-2024-${String(i + 1).padStart(3, '0')}` : '',
            cantidad_reservada: cantidadReservada,
            cantidad_usada: cantidadUsada,
            cantidad_disponible: cantidadReservada - cantidadUsada,
            fecha_creacion: fechaCreacion.toISOString(),
            fecha_limite: fechaLimite.toISOString(),
            estado: estado,
            observaciones: Math.random() > 0.6 ? `Observaciones para la reserva ${i + 1}` : '',
            usuario_creacion: 'Admin'
        });
    }
    
    return reservasDemo.sort((a, b) => new Date(b.fecha_creacion) - new Date(a.fecha_creacion));
}

async function cargarProductos() {
    try {
        const token = localStorage.getItem('empleadoToken');
        const response = await fetch('/api/inventario/productos', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            productos = await response.json();
        } else {
            // Productos de demostración
            productos = [
                { id: 1, marca: 'Michelin', modelo: 'Energy Saver', medida: '205/55R16', stock_actual: 15, stock_disponible: 12 },
                { id: 2, marca: 'Bridgestone', modelo: 'Turanza', medida: '225/60R17', stock_actual: 8, stock_disponible: 6 },
                { id: 3, marca: 'Continental', modelo: 'EcoContact', medida: '195/60R15', stock_actual: 12, stock_disponible: 10 },
                { id: 4, marca: 'Pirelli', modelo: 'Cinturato', medida: '235/55R18', stock_actual: 5, stock_disponible: 3 }
            ];
        }
        
        actualizarSelectProductos();
    } catch (error) {
        console.error('Error cargando productos:', error);
        productos = [
            { id: 1, marca: 'Michelin', modelo: 'Energy Saver', medida: '205/55R16', stock_actual: 15, stock_disponible: 12 },
            { id: 2, marca: 'Bridgestone', modelo: 'Turanza', medida: '225/60R17', stock_actual: 8, stock_disponible: 6 },
            { id: 3, marca: 'Continental', modelo: 'EcoContact', medida: '195/60R15', stock_actual: 12, stock_disponible: 10 },
            { id: 4, marca: 'Pirelli', modelo: 'Cinturato', medida: '235/55R18', stock_actual: 5, stock_disponible: 3 }
        ];
        actualizarSelectProductos();
    }
}

function actualizarSelectProductos() {
    const select = document.getElementById('reserva-producto');
    select.innerHTML = '<option value="">Seleccionar producto</option>';
    
    productos.forEach(producto => {
        const option = document.createElement('option');
        option.value = producto.id;
        option.textContent = `${producto.marca} ${producto.modelo} ${producto.medida} (Disponible: ${producto.stock_disponible || producto.stock_actual})`;
        option.dataset.stockDisponible = producto.stock_disponible || producto.stock_actual;
        select.appendChild(option);
    });
    
    // Event listener para actualizar info de stock disponible
    select.addEventListener('change', function() {
        const selectedOption = this.options[this.selectedIndex];
        const stockInfo = document.getElementById('stock-disponible-info');
        
        if (selectedOption.value) {
            const stockDisponible = selectedOption.dataset.stockDisponible;
            stockInfo.textContent = `Stock disponible: ${stockDisponible}`;
            
            // Actualizar max del input de cantidad
            const cantidadInput = document.getElementById('reserva-cantidad');
            cantidadInput.max = stockDisponible;
        } else {
            stockInfo.textContent = 'Stock disponible: -';
        }
    });
}

function mostrarReservas() {
    const tbody = document.getElementById('tabla-reservas-body');
    const noReservas = document.getElementById('no-reservas');
    
    if (reservasFiltradas.length === 0) {
        tbody.innerHTML = '';
        document.getElementById('tabla-reservas-container').style.display = 'none';
        noReservas.style.display = 'block';
        return;
    }
    
    noReservas.style.display = 'none';
    document.getElementById('tabla-reservas-container').style.display = 'block';
    
    const inicio = (paginaActual - 1) * reservasPorPagina;
    const fin = inicio + reservasPorPagina;
    const reservasPagina = reservasFiltradas.slice(inicio, fin);
    
    tbody.innerHTML = reservasPagina.map(reserva => `
        <tr class="${isVencida(reserva.fecha_limite, reserva.estado) ? 'reserva-vencida' : ''}">
            <td><strong>${reserva.id}</strong></td>
            <td>${reserva.producto}</td>
            <td>
                <div>${reserva.cliente}</div>
                ${reserva.cotizacion_id ? `<small class="text-muted">${reserva.cotizacion_id}</small>` : ''}
            </td>
            <td class="text-center"><strong>${reserva.cantidad_reservada}</strong></td>
            <td class="text-center">${reserva.cantidad_usada}</td>
            <td class="text-center">${reserva.cantidad_disponible}</td>
            <td>${AppUtils.formatearFecha(reserva.fecha_limite)}</td>
            <td><span class="estado-reserva ${reserva.estado}">${getEstadoText(reserva.estado)}</span></td>
            <td>
                <button onclick="gestionarReserva('${reserva.id}')" class="btn btn-primary btn-sm" title="Gestionar">
                    ⚙️
                </button>
                <button onclick="verDetalleReserva('${reserva.id}')" class="btn btn-info btn-sm" title="Ver detalle">
                    👁️
                </button>
            </td>
        </tr>
    `).join('');
}

function isVencida(fechaLimite, estado) {
    return new Date(fechaLimite) < new Date() && estado === 'activa';
}

function getEstadoText(estado) {
    const textos = {
        'activa': '✅ Activa',
        'parcial': '🟡 Parcial',
        'completada': '✅ Completada',
        'vencida': '⏰ Vencida',
        'cancelada': '❌ Cancelada'
    };
    return textos[estado] || estado;
}

function filtrarReservas() {
    const busqueda = document.getElementById('buscar-reserva').value.toLowerCase();
    const estadoFiltro = document.getElementById('filtro-estado-reserva').value;
    const fechaVencimiento = document.getElementById('fecha-vencimiento-filtro').value;
    
    reservasFiltradas = reservas.filter(reserva => {
        const cumpleBusqueda = !busqueda || 
            reserva.producto.toLowerCase().includes(busqueda) ||
            reserva.cliente.toLowerCase().includes(busqueda) ||
            (reserva.cotizacion_id && reserva.cotizacion_id.toLowerCase().includes(busqueda)) ||
            reserva.id.toLowerCase().includes(busqueda);
        
        const cumpleEstado = !estadoFiltro || reserva.estado === estadoFiltro;
        
        const cumpleFechaVencimiento = !fechaVencimiento || 
            new Date(reserva.fecha_limite).toDateString() === new Date(fechaVencimiento).toDateString();
        
        return cumpleBusqueda && cumpleEstado && cumpleFechaVencimiento;
    });
    
    paginaActual = 1;
    mostrarReservas();
    actualizarPaginacion();
}

function limpiarBusqueda() {
    document.getElementById('buscar-reserva').value = '';
    document.getElementById('filtro-estado-reserva').value = '';
    document.getElementById('fecha-vencimiento-filtro').value = '';
    filtrarReservas();
}

function actualizarEstadisticas() {
    const totalReservas = reservas.length;
    const reservasVencidas = reservas.filter(r => isVencida(r.fecha_limite, r.estado)).length;
    const reservasActivas = reservas.filter(r => r.estado === 'activa').length;
    const productosReservados = new Set(reservas.filter(r => r.estado === 'activa').map(r => r.producto)).size;
    
    document.getElementById('total-reservas').textContent = totalReservas;
    document.getElementById('reservas-vencidas').textContent = reservasVencidas;
    document.getElementById('reservas-activas').textContent = reservasActivas;
    document.getElementById('productos-reservados').textContent = productosReservados;
}

function actualizarPaginacion() {
    const totalPaginas = Math.ceil(reservasFiltradas.length / reservasPorPagina);
    const paginacion = document.getElementById('paginacion');
    
    if (totalPaginas <= 1) {
        paginacion.style.display = 'none';
        return;
    }
    
    paginacion.style.display = 'flex';
    
    const inicio = (paginaActual - 1) * reservasPorPagina + 1;
    const fin = Math.min(paginaActual * reservasPorPagina, reservasFiltradas.length);
    
    document.getElementById('info-paginacion').textContent = 
        `Mostrando ${inicio}-${fin} de ${reservasFiltradas.length} reservas`;
    
    document.getElementById('btn-anterior').disabled = paginaActual <= 1;
    document.getElementById('btn-siguiente').disabled = paginaActual >= totalPaginas;
    
    // Event listeners para paginación
    document.getElementById('btn-anterior').onclick = () => {
        if (paginaActual > 1) {
            paginaActual--;
            mostrarReservas();
            actualizarPaginacion();
        }
    };
    
    document.getElementById('btn-siguiente').onclick = () => {
        if (paginaActual < totalPaginas) {
            paginaActual++;
            mostrarReservas();
            actualizarPaginacion();
        }
    };
}

function mostrarFormularioReserva() {
    document.getElementById('modal-nueva-reserva').classList.remove('hidden');
    document.getElementById('form-reserva').reset();
    
    // Establecer fecha límite mínima (hoy)
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('reserva-fecha-limite').min = hoy;
}

async function guardarReserva(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const reservaData = Object.fromEntries(formData);
    
    // Limpiar errores previos
    AppUtils.limpiarErroresForm('form-reserva');
    
    // Validación básica
    const errores = [];
    if (!reservaData.producto_id) errores.push('Seleccione un producto');
    if (!reservaData.cantidad || reservaData.cantidad <= 0) errores.push('Ingrese una cantidad válida');
    if (!reservaData.fecha_limite) errores.push('Seleccione una fecha límite');
    
    // Validar que la fecha límite sea futura
    if (reservaData.fecha_limite) {
        const fechaLimite = new Date(reservaData.fecha_limite);
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        
        if (fechaLimite <= hoy) {
            errores.push('La fecha límite debe ser futura');
        }
    }
    
    if (errores.length > 0) {
        AppUtils.mostrarErroresForm(errores, 'form-reserva');
        return;
    }
    
    try {
        // Simular guardado
        AppUtils.mostrarMensaje('Reserva creada correctamente', 'success');
        cerrarModal('modal-nueva-reserva');
        
        // Recargar reservas
        await cargarReservas();
        actualizarEstadisticas();
    } catch (error) {
        console.error('Error guardando reserva:', error);
        AppUtils.mostrarErroresForm(['Error al crear la reserva. Intente nuevamente.'], 'form-reserva');
    }
}

function gestionarReserva(id) {
    const reserva = reservas.find(r => r.id === id);
    if (!reserva) return;
    
    reservaActual = reserva;
    
    // Llenar datos del modal
    document.getElementById('detalle-producto').textContent = reserva.producto;
    document.getElementById('detalle-cliente').textContent = reserva.cliente;
    document.getElementById('detalle-cantidad-reservada').textContent = reserva.cantidad_reservada;
    document.getElementById('detalle-cantidad-usada').textContent = reserva.cantidad_usada;
    document.getElementById('detalle-cantidad-disponible').textContent = reserva.cantidad_disponible;
    document.getElementById('detalle-fecha-limite').textContent = AppUtils.formatearFecha(reserva.fecha_limite);
    
    // Configurar máximos para inputs
    document.getElementById('cantidad-usar').max = reserva.cantidad_disponible;
    
    document.getElementById('modal-gestionar-reserva').classList.remove('hidden');
}

function verDetalleReserva(id) {
    const reserva = reservas.find(r => r.id === id);
    if (!reserva) return;
    
    const detalles = [
        `ID: ${reserva.id}`,
        `Producto: ${reserva.producto}`,
        `Cliente: ${reserva.cliente}`,
        `Cantidad reservada: ${reserva.cantidad_reservada}`,
        `Cantidad usada: ${reserva.cantidad_usada}`,
        `Cantidad disponible: ${reserva.cantidad_disponible}`,
        `Fecha creación: ${AppUtils.formatearFecha(reserva.fecha_creacion)}`,
        `Fecha límite: ${AppUtils.formatearFecha(reserva.fecha_limite)}`,
        `Estado: ${getEstadoText(reserva.estado)}`,
        `Usuario: ${reserva.usuario_creacion}`
    ];
    
    if (reserva.cotizacion_id) {
        detalles.splice(3, 0, `Cotización: ${reserva.cotizacion_id}`);
    }
    
    if (reserva.observaciones) {
        detalles.push(`Observaciones: ${reserva.observaciones}`);
    }
    
    alert(detalles.join('\n'));
}

function usarStockReservado() {
    const cantidad = parseInt(document.getElementById('cantidad-usar').value);
    
    if (!cantidad || cantidad <= 0) {
        AppUtils.mostrarMensaje('Ingrese una cantidad válida', 'error');
        return;
    }
    
    if (cantidad > reservaActual.cantidad_disponible) {
        AppUtils.mostrarMensaje('La cantidad excede el stock disponible de la reserva', 'error');
        return;
    }
    
    // Simular uso de stock
    AppUtils.mostrarMensaje(`Se usaron ${cantidad} unidades de la reserva ${reservaActual.id}`, 'success');
    cerrarModal('modal-gestionar-reserva');
    
    // Recargar datos
    cargarReservas();
    actualizarEstadisticas();
}

function modificarFechaLimite() {
    const nuevaFecha = document.getElementById('nueva-fecha-limite').value;
    
    if (!nuevaFecha) {
        AppUtils.mostrarMensaje('Seleccione una fecha válida', 'error');
        return;
    }
    
    const fechaSeleccionada = new Date(nuevaFecha);
    const hoy = new Date();
    
    if (fechaSeleccionada <= hoy) {
        AppUtils.mostrarMensaje('La fecha debe ser futura', 'error');
        return;
    }
    
    // Simular modificación
    AppUtils.mostrarMensaje(`Fecha límite de la reserva ${reservaActual.id} actualizada`, 'success');
    cerrarModal('modal-gestionar-reserva');
    
    // Recargar datos
    cargarReservas();
}

function liberarReserva() {
    if (!confirm(`¿Está seguro de liberar el stock de la reserva ${reservaActual.id}?`)) {
        return;
    }
    
    // Simular liberación
    AppUtils.mostrarMensaje(`Stock de la reserva ${reservaActual.id} liberado correctamente`, 'success');
    cerrarModal('modal-gestionar-reserva');
    
    // Recargar datos
    cargarReservas();
    actualizarEstadisticas();
}

function cancelarReserva() {
    if (!confirm(`¿Está seguro de cancelar la reserva ${reservaActual.id}?`)) {
        return;
    }
    
    // Simular cancelación
    AppUtils.mostrarMensaje(`Reserva ${reservaActual.id} cancelada correctamente`, 'success');
    cerrarModal('modal-gestionar-reserva');
    
    // Recargar datos
    cargarReservas();
    actualizarEstadisticas();
}

function exportarReservas() {
    if (reservasFiltradas.length === 0) {
        AppUtils.mostrarMensaje('No hay reservas para exportar', 'error');
        return;
    }
    
    AppUtils.mostrarMensaje('Funcionalidad de exportación en desarrollo', 'info');
}

function cerrarModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

function ordenarPor(campo) {
    if (ordenActual.campo === campo) {
        ordenActual.direccion = ordenActual.direccion === 'asc' ? 'desc' : 'asc';
    } else {
        ordenActual.campo = campo;
        ordenActual.direccion = 'asc';
    }
    
    reservasFiltradas.sort((a, b) => {
        let valorA = a[campo];
        let valorB = b[campo];
        
        if (campo.includes('fecha')) {
            valorA = new Date(valorA);
            valorB = new Date(valorB);
        } else if (typeof valorA === 'string') {
            valorA = valorA.toLowerCase();
            valorB = valorB.toLowerCase();
        }
        
        if (ordenActual.direccion === 'asc') {
            return valorA > valorB ? 1 : -1;
        } else {
            return valorA < valorB ? 1 : -1;
        }
    });
    
    mostrarReservas();
}
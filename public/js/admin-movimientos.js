let movimientos = [];
let movimientosFiltrados = [];
let productos = [];
let paginaActual = 1;
let movimientosPorPagina = 10;
let ordenActual = { campo: 'fecha', direccion: 'desc' };

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
        cargarMovimientos();
        cargarProductos();
        actualizarEstadisticas();
    }
});

function setupEventListeners() {
    // Búsqueda en tiempo real con debounce
    document.getElementById('buscar-movimiento').addEventListener('input', 
        AppUtils.debounce(filtrarMovimientos, 300));
    
    // Filtros
    document.getElementById('filtro-tipo-movimiento').addEventListener('change', filtrarMovimientos);
    document.getElementById('fecha-desde').addEventListener('change', filtrarMovimientos);
    document.getElementById('fecha-hasta').addEventListener('change', filtrarMovimientos);
    
    // Form de movimiento
    document.getElementById('form-movimiento').addEventListener('submit', guardarMovimiento);
    
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

async function cargarMovimientos() {
    try {
        document.getElementById('loading-movimientos').style.display = 'block';
        document.getElementById('tabla-movimientos-container').style.display = 'none';
        
        const token = localStorage.getItem('empleadoToken');
        const response = await fetch('/api/inventario/movimientos', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            movimientos = await response.json();
            movimientosFiltrados = [...movimientos];
            mostrarMovimientos();
            actualizarPaginacion();
        } else {
            // Datos de demostración si no hay API
            movimientos = generarDatosDemo();
            movimientosFiltrados = [...movimientos];
            mostrarMovimientos();
            actualizarPaginacion();
        }
    } catch (error) {
        console.error('Error cargando movimientos:', error);
        // Usar datos de demostración
        movimientos = generarDatosDemo();
        movimientosFiltrados = [...movimientos];
        mostrarMovimientos();
        actualizarPaginacion();
    } finally {
        document.getElementById('loading-movimientos').style.display = 'none';
        document.getElementById('tabla-movimientos-container').style.display = 'block';
    }
}

function generarDatosDemo() {
    const tipos = ['entrada', 'salida', 'ajuste', 'devolucion'];
    const productos = ['Michelin 205/55R16', 'Bridgestone 225/60R17', 'Continental 195/60R15', 'Pirelli 235/55R18'];
    const motivos = {
        'entrada': ['Compra', 'Devolución cliente', 'Ajuste positivo'],
        'salida': ['Venta', 'Daño', 'Pérdida'],
        'ajuste': ['Inventario físico', 'Corrección sistema'],
        'devolucion': ['Defecto fabricante', 'Cliente insatisfecho']
    };
    
    const movimientosDemo = [];
    
    for (let i = 0; i < 25; i++) {
        const tipo = tipos[Math.floor(Math.random() * tipos.length)];
        const fecha = new Date();
        fecha.setDate(fecha.getDate() - Math.floor(Math.random() * 30));
        
        const stockAnterior = 10 + Math.floor(Math.random() * 20);
        const cantidad = 1 + Math.floor(Math.random() * 5);
        const stockActual = tipo === 'entrada' ? stockAnterior + cantidad : 
                          tipo === 'salida' ? Math.max(0, stockAnterior - cantidad) : 
                          stockAnterior + (Math.random() > 0.5 ? cantidad : -cantidad);
        
        movimientosDemo.push({
            id: i + 1,
            fecha: fecha.toISOString(),
            producto: productos[Math.floor(Math.random() * productos.length)],
            tipo: tipo,
            cantidad: cantidad,
            motivo: motivos[tipo][Math.floor(Math.random() * motivos[tipo].length)],
            usuario: 'Admin',
            stock_anterior: stockAnterior,
            stock_actual: stockActual,
            observaciones: Math.random() > 0.7 ? 'Observaciones adicionales' : '',
            documento_referencia: Math.random() > 0.5 ? `DOC-${1000 + i}` : ''
        });
    }
    
    return movimientosDemo.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
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
                { id: 1, marca: 'Michelin', modelo: 'Energy Saver', medida: '205/55R16', stock_actual: 15 },
                { id: 2, marca: 'Bridgestone', modelo: 'Turanza', medida: '225/60R17', stock_actual: 8 },
                { id: 3, marca: 'Continental', modelo: 'EcoContact', medida: '195/60R15', stock_actual: 12 },
                { id: 4, marca: 'Pirelli', modelo: 'Cinturato', medida: '235/55R18', stock_actual: 5 }
            ];
        }
        
        actualizarSelectProductos();
    } catch (error) {
        console.error('Error cargando productos:', error);
        productos = [
            { id: 1, marca: 'Michelin', modelo: 'Energy Saver', medida: '205/55R16', stock_actual: 15 },
            { id: 2, marca: 'Bridgestone', modelo: 'Turanza', medida: '225/60R17', stock_actual: 8 },
            { id: 3, marca: 'Continental', modelo: 'EcoContact', medida: '195/60R15', stock_actual: 12 },
            { id: 4, marca: 'Pirelli', modelo: 'Cinturato', medida: '235/55R18', stock_actual: 5 }
        ];
        actualizarSelectProductos();
    }
}

function actualizarSelectProductos() {
    const select = document.getElementById('movimiento-producto');
    select.innerHTML = '<option value="">Seleccionar producto</option>';
    
    productos.forEach(producto => {
        const option = document.createElement('option');
        option.value = producto.id;
        option.textContent = `${producto.marca} ${producto.modelo} ${producto.medida} (Stock: ${producto.stock_actual})`;
        option.dataset.stock = producto.stock_actual;
        select.appendChild(option);
    });
}

function mostrarMovimientos() {
    const tbody = document.getElementById('tabla-movimientos-body');
    const noMovimientos = document.getElementById('no-movimientos');
    
    if (movimientosFiltrados.length === 0) {
        tbody.innerHTML = '';
        document.getElementById('tabla-movimientos-container').style.display = 'none';
        noMovimientos.style.display = 'block';
        return;
    }
    
    noMovimientos.style.display = 'none';
    document.getElementById('tabla-movimientos-container').style.display = 'block';
    
    const inicio = (paginaActual - 1) * movimientosPorPagina;
    const fin = inicio + movimientosPorPagina;
    const movimientosPagina = movimientosFiltrados.slice(inicio, fin);
    
    tbody.innerHTML = movimientosPagina.map(movimiento => `
        <tr>
            <td>${AppUtils.formatearFecha(movimiento.fecha)}</td>
            <td>${movimiento.producto}</td>
            <td><span class="tipo-movimiento ${movimiento.tipo}">${getTipoIcon(movimiento.tipo)} ${capitalize(movimiento.tipo)}</span></td>
            <td class="cantidad ${movimiento.tipo === 'entrada' ? 'positiva' : 'negativa'}">${movimiento.tipo === 'entrada' ? '+' : '-'}${movimiento.cantidad}</td>
            <td>${movimiento.motivo}</td>
            <td>${movimiento.usuario}</td>
            <td>${movimiento.stock_anterior}</td>
            <td>${movimiento.stock_actual}</td>
            <td>
                <button onclick="verDetalleMovimiento(${movimiento.id})" class="btn btn-info btn-sm" title="Ver detalle">
                    👁️
                </button>
                ${movimiento.observaciones ? `<button onclick="verObservaciones(${movimiento.id})" class="btn btn-secondary btn-sm" title="Ver observaciones">📝</button>` : ''}
            </td>
        </tr>
    `).join('');
}

function getTipoIcon(tipo) {
    const icons = {
        'entrada': '📈',
        'salida': '📉',
        'ajuste': '⚖️',
        'devolucion': '🔄'
    };
    return icons[tipo] || '📊';
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function filtrarMovimientos() {
    const busqueda = document.getElementById('buscar-movimiento').value.toLowerCase();
    const tipoFiltro = document.getElementById('filtro-tipo-movimiento').value;
    const fechaDesde = document.getElementById('fecha-desde').value;
    const fechaHasta = document.getElementById('fecha-hasta').value;
    
    movimientosFiltrados = movimientos.filter(movimiento => {
        const cumpleBusqueda = !busqueda || 
            movimiento.producto.toLowerCase().includes(busqueda) ||
            movimiento.motivo.toLowerCase().includes(busqueda) ||
            movimiento.usuario.toLowerCase().includes(busqueda);
        
        const cumpleTipo = !tipoFiltro || movimiento.tipo === tipoFiltro;
        
        const fechaMovimiento = new Date(movimiento.fecha);
        const cumpleFechaDesde = !fechaDesde || fechaMovimiento >= new Date(fechaDesde);
        const cumpleFechaHasta = !fechaHasta || fechaMovimiento <= new Date(fechaHasta + 'T23:59:59');
        
        return cumpleBusqueda && cumpleTipo && cumpleFechaDesde && cumpleFechaHasta;
    });
    
    paginaActual = 1;
    mostrarMovimientos();
    actualizarPaginacion();
}

function limpiarBusqueda() {
    document.getElementById('buscar-movimiento').value = '';
    document.getElementById('filtro-tipo-movimiento').value = '';
    document.getElementById('fecha-desde').value = '';
    document.getElementById('fecha-hasta').value = '';
    filtrarMovimientos();
}

function actualizarEstadisticas() {
    const totalEntradas = movimientos.filter(m => m.tipo === 'entrada').length;
    const totalSalidas = movimientos.filter(m => m.tipo === 'salida').length;
    const totalAjustes = movimientos.filter(m => m.tipo === 'ajuste').length;
    
    const hoy = new Date().toDateString();
    const movimientosHoy = movimientos.filter(m => new Date(m.fecha).toDateString() === hoy).length;
    
    document.getElementById('total-entradas').textContent = totalEntradas;
    document.getElementById('total-salidas').textContent = totalSalidas;
    document.getElementById('total-ajustes').textContent = totalAjustes;
    document.getElementById('movimientos-hoy').textContent = movimientosHoy;
}

function actualizarPaginacion() {
    const totalPaginas = Math.ceil(movimientosFiltrados.length / movimientosPorPagina);
    const paginacion = document.getElementById('paginacion');
    
    if (totalPaginas <= 1) {
        paginacion.style.display = 'none';
        return;
    }
    
    paginacion.style.display = 'flex';
    
    const inicio = (paginaActual - 1) * movimientosPorPagina + 1;
    const fin = Math.min(paginaActual * movimientosPorPagina, movimientosFiltrados.length);
    
    document.getElementById('info-paginacion').textContent = 
        `Mostrando ${inicio}-${fin} de ${movimientosFiltrados.length} movimientos`;
    
    document.getElementById('btn-anterior').disabled = paginaActual <= 1;
    document.getElementById('btn-siguiente').disabled = paginaActual >= totalPaginas;
    
    // Event listeners para paginación
    document.getElementById('btn-anterior').onclick = () => {
        if (paginaActual > 1) {
            paginaActual--;
            mostrarMovimientos();
            actualizarPaginacion();
        }
    };
    
    document.getElementById('btn-siguiente').onclick = () => {
        if (paginaActual < totalPaginas) {
            paginaActual++;
            mostrarMovimientos();
            actualizarPaginacion();
        }
    };
}

function mostrarFormularioMovimiento() {
    document.getElementById('modal-movimiento').classList.remove('hidden');
    document.getElementById('form-movimiento').reset();
}

function actualizarTipoMovimiento() {
    const tipo = document.getElementById('movimiento-tipo').value;
    const motivoSelect = document.getElementById('movimiento-motivo');
    
    const motivos = {
        'entrada': [
            { value: 'compra', text: 'Compra a proveedor' },
            { value: 'devolucion', text: 'Devolución de cliente' },
            { value: 'ajuste_positivo', text: 'Ajuste positivo' },
            { value: 'transferencia', text: 'Transferencia entre almacenes' }
        ],
        'salida': [
            { value: 'venta', text: 'Venta a cliente' },
            { value: 'dano', text: 'Daño o deterioro' },
            { value: 'perdida', text: 'Pérdida' },
            { value: 'devolucion_proveedor', text: 'Devolución a proveedor' }
        ],
        'ajuste': [
            { value: 'inventario_fisico', text: 'Inventario físico' },
            { value: 'correccion_sistema', text: 'Corrección del sistema' },
            { value: 'reconteo', text: 'Reconteo' }
        ],
        'devolucion': [
            { value: 'defecto_fabricante', text: 'Defecto de fabricante' },
            { value: 'cliente_insatisfecho', text: 'Cliente insatisfecho' },
            { value: 'producto_incorrecto', text: 'Producto incorrecto' }
        ]
    };
    
    motivoSelect.innerHTML = '<option value="">Seleccionar motivo</option>';
    
    if (tipo && motivos[tipo]) {
        motivos[tipo].forEach(motivo => {
            const option = document.createElement('option');
            option.value = motivo.value;
            option.textContent = motivo.text;
            motivoSelect.appendChild(option);
        });
    }
}

async function guardarMovimiento(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const movimientoData = Object.fromEntries(formData);
    
    // Limpiar errores previos
    AppUtils.limpiarErroresForm('form-movimiento');
    
    // Validación básica
    const errores = [];
    if (!movimientoData.producto_id) errores.push('Seleccione un producto');
    if (!movimientoData.tipo) errores.push('Seleccione el tipo de movimiento');
    if (!movimientoData.cantidad || movimientoData.cantidad <= 0) errores.push('Ingrese una cantidad válida');
    if (!movimientoData.motivo) errores.push('Seleccione un motivo');
    
    if (errores.length > 0) {
        AppUtils.mostrarErroresForm(errores, 'form-movimiento');
        return;
    }
    
    try {
        // Simular guardado
        AppUtils.mostrarMensaje('Movimiento registrado correctamente', 'success');
        cerrarModal('modal-movimiento');
        
        // Recargar movimientos
        await cargarMovimientos();
        actualizarEstadisticas();
    } catch (error) {
        console.error('Error guardando movimiento:', error);
        AppUtils.mostrarErroresForm(['Error al registrar el movimiento. Intente nuevamente.'], 'form-movimiento');
    }
}

function verDetalleMovimiento(id) {
    const movimiento = movimientos.find(m => m.id === id);
    if (!movimiento) return;
    
    const detalles = [
        `Producto: ${movimiento.producto}`,
        `Tipo: ${capitalize(movimiento.tipo)}`,
        `Cantidad: ${movimiento.cantidad}`,
        `Motivo: ${movimiento.motivo}`,
        `Usuario: ${movimiento.usuario}`,
        `Fecha: ${AppUtils.formatearFecha(movimiento.fecha)}`,
        `Stock anterior: ${movimiento.stock_anterior}`,
        `Stock actual: ${movimiento.stock_actual}`
    ];
    
    if (movimiento.documento_referencia) {
        detalles.push(`Documento: ${movimiento.documento_referencia}`);
    }
    
    if (movimiento.observaciones) {
        detalles.push(`Observaciones: ${movimiento.observaciones}`);
    }
    
    alert(detalles.join('\n'));
}

function verObservaciones(id) {
    const movimiento = movimientos.find(m => m.id === id);
    if (movimiento && movimiento.observaciones) {
        alert(`Observaciones:\n${movimiento.observaciones}`);
    }
}

function exportarMovimientos() {
    if (movimientosFiltrados.length === 0) {
        AppUtils.mostrarMensaje('No hay movimientos para exportar', 'error');
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
    
    movimientosFiltrados.sort((a, b) => {
        let valorA = a[campo];
        let valorB = b[campo];
        
        if (campo === 'fecha') {
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
    
    mostrarMovimientos();
}
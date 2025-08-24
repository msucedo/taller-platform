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

// Funciones placeholder para las demás acciones
function verCotizacion(id) { AppUtils.mostrarMensaje('Vista detallada en desarrollo', 'info'); }
function editarCotizacion(id) { AppUtils.mostrarMensaje('Edición en desarrollo', 'info'); }
function duplicarCotizacion(id) { AppUtils.mostrarMensaje('Duplicar en desarrollo', 'info'); }
function generarPDF(id) { AppUtils.mostrarMensaje('PDF en desarrollo', 'info'); }
function enviarCotizacion(id) { AppUtils.mostrarMensaje('Envío en desarrollo', 'info'); }
function cambiarEstado(id, estado) { AppUtils.mostrarMensaje('Cambio de estado en desarrollo', 'info'); }

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



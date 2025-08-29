let productos = [];
let productosFiltrados = [];
let productoAEliminar = null;
let paginaActual = 1;
let productosPorPagina = 10;
let ordenActual = { campo: 'marca', direccion: 'asc' };

document.addEventListener('DOMContentLoaded', async function() {
    AppUtils.cargarVersion();
    setupEventListeners();
    inicializarVista();
    
    // Debug: Verificar que las funciones estén disponibles
    console.log('Functions check:', {
        editarProducto: typeof window.editarProducto,
        verDetalleProducto: typeof window.verDetalleProducto,
        eliminarProducto: typeof window.eliminarProducto,
        cerrarModal: typeof window.cerrarModal
    });
    
    // Verificar si estamos en modo demo (sin autenticación)
    const esDemo = window.location.pathname.includes('demo');
    
    if (esDemo) {
        // Modo demo - cargar productos sin autenticación
        document.getElementById('usuario-nombre').textContent = 'Demo Admin';
        cargarProductos();
    } else {
        // Modo normal - verificar autenticación
        const autenticado = await verificarAutenticacion();
        if (autenticado) {
            cargarProductos();
        }
    }
});

function setupEventListeners() {
    // Búsqueda en tiempo real con debounce
    document.getElementById('buscar-producto').addEventListener('input', 
        AppUtils.debounce(filtrarProductos, 300));
    
    // Filtros
    document.getElementById('filtro-stock').addEventListener('change', filtrarProductos);
    
    // Form de producto
    document.getElementById('form-producto').addEventListener('submit', guardarProducto);
    
    // Upload de imagen
    document.getElementById('producto-imagen-file').addEventListener('change', subirImagen);
    document.getElementById('producto-imagen').addEventListener('input', function() {
        // Actualizar vista previa cuando se cambie la URL manualmente
        const url = this.value;
        if (url && AppUtils.esURLValida(url)) {
            actualizarVistaPrevia(url);
        }
    });
    
    // Paginación
    document.getElementById('btn-anterior').addEventListener('click', () => cambiarPagina(-1));
    document.getElementById('btn-siguiente').addEventListener('click', () => cambiarPagina(1));
    
    // Event listeners para drag & drop (importación masiva)
    const uploadArea = document.querySelector('.upload-area');
    if (uploadArea) {
        uploadArea.addEventListener('dragover', function(e) {
            e.preventDefault();
            this.classList.add('dragover');
        });
        
        uploadArea.addEventListener('dragleave', function(e) {
            e.preventDefault();
            this.classList.remove('dragover');
        });
        
        uploadArea.addEventListener('drop', function(e) {
            e.preventDefault();
            this.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                document.getElementById('archivo-importacion').files = files;
                manejarArchivoSeleccionado(files[0]);
            }
        });
    }
    
    // Event listener para selección de archivo
    const archivoInput = document.getElementById('archivo-importacion');
    if (archivoInput) {
        archivoInput.addEventListener('change', function(e) {
            if (e.target.files.length > 0) {
                manejarArchivoSeleccionado(e.target.files[0]);
            }
        });
    }
    
    // Event delegation para botones de productos (más confiable para contenido dinámico)
    document.addEventListener('click', function(e) {
        const button = e.target.closest('[data-action]');
        if (!button) return;
        
        const action = button.getAttribute('data-action');
        const productoId = button.getAttribute('data-producto-id');
        
        console.log('Button clicked:', { action, productoId });
        
        switch(action) {
            case 'editar':
                editarProducto(productoId);
                break;
            case 'ver':
                verDetalleProducto(productoId);
                break;
            case 'eliminar':
                eliminarProducto(productoId);
                break;
        }
    });
    
    // Event listener específico para botones de cerrar modal
    document.addEventListener('click', function(e) {
        // Botón cancelar en modal de producto
        if (e.target.matches('button[onclick*="cerrarModal"]')) {
            console.log('Cerrar modal button clicked');
            cerrarModal();
            return;
        }
        
        // Botón nuevo producto
        if (e.target.matches('button[onclick*="mostrarFormularioNuevo"]')) {
            console.log('Nuevo producto button clicked');
            mostrarFormularioNuevo();
            return;
        }
    });
}

async function verificarAutenticacion() {
    try {
        const token = localStorage.getItem('empleadoToken');
        if (!token) {
            console.log('No hay token, redirigiendo al login...');
            alert('Debe iniciar sesión como administrador para acceder al inventario.');
            window.location.href = '/empleado/login';
            return false;
        }

        const response = await fetch('/api/empleado/verify', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            console.log('No autenticado, redirigiendo al login...');
            alert('Debe iniciar sesión como administrador para acceder al inventario.');
            window.location.href = '/empleado/login';
            return false;
        }
        
        const data = await response.json();
        console.log('Datos del usuario:', data); // Debug para ver la estructura
        
        if (data.user.rol !== 'admin') {
            alert('Acceso denegado. Solo administradores pueden acceder al inventario.');
            window.location.href = '/empleado/dashboard';
            return false;
        }
        
        document.getElementById('usuario-nombre').textContent = data.user.nombre || 'Administrador';
        return true;
    } catch (error) {
        console.error('Error verificando autenticación:', error);
        alert('Error de conexión. Por favor, inicie sesión nuevamente.');
        window.location.href = '/empleado/login';
        return false;
    }
}

async function cargarProductos() {
    try {
        mostrarCargando(true);
        
        const esDemo = window.location.pathname.includes('demo');
        
        if (esDemo) {
            // Modo demo - usar datos simulados
            const productosSimulados = generarProductosSimulados();
            productos = productosSimulados;
            productosFiltrados = [...productos];
        } else {
            // Modo real - cargar desde API
            const token = localStorage.getItem('empleadoToken');
            const response = await fetch('/api/inventario/productos', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Error al cargar productos');
            }
            
            productos = await response.json();
            productosFiltrados = [...productos];
        }
        
        actualizarMetricas();
        renderizarProductos();
        actualizarPaginacion();
        
    } catch (error) {
        console.error('Error cargando productos:', error);
        AppUtils.mostrarMensaje('Error al cargar el inventario', 'error');
        
        // Si falla la API, mostrar mensaje de error en lugar de datos simulados
        console.error('No se pudieron cargar productos desde la API');
        AppUtils.mostrarMensaje('Error al conectar con el servidor. Verifica tu conexión.', 'error');
        
        // Mostrar estado vacío
        productos = [];
        productosFiltrados = [];
        actualizarMetricas();
        renderizarProductos();
    } finally {
        mostrarCargando(false);
    }
}

// Función eliminada: generarProductosSimulados()
// Ahora se usan productos reales de la base de datos

function actualizarMetricas() {
    const totalProductos = productos.length;
    const productosActivos = productos.filter(p => p.activo).length;
    const stockBajo = productos.filter(p => p.stock_actual <= p.stock_minimo).length;
    const valorInventario = productos.reduce((total, p) => {
        return total + (p.stock_actual * p.precio_venta);
    }, 0);
    
    document.getElementById('total-productos').textContent = totalProductos;
    document.getElementById('productos-activos').textContent = productosActivos;
    document.getElementById('stock-bajo').textContent = stockBajo;
    document.getElementById('valor-inventario').textContent = AppUtils.formatearPrecio(valorInventario);
}

// Variable global para el tipo de vista actual
let vistaActual = 'cards'; // 'cards' o 'table'

// Inicializar la vista según preferencias del usuario
function inicializarVista() {
    // Cargar preferencia guardada o usar vista de tarjetas por defecto
    const vistaGuardada = localStorage.getItem('vistaInventario') || 'cards';
    vistaActual = vistaGuardada;
    
    // Actualizar botones toggle
    const btnTarjetas = document.getElementById('btn-vista-tarjetas');
    const btnTabla = document.getElementById('btn-vista-tabla');
    
    if (vistaActual === 'cards') {
        btnTarjetas.classList.add('active');
        btnTabla.classList.remove('active');
    } else {
        btnTabla.classList.add('active');
        btnTarjetas.classList.remove('active');
    }
}

function renderizarProductos() {
    const vistaTarjetas = document.getElementById('vista-tarjetas');
    const vistaTabla = document.getElementById('vista-tabla');
    const noProductos = document.getElementById('no-productos');
    
    if (productosFiltrados.length === 0) {
        vistaTarjetas.style.display = 'none';
        vistaTabla.style.display = 'none';
        noProductos.style.display = 'block';
        return;
    }
    
    noProductos.style.display = 'none';
    
    // Aplicar paginación
    const inicio = (paginaActual - 1) * productosPorPagina;
    const fin = inicio + productosPorPagina;
    const productosPagina = productosFiltrados.slice(inicio, fin);
    
    if (vistaActual === 'cards') {
        vistaTarjetas.style.display = 'block';
        vistaTabla.style.display = 'none';
        renderizarTarjetas(productosPagina);
    } else {
        vistaTarjetas.style.display = 'none';
        vistaTabla.style.display = 'block';
        renderizarTablaCompacta(productosPagina);
    }
}

function renderizarTarjetas(productos) {
    const container = document.getElementById('vista-tarjetas');
    
    let html = '';
    productos.forEach(producto => {
        const estadoClase = getEstadoClase(producto);
        const estadoTexto = getEstadoTexto(producto);
        
        html += `
            <div class="product-card">
                <div class="product-card-status ${estadoClase}">
                    ${estadoTexto}
                </div>
                
                <div class="product-card-header">
                    <img src="${producto.imagen_url}" alt="${producto.modelo}" 
                         class="product-card-image"
                         onerror="this.src='https://llanteramovil.com/wp-content/uploads/elementor/thumbs/llanta-5-pr0al2r4eqji54wsuj231nsld0ryo0qbwlru1zf280.png'" loading="lazy">
                    
                    <div class="product-card-info">
                        <h4 class="product-card-title">${producto.marca} ${producto.modelo}</h4>
                        <p class="product-card-subtitle">${producto.medida}</p>
                    </div>
                </div>
                
                <div class="product-card-details">
                    <div class="product-detail-item">
                        <span class="product-detail-label">Stock</span>
                        <span class="product-detail-value stock-value ${getStockClase(producto)}">
                            ${producto.stock_actual} unidades
                        </span>
                    </div>
                    
                    <div class="product-detail-item">
                        <span class="product-detail-label">Precio</span>
                        <span class="product-detail-value product-price">
                            ${AppUtils.formatearPrecio(producto.precio_venta)}
                        </span>
                    </div>
                    
                    <div class="product-detail-item">
                        <span class="product-detail-label">Ubicación</span>
                        <span class="product-detail-value">
                            <span class="product-ubicacion">${producto.ubicacion_almacen || 'Sin asignar'}</span>
                        </span>
                    </div>
                    
                    <div class="product-detail-item">
                        <span class="product-detail-label">Stock Mín.</span>
                        <span class="product-detail-value">${producto.stock_minimo}</span>
                    </div>
                </div>
                
                <div class="product-card-actions">
                    <button data-action="editar" data-producto-id="${producto.id}" class="btn btn-primary btn-sm" title="Editar">
                        ✏️ Editar
                    </button>
                    <button data-action="ver" data-producto-id="${producto.id}" class="btn btn-info btn-sm" title="Ver detalles">
                        👁️ Detalles
                    </button>
                    <button data-action="eliminar" data-producto-id="${producto.id}" class="btn btn-danger btn-sm" title="Eliminar">
                        🗑️
                    </button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function renderizarTablaCompacta(productos) {
    const tbody = document.getElementById('tabla-productos');
    
    let html = '';
    productos.forEach(producto => {
        const estadoClase = getEstadoClase(producto);
        const estadoTexto = getEstadoTexto(producto);
        const stockClase = getStockClase(producto);
        
        html += `
            <tr>
                <td class="product-cell">
                    <img src="${producto.imagen_url}" alt="${producto.modelo}" 
                         class="product-image"
                         onerror="this.src='https://llanteramovil.com/wp-content/uploads/elementor/thumbs/llanta-5-pr0al2r4eqji54wsuj231nsld0ryo0qbwlru1zf280.png'" loading="lazy">
                    <div class="product-info">
                        <div class="product-name">${producto.marca} ${producto.modelo}</div>
                        <div class="product-specs">${producto.medida}</div>
                    </div>
                </td>
                
                <td class="ubicacion-cell">
                    ${producto.ubicacion_almacen || 'Sin asignar'}
                </td>
                
                <td class="stock-cell ${stockClase}">
                    ${producto.stock_actual}
                    ${producto.stock_actual <= producto.stock_minimo ? ' ⚠️' : ''}
                    <br><small>min: ${producto.stock_minimo}</small>
                </td>
                
                <td class="price-cell">
                    ${AppUtils.formatearPrecio(producto.precio_venta)}
                </td>
                
                <td class="status-cell">
                    <span class="status-badge ${estadoClase}">${estadoTexto}</span>
                </td>
                
                <td class="actions-cell">
                    <button data-action="editar" data-producto-id="${producto.id}" class="btn btn-primary btn-sm" title="Editar">
                        ✏️
                    </button>
                    <button data-action="ver" data-producto-id="${producto.id}" class="btn btn-info btn-sm" title="Ver">
                        👁️
                    </button>
                    <button data-action="eliminar" data-producto-id="${producto.id}" class="btn btn-danger btn-sm" title="Eliminar">
                        🗑️
                    </button>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

// Función para cambiar entre vistas
function cambiarVista(tipoVista) {
    vistaActual = tipoVista;
    
    // Actualizar botones toggle
    const btnTarjetas = document.getElementById('btn-vista-tarjetas');
    const btnTabla = document.getElementById('btn-vista-tabla');
    
    if (tipoVista === 'cards') {
        btnTarjetas.classList.add('active');
        btnTabla.classList.remove('active');
    } else {
        btnTabla.classList.add('active');
        btnTarjetas.classList.remove('active');
    }
    
    // Guardar preferencia en localStorage
    localStorage.setItem('vistaInventario', tipoVista);
    
    // Re-renderizar con la nueva vista
    renderizarProductos();
}

// Funciones auxiliares para estados y clases
function getEstadoClase(producto) {
    if (!producto.activo) return 'status-inactivo';
    if (producto.stock_actual === 0) return 'status-agotado';
    if (producto.stock_actual <= producto.stock_minimo) return 'status-bajo';
    return 'status-disponible';
}

function getEstadoTexto(producto) {
    if (!producto.activo) return 'Inactivo';
    if (producto.stock_actual === 0) return 'Agotado';
    if (producto.stock_actual <= producto.stock_minimo) return 'Stock Bajo';
    return 'Disponible';
}

function getStockClase(producto) {
    if (producto.stock_actual === 0) return 'agotado';
    if (producto.stock_actual <= producto.stock_minimo) return 'bajo';
    return '';
}

function getEstadoProducto(producto) {
    if (!producto.activo) {
        return '<span class="badge badge-inactive">Inactivo</span>';
    }
    if (producto.stock_actual === 0) {
        return '<span class="badge badge-danger">Agotado</span>';
    }
    if (producto.stock_actual <= producto.stock_minimo) {
        return '<span class="badge badge-warning">Stock Bajo</span>';
    }
    return '<span class="badge badge-success">Disponible</span>';
}

function filtrarProductos() {
    const textoBusqueda = document.getElementById('buscar-producto').value.toLowerCase();
    const filtroStock = document.getElementById('filtro-stock').value;
    
    productosFiltrados = productos.filter(producto => {
        // Filtro por texto
        const coincideTexto = !textoBusqueda || 
            producto.marca.toLowerCase().includes(textoBusqueda) ||
            producto.modelo.toLowerCase().includes(textoBusqueda) ||
            producto.medida.toLowerCase().includes(textoBusqueda) ||
            (producto.proveedor && producto.proveedor.toLowerCase().includes(textoBusqueda));
        
        // Filtro por stock
        let coincideStock = true;
        if (filtroStock === 'disponible') {
            coincideStock = producto.stock_actual > 0 && producto.activo;
        } else if (filtroStock === 'bajo') {
            coincideStock = producto.stock_actual <= producto.stock_minimo && producto.stock_actual > 0;
        } else if (filtroStock === 'agotado') {
            coincideStock = producto.stock_actual === 0;
        }
        
        return coincideTexto && coincideStock;
    });
    
    paginaActual = 1; // Resetear a primera página
    renderizarProductos();
    actualizarPaginacion();
}

function ordenarPor(campo) {
    if (ordenActual.campo === campo) {
        ordenActual.direccion = ordenActual.direccion === 'asc' ? 'desc' : 'asc';
    } else {
        ordenActual.campo = campo;
        ordenActual.direccion = 'asc';
    }
    
    productosFiltrados.sort((a, b) => {
        let valorA = a[campo];
        let valorB = b[campo];
        
        // Manejar casos especiales
        if (campo === 'stock') {
            valorA = a.stock_actual;
            valorB = b.stock_actual;
        } else if (campo === 'precio') {
            valorA = a.precio_venta;
            valorB = b.precio_venta;
        }
        
        if (typeof valorA === 'string') {
            valorA = valorA.toLowerCase();
            valorB = valorB.toLowerCase();
        }
        
        if (ordenActual.direccion === 'asc') {
            return valorA > valorB ? 1 : -1;
        } else {
            return valorA < valorB ? 1 : -1;
        }
    });
    
    renderizarProductos();
    actualizarIndicadorOrden();
}

function actualizarIndicadorOrden() {
    // Actualizar indicadores visuales de ordenamiento
    document.querySelectorAll('th.sortable').forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
    });
    
    const thActivo = document.querySelector(`th[onclick="ordenarPor('${ordenActual.campo}')"]`);
    if (thActivo) {
        thActivo.classList.add(`sort-${ordenActual.direccion}`);
    }
}

// Funciones de modal y formulario
function mostrarFormularioNuevo() {
    document.getElementById('titulo-modal').textContent = 'Nuevo Producto';
    document.getElementById('form-producto').reset();
    document.getElementById('producto-id').value = '';
    // Pre-llenar con imagen por defecto
    document.getElementById('producto-imagen').value = 'https://tinyurl.com/bdhn9ubh';
    // Pre-llenar fecha de ingreso con hoy
    document.getElementById('producto-fecha-ingreso').value = new Date().toISOString().split('T')[0];
    document.getElementById('modal-producto').classList.remove('hidden');
}

function editarProducto(id) {
    console.log('editarProducto called with id:', id);
    console.log('productos array length:', productos.length);
    
    // Asegurar que el ID sea string para comparación
    const productoId = String(id);
    const producto = productos.find(p => String(p.id) === productoId);
    
    if (!producto) {
        console.log('Producto no encontrado:', id);
        console.log('Productos disponibles:', productos.map(p => ({ id: p.id, marca: p.marca, modelo: p.modelo })));
        
        if (window.mostrarInformacion) {
            mostrarInformacion('Error', 'Producto no encontrado: ' + id, 'error');
        } else {
            alert('Producto no encontrado: ' + id);
        }
        return;
    }
    
    document.getElementById('titulo-modal').textContent = 'Editar Producto';
    document.getElementById('producto-id').value = producto.id;
    document.getElementById('producto-marca').value = producto.marca;
    document.getElementById('producto-modelo').value = producto.modelo;
    document.getElementById('producto-medida').value = producto.medida;
    document.getElementById('producto-precio-compra').value = producto.precio_compra || '';
    document.getElementById('producto-precio-venta').value = producto.precio_venta;
    document.getElementById('producto-stock').value = producto.stock_actual;
    document.getElementById('producto-stock-minimo').value = producto.stock_minimo;
    document.getElementById('producto-proveedor').value = producto.proveedor || '';
    document.getElementById('producto-descripcion').value = producto.descripcion || '';
    document.getElementById('producto-imagen').value = producto.imagen_url || '';
    document.getElementById('producto-codigo-barras').value = producto.codigo_barras || '';
    document.getElementById('producto-ubicacion').value = producto.ubicacion_almacen || '';
    document.getElementById('producto-lote').value = producto.numero_lote || '';
    
    // Establecer fecha de ingreso
    if (producto.fecha_ingreso) {
        const fechaIngreso = new Date(producto.fecha_ingreso);
        document.getElementById('producto-fecha-ingreso').value = fechaIngreso.toISOString().split('T')[0];
    } else {
        document.getElementById('producto-fecha-ingreso').value = '';
    }
    
    document.getElementById('modal-producto').classList.remove('hidden');
}

async function guardarProducto(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const productoData = Object.fromEntries(formData.entries());
    const id = document.getElementById('producto-id').value;
    const esDemo = window.location.pathname.includes('demo');
    
    // Debug: Ver qué datos estamos enviando
    console.log('Datos del formulario:', productoData);
    
    // Limpiar errores previos
    limpiarErroresValidacion();
    
    // Validación del lado cliente
    const validationResult = validarProductoDetallado(productoData);
    
    // Debug: Ver errores de validación
    console.log('Resultado de validación:', validationResult);
    
    if (!validationResult.isValid) {
        mostrarErroresValidacion(validationResult.errors);
        AppUtils.mostrarMensaje(`Por favor corrige los errores marcados en rojo`, 'error');
        return;
    }
    
    try {
        if (esDemo) {
            // Modo demo - guardar localmente
            if (id) {
                // Editar producto existente
                const index = productos.findIndex(p => p.id === id);
                if (index !== -1) {
                    productos[index] = { 
                        ...productos[index], 
                        ...productoData,
                        fecha_actualizacion: new Date()
                    };
                    AppUtils.mostrarMensaje('Producto actualizado correctamente', 'success');
                }
            } else {
                // Crear nuevo producto
                const nuevoProducto = {
                    id: `prod-${Date.now()}`,
                    ...productoData,
                    stock_actual: parseInt(productoData.stock_actual) || 0,
                    stock_minimo: parseInt(productoData.stock_minimo) || 5,
                    precio_compra: parseFloat(productoData.precio_compra) || null,
                    precio_venta: parseFloat(productoData.precio_venta) || 0,
                    activo: true,
                    fecha_creacion: new Date(),
                    fecha_actualizacion: new Date()
                };
                
                productos.push(nuevoProducto);
                AppUtils.mostrarMensaje('Producto agregado correctamente', 'success');
            }
        } else {
            // Modo real - usar API
            
            // Extraer el número del ID si tiene formato "prod-123"
            let apiId = id;
            if (id && id.includes('prod-')) {
                apiId = id.replace('prod-', ''); // Convierte "prod-1" a "1"
            }
            
            const url = id ? `/api/inventario/productos/${apiId}` : '/api/inventario/productos';
            const method = id ? 'PUT' : 'POST';
            
            console.log('Enviando al servidor:', {
                originalId: id,
                apiId: apiId,
                url, 
                method, 
                data: productoData
            });
            
            const token = localStorage.getItem('empleadoToken');
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(productoData)
            });
            
            console.log('Respuesta del servidor:', {
                status: response.status,
                ok: response.ok
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.log('Error del servidor (raw):', errorText);
                
                let errorObj;
                try {
                    errorObj = JSON.parse(errorText);
                } catch (e) {
                    errorObj = { error: errorText };
                }
                
                console.log('Error del servidor (parsed):', errorObj);
                throw new Error(errorObj.error || errorObj.message || 'Error al guardar producto');
            }
            
            const resultado = await response.json();
            AppUtils.mostrarMensaje(resultado.mensaje, 'success');
            
            // Recargar productos desde la API
            await cargarProductos();
        }
        
        cerrarModal();
        if (esDemo) {
            filtrarProductos();
            actualizarMetricas();
        }
        
    } catch (error) {
        console.error('Error guardando producto:', error);
        AppUtils.mostrarMensaje(error.message || 'Error al guardar el producto', 'error');
    }
}

function eliminarProducto(id) {
    console.log('eliminarProducto called with id:', id);
    console.log('productos array length:', productos.length);
    
    // Asegurar que el ID sea string para comparación
    const productoId = String(id);
    const producto = productos.find(p => String(p.id) === productoId);
    
    if (!producto) {
        console.log('Producto no encontrado:', id);
        console.log('Productos disponibles:', productos.map(p => ({ id: p.id, marca: p.marca, modelo: p.modelo })));
        
        if (window.mostrarInformacion) {
            mostrarInformacion('Error', 'Producto no encontrado: ' + id, 'error');
        } else {
            alert('Producto no encontrado: ' + id);
        }
        return;
    }
    
    // Usar modal de confirmación profesional si está disponible
    if (window.mostrarConfirmacion) {
        mostrarConfirmacion(
            '🗑️ Eliminar Producto',
            `¿Está seguro de que desea eliminar el producto "${producto.marca} ${producto.modelo} - ${producto.medida}"?\n\nEsta acción no se puede deshacer.`,
            async () => {
                productoAEliminar = id;
                await confirmarEliminacion();
            }
        );
    } else {
        // Fallback a confirm tradicional
        if (confirm(`¿Está seguro de eliminar ${producto.marca} ${producto.modelo}?`)) {
            productoAEliminar = id;
            confirmarEliminacion();
        }
    }
}

async function confirmarEliminacion() {
    if (!productoAEliminar) return;
    
    const esDemo = window.location.pathname.includes('demo');
    
    try {
        if (esDemo) {
            // Modo demo - eliminar localmente
            productos = productos.filter(p => p.id !== productoAEliminar);
            AppUtils.mostrarMensaje('Producto eliminado correctamente', 'success');
            cerrarModalEliminar();
            filtrarProductos();
            actualizarMetricas();
        } else {
            // Modo real - usar API
            const token = localStorage.getItem('empleadoToken');
            const response = await fetch(`/api/inventario/productos/${productoAEliminar}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Error al eliminar producto');
            }
            
            const resultado = await response.json();
            AppUtils.mostrarMensaje(resultado.mensaje, 'success');
            cerrarModalEliminar();
            
            // Recargar productos desde la API
            await cargarProductos();
        }
    } catch (error) {
        console.error('Error eliminando producto:', error);
        AppUtils.mostrarMensaje(error.message || 'Error al eliminar el producto', 'error');
    }
}

function verDetalleProducto(id) {
    console.log('verDetalleProducto called with id:', id);
    console.log('productos array length:', productos.length);
    
    // Asegurar que el ID sea string para comparación
    const productoId = String(id);
    const producto = productos.find(p => String(p.id) === productoId);
    
    if (!producto) {
        console.log('Producto no encontrado:', id);
        console.log('Productos disponibles:', productos.map(p => ({ id: p.id, marca: p.marca, modelo: p.modelo })));
        
        if (window.mostrarInformacion) {
            mostrarInformacion('Error', 'Producto no encontrado: ' + id, 'error');
        } else {
            alert('Producto no encontrado: ' + id);
        }
        return;
    }
    
    // Usar el modal profesional si está disponible, sino usar alert
    if (window.mostrarDetalleProductoProfesional) {
        mostrarDetalleProductoProfesional(producto);
    } else {
        alert(`Detalles del producto:\n\nMarca: ${producto.marca}\nModelo: ${producto.modelo}\nMedida: ${producto.medida}\nStock: ${producto.stock_actual}\nPrecio: $${producto.precio_venta.toLocaleString('es-CO')}\nProveedor: ${producto.proveedor || 'N/A'}`);
    }
}

// Funciones de utilidad específicas
function cerrarModal(modalId = 'modal-producto') {
    console.log('cerrarModal called with modalId:', modalId);
    const modal = document.getElementById(modalId);
    if (modal) {
        console.log('Modal found, adding hidden class');
        modal.classList.add('hidden');
    } else {
        console.log('Modal not found:', modalId);
    }
}

function cerrarModalEliminar() {
    document.getElementById('modal-eliminar').classList.add('hidden');
    productoAEliminar = null;
}

function limpiarBusqueda() {
    document.getElementById('buscar-producto').value = '';
    document.getElementById('filtro-stock').value = '';
    filtrarProductos();
}

function mostrarCargando(mostrar) {
    const loading = document.getElementById('loading-productos');
    const vistaTarjetas = document.getElementById('vista-tarjetas');
    const vistaTabla = document.getElementById('vista-tabla');
    const noProductos = document.getElementById('no-productos');
    
    if (mostrar) {
        if (loading) loading.style.display = 'block';
        if (vistaTarjetas) vistaTarjetas.style.display = 'none';
        if (vistaTabla) vistaTabla.style.display = 'none';
        if (noProductos) noProductos.style.display = 'none';
    } else {
        if (loading) loading.style.display = 'none';
    }
}


// Paginación
function actualizarPaginacion() {
    const totalProductos = productosFiltrados.length;
    const totalPaginas = Math.ceil(totalProductos / productosPorPagina);
    const paginacionDiv = document.getElementById('paginacion');
    
    if (totalPaginas <= 1) {
        paginacionDiv.style.display = 'none';
        return;
    }
    
    paginacionDiv.style.display = 'flex';
    
    // Actualizar información
    const inicio = (paginaActual - 1) * productosPorPagina + 1;
    const fin = Math.min(paginaActual * productosPorPagina, totalProductos);
    document.getElementById('info-paginacion').textContent = 
        `Mostrando ${inicio}-${fin} de ${totalProductos} productos`;
    
    // Botones anterior/siguiente
    document.getElementById('btn-anterior').disabled = paginaActual <= 1;
    document.getElementById('btn-siguiente').disabled = paginaActual >= totalPaginas;
    
    // Números de página
    generarNumerosPagina(totalPaginas);
}

function generarNumerosPagina(totalPaginas) {
    const numerosDiv = document.getElementById('paginas-numeros');
    let html = '';
    
    for (let i = 1; i <= Math.min(totalPaginas, 5); i++) {
        const clase = i === paginaActual ? 'active' : '';
        html += `<button class="page-btn ${clase}" onclick="irAPagina(${i})">${i}</button>`;
    }
    
    if (totalPaginas > 5) {
        html += '<span>...</span>';
        html += `<button class="page-btn" onclick="irAPagina(${totalPaginas})">${totalPaginas}</button>`;
    }
    
    numerosDiv.innerHTML = html;
}

function cambiarPagina(direccion) {
    const totalPaginas = Math.ceil(productosFiltrados.length / productosPorPagina);
    const nuevaPagina = paginaActual + direccion;
    
    if (nuevaPagina >= 1 && nuevaPagina <= totalPaginas) {
        paginaActual = nuevaPagina;
        renderizarProductos();
        actualizarPaginacion();
    }
}

function irAPagina(pagina) {
    paginaActual = pagina;
    renderizarProductos();
    actualizarPaginacion();
}

// Exportar inventario a Excel
async function exportarInventario() {
    try {
        AppUtils.mostrarMensaje('Preparando exportación a Excel...', 'info');
        
        const token = localStorage.getItem('empleadoToken');
        const response = await fetch('/api/inventario/exportar-excel', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            // Obtener el blob del archivo Excel
            const blob = await response.blob();
            
            // Crear URL temporal para descarga
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            
            // Obtener nombre del archivo del header o usar nombre por defecto
            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = 'inventario-export.xlsx';
            
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="(.+)"/);
                if (filenameMatch) {
                    filename = filenameMatch[1];
                }
            }
            
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            
            AppUtils.mostrarMensaje(`✅ Inventario exportado exitosamente como ${filename}`, 'success');
            
        } else {
            const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
            AppUtils.mostrarMensaje(`Error al exportar: ${errorData.error}`, 'error');
        }
        
    } catch (error) {
        console.error('Error en exportación:', error);
        AppUtils.mostrarMensaje('Error de conexión al exportar inventario', 'error');
    }
}

// Logout específico para inventario (considera modo demo)
function logout() {
    const esDemo = window.location.pathname.includes('demo');
    
    if (esDemo) {
        if (window.mostrarConfirmacion) {
            mostrarConfirmacion(
                '🚪 Salir del Demo',
                '¿Desea regresar al inicio?',
                () => {
                    window.location.href = '/';
                }
            );
        } else {
            if (confirm('¿Regresar al inicio?')) {
                window.location.href = '/';
            }
        }
        return;
    }
    
    // Usar modal de confirmación profesional
    if (window.mostrarConfirmacion) {
        mostrarConfirmacion(
            '🚪 Cerrar Sesión',
            '¿Está seguro de que desea cerrar sesión?',
            () => {
                AuthService.ejecutarLogout();
            }
        );
    } else {
        AuthService.logout();
    }
}

// Validación específica de productos con detalles por campo
const validarProductoDetallado = (data) => {
    const errors = {};
    let isValid = true;
    
    console.log('Validando producto detalladamente:', data);
    
    // Validar marca
    if (!data.marca || data.marca.trim().length < 1) {
        errors.marca = 'La marca es requerida';
        isValid = false;
        console.log('Error en marca:', data.marca);
    }
    
    // Validar modelo
    if (!data.modelo || data.modelo.trim().length < 1) {
        errors.modelo = 'El modelo es requerido';
        isValid = false;
        console.log('Error en modelo:', data.modelo);
    }
    
    // Validar medida
    if (!data.medida || data.medida.trim().length < 1) {
        errors.medida = 'La medida es requerida';
        isValid = false;
        console.log('Error en medida:', data.medida);
    }
    
    // Validar precio de venta
    if (!data.precio_venta || data.precio_venta === '' || parseFloat(data.precio_venta) <= 0) {
        errors.precio_venta = 'El precio de venta debe ser mayor a 0';
        isValid = false;
        console.log('Error en precio_venta:', data.precio_venta);
    }
    
    // Validar stock actual (opcional pero no puede ser negativo)
    if (data.stock_actual !== '' && data.stock_actual !== undefined && data.stock_actual !== null) {
        const stock = parseInt(data.stock_actual);
        if (isNaN(stock) || stock < 0) {
            errors.stock_actual = 'El stock actual debe ser un número positivo';
            isValid = false;
            console.log('Error en stock_actual:', data.stock_actual);
        }
    }
    
    // Validar stock mínimo (opcional pero no puede ser negativo)
    if (data.stock_minimo !== '' && data.stock_minimo !== undefined && data.stock_minimo !== null) {
        const stockMin = parseInt(data.stock_minimo);
        if (isNaN(stockMin) || stockMin < 0) {
            errors.stock_minimo = 'El stock mínimo debe ser un número positivo';
            isValid = false;
            console.log('Error en stock_minimo:', data.stock_minimo);
        }
    }
    
    // Validar precio de compra (opcional pero no puede ser negativo)
    if (data.precio_compra !== '' && data.precio_compra !== undefined && data.precio_compra !== null) {
        const precio = parseFloat(data.precio_compra);
        if (isNaN(precio) || precio < 0) {
            errors.precio_compra = 'El precio de compra no puede ser negativo';
            isValid = false;
            console.log('Error en precio_compra:', data.precio_compra);
        }
    }
    
    console.log('Resultado validación:', { isValid, errorsCount: Object.keys(errors).length });
    return { isValid, errors };
};

// Función legacy para compatibilidad
const validarProducto = (data) => {
    const result = validarProductoDetallado(data);
    return result.isValid ? [] : Object.values(result.errors);
};

// Funciones para mostrar errores visuales
function limpiarErroresValidacion() {
    // Remover clases de error de todos los campos
    const campos = ['marca', 'modelo', 'medida', 'precio-venta', 'precio-compra', 'stock', 'stock-minimo'];
    
    campos.forEach(campo => {
        const elemento = document.getElementById(`producto-${campo}`);
        if (elemento) {
            elemento.classList.remove('error');
            // Remover mensaje de error si existe
            const errorMsg = elemento.parentNode.querySelector('.error-message');
            if (errorMsg) {
                errorMsg.remove();
            }
        }
    });
}

function mostrarErroresValidacion(errors) {
    // Mapeo de nombres de campos del form a IDs de elementos
    const campoMap = {
        'marca': 'producto-marca',
        'modelo': 'producto-modelo', 
        'medida': 'producto-medida',
        'precio_venta': 'producto-precio-venta',
        'precio_compra': 'producto-precio-compra',
        'stock_actual': 'producto-stock',
        'stock_minimo': 'producto-stock-minimo'
    };
    
    // Mostrar errores específicos por campo
    Object.keys(errors).forEach(campo => {
        const elementId = campoMap[campo];
        if (elementId) {
            const elemento = document.getElementById(elementId);
            if (elemento) {
                // Agregar clase de error
                elemento.classList.add('error');
                
                // Agregar mensaje de error
                const errorMessage = document.createElement('small');
                errorMessage.className = 'error-message';
                errorMessage.textContent = errors[campo];
                errorMessage.style.color = '#e74c3c';
                errorMessage.style.display = 'block';
                errorMessage.style.marginTop = '4px';
                
                // Insertar después del campo
                elemento.parentNode.insertBefore(errorMessage, elemento.nextSibling);
            }
        }
    });
}

// Funciones para manejo de imágenes
function abrirSeleccionArchivo() {
    document.getElementById('producto-imagen-file').click();
}

async function subirImagen(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validar tamaño (5MB máximo)
    if (file.size > 5 * 1024 * 1024) {
        AppUtils.mostrarMensaje('La imagen es muy grande. Tamaño máximo: 5MB', 'error');
        return;
    }
    
    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
        AppUtils.mostrarMensaje('Solo se permiten archivos de imagen', 'error');
        return;
    }
    
    const esDemo = window.location.pathname.includes('demo');
    
    if (esDemo) {
        // En modo demo, simular upload con un URL temporal
        const reader = new FileReader();
        reader.onload = function(e) {
            const url = e.target.result;
            document.getElementById('producto-imagen').value = url;
            actualizarVistaPrevia(url);
            AppUtils.mostrarMensaje('Imagen cargada (modo demo)', 'success');
        };
        reader.readAsDataURL(file);
        return;
    }
    
    // Modo real - subir a servidor
    const formData = new FormData();
    formData.append('imagen', file);
    
    try {
        AppUtils.mostrarMensaje('Subiendo imagen...', 'info');
        
        const token = localStorage.getItem('empleadoToken');
        const response = await fetch('/api/inventario/upload-imagen', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al subir imagen');
        }
        
        const resultado = await response.json();
        
        // Actualizar el campo de URL con la imagen subida
        document.getElementById('producto-imagen').value = resultado.url;
        actualizarVistaPrevia(resultado.url);
        
        AppUtils.mostrarMensaje(resultado.mensaje, 'success');
        
    } catch (error) {
        console.error('Error subiendo imagen:', error);
        AppUtils.mostrarMensaje(error.message || 'Error al subir imagen', 'error');
    }
}

function mostrarVistaPrevia() {
    const url = document.getElementById('producto-imagen').value.trim();
    
    if (!url) {
        AppUtils.mostrarMensaje('Ingrese una URL de imagen primero', 'warning');
        return;
    }
    
    actualizarVistaPrevia(url);
}

function actualizarVistaPrevia(url) {
    const previewContainer = document.getElementById('imagen-preview');
    const previewImg = document.getElementById('preview-img');
    
    previewImg.src = url;
    previewContainer.style.display = 'block';
    
    // Manejar error de carga de imagen
    previewImg.onerror = function() {
        AppUtils.mostrarMensaje('Error al cargar la imagen. Verifique la URL', 'error');
        previewContainer.style.display = 'none';
    };
}

function cerrarVistaPrevia() {
    document.getElementById('imagen-preview').style.display = 'none';
}

// ===== FUNCIONES DE IMPORTACIÓN MASIVA =====

let pasoActual = 1;
let archivoImportacion = null;
let datosParseados = [];

function mostrarImportacionMasiva() {
    // Resetear estado
    pasoActual = 1;
    archivoImportacion = null;
    datosParseados = [];
    
    // Resetear pasos
    resetearPasos();
    
    // Mostrar modal
    document.getElementById('modal-importacion').classList.remove('hidden');
}

function resetearPasos() {
    // Resetear indicadores de paso
    document.querySelectorAll('.step').forEach((step, index) => {
        step.classList.remove('active', 'completed');
        if (index === 0) step.classList.add('active');
    });
    
    // Mostrar solo el primer paso
    document.querySelectorAll('.import-step').forEach((step, index) => {
        step.style.display = index === 0 ? 'block' : 'none';
    });
    
    // Resetear botones
    document.getElementById('btn-siguiente-paso').disabled = true;
    document.getElementById('btn-anterior-paso').style.display = 'none';
    document.getElementById('btn-importar').style.display = 'none';
    
    // Limpiar archivo seleccionado
    document.getElementById('archivo-importacion').value = '';
    document.getElementById('archivo-seleccionado').style.display = 'none';
}

function siguientePaso() {
    if (pasoActual === 1) {
        // Procesar archivo
        procesarArchivo();
    } else if (pasoActual === 2) {
        // Ir a paso de importación
        pasoActual = 3;
        actualizarPasos();
    }
}

function anteriorPaso() {
    if (pasoActual > 1) {
        pasoActual--;
        actualizarPasos();
    }
}

function actualizarPasos() {
    // Actualizar indicadores
    document.querySelectorAll('.step').forEach((step, index) => {
        step.classList.remove('active', 'completed');
        if (index < pasoActual - 1) {
            step.classList.add('completed');
        } else if (index === pasoActual - 1) {
            step.classList.add('active');
        }
    });
    
    // Mostrar paso actual
    document.querySelectorAll('.import-step').forEach((step, index) => {
        step.style.display = index === pasoActual - 1 ? 'block' : 'none';
    });
    
    // Actualizar botones
    document.getElementById('btn-anterior-paso').style.display = pasoActual > 1 ? 'inline-block' : 'none';
    document.getElementById('btn-siguiente-paso').style.display = pasoActual < 3 ? 'inline-block' : 'none';
    document.getElementById('btn-importar').style.display = pasoActual === 3 ? 'inline-block' : 'none';
    
    if (pasoActual === 2) {
        document.getElementById('btn-siguiente-paso').disabled = false;
    }
}

// Función para manejar archivo seleccionado
function manejarArchivoSeleccionado(archivo) {
    archivoImportacion = archivo;
    
    // Validar tipo de archivo
    const tiposPermitidos = ['.csv', '.xlsx', '.xls'];
    const extension = archivo.name.toLowerCase().substring(archivo.name.lastIndexOf('.'));
    
    if (!tiposPermitidos.includes(extension)) {
        AppUtils.mostrarMensaje('Tipo de archivo no válido. Use CSV o Excel (.xlsx, .xls)', 'error');
        return;
    }
    
    // Mostrar información del archivo
    document.getElementById('nombre-archivo').textContent = archivo.name;
    document.getElementById('tamaño-archivo').textContent = formatearTamaño(archivo.size);
    document.getElementById('archivo-seleccionado').style.display = 'flex';
    
    // Habilitar botón siguiente
    document.getElementById('btn-siguiente-paso').disabled = false;
}

function formatearTamaño(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function quitarArchivo() {
    archivoImportacion = null;
    document.getElementById('archivo-importacion').value = '';
    document.getElementById('archivo-seleccionado').style.display = 'none';
    document.getElementById('btn-siguiente-paso').disabled = true;
}

async function procesarArchivo() {
    if (!archivoImportacion) return;
    
    try {
        AppUtils.mostrarMensaje('Procesando archivo...', 'info');
        
        const extension = archivoImportacion.name.toLowerCase().substring(archivoImportacion.name.lastIndexOf('.'));
        let datos = [];
        
        if (extension === '.csv') {
            datos = await procesarCSV(archivoImportacion);
        } else {
            datos = await procesarExcel(archivoImportacion);
        }
        
        if (datos.length === 0) {
            AppUtils.mostrarMensaje('El archivo está vacío o no tiene datos válidos', 'error');
            return;
        }
        
        datosParseados = validarDatos(datos);
        mostrarPreview();
        pasoActual = 2;
        actualizarPasos();
        
    } catch (error) {
        console.error('Error procesando archivo:', error);
        AppUtils.mostrarMensaje('Error al procesar el archivo: ' + error.message, 'error');
    }
}

async function procesarCSV(archivo) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const csv = e.target.result;
                const lineas = csv.split('\n').filter(linea => linea.trim());
                
                if (lineas.length < 2) {
                    reject(new Error('El archivo CSV debe tener al menos una fila de encabezados y una fila de datos'));
                    return;
                }
                
                const encabezados = lineas[0].split(',').map(h => h.trim().replace(/"/g, ''));
                const datos = [];
                
                for (let i = 1; i < lineas.length; i++) {
                    const valores = lineas[i].split(',').map(v => v.trim().replace(/"/g, ''));
                    const fila = {};
                    
                    encabezados.forEach((encabezado, index) => {
                        fila[encabezado] = valores[index] || '';
                    });
                    
                    datos.push(fila);
                }
                
                resolve(datos);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = () => reject(new Error('Error al leer el archivo'));
        reader.readAsText(archivo);
    });
}

async function procesarExcel(archivo) {
    // Para Excel necesitaríamos una librería como SheetJS
    // Por simplicidad, vamos a mostrar un mensaje para usar CSV
    throw new Error('Para archivos Excel, por favor convierta a CSV primero. Próximamente soporte nativo para Excel.');
}

function validarDatos(datos) {
    const columnasRequeridas = ['marca', 'modelo', 'medida', 'precio_venta', 'stock_actual'];
    const datosValidados = [];
    
    datos.forEach((fila, index) => {
        const errores = [];
        const filaValidada = { ...fila, _errores: [], _valida: true, _numeroFila: index + 2 };
        
        // Validar columnas requeridas
        columnasRequeridas.forEach(col => {
            if (!fila[col] || fila[col].toString().trim() === '') {
                errores.push(`${col} es requerido`);
            }
        });
        
        // Validar formato de medida
        if (fila.medida && !/^\d{3}\/\d{2}R\d{2}$/.test(fila.medida)) {
            errores.push('Medida debe tener formato 205/55R16');
        }
        
        // Validar precio
        if (fila.precio_venta && (isNaN(fila.precio_venta) || parseFloat(fila.precio_venta) <= 0)) {
            errores.push('Precio debe ser un número mayor a 0');
        }
        
        // Validar stock
        if (fila.stock_actual && (isNaN(fila.stock_actual) || parseInt(fila.stock_actual) < 0)) {
            errores.push('Stock debe ser un número entero positivo');
        }
        
        if (errores.length > 0) {
            filaValidada._valida = false;
            filaValidada._errores = errores;
        }
        
        datosValidados.push(filaValidada);
    });
    
    return datosValidados;
}

function mostrarPreview() {
    const totalFilas = datosParseados.length;
    const filasValidas = datosParseados.filter(f => f._valida).length;
    const filasError = totalFilas - filasValidas;
    
    // Actualizar estadísticas
    document.getElementById('total-filas').textContent = totalFilas;
    document.getElementById('filas-validas').textContent = filasValidas;
    document.getElementById('filas-error').textContent = filasError;
    
    // Mostrar tabla de preview
    const tabla = document.getElementById('tabla-preview');
    const thead = document.getElementById('tabla-preview-head');
    const tbody = document.getElementById('tabla-preview-body');
    
    // Limpiar tabla
    thead.innerHTML = '';
    tbody.innerHTML = '';
    
    if (datosParseados.length === 0) return;
    
    // Crear encabezados
    const primeraFila = datosParseados[0];
    const columnas = Object.keys(primeraFila).filter(k => !k.startsWith('_'));
    
    const headerRow = document.createElement('tr');
    headerRow.innerHTML = '<th>#</th>' + columnas.map(col => `<th>${col}</th>`).join('') + '<th>Errores</th>';
    thead.appendChild(headerRow);
    
    // Crear filas de datos (mostrar solo las primeras 10 para performance)
    datosParseados.slice(0, 10).forEach(fila => {
        const tr = document.createElement('tr');
        if (!fila._valida) tr.classList.add('error');
        
        let html = `<td>${fila._numeroFila}</td>`;
        columnas.forEach(col => {
            const valor = fila[col] || '';
            html += `<td${!fila._valida && fila._errores.some(e => e.includes(col)) ? ' class="error-cell"' : ''}>${valor}</td>`;
        });
        html += `<td>${fila._errores.join(', ')}</td>`;
        
        tr.innerHTML = html;
        tbody.appendChild(tr);
    });
    
    if (datosParseados.length > 10) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="${columnas.length + 2}" style="text-align: center; font-style: italic; color: #666;">... y ${datosParseados.length - 10} filas más</td>`;
        tbody.appendChild(tr);
    }
}

function descargarPlantilla() {
    const csvContent = "marca,modelo,medida,descripcion,precio_compra,precio_venta,stock_actual,stock_minimo,proveedor\n" +
                      "Michelin,Energy XM2,205/55R16,Llanta ecológica para ciudad,800000,950000,10,5,Distribuidor A\n" +
                      "Bridgestone,Turanza T005,225/60R18,Llanta premium para sedanes,1200000,1400000,8,3,Distribuidor B\n" +
                      "Continental,PowerContact 2,195/65R15,Llanta deportiva,700000,850000,15,5,Distribuidor C";
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', 'plantilla-productos.csv');
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

async function ejecutarImportacion() {
    const filasValidas = datosParseados.filter(f => f._valida);
    
    if (filasValidas.length === 0) {
        AppUtils.mostrarMensaje('No hay productos válidos para importar', 'error');
        return;
    }
    
    const confirmacion = await mostrarConfirmacion(
        '🚀 Confirmar Importación',
        `¿Desea importar ${filasValidas.length} productos válidos?`,
        () => true
    );
    if (!confirmacion) return;
    
    try {
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');
        const importResults = document.getElementById('import-results');
        const resultsList = document.getElementById('results-list');
        
        progressFill.style.width = '0%';
        progressText.textContent = 'Iniciando importación...';
        importResults.style.display = 'none';
        
        // Procesar en lotes de 5 productos para mostrar progreso
        const batchSize = 5;
        const batches = [];
        for (let i = 0; i < filasValidas.length; i += batchSize) {
            batches.push(filasValidas.slice(i, i + batchSize));
        }
        
        let procesados = 0;
        let exitosos = 0;
        let errores = 0;
        const resultados = [];
        
        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];
            
            for (const producto of batch) {
                try {
                    await importarProducto(producto);
                    exitosos++;
                    resultados.push(`✅ ${producto.marca} ${producto.modelo} - Importado correctamente`);
                } catch (error) {
                    errores++;
                    resultados.push(`❌ ${producto.marca} ${producto.modelo} - Error: ${error.message}`);
                }
                
                procesados++;
                const porcentaje = Math.round((procesados / filasValidas.length) * 100);
                progressFill.style.width = `${porcentaje}%`;
                progressText.textContent = `Procesando producto ${procesados} de ${filasValidas.length}...`;
                
                // Pequeña pausa para mostrar progreso
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        // Mostrar resultados
        progressText.textContent = 'Importación completada';
        resultsList.innerHTML = '';
        
        resultados.forEach(resultado => {
            const li = document.createElement('li');
            li.textContent = resultado;
            resultsList.appendChild(li);
        });
        
        importResults.style.display = 'block';
        
        // Mostrar botón de cerrar y ocultar otros botones
        document.getElementById('btn-importar').style.display = 'none';
        document.getElementById('btn-anterior-paso').style.display = 'none';
        document.getElementById('btn-cerrar-importacion').style.display = 'inline-block';
        
        // Recargar inventario
        setTimeout(() => {
            cargarProductos();
            AppUtils.mostrarMensaje(`Importación completada: ${exitosos} exitosos, ${errores} errores`, exitosos > 0 ? 'success' : 'error');
        }, 2000);
        
    } catch (error) {
        console.error('Error en importación:', error);
        AppUtils.mostrarMensaje('Error durante la importación: ' + error.message, 'error');
    }
}

async function importarProducto(producto) {
    const token = localStorage.getItem('empleadoToken');
    
    const data = {
        marca: producto.marca,
        modelo: producto.modelo,
        medida: producto.medida,
        descripcion: producto.descripcion || '',
        precio_compra: producto.precio_compra || null,
        precio_venta: parseFloat(producto.precio_venta),
        stock_actual: parseInt(producto.stock_actual) || 0,
        stock_minimo: parseInt(producto.stock_minimo) || 5,
        proveedor: producto.proveedor || null
    };
    
    const response = await fetch('/api/inventario/productos', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al importar producto');
    }
    
    return response.json();
}

// Función para cerrar modales (reutilizable) - Versión duplicada eliminada
// Se mantiene solo la versión anterior con debug

// ===== SISTEMA DE MODALES PROFESIONALES =====

// Modal de confirmación profesional
function mostrarConfirmacion(titulo, mensaje, onConfirmar, onCancelar = null) {
    return new Promise((resolve) => {
        document.getElementById('confirmacion-titulo').textContent = titulo;
        document.getElementById('confirmacion-mensaje').textContent = mensaje;
        
        const btnSi = document.getElementById('btn-confirmar-si');
        const btnNo = document.getElementById('btn-confirmar-no');
        
        // Limpiar event listeners anteriores
        btnSi.replaceWith(btnSi.cloneNode(true));
        btnNo.replaceWith(btnNo.cloneNode(true));
        
        // Obtener referencias nuevas
        const newBtnSi = document.getElementById('btn-confirmar-si');
        const newBtnNo = document.getElementById('btn-confirmar-no');
        
        newBtnSi.addEventListener('click', () => {
            cerrarModal('modal-confirmacion');
            if (onConfirmar) onConfirmar();
            resolve(true);
        });
        
        newBtnNo.addEventListener('click', () => {
            cerrarModal('modal-confirmacion');
            if (onCancelar) onCancelar();
            resolve(false);
        });
        
        document.getElementById('modal-confirmacion').classList.remove('hidden');
    });
}

// Modal de información profesional
function mostrarInformacion(titulo, mensaje, tipo = 'info') {
    return new Promise((resolve) => {
        const iconos = {
            'info': 'ℹ️',
            'success': '✅',
            'warning': '⚠️',
            'error': '❌'
        };
        
        document.getElementById('informacion-titulo').textContent = `${iconos[tipo]} ${titulo}`;
        document.getElementById('informacion-mensaje').innerHTML = mensaje;
        
        const btnCerrar = document.getElementById('btn-info-cerrar');
        btnCerrar.replaceWith(btnCerrar.cloneNode(true));
        
        const newBtnCerrar = document.getElementById('btn-info-cerrar');
        newBtnCerrar.addEventListener('click', () => {
            cerrarModal('modal-informacion');
            resolve();
        });
        
        document.getElementById('modal-informacion').classList.remove('hidden');
    });
}

// Modal de detalles de producto profesional
function mostrarDetalleProductoProfesional(producto) {
    const fechaCreacion = new Date(producto.fecha_creacion).toLocaleDateString('es-CO');
    const fechaActualizacion = new Date(producto.fecha_actualizacion).toLocaleDateString('es-CO');
    
    const contenido = `
        <div class="product-detail-grid">
            <div class="detail-section">
                <h4>📦 Información Básica</h4>
                <div class="detail-item">
                    <strong>Marca:</strong> ${producto.marca}
                </div>
                <div class="detail-item">
                    <strong>Modelo:</strong> ${producto.modelo}
                </div>
                <div class="detail-item">
                    <strong>Medida:</strong> <span class="badge">${producto.medida}</span>
                </div>
                <div class="detail-item">
                    <strong>Estado:</strong> ${getEstadoProducto(producto)}
                </div>
            </div>
            
            <div class="detail-section">
                <h4>💰 Información Financiera</h4>
                <div class="detail-item">
                    <strong>Precio Venta:</strong> <span class="price-highlight">${AppUtils.formatearPrecio(producto.precio_venta)}</span>
                </div>
                ${producto.precio_compra ? `<div class="detail-item">
                    <strong>Precio Compra:</strong> ${AppUtils.formatearPrecio(producto.precio_compra)}
                </div>` : ''}
                <div class="detail-item">
                    <strong>Margen:</strong> ${producto.precio_compra ? 
                        ((producto.precio_venta - producto.precio_compra) / producto.precio_compra * 100).toFixed(1) + '%' : 
                        'N/A'}
                </div>
            </div>
            
            <div class="detail-section">
                <h4>📊 Inventario</h4>
                <div class="detail-item">
                    <strong>Stock Actual:</strong> <span class="${producto.stock_actual <= producto.stock_minimo ? 'text-warning' : ''}">${producto.stock_actual}</span>
                </div>
                <div class="detail-item">
                    <strong>Stock Mínimo:</strong> ${producto.stock_minimo}
                </div>
                <div class="detail-item">
                    <strong>Valor Inventario:</strong> ${AppUtils.formatearPrecio(producto.stock_actual * producto.precio_venta)}
                </div>
            </div>
            
            <div class="detail-section">
                <h4>🏢 Proveedor y Otros</h4>
                <div class="detail-item">
                    <strong>Proveedor:</strong> ${producto.proveedor || 'No especificado'}
                </div>
                <div class="detail-item">
                    <strong>Descripción:</strong> ${producto.descripcion || 'Sin descripción'}
                </div>
            </div>
            
            <div class="detail-section">
                <h4>📅 Fechas</h4>
                <div class="detail-item">
                    <strong>Fecha Creación:</strong> ${fechaCreacion}
                </div>
                <div class="detail-item">
                    <strong>Última Actualización:</strong> ${fechaActualizacion}
                </div>
            </div>
            
            ${producto.imagen_url ? `
            <div class="detail-section full-width">
                <h4>🖼️ Imagen</h4>
                <div class="product-image-detail">
                    <img src="${producto.imagen_url}" alt="${producto.modelo}" 
                         onerror="this.src='https://tinyurl.com/bdhn9ubh'">
                </div>
            </div>` : ''}
        </div>
    `;
    
    document.getElementById('detalle-titulo').textContent = `📋 ${producto.marca} ${producto.modelo}`;
    document.getElementById('detalle-contenido').innerHTML = contenido;
    document.getElementById('modal-detalle-producto').classList.remove('hidden');
}

// ===== FUNCIONALIDADES NUEVAS: CÓDIGOS QR/BARRAS =====

let movimientos = [];
let inventarioFisico = null;
let reservas = [];
let reservaEnEdicion = null;

// Función para generar código de barras automático
function generarCodigoBarras() {
    const marca = document.getElementById('producto-marca').value || '';
    const modelo = document.getElementById('producto-modelo').value || '';
    const medida = document.getElementById('producto-medida').value || '';
    
    if (!marca || !modelo || !medida) {
        AppUtils.mostrarMensaje('Complete marca, modelo y medida primero', 'warning');
        return;
    }
    
    // Generar código basado en los datos del producto
    const prefijo = marca.substring(0, 3).toUpperCase();
    const sufijo = medida.replace(/[^\d]/g, '').substring(0, 6);
    const timestamp = Date.now().toString().substring(-4);
    const codigoGenerado = `${prefijo}${sufijo}${timestamp}`;
    
    document.getElementById('producto-codigo-barras').value = codigoGenerado;
    AppUtils.mostrarMensaje('Código de barras generado', 'success');
}


// ===== FUNCIONALIDADES MOVIMIENTOS DE INVENTARIO =====

function mostrarMovimientos() {
    cargarMovimientos();
    document.getElementById('modal-movimientos').classList.remove('hidden');
}

function mostrarFormularioMovimiento() {
    // Cargar productos en el select
    const selectProducto = document.getElementById('movimiento-producto');
    selectProducto.innerHTML = '<option value="">Seleccionar producto</option>';
    
    productos.forEach(producto => {
        const option = document.createElement('option');
        option.value = producto.id;
        option.textContent = `${producto.marca} ${producto.modelo} - ${producto.medida} (Stock: ${producto.stock_actual})`;
        option.dataset.stock = producto.stock_actual;
        selectProducto.appendChild(option);
    });
    
    // Event listeners para el formulario de movimiento
    document.getElementById('form-movimiento').onsubmit = registrarMovimiento;
    document.getElementById('movimiento-producto').onchange = function() {
        const selectedOption = this.selectedOptions[0];
        if (selectedOption) {
            const stock = selectedOption.dataset.stock;
            document.getElementById('stock-actual-info').textContent = `Stock actual: ${stock} unidades`;
        }
    };
    
    // Limpiar formulario
    document.getElementById('form-movimiento').reset();
    document.getElementById('stock-actual-info').textContent = 'Stock actual: -';
    
    document.getElementById('modal-movimiento').classList.remove('hidden');
}

function actualizarTipoMovimiento() {
    const tipo = document.getElementById('movimiento-tipo').value;
    const motivoSelect = document.getElementById('movimiento-motivo');
    
    motivoSelect.innerHTML = '<option value="">Seleccionar motivo</option>';
    
    const motivos = {
        'entrada': [
            { value: 'compra', text: '📦 Compra a proveedor' },
            { value: 'devolucion_cliente', text: '↩️ Devolución de cliente' },
            { value: 'produccion', text: '🏭 Producción interna' },
            { value: 'transferencia_entrada', text: '📥 Transferencia de otro almacén' },
            { value: 'ajuste_positivo', text: '➕ Ajuste positivo' }
        ],
        'salida': [
            { value: 'venta', text: '🛒 Venta a cliente' },
            { value: 'devolucion_proveedor', text: '↪️ Devolución a proveedor' },
            { value: 'merma', text: '📉 Merma o deterioro' },
            { value: 'transferencia_salida', text: '📤 Transferencia a otro almacén' },
            { value: 'muestra', text: '🎁 Muestra o regalo' }
        ],
        'ajuste': [
            { value: 'inventario_fisico', text: '📋 Ajuste por inventario físico' },
            { value: 'correccion_error', text: '🔧 Corrección de error' },
            { value: 'diferencia_conteo', text: '🔍 Diferencia en conteo' }
        ],
        'devolucion': [
            { value: 'cliente_defectuoso', text: '❌ Cliente - Producto defectuoso' },
            { value: 'cliente_cambio', text: '🔄 Cliente - Cambio de producto' },
            { value: 'proveedor_garantia', text: '🛡️ Proveedor - Garantía' }
        ]
    };
    
    if (motivos[tipo]) {
        motivos[tipo].forEach(motivo => {
            const option = document.createElement('option');
            option.value = motivo.value;
            option.textContent = motivo.text;
            motivoSelect.appendChild(option);
        });
    }
}

async function registrarMovimiento(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const movimientoData = Object.fromEntries(formData.entries());
    
    // Validar datos
    const producto = productos.find(p => p.id === movimientoData.producto_id);
    if (!producto) {
        AppUtils.mostrarMensaje('Producto no encontrado', 'error');
        return;
    }
    
    const cantidad = parseInt(movimientoData.cantidad);
    const stockAnterior = producto.stock_actual;
    
    // Calcular nuevo stock
    let nuevoStock = stockAnterior;
    if (movimientoData.tipo === 'entrada' || movimientoData.tipo === 'devolucion') {
        nuevoStock = stockAnterior + cantidad;
    } else if (movimientoData.tipo === 'salida') {
        nuevoStock = stockAnterior - cantidad;
        if (nuevoStock < 0) {
            AppUtils.mostrarMensaje('No hay suficiente stock para esta salida', 'error');
            return;
        }
    } else if (movimientoData.tipo === 'ajuste') {
        nuevoStock = cantidad; // En ajustes, la cantidad es el stock final deseado
    }
    
    try {
        const esDemo = window.location.pathname.includes('demo');
        
        if (esDemo) {
            // Modo demo - simular registro
            const nuevoMovimiento = {
                id: `mov-${Date.now()}`,
                producto_id: movimientoData.producto_id,
                producto_info: `${producto.marca} ${producto.modelo} - ${producto.medida}`,
                tipo: movimientoData.tipo,
                cantidad: cantidad,
                motivo: movimientoData.motivo,
                observaciones: movimientoData.observaciones || '',
                documento_referencia: movimientoData.documento_referencia || '',
                stock_anterior: stockAnterior,
                stock_nuevo: nuevoStock,
                usuario: 'Demo Admin',
                fecha: new Date().toISOString()
            };
            
            movimientos.unshift(nuevoMovimiento);
            
            // Actualizar stock del producto
            const productoIndex = productos.findIndex(p => p.id === movimientoData.producto_id);
            productos[productoIndex].stock_actual = nuevoStock;
            
            AppUtils.mostrarMensaje('Movimiento registrado correctamente', 'success');
            
        } else {
            // Modo real - usar API
            const token = localStorage.getItem('empleadoToken');
            const response = await fetch('/api/inventario/movimientos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(movimientoData)
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Error al registrar movimiento');
            }
            
            const resultado = await response.json();
            AppUtils.mostrarMensaje(resultado.mensaje, 'success');
        }
        
        cerrarModal('modal-movimiento');
        cargarMovimientos();
        if (esDemo) {
            actualizarMetricas();
            renderizarProductos();
        } else {
            cargarProductos();
        }
        
    } catch (error) {
        console.error('Error registrando movimiento:', error);
        AppUtils.mostrarMensaje(error.message || 'Error al registrar movimiento', 'error');
    }
}

function cargarMovimientos() {
    const tbody = document.getElementById('tabla-movimientos-body');
    
    if (movimientos.length === 0) {
        // Generar movimientos simulados para demo
        generarMovimientosSimulados();
    }
    
    let html = '';
    movimientos.slice(0, 50).forEach(mov => {
        const fecha = new Date(mov.fecha).toLocaleString('es-CO');
        const tipoClass = {
            'entrada': 'badge-success',
            'salida': 'badge-danger', 
            'ajuste': 'badge-warning',
            'devolucion': 'badge-info'
        }[mov.tipo] || 'badge-secondary';
        
        const tipoIcon = {
            'entrada': '📈',
            'salida': '📉',
            'ajuste': '⚖️',
            'devolucion': '🔄'
        }[mov.tipo] || '📋';
        
        html += `
            <tr>
                <td>${fecha}</td>
                <td>${mov.producto_info}</td>
                <td><span class="badge ${tipoClass}">${tipoIcon} ${mov.tipo.toUpperCase()}</span></td>
                <td>${mov.cantidad}</td>
                <td>${mov.motivo}</td>
                <td>${mov.usuario}</td>
                <td>${mov.stock_anterior}</td>
                <td>${mov.stock_nuevo}</td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

function generarMovimientosSimulados() {
    const tiposMovimientos = ['entrada', 'salida', 'ajuste', 'devolucion'];
    const usuarios = ['Admin', 'Empleado1', 'Empleado2'];
    
    for (let i = 0; i < 20; i++) {
        const producto = productos[Math.floor(Math.random() * productos.length)];
        const tipo = tiposMovimientos[Math.floor(Math.random() * tiposMovimientos.length)];
        const cantidad = Math.floor(Math.random() * 10) + 1;
        const stockAnterior = Math.floor(Math.random() * 50) + 1;
        
        let stockNuevo = stockAnterior;
        if (tipo === 'entrada') stockNuevo += cantidad;
        else if (tipo === 'salida') stockNuevo = Math.max(0, stockAnterior - cantidad);
        else if (tipo === 'ajuste') stockNuevo = cantidad;
        
        movimientos.push({
            id: `mov-sim-${i}`,
            producto_id: producto.id,
            producto_info: `${producto.marca} ${producto.modelo} - ${producto.medida}`,
            tipo: tipo,
            cantidad: cantidad,
            motivo: 'Movimiento simulado',
            observaciones: '',
            documento_referencia: '',
            stock_anterior: stockAnterior,
            stock_nuevo: stockNuevo,
            usuario: usuarios[Math.floor(Math.random() * usuarios.length)],
            fecha: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
        });
    }
    
    // Ordenar por fecha más reciente
    movimientos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
}

// ===== FUNCIONALIDADES INVENTARIO FÍSICO =====

function mostrarInventarioFisico() {
    document.getElementById('modal-inventario-fisico').classList.remove('hidden');
}

function iniciarInventarioFisico() {
    if (inventarioFisico && inventarioFisico.estado === 'en_proceso') {
        AppUtils.mostrarMensaje('Ya hay un inventario físico en proceso', 'warning');
        return;
    }
    
    inventarioFisico = {
        id: `inv-${Date.now()}`,
        fecha_inicio: new Date(),
        estado: 'en_proceso',
        productos: productos.map(p => ({
            ...p,
            conteo_fisico: null,
            diferencia: 0,
            estado_conteo: 'pendiente'
        })),
        usuario: document.getElementById('usuario-nombre').textContent
    };
    
    document.getElementById('conteo-fisico-container').style.display = 'block';
    document.getElementById('total-productos-contar').textContent = productos.length;
    actualizarTablaConteoFisico();
    AppUtils.mostrarMensaje('Inventario físico iniciado', 'success');
}

function actualizarTablaConteoFisico() {
    const tbody = document.getElementById('tabla-conteo-fisico');
    let html = '';
    let contados = 0;
    
    inventarioFisico.productos.forEach((producto, index) => {
        const diferencia = producto.conteo_fisico !== null ? 
            producto.conteo_fisico - producto.stock_actual : 0;
        
        const estadoClass = {
            'pendiente': 'badge-secondary',
            'contado': 'badge-success',
            'diferencia': 'badge-warning'
        }[producto.estado_conteo] || 'badge-secondary';
        
        if (producto.estado_conteo !== 'pendiente') contados++;
        
        html += `
            <tr>
                <td>${producto.marca} ${producto.modelo} - ${producto.medida}</td>
                <td>${producto.ubicacion_almacen || 'No definida'}</td>
                <td>${producto.stock_actual}</td>
                <td>
                    <input type="number" id="conteo-${index}" 
                           value="${producto.conteo_fisico || ''}" 
                           onchange="actualizarConteo(${index}, this.value)"
                           class="form-control" min="0">
                </td>
                <td class="${diferencia !== 0 ? 'text-warning' : ''}">${diferencia}</td>
                <td><span class="badge ${estadoClass}">${producto.estado_conteo.toUpperCase()}</span></td>
                <td>
                    <button onclick="marcarComoContado(${index})" class="btn btn-sm btn-success">✓</button>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
    
    // Actualizar progreso
    document.getElementById('productos-contados').textContent = contados;
    const progreso = (contados / inventarioFisico.productos.length) * 100;
    document.getElementById('progress-conteo').style.width = `${progreso}%`;
}

function actualizarConteo(index, valor) {
    if (!inventarioFisico) return;
    
    const producto = inventarioFisico.productos[index];
    const conteoFisico = parseInt(valor) || 0;
    
    producto.conteo_fisico = conteoFisico;
    producto.diferencia = conteoFisico - producto.stock_actual;
    
    if (producto.diferencia !== 0) {
        producto.estado_conteo = 'diferencia';
    } else {
        producto.estado_conteo = 'contado';
    }
}

function marcarComoContado(index) {
    if (!inventarioFisico) return;
    
    const conteoInput = document.getElementById(`conteo-${index}`);
    if (!conteoInput.value) {
        AppUtils.mostrarMensaje('Ingrese el conteo físico primero', 'warning');
        return;
    }
    
    actualizarConteo(index, conteoInput.value);
    actualizarTablaConteoFisico();
}

function finalizarInventarioFisico() {
    if (!inventarioFisico) return;
    
    const pendientes = inventarioFisico.productos.filter(p => p.estado_conteo === 'pendiente').length;
    
    if (pendientes > 0) {
        const confirmar = confirm(`Hay ${pendientes} productos sin contar. ¿Desea finalizar el inventario?`);
        if (!confirmar) return;
    }
    
    // Aplicar ajustes automáticamente
    let ajustesAplicados = 0;
    
    inventarioFisico.productos.forEach(producto => {
        if (producto.diferencia !== 0 && producto.conteo_fisico !== null) {
            // Actualizar stock en productos
            const productoIndex = productos.findIndex(p => p.id === producto.id);
            if (productoIndex !== -1) {
                productos[productoIndex].stock_actual = producto.conteo_fisico;
                
                // Registrar movimiento de ajuste
                movimientos.unshift({
                    id: `mov-inv-${Date.now()}-${productoIndex}`,
                    producto_id: producto.id,
                    producto_info: `${producto.marca} ${producto.modelo} - ${producto.medida}`,
                    tipo: 'ajuste',
                    cantidad: producto.conteo_fisico,
                    motivo: 'inventario_fisico',
                    observaciones: `Ajuste por inventario físico. Diferencia: ${producto.diferencia}`,
                    documento_referencia: inventarioFisico.id,
                    stock_anterior: producto.stock_actual,
                    stock_nuevo: producto.conteo_fisico,
                    usuario: inventarioFisico.usuario,
                    fecha: new Date().toISOString()
                });
                
                ajustesAplicados++;
            }
        }
    });
    
    inventarioFisico.estado = 'completado';
    inventarioFisico.fecha_fin = new Date();
    
    AppUtils.mostrarMensaje(`Inventario físico completado. ${ajustesAplicados} ajustes aplicados`, 'success');
    
    document.getElementById('conteo-fisico-container').style.display = 'none';
    actualizarMetricas();
    renderizarProductos();
}

function cancelarInventarioFisico() {
    if (!inventarioFisico) return;
    
    const confirmar = confirm('¿Está seguro de cancelar el inventario físico? Se perderán todos los cambios.');
    if (!confirmar) return;
    
    inventarioFisico = null;
    document.getElementById('conteo-fisico-container').style.display = 'none';
    AppUtils.mostrarMensaje('Inventario físico cancelado', 'info');
}

function exportarInventarioFisico() {
    const csvContent = "Producto,Medida,Ubicacion,Stock_Sistema,Conteo_Fisico,Diferencia\n" +
                      productos.map(p => 
                          `"${p.marca} ${p.modelo}","${p.medida}","${p.ubicacion_almacen || 'No definida'}",${p.stock_actual},,`
                      ).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `inventario-fisico-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ===== FUNCIONALIDADES RESERVAS DE STOCK =====

function mostrarReservas() {
    cargarReservas();
    actualizarEstadisticasReservas();
    document.getElementById('modal-reservas').classList.remove('hidden');
}

function mostrarFormularioReserva() {
    // Cargar productos disponibles
    const selectProducto = document.getElementById('reserva-producto');
    selectProducto.innerHTML = '<option value="">Seleccionar producto</option>';
    
    productos.forEach(producto => {
        const stockDisponible = calcularStockDisponible(producto.id);
        if (stockDisponible > 0) {
            const option = document.createElement('option');
            option.value = producto.id;
            option.textContent = `${producto.marca} ${producto.modelo} - ${producto.medida} (Disponible: ${stockDisponible})`;
            option.dataset.stockDisponible = stockDisponible;
            selectProducto.appendChild(option);
        }
    });
    
    // Event listeners
    document.getElementById('form-reserva').onsubmit = crearReserva;
    document.getElementById('reserva-producto').onchange = function() {
        const selectedOption = this.selectedOptions[0];
        if (selectedOption) {
            const stock = selectedOption.dataset.stockDisponible;
            document.getElementById('stock-disponible-info').textContent = `Stock disponible: ${stock} unidades`;
            
            // Establecer máximo en cantidad
            const cantidadInput = document.getElementById('reserva-cantidad');
            cantidadInput.max = stock;
        }
    };
    
    // Establecer fecha límite por defecto (30 días)
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() + 30);
    document.getElementById('reserva-fecha-limite').value = fechaLimite.toISOString().split('T')[0];
    
    document.getElementById('form-reserva').reset();
    document.getElementById('stock-disponible-info').textContent = 'Stock disponible: -';
    document.getElementById('modal-nueva-reserva').classList.remove('hidden');
}

function calcularStockDisponible(productoId) {
    const producto = productos.find(p => p.id === productoId);
    if (!producto) return 0;
    
    const stockReservado = reservas
        .filter(r => r.producto_id === productoId && r.estado === 'activa')
        .reduce((total, r) => total + (r.cantidad - r.cantidad_usada), 0);
    
    return Math.max(0, producto.stock_actual - stockReservado);
}

async function crearReserva(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const reservaData = Object.fromEntries(formData.entries());
    
    // Validar datos
    const producto = productos.find(p => p.id === reservaData.producto_id);
    if (!producto) {
        AppUtils.mostrarMensaje('Producto no encontrado', 'error');
        return;
    }
    
    const cantidad = parseInt(reservaData.cantidad);
    const stockDisponible = calcularStockDisponible(reservaData.producto_id);
    
    if (cantidad > stockDisponible) {
        AppUtils.mostrarMensaje(`Solo hay ${stockDisponible} unidades disponibles para reservar`, 'error');
        return;
    }
    
    try {
        const esDemo = window.location.pathname.includes('demo');
        
        if (esDemo) {
            // Modo demo - simular reserva
            const nuevaReserva = {
                id: `RSV-${Date.now()}`,
                producto_id: reservaData.producto_id,
                producto_info: `${producto.marca} ${producto.modelo} - ${producto.medida}`,
                cantidad: cantidad,
                cantidad_usada: 0,
                cliente: reservaData.cliente || 'Cliente no especificado',
                cotizacion_id: reservaData.cotizacion_id || null,
                fecha_limite: new Date(reservaData.fecha_limite),
                observaciones: reservaData.observaciones || '',
                estado: 'activa',
                fecha_creacion: new Date(),
                usuario: 'Demo Admin'
            };
            
            reservas.unshift(nuevaReserva);
            AppUtils.mostrarMensaje('Reserva creada correctamente', 'success');
            
        } else {
            // Modo real - usar API
            const token = localStorage.getItem('empleadoToken');
            const response = await fetch('/api/inventario/reservas', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(reservaData)
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Error al crear reserva');
            }
            
            const resultado = await response.json();
            AppUtils.mostrarMensaje(resultado.mensaje, 'success');
        }
        
        cerrarModal('modal-nueva-reserva');
        cargarReservas();
        actualizarEstadisticasReservas();
        
    } catch (error) {
        console.error('Error creando reserva:', error);
        AppUtils.mostrarMensaje(error.message || 'Error al crear reserva', 'error');
    }
}

function cargarReservas() {
    const tbody = document.getElementById('tabla-reservas-body');
    
    if (reservas.length === 0) {
        generarReservasSimuladas();
    }
    
    // Actualizar estados de reservas (verificar vencidas)
    const ahora = new Date();
    reservas.forEach(reserva => {
        if (reserva.estado === 'activa' && new Date(reserva.fecha_limite) < ahora) {
            reserva.estado = 'vencida';
        }
    });
    
    let html = '';
    reservas.forEach(reserva => {
        const fechaLimite = new Date(reserva.fecha_limite).toLocaleDateString('es-CO');
        const cantidadDisponible = reserva.cantidad - reserva.cantidad_usada;
        
        const estadoClass = {
            'activa': 'badge-success',
            'parcial': 'badge-warning',
            'completada': 'badge-info',
            'vencida': 'badge-danger',
            'cancelada': 'badge-secondary'
        }[reserva.estado] || 'badge-secondary';
        
        const estadoIcon = {
            'activa': '🟢',
            'parcial': '🟡',
            'completada': '🔵',
            'vencida': '🔴',
            'cancelada': '⚫'
        }[reserva.estado] || '⚫';
        
        html += `
            <tr>
                <td><strong>${reserva.id}</strong></td>
                <td>${reserva.producto_info}</td>
                <td>
                    <strong>${reserva.cliente}</strong>
                    ${reserva.cotizacion_id ? `<br><small>COT: ${reserva.cotizacion_id}</small>` : ''}
                </td>
                <td>${reserva.cantidad}</td>
                <td>${reserva.cantidad_usada}</td>
                <td class="${cantidadDisponible > 0 ? 'text-success' : 'text-muted'}">${cantidadDisponible}</td>
                <td class="${reserva.estado === 'vencida' ? 'text-danger' : ''}">${fechaLimite}</td>
                <td><span class="badge ${estadoClass}">${estadoIcon} ${reserva.estado.toUpperCase()}</span></td>
                <td>
                    <button onclick="gestionarReserva('${reserva.id}')" class="btn btn-sm btn-primary" title="Gestionar">
                        ⚙️
                    </button>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

function generarReservasSimuladas() {
    const clientes = ['Empresa ABC', 'Cliente XYZ', 'Corporación 123', 'Taller López', 'AutoPartes SA'];
    
    for (let i = 0; i < 10; i++) {
        const producto = productos[Math.floor(Math.random() * productos.length)];
        const cantidad = Math.floor(Math.random() * 5) + 1;
        const cantidadUsada = Math.floor(Math.random() * cantidad);
        const cliente = clientes[Math.floor(Math.random() * clientes.length)];
        
        let estado = 'activa';
        if (cantidadUsada === cantidad) {
            estado = 'completada';
        } else if (cantidadUsada > 0) {
            estado = 'parcial';
        } else if (Math.random() > 0.8) {
            estado = 'vencida';
        }
        
        const fechaLimite = new Date();
        fechaLimite.setDate(fechaLimite.getDate() + Math.floor(Math.random() * 60) - 10); // -10 a +50 días
        
        reservas.push({
            id: `RSV-2024-${(i + 1).toString().padStart(3, '0')}`,
            producto_id: producto.id,
            producto_info: `${producto.marca} ${producto.modelo} - ${producto.medida}`,
            cantidad: cantidad,
            cantidad_usada: cantidadUsada,
            cliente: cliente,
            cotizacion_id: Math.random() > 0.5 ? `COT-2024-${(i + 1).toString().padStart(3, '0')}` : null,
            fecha_limite: fechaLimite,
            observaciones: `Reserva simulada para ${cliente}`,
            estado: estado,
            fecha_creacion: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
            usuario: 'Admin'
        });
    }
    
    // Ordenar por fecha de creación más reciente
    reservas.sort((a, b) => new Date(b.fecha_creacion) - new Date(a.fecha_creacion));
}

function actualizarEstadisticasReservas() {
    const totalReservas = reservas.length;
    const reservasVencidas = reservas.filter(r => r.estado === 'vencida').length;
    const productosReservados = reservas
        .filter(r => r.estado === 'activa')
        .reduce((total, r) => total + (r.cantidad - r.cantidad_usada), 0);
    
    document.getElementById('total-reservas').textContent = totalReservas;
    document.getElementById('reservas-vencidas').textContent = reservasVencidas;
    document.getElementById('productos-reservados').textContent = productosReservados;
}

function gestionarReserva(reservaId) {
    const reserva = reservas.find(r => r.id === reservaId);
    if (!reserva) {
        AppUtils.mostrarMensaje('Reserva no encontrada', 'error');
        return;
    }
    
    reservaEnEdicion = reserva;
    
    // Llenar detalles
    document.getElementById('titulo-gestionar-reserva').textContent = `🔒 Gestionar ${reserva.id}`;
    document.getElementById('detalle-producto').textContent = reserva.producto_info;
    document.getElementById('detalle-cliente').textContent = reserva.cliente;
    document.getElementById('detalle-cantidad-reservada').textContent = reserva.cantidad;
    document.getElementById('detalle-cantidad-usada').textContent = reserva.cantidad_usada;
    document.getElementById('detalle-cantidad-disponible').textContent = reserva.cantidad - reserva.cantidad_usada;
    document.getElementById('detalle-fecha-limite').textContent = new Date(reserva.fecha_limite).toLocaleDateString('es-CO');
    
    // Configurar campos
    document.getElementById('cantidad-usar').max = reserva.cantidad - reserva.cantidad_usada;
    document.getElementById('nueva-fecha-limite').value = new Date(reserva.fecha_limite).toISOString().split('T')[0];
    
    document.getElementById('modal-gestionar-reserva').classList.remove('hidden');
}

function usarStockReservado() {
    if (!reservaEnEdicion) return;
    
    const cantidadUsar = parseInt(document.getElementById('cantidad-usar').value);
    if (!cantidadUsar || cantidadUsar <= 0) {
        AppUtils.mostrarMensaje('Ingrese una cantidad válida', 'error');
        return;
    }
    
    const cantidadDisponible = reservaEnEdicion.cantidad - reservaEnEdicion.cantidad_usada;
    if (cantidadUsar > cantidadDisponible) {
        AppUtils.mostrarMensaje(`Solo hay ${cantidadDisponible} unidades disponibles`, 'error');
        return;
    }
    
    // Actualizar reserva
    reservaEnEdicion.cantidad_usada += cantidadUsar;
    
    // Actualizar estado
    if (reservaEnEdicion.cantidad_usada === reservaEnEdicion.cantidad) {
        reservaEnEdicion.estado = 'completada';
    } else {
        reservaEnEdicion.estado = 'parcial';
    }
    
    // Registrar movimiento de salida
    const producto = productos.find(p => p.id === reservaEnEdicion.producto_id);
    if (producto) {
        movimientos.unshift({
            id: `mov-rsv-${Date.now()}`,
            producto_id: reservaEnEdicion.producto_id,
            producto_info: reservaEnEdicion.producto_info,
            tipo: 'salida',
            cantidad: cantidadUsar,
            motivo: 'uso_reserva',
            observaciones: `Uso de stock reservado - ${reservaEnEdicion.id}`,
            documento_referencia: reservaEnEdicion.cotizacion_id || reservaEnEdicion.id,
            stock_anterior: producto.stock_actual,
            stock_nuevo: producto.stock_actual - cantidadUsar,
            usuario: document.getElementById('usuario-nombre').textContent,
            fecha: new Date().toISOString()
        });
        
        // Actualizar stock del producto
        const productoIndex = productos.findIndex(p => p.id === reservaEnEdicion.producto_id);
        productos[productoIndex].stock_actual -= cantidadUsar;
    }
    
    AppUtils.mostrarMensaje(`${cantidadUsar} unidades utilizadas de la reserva`, 'success');
    
    // Actualizar interfaz
    cargarReservas();
    actualizarEstadisticasReservas();
    actualizarMetricas();
    renderizarProductos();
    
    // Cerrar o actualizar modal
    if (reservaEnEdicion.estado === 'completada') {
        cerrarModal('modal-gestionar-reserva');
    } else {
        gestionarReserva(reservaEnEdicion.id); // Recargar datos
    }
}

function modificarFechaLimite() {
    if (!reservaEnEdicion) return;
    
    const nuevaFecha = document.getElementById('nueva-fecha-limite').value;
    if (!nuevaFecha) {
        AppUtils.mostrarMensaje('Seleccione una fecha válida', 'error');
        return;
    }
    
    const fechaSeleccionada = new Date(nuevaFecha);
    const hoy = new Date();
    
    if (fechaSeleccionada < hoy) {
        AppUtils.mostrarMensaje('La fecha no puede ser anterior a hoy', 'error');
        return;
    }
    
    reservaEnEdicion.fecha_limite = fechaSeleccionada;
    
    // Si estaba vencida y ahora no, reactivar
    if (reservaEnEdicion.estado === 'vencida' && fechaSeleccionada > hoy) {
        reservaEnEdicion.estado = reservaEnEdicion.cantidad_usada > 0 ? 'parcial' : 'activa';
    }
    
    AppUtils.mostrarMensaje('Fecha límite actualizada', 'success');
    
    cargarReservas();
    gestionarReserva(reservaEnEdicion.id); // Recargar datos
}

function liberarReserva() {
    if (!reservaEnEdicion) return;
    
    const cantidadLiberar = reservaEnEdicion.cantidad - reservaEnEdicion.cantidad_usada;
    
    if (cantidadLiberar === 0) {
        AppUtils.mostrarMensaje('Esta reserva ya está completamente utilizada', 'info');
        return;
    }
    
    const confirmar = confirm(`¿Liberar ${cantidadLiberar} unidades de la reserva ${reservaEnEdicion.id}?`);
    if (!confirmar) return;
    
    reservaEnEdicion.estado = 'completada';
    AppUtils.mostrarMensaje(`${cantidadLiberar} unidades liberadas`, 'success');
    
    cargarReservas();
    actualizarEstadisticasReservas();
    cerrarModal('modal-gestionar-reserva');
}

function cancelarReserva() {
    if (!reservaEnEdicion) return;
    
    const confirmar = confirm(`¿Cancelar completamente la reserva ${reservaEnEdicion.id}?`);
    if (!confirmar) return;
    
    reservaEnEdicion.estado = 'cancelada';
    AppUtils.mostrarMensaje('Reserva cancelada', 'success');
    
    cargarReservas();
    actualizarEstadisticasReservas();
    cerrarModal('modal-gestionar-reserva');
}

// Hacer todas las funciones disponibles globalmente
window.editarProducto = editarProducto;
window.verDetalleProducto = verDetalleProducto; 
window.eliminarProducto = eliminarProducto;
window.cerrarModal = cerrarModal;
window.cerrarModalEliminar = cerrarModalEliminar;
window.confirmarEliminacion = confirmarEliminacion;
window.mostrarFormularioNuevo = mostrarFormularioNuevo;
window.logout = logout;
window.mostrarConfirmacion = mostrarConfirmacion;
window.mostrarInformacion = mostrarInformacion;
window.mostrarDetalleProductoProfesional = mostrarDetalleProductoProfesional;
window.generarCodigoBarras = generarCodigoBarras;
window.mostrarMovimientos = mostrarMovimientos;
window.mostrarFormularioMovimiento = mostrarFormularioMovimiento;
window.actualizarTipoMovimiento = actualizarTipoMovimiento;
window.mostrarInventarioFisico = mostrarInventarioFisico;
window.iniciarInventarioFisico = iniciarInventarioFisico;
window.finalizarInventarioFisico = finalizarInventarioFisico;
window.cancelarInventarioFisico = cancelarInventarioFisico;
window.exportarInventarioFisico = exportarInventarioFisico;
window.marcarComoContado = marcarComoContado;
window.actualizarConteo = actualizarConteo;
window.mostrarReservas = mostrarReservas;
window.mostrarFormularioReserva = mostrarFormularioReserva;
window.gestionarReserva = gestionarReserva;
window.usarStockReservado = usarStockReservado;
window.modificarFechaLimite = modificarFechaLimite;
window.liberarReserva = liberarReserva;
window.cancelarReserva = cancelarReserva;


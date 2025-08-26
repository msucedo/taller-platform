let productos = [];
let productosFiltrados = [];
let productoAEliminar = null;
let paginaActual = 1;
let productosPorPagina = 10;
let ordenActual = { campo: 'marca', direccion: 'asc' };

document.addEventListener('DOMContentLoaded', async function() {
    AppUtils.cargarVersion();
    setupEventListeners();
    
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
        
        // Fallback a datos simulados si falla la API
        const productosSimulados = generarProductosSimulados();
        productos = productosSimulados;
        productosFiltrados = [...productos];
        actualizarMetricas();
        renderizarProductos();
        actualizarPaginacion();
    } finally {
        mostrarCargando(false);
    }
}

function generarProductosSimulados() {
    const marcas = ['Michelin', 'Bridgestone', 'Continental', 'Goodyear', 'Pirelli', 'Dunlop', 'Firestone'];
    const modelos = ['Energy', 'Turanza', 'PremiumContact', 'EfficientGrip', 'Cinturato', 'SP Sport', 'Destination'];
    const medidas = ['185/60R15', '195/65R15', '205/55R16', '215/60R16', '225/55R17', '235/50R18', '245/45R19'];
    
    const productos = [];
    
    for (let i = 0; i < 25; i++) {
        const marca = marcas[Math.floor(Math.random() * marcas.length)];
        const modelo = modelos[Math.floor(Math.random() * modelos.length)];
        const medida = medidas[Math.floor(Math.random() * medidas.length)];
        const stock = Math.floor(Math.random() * 50);
        const precioBase = Math.floor(Math.random() * 200000) + 150000;
        
        productos.push({
            id: `prod-${i + 1}`,
            marca,
            modelo: `${marca} ${modelo}`,
            medida,
            descripcion: `Llanta ${marca} ${modelo} - Excelente calidad y durabilidad`,
            precio_compra: Math.floor(precioBase * 0.7),
            precio_venta: precioBase,
            stock_actual: stock,
            stock_minimo: 5,
            proveedor: `Proveedor ${Math.floor(Math.random() * 3) + 1}`,
            imagen_url: 'https://tinyurl.com/bdhn9ubh',
            activo: true,
            fecha_creacion: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000),
            fecha_actualizacion: new Date()
        });
    }
    
    return productos;
}

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

function renderizarProductos() {
    const tbody = document.getElementById('tabla-productos');
    const container = document.getElementById('productos-container');
    const noProductos = document.getElementById('no-productos');
    
    if (productosFiltrados.length === 0) {
        container.style.display = 'none';
        noProductos.style.display = 'block';
        return;
    }
    
    container.style.display = 'block';
    noProductos.style.display = 'none';
    
    // Aplicar paginación
    const inicio = (paginaActual - 1) * productosPorPagina;
    const fin = inicio + productosPorPagina;
    const productosPagina = productosFiltrados.slice(inicio, fin);
    
    let html = '';
    
    productosPagina.forEach(producto => {
        const stockClass = producto.stock_actual <= producto.stock_minimo ? 'stock-bajo' : 
                          producto.stock_actual === 0 ? 'stock-agotado' : '';
        
        const estadoClass = !producto.activo ? 'inactivo' : stockClass;
        
        html += `
            <tr class="${estadoClass}">
                <td class="producto-imagen">
                    <img src="${producto.imagen_url}" alt="${producto.modelo}" 
                         onerror="this.src='https://tinyurl.com/bdhn9ubh'" loading="lazy">
                </td>
                <td class="marca">${producto.marca}</td>
                <td class="modelo">${producto.modelo}</td>
                <td class="medida"><span class="badge">${producto.medida}</span></td>
                <td class="stock">
                    <span class="stock-numero ${stockClass}">
                        ${producto.stock_actual}
                        ${producto.stock_actual <= producto.stock_minimo ? ' ⚠️' : ''}
                    </span>
                    <br><small>min: ${producto.stock_minimo}</small>
                </td>
                <td class="precio">
                    <strong>${AppUtils.formatearPrecio(producto.precio_venta)}</strong>
                    ${producto.precio_compra ? `<br><small>Compra: ${AppUtils.formatearPrecio(producto.precio_compra)}</small>` : ''}
                </td>
                <td class="estado">
                    ${getEstadoProducto(producto)}
                </td>
                <td class="acciones">
                    <div class="btn-group">
                        <button data-action="editar" data-producto-id="${producto.id}" class="btn btn-primary btn-sm" title="Editar">
                            ✏️
                        </button>
                        <button data-action="ver" data-producto-id="${producto.id}" class="btn btn-info btn-sm" title="Ver detalles">
                            👁️
                        </button>
                        <button data-action="eliminar" data-producto-id="${producto.id}" class="btn btn-danger btn-sm" title="Eliminar">
                            🗑️
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
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
    
    document.getElementById('modal-producto').classList.remove('hidden');
}

async function guardarProducto(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const productoData = Object.fromEntries(formData.entries());
    const id = document.getElementById('producto-id').value;
    const esDemo = window.location.pathname.includes('demo');
    
    // Validación del lado cliente
    const errors = validarProducto(productoData);
    if (errors.length > 0) {
        AppUtils.mostrarMensaje(`Errores de validación: ${errors.join(', ')}`, 'error');
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
            const url = id ? `/api/inventario/productos/${id}` : '/api/inventario/productos';
            const method = id ? 'PUT' : 'POST';
            
            const token = localStorage.getItem('empleadoToken');
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(productoData)
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Error al guardar producto');
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
    const container = document.getElementById('productos-container');
    const noProductos = document.getElementById('no-productos');
    
    if (mostrar) {
        loading.style.display = 'block';
        container.style.display = 'none';
        noProductos.style.display = 'none';
    } else {
        loading.style.display = 'none';
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

// Exportar inventario
function exportarInventario() {
    AppUtils.mostrarMensaje('Funcionalidad de exportación próximamente', 'info');
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

// Validación específica de productos
const validarProducto = (data) => {
    const errors = [];
    
    if (!data.marca || data.marca.trim().length < 2) {
        errors.push('La marca debe tener al menos 2 caracteres');
    }
    
    if (!data.modelo || data.modelo.trim().length < 2) {
        errors.push('El modelo debe tener al menos 2 caracteres');
    }
    
    if (!data.medida || !AppUtils.validarMedidaLlanta(data.medida)) {
        errors.push('La medida debe tener el formato correcto (ej: 205/55R16)');
    }
    
    if (!data.precio_venta || isNaN(data.precio_venta) || parseFloat(data.precio_venta) <= 0) {
        errors.push('El precio de venta debe ser mayor a 0');
    }
    
    if (data.stock_actual && (isNaN(data.stock_actual) || parseInt(data.stock_actual) < 0)) {
        errors.push('El stock actual debe ser un número positivo');
    }
    
    return errors;
};

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


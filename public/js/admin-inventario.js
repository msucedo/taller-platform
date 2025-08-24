let productos = [];
let productosFiltrados = [];
let productoAEliminar = null;
let paginaActual = 1;
let productosPorPagina = 10;
let ordenActual = { campo: 'marca', direccion: 'asc' };

document.addEventListener('DOMContentLoaded', async function() {
    AppUtils.cargarVersion();
    setupEventListeners();
    
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
        if (data.rol !== 'admin') {
            alert('Acceso denegado. Solo administradores pueden acceder al inventario.');
            window.location.href = '/empleado/dashboard';
            return false;
        }
        
        document.getElementById('usuario-nombre').textContent = data.nombre || 'Administrador';
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
            imagen_url: `https://via.placeholder.com/100x100/3498db/ffffff?text=${marca.charAt(0)}`,
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
                         onerror="this.src='/images/llanta-default.png'" loading="lazy">
                </td>
                <td class="marca">${producto.marca}</td>
                <td class="modelo">${producto.modelo}</td>
                <td class="medida"><span class="badge">${producto.medida}</span></td>
                <td class="stock">
                    <span class="stock-numero ${stockClass}">
                        ${producto.stock_actual}
                        ${producto.stock_actual <= producto.stock_minimo ? '⚠️' : ''}
                    </span>
                    <small>min: ${producto.stock_minimo}</small>
                </td>
                <td class="precio">
                    <strong>${AppUtils.formatearPrecio(producto.precio_venta)}</strong>
                    ${producto.precio_compra ? `<small>Compra: ${AppUtils.formatearPrecio(producto.precio_compra)}</small>` : ''}
                </td>
                <td class="estado">
                    ${getEstadoProducto(producto)}
                </td>
                <td class="acciones">
                    <div class="btn-group">
                        <button onclick="editarProducto('${producto.id}')" class="btn btn-primary btn-sm" title="Editar">
                            ✏️
                        </button>
                        <button onclick="verDetalleProducto('${producto.id}')" class="btn btn-info btn-sm" title="Ver detalles">
                            👁️
                        </button>
                        <button onclick="eliminarProducto('${producto.id}')" class="btn btn-danger btn-sm" title="Eliminar">
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
    document.getElementById('modal-producto').classList.remove('hidden');
}

function editarProducto(id) {
    const producto = productos.find(p => p.id === id);
    if (!producto) return;
    
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
    const producto = productos.find(p => p.id === id);
    if (!producto) return;
    
    productoAEliminar = id;
    document.getElementById('producto-eliminar-nombre').textContent = 
        `${producto.marca} ${producto.modelo} - ${producto.medida}`;
    document.getElementById('modal-eliminar').classList.remove('hidden');
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
    const producto = productos.find(p => p.id === id);
    if (!producto) return;
    
    // Por ahora mostrar un alert simple - más tarde podríamos crear un modal detallado
    alert(`Detalles del producto:\n\nMarca: ${producto.marca}\nModelo: ${producto.modelo}\nMedida: ${producto.medida}\nStock: ${producto.stock_actual}\nPrecio: $${producto.precio_venta.toLocaleString('es-CO')}\nProveedor: ${producto.proveedor || 'N/A'}\nCreado: ${producto.fecha_creacion.toLocaleDateString()}`);
}

// Funciones de utilidad específicas
function cerrarModal() {
    document.getElementById('modal-producto').classList.add('hidden');
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
        if (AppUtils.confirmar('¿Regresar al inicio?')) {
            window.location.href = '/';
        }
        return;
    }
    
    // Usar logout global de AppUtils
    window.logout();
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


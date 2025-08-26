let misSolicitudes = [];
let todasSolicitudes = [];
let empleadoData = {};
let currentTab = 'mis-solicitudes';

document.addEventListener('DOMContentLoaded', function() {
    AppUtils.cargarVersion();
    verificarAutenticacion();
    
    // Event listeners para filtros
    const buscadorEmpleado = document.getElementById('buscadorEmpleado');
    const filtroEstadoEmpleado = document.getElementById('filtroEstadoEmpleado');
    const filtroUrgencia = document.getElementById('filtroUrgencia');
    
    buscadorEmpleado.addEventListener('input', filtrarTodasSolicitudes);
    filtroEstadoEmpleado.addEventListener('change', filtrarTodasSolicitudes);
    filtroUrgencia.addEventListener('change', filtrarTodasSolicitudes);
    
    // Event listeners para formularios
    document.getElementById('editarForm').addEventListener('submit', guardarEdicion);
    document.getElementById('passwordForm').addEventListener('submit', cambiarPassword);
    
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
    
    loadMisSolicitudes();
});

function verificarAutenticacion() {
    const token = localStorage.getItem('empleadoToken');
    empleadoData = JSON.parse(localStorage.getItem('empleadoData') || '{}');
    
    if (!token || !empleadoData.rol) {
        window.location.href = '/empleado/login';
        return;
    }
    
    // Actualizar UI con datos del empleado
    document.getElementById('welcomeMessage').textContent = `Bienvenido, ${empleadoData.nombre}`;
    
    const rolBadge = document.getElementById('rolBadge');
    const rolIcons = {
        'admin': '👑',
        'mecanico': '🔧',
        'recepcionista': '📋'
    };
    rolBadge.innerHTML = `${rolIcons[empleadoData.rol] || '👤'} ${empleadoData.rol.charAt(0).toUpperCase() + empleadoData.rol.slice(1)}`;
    rolBadge.className = `user-badge ${empleadoData.rol}`;
    
    // Mostrar/ocultar tabs según el rol
    if (empleadoData.rol === 'recepcionista') {
        document.getElementById('todasTab').style.display = 'block';
    } else {
        // Mecánicos solo ven sus solicitudes asignadas
        document.getElementById('todasTab').style.display = 'none';
    }
    
    // Llenar datos del perfil
    document.getElementById('perfilNombre').textContent = empleadoData.nombre;
    document.getElementById('perfilEmail').textContent = empleadoData.email;
    document.getElementById('perfilRol').textContent = empleadoData.rol.charAt(0).toUpperCase() + empleadoData.rol.slice(1);
    
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
    document.getElementById(`tab-${tabName}`).classList.add('active');
    
    currentTab = tabName;
    
    // Cargar datos según el tab
    if (tabName === 'todas-solicitudes') {
        loadTodasSolicitudes();
    } else if (tabName === 'mi-perfil') {
        cargarEstadisticasPersonales();
    }
}

async function loadMisSolicitudes() {
    try {
        const token = localStorage.getItem('empleadoToken');
        const response = await fetch('/api/empleado/mis-solicitudes', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            misSolicitudes = await response.json();
            mostrarEstadisticasMis();
            mostrarMisSolicitudes();
        } else {
            document.getElementById('misSolicitudesContainer').innerHTML = 
                '<div class="no-data">No tienes solicitudes asignadas</div>';
        }
    } catch (error) {
        console.error('Error:', error);
        AppUtils.mostrarMensaje('Error al cargar solicitudes asignadas', 'error');
    }
}

async function loadTodasSolicitudes() {
    if (empleadoData.rol !== 'recepcionista') return;
    
    try {
        const response = await fetch('/api/solicitudes');
        if (response.ok) {
            todasSolicitudes = await response.json();
            mostrarTodasSolicitudes();
        } else {
            AppUtils.mostrarMensaje('Error al cargar todas las solicitudes', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        AppUtils.mostrarMensaje('Error de conexión', 'error');
    }
}

function mostrarEstadisticasMis() {
    const total = misSolicitudes.length;
    const pendientes = misSolicitudes.filter(s => s.estado === 'pendiente').length;
    const proceso = misSolicitudes.filter(s => s.estado === 'en_proceso').length;
    const completadas = misSolicitudes.filter(s => s.estado === 'completado').length;
    
    document.getElementById('misTotalSolicitudes').textContent = total;
    document.getElementById('misPendientes').textContent = pendientes;
    document.getElementById('misProceso').textContent = proceso;
    document.getElementById('misCompletadas').textContent = completadas;
}

function mostrarMisSolicitudes() {
    const container = document.getElementById('misSolicitudesContainer');
    
    if (misSolicitudes.length === 0) {
        container.innerHTML = `
            <div class="no-data">
                <h3>No tienes solicitudes asignadas</h3>
                <p>Las solicitudes aparecerán aquí cuando un administrador te las asigne.</p>
            </div>
        `;
        return;
    }
    
    const html = misSolicitudes.map(solicitud => `
        <div class="solicitud-card-empleado ${solicitud.estado}">
            <div class="solicitud-header-empleado">
                <div class="solicitud-info">
                    <h3>${solicitud.proveedor_nombre}</h3>
                    <span class="tracker-code">📋 ${solicitud.tracker_code}</span>
                </div>
                <div class="solicitud-badges">
                    <span class="urgencia-badge ${solicitud.urgencia}">${solicitud.urgencia.toUpperCase()}</span>
                    <span class="estado-badge ${solicitud.estado}">${solicitud.estado.toUpperCase()}</span>
                </div>
            </div>
            
            <div class="solicitud-body-empleado">
                <div class="solicitud-details">
                    <p><strong>Servicio:</strong> ${solicitud.tipo_servicio}</p>
                    <p><strong>Email:</strong> ${solicitud.proveedor_email}</p>
                    ${solicitud.proveedor_telefono ? `<p><strong>Teléfono:</strong> ${solicitud.proveedor_telefono}</p>` : ''}
                    <p><strong>Descripción:</strong> ${solicitud.descripcion}</p>
                    <p><strong>Fecha Solicitud:</strong> ${AppUtils.formatearFecha(solicitud.fecha_solicitud)}</p>
                    ${solicitud.fecha_preferida ? `<p><strong>Fecha Preferida:</strong> ${AppUtils.formatearFecha(solicitud.fecha_preferida)}</p>` : ''}
                    ${solicitud.notas_taller ? `<p><strong>Mis Notas:</strong> ${solicitud.notas_taller}</p>` : ''}
                </div>
            </div>
            
            <div class="solicitud-actions-empleado">
                <button onclick="editarSolicitud(${solicitud.id})" class="btn-edit">Actualizar</button>
                <button onclick="verDetalleTracker('${solicitud.tracker_code}')" class="btn-view">Ver Tracker</button>
                <button onclick="contactarProveedor('${solicitud.proveedor_email}')" class="btn-contact">Contactar</button>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = html;
}

function mostrarTodasSolicitudes() {
    const container = document.getElementById('todasSolicitudesContainer');
    
    if (todasSolicitudes.length === 0) {
        container.innerHTML = '<div class="no-data">No hay solicitudes disponibles</div>';
        return;
    }
    
    const html = todasSolicitudes.map(solicitud => `
        <div class="solicitud-card-simple ${solicitud.estado}">
            <div class="solicitud-header-simple">
                <div class="solicitud-info">
                    <h4>${solicitud.proveedor_nombre}</h4>
                    <span class="service-type">${solicitud.tipo_servicio}</span>
                </div>
                <div class="solicitud-meta">
                    <span class="urgencia-badge ${solicitud.urgencia}">${solicitud.urgencia}</span>
                    <span class="estado-badge ${solicitud.estado}">${solicitud.estado}</span>
                </div>
            </div>
            <div class="solicitud-summary">
                <p><strong>Descripción:</strong> ${solicitud.descripcion.substring(0, 100)}${solicitud.descripcion.length > 100 ? '...' : ''}</p>
                <p><strong>Fecha:</strong> ${AppUtils.formatearFecha(solicitud.fecha_solicitud)}</p>
            </div>
            <div class="solicitud-actions-simple">
                <button onclick="verDetalleTracker('${solicitud.tracker_code}')" class="btn-view-small">Ver Detalle</button>
                ${empleadoData.rol === 'recepcionista' ? `<button onclick="editarSolicitud(${solicitud.id})" class="btn-edit-small">Editar</button>` : ''}
            </div>
        </div>
    `).join('');
    
    container.innerHTML = html;
}

function filtrarTodasSolicitudes() {
    const busqueda = document.getElementById('buscadorEmpleado').value.toLowerCase().trim();
    const estado = document.getElementById('filtroEstadoEmpleado').value;
    const urgencia = document.getElementById('filtroUrgencia').value;
    
    let filtradas = todasSolicitudes;
    
    if (estado) {
        filtradas = filtradas.filter(s => s.estado === estado);
    }
    
    if (urgencia) {
        filtradas = filtradas.filter(s => s.urgencia === urgencia);
    }
    
    if (busqueda) {
        filtradas = filtradas.filter(s => 
            s.proveedor_nombre.toLowerCase().includes(busqueda) ||
            s.descripcion.toLowerCase().includes(busqueda) ||
            s.tipo_servicio.toLowerCase().includes(busqueda)
        );
    }
    
    // Mostrar solicitudes filtradas (reutilizar función)
    const container = document.getElementById('todasSolicitudesContainer');
    if (filtradas.length === 0) {
        container.innerHTML = '<div class="no-data">No hay solicitudes que coincidan con los filtros</div>';
        return;
    }
    
    const html = filtradas.map(solicitud => `
        <div class="solicitud-card-simple ${solicitud.estado}">
            <div class="solicitud-header-simple">
                <div class="solicitud-info">
                    <h4>${solicitud.proveedor_nombre}</h4>
                    <span class="service-type">${solicitud.tipo_servicio}</span>
                </div>
                <div class="solicitud-meta">
                    <span class="urgencia-badge ${solicitud.urgencia}">${solicitud.urgencia}</span>
                    <span class="estado-badge ${solicitud.estado}">${solicitud.estado}</span>
                </div>
            </div>
            <div class="solicitud-summary">
                <p><strong>Descripción:</strong> ${solicitud.descripcion.substring(0, 100)}${solicitud.descripcion.length > 100 ? '...' : ''}</p>
                <p><strong>Fecha:</strong> ${AppUtils.formatearFecha(solicitud.fecha_solicitud)}</p>
            </div>
            <div class="solicitud-actions-simple">
                <button onclick="verDetalleTracker('${solicitud.tracker_code}')" class="btn-view-small">Ver Detalle</button>
                ${empleadoData.rol === 'recepcionista' ? `<button onclick="editarSolicitud(${solicitud.id})" class="btn-edit-small">Editar</button>` : ''}
            </div>
        </div>
    `).join('');
    
    container.innerHTML = html;
}

function limpiarBusquedaEmpleado() {
    document.getElementById('buscadorEmpleado').value = '';
    document.getElementById('filtroEstadoEmpleado').value = '';
    document.getElementById('filtroUrgencia').value = '';
    mostrarTodasSolicitudes();
}

function editarSolicitud(id) {
    let solicitud;
    
    // Buscar en mis solicitudes primero, luego en todas
    solicitud = misSolicitudes.find(s => s.id === id);
    if (!solicitud) {
        solicitud = todasSolicitudes.find(s => s.id === id);
    }
    
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
            loadMisSolicitudes();
            if (currentTab === 'todas-solicitudes') {
                loadTodasSolicitudes();
            }
            AppUtils.mostrarMensaje('Solicitud actualizada exitosamente', 'success');
        } else {
            AppUtils.mostrarMensaje('Error al actualizar la solicitud', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        AppUtils.mostrarMensaje('Error de conexión', 'error');
    }
}

function verDetalleTracker(trackerCode) {
    window.open(`/tracker?code=${trackerCode}`, '_blank');
}

function contactarProveedor(email) {
    window.open(`mailto:${email}?subject=Consulta sobre su solicitud - Llantera`, '_blank');
}

function mostrarCambiarPassword() {
    document.getElementById('passwordForm').reset();
    document.getElementById('modalPassword').classList.remove('hidden');
}

async function cambiarPassword(e) {
    e.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (newPassword !== confirmPassword) {
        AppUtils.mostrarMensaje('Las contraseñas no coinciden', 'error');
        return;
    }
    
    if (newPassword.length < 6) {
        AppUtils.mostrarMensaje('La contraseña debe tener al menos 6 caracteres', 'error');
        return;
    }
    
    try {
        const token = localStorage.getItem('empleadoToken');
        const response = await fetch('/api/empleado/cambiar-password', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                currentPassword,
                newPassword
            })
        });
        
        if (response.ok) {
            cerrarModal('modalPassword');
            AppUtils.mostrarMensaje('Contraseña cambiada exitosamente', 'success');
        } else {
            const result = await response.json();
            AppUtils.mostrarMensaje(result.error || 'Error al cambiar contraseña', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        AppUtils.mostrarMensaje('Error de conexión', 'error');
    }
}

async function cargarEstadisticasPersonales() {
    try {
        const token = localStorage.getItem('empleadoToken');
        const response = await fetch('/api/empleado/estadisticas', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const stats = await response.json();
            document.getElementById('totalAsignadas').textContent = stats.totalAsignadas || 0;
            document.getElementById('completadasMes').textContent = stats.completadasMes || 0;
            document.getElementById('tiempoPromedio').textContent = stats.tiempoPromedio || 0;
            document.getElementById('satisfaccion').textContent = `${stats.satisfaccion || 0}%`;
        }
    } catch (error) {
        console.error('Error al cargar estadísticas:', error);
    }
}

function cerrarModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

function cerrarSesion() {
    // Usar el servicio centralizado de autenticación
    AuthService.logout();
}




// Utilidades comunes para toda la aplicación
window.AppUtils = {
    // Función reutilizable para cargar versión
    async cargarVersion() {
        try {
            const response = await fetch('/api/version');
            if (response.ok) {
                const versionData = await response.json();
                const versionElement = document.getElementById('app-version');
                if (versionElement) {
                    versionElement.textContent = `v${versionData.version}`;
                }
            }
        } catch (error) {
            console.log('No se pudo cargar la versión:', error);
        }
    },

    // Función para formatear precios
    formatearPrecio(precio) {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(precio);
    },

    // Función para formatear moneda (alias para compatibilidad)
    formatMoney(amount) {
        if (amount === null || amount === undefined || isNaN(amount)) {
            return '0.00';
        }
        return Number(amount).toLocaleString('es-MX', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    },

    // Debounce para búsquedas
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Validaciones comunes
    validarEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },

    validarTelefono(telefono) {
        const re = /^[\d\s\-\+\(\)]+$/;
        return re.test(telefono);
    },

    validarMedidaLlanta(medida) {
        // Regex más flexible para diferentes formatos de medidas de llantas
        // Permite: 205/55R16, 185/60R15, 235/50R18, etc.
        const re = /^\d{3}\/\d{2}R\d{2}$/;
        
        // Si no coincide con el formato estándar, verificar otros formatos comunes
        if (!re.test(medida)) {
            // Formatos alternativos: 175/70R13, 31x10.5R15, etc.
            const reAlt = /^\d{2,3}\/\d{2}R\d{2}$|^\d{2,3}\/\d{2,3}R\d{2}$|^\d{2}x\d{1,2}\.?\d?R\d{2}$/;
            return reAlt.test(medida);
        }
        
        return true;
    },

    // Sanitización mejorada
    sanitizarTexto(texto) {
        if (typeof texto !== 'string') return texto;
        return texto.trim()
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
            .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
            .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/data:/gi, '')
            .replace(/vbscript:/gi, '')
            .replace(/on\w+=/gi, '')
            .replace(/[<>]/g, '');
    },

    // Validación de entrada mejorada
    validarEntrada(entrada, tipo) {
        if (!entrada || typeof entrada !== 'string') return false;
        
        entrada = entrada.trim();
        
        const reglas = {
            nombre: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]{2,50}$/,
            email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            telefono: /^[\d\s\-\+\(\)]{7,20}$/,
            texto: /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s\.,;:!¿?¡\-]{1,500}$/,
            numero: /^\d+$/,
            decimal: /^\d+(\.\d{1,2})?$/
        };
        
        return reglas[tipo] ? reglas[tipo].test(entrada) : true;
    },

    // Rate limiting simple
    rateLimiter: {
        limits: new Map(),
        
        isAllowed(key, maxAttempts = 5, windowMs = 60000) {
            const now = Date.now();
            const limit = this.limits.get(key);
            
            if (!limit) {
                this.limits.set(key, { count: 1, resetTime: now + windowMs });
                return true;
            }
            
            if (now > limit.resetTime) {
                this.limits.set(key, { count: 1, resetTime: now + windowMs });
                return true;
            }
            
            if (limit.count < maxAttempts) {
                limit.count++;
                return true;
            }
            
            return false;
        }
    },

    // Manejo de errores API
    async manejarRespuestaAPI(response) {
        if (!response.ok) {
            try {
                const error = await response.json();
                // Si hay detalles de validación, crear un mensaje más específico
                if (error.details && Array.isArray(error.details)) {
                    const detalles = error.details.map(detail => `${detail.field}: ${detail.message}`).join('\n');
                    throw new Error(`${error.error}\n\nDetalles:\n${detalles}`);
                }
                throw new Error(error.error || error.message || `Error HTTP: ${response.status}`);
            } catch (jsonError) {
                if (jsonError instanceof SyntaxError) {
                    throw new Error(`Error del servidor: ${response.status} ${response.statusText}`);
                }
                throw jsonError;
            }
        }
        try {
            return await response.json();
        } catch (jsonError) {
            throw new Error('Respuesta del servidor inválida');
        }
    },

    // Mostrar mensajes (función base)
    mostrarMensaje(mensaje, tipo, containerId = 'temp-message') {
        let messageDiv = document.getElementById(containerId);
        if (!messageDiv) {
            messageDiv = document.createElement('div');
            messageDiv.id = containerId;
            messageDiv.className = 'message';
            
            // Buscar contenedor apropiado
            const container = document.querySelector('.container') || document.body;
            container.appendChild(messageDiv);
        }
        
        messageDiv.textContent = mensaje;
        messageDiv.className = `message ${tipo}`;
        messageDiv.classList.remove('hidden');
        
        setTimeout(() => {
            messageDiv.classList.add('hidden');
        }, tipo === 'error' ? 5000 : 3000);
    },

    // Confirmar acción
    confirmar(mensaje) {
        return confirm(mensaje);
    },

    // Formatear fechas
    formatearFecha(fecha) {
        return new Date(fecha).toLocaleDateString('es-CO', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    // Copiar al portapapeles
    async copiarAlPortapapeles(texto) {
        try {
            await navigator.clipboard.writeText(texto);
            this.mostrarMensaje('Copiado al portapapeles', 'success');
        } catch (error) {
            console.error('Error copiando al portapapeles:', error);
            this.mostrarMensaje('No se pudo copiar al portapapeles', 'error');
        }
    },

    // Verificar si es URL válida
    esURLValida(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    },

    // Throttle para eventos frecuentes
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        }
    }
};

// Servicio centralizado de autenticación
window.AuthService = {
    async verificarAutenticacion(requiredRoles = []) {
        const token = localStorage.getItem('empleadoToken');
        const empleadoData = JSON.parse(localStorage.getItem('empleadoData') || '{}');
        
        if (!token || (requiredRoles.length && !requiredRoles.includes(empleadoData.rol))) {
            this.redirectToLogin();
            return false;
        }
        
        try {
            const response = await fetch('/api/empleado/verify', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) {
                this.clearSession();
                this.redirectToLogin();
                return false;
            }
            
            return await response.json();
        } catch (error) {
            this.clearSession();
            this.redirectToLogin();
            return false;
        }
    },
    
    clearSession() {
        localStorage.removeItem('empleadoToken');
        localStorage.removeItem('empleadoData');
    },
    
    redirectToLogin() {
        window.location.href = '/empleado/login';
    },
    
    async logout() {
        // Usar modal de confirmación profesional si está disponible
        if (window.mostrarConfirmacion) {
            mostrarConfirmacion(
                '🚪 Cerrar Sesión',
                '¿Está seguro de que desea cerrar sesión?',
                () => {
                    this.ejecutarLogout();
                }
            );
        } else {
            // Fallback para casos donde no hay modal custom
            if (AppUtils.confirmar('¿Estás seguro de que deseas cerrar sesión?')) {
                this.ejecutarLogout();
            }
        }
    },
    
    ejecutarLogout() {
        const token = localStorage.getItem('empleadoToken');
        
        fetch('/api/empleado/logout', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        }).finally(() => {
            this.clearSession();
            window.location.href = '/empleado/login';
        });
    }
};

// Servicio centralizado para llamadas a API
window.APIService = {
    async makeRequest(url, options = {}) {
        const token = localStorage.getItem('empleadoToken');
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            }
        };
        
        try {
            const response = await fetch(url, { ...defaultOptions, ...options });
            return await AppUtils.manejarRespuestaAPI(response);
        } catch (error) {
            AppUtils.mostrarMensaje('Error de conexión', 'error');
            throw error;
        }
    }
};

// Gestor centralizado de modales
window.ModalManager = {
    abrir(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }
    },
    
    cerrar(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
        }
    },
    
    cerrarTodos() {
        document.querySelectorAll('.modal:not(.hidden)').forEach(modal => {
            this.cerrar(modal.id);
        });
    },
    
    configurarEventosGlobales() {
        // Cerrar con Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.cerrarTodos();
        });
        
        // Cerrar al hacer clic fuera
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.cerrar(modal.id);
            });
        });
    }
};

// Utilidades para exportación
window.ExportUtils = {
    getEstadoColor(estado) {
        const colores = {
            'pendiente': { r: 243, g: 156, b: 18 },
            'en_proceso': { r: 52, g: 152, b: 219 },
            'completado': { r: 39, g: 174, b: 96 },
            'rechazado': { r: 231, g: 76, b: 60 }
        };
        return colores[estado] || { r: 0, g: 0, b: 0 };
    },
    
    async exportarSolicitudesPDF(solicitudes, titulo = 'Reporte de Solicitudes') {
        if (solicitudes.length === 0) {
            AppUtils.mostrarMensaje('No hay solicitudes para exportar', 'warning');
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
        doc.text(`${titulo} - Llantera`, margin, yPosition);
        
        yPosition += 10;
        doc.setFontSize(12);
        doc.setFont(undefined, 'normal');
        doc.text(`Fecha de generación: ${new Date().toLocaleDateString('es-ES')}`, margin, yPosition);
        doc.text(`Total de solicitudes: ${solicitudes.length}`, margin, yPosition + 7);
        
        yPosition += 25;
        
        // Iterar sobre las solicitudes
        solicitudes.forEach((solicitud, index) => {
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
            const estadoColor = this.getEstadoColor(solicitud.estado);
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
        doc.save(`${titulo.toLowerCase().replace(/ /g, '-')}-${fecha}.pdf`);
    },
    
    async exportarSolicitudesExcel(solicitudes, nombreArchivo = 'solicitudes-taller') {
        if (solicitudes.length === 0) {
            AppUtils.mostrarMensaje('No hay solicitudes para exportar', 'warning');
            return;
        }
        
        // Preparar datos para Excel
        const excelData = solicitudes.map(solicitud => ({
            'ID': solicitud.id,
            'Código Tracker': solicitud.tracker_code || solicitud.id,
            'Proveedor': solicitud.proveedor_nombre,
            'Email': solicitud.proveedor_email,
            'Teléfono': solicitud.proveedor_telefono || '',
            'Empresa': solicitud.empresa || '',
            'Servicio': solicitud.tipo_servicio,
            'Descripción': solicitud.descripcion,
            'Urgencia': solicitud.urgencia,
            'Estado': solicitud.estado,
            'Fecha Solicitud': AppUtils.formatearFecha(solicitud.fecha_solicitud),
            'Fecha Preferida': solicitud.fecha_preferida ? new Date(solicitud.fecha_preferida).toLocaleDateString('es-ES') : '',
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
        XLSX.writeFile(wb, `${nombreArchivo}-${fecha}.xlsx`);
    }
};

// Modal de confirmación profesional global
window.mostrarConfirmacion = function(titulo, mensaje, onConfirmar, onCancelar = null) {
    return new Promise((resolve) => {
        // Verificar si el modal existe, si no, crearlo
        let modal = document.getElementById('modal-confirmacion');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'modal-confirmacion';
            modal.className = 'modal hidden';
            modal.innerHTML = `
                <div class="modal-content">
                    <h3 id="confirmacion-titulo">⚠️ Confirmar Acción</h3>
                    <p id="confirmacion-mensaje">¿Está seguro de realizar esta acción?</p>
                    <div class="form-actions">
                        <button id="btn-confirmar-si" class="btn btn-primary">Sí</button>
                        <button id="btn-confirmar-no" class="btn btn-secondary">No</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        
        // Configurar contenido
        document.getElementById('confirmacion-titulo').textContent = titulo;
        document.getElementById('confirmacion-mensaje').textContent = mensaje;
        
        // Configurar eventos
        const btnSi = document.getElementById('btn-confirmar-si');
        const btnNo = document.getElementById('btn-confirmar-no');
        
        const cerrarModal = () => {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
        };
        
        btnSi.onclick = () => {
            cerrarModal();
            if (onConfirmar) onConfirmar();
            resolve(true);
        };
        
        btnNo.onclick = () => {
            cerrarModal();
            if (onCancelar) onCancelar();
            resolve(false);
        };
        
        // Mostrar modal
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        
        // Cerrar con Escape
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                cerrarModal();
                if (onCancelar) onCancelar();
                resolve(false);
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
        
        // Cerrar al hacer clic fuera
        modal.onclick = (e) => {
            if (e.target === modal) {
                cerrarModal();
                if (onCancelar) onCancelar();
                resolve(false);
            }
        };
    });
};

// Footer unificado para toda la aplicación
window.renderFooter = function(options = {}) {
    const {
        type = 'full', // 'full' | 'simple' | 'dashboard'
        showNavigation = true,
        showVersion = true,
        customContent = null,
        containerSelector = 'footer'
    } = options;
    
    let footerContent = '';
    
    // Navegación según el tipo
    if (showNavigation) {
        if (type === 'full') {
            footerContent += `
                <p>
                    <a href="/proveedor">Portal Proveedor</a> | 
                    <a href="/tracker">Rastrear Solicitud</a> | 
                    <a href="/empleado/login">Acceso Empleados</a> | 
                    <a href="/dashboard">Dashboard (Propietario)</a>
                </p>
            `;
        } else if (type === 'simple') {
            footerContent += `
                <p>
                    <a href="/">Crear Nueva Solicitud</a> | 
                    <a href="/tracker">Rastrear Solicitud</a> | 
                    <a href="/proveedor">Portal Proveedor</a>
                </p>
            `;
        } else if (type === 'dashboard') {
            footerContent += `<p><a href="/admin/dashboard">← Volver al Dashboard</a></p>`;
        }
    }
    
    // Contenido personalizado
    if (customContent) {
        footerContent += customContent;
    }
    
    // Información de versión
    if (showVersion) {
        footerContent += `
            <div class="version-info">
                <span id="app-version">v1.0.0</span> | 
                <span>msucedo</span>
            </div>
        `;
    }
    
    // Renderizar en el contenedor
    const footerElement = document.querySelector(containerSelector);
    if (footerElement) {
        footerElement.innerHTML = footerContent;
        
        // Cargar versión automáticamente si está habilitada
        if (showVersion) {
            AppUtils.cargarVersion();
        }
    }
    
    return footerContent;
};

// Función global para logout (mantener compatibilidad)
window.logout = function() {
    AuthService.logout();
};
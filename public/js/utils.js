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
        const re = /^\d{3}\/\d{2}R\d{2}$/;
        return re.test(medida);
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
            const error = await response.json().catch(() => ({ error: 'Error desconocido' }));
            throw new Error(error.error || `Error HTTP: ${response.status}`);
        }
        return response.json();
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
        if (AppUtils.confirmar('¿Estás seguro de que deseas cerrar sesión?')) {
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

// Función global para logout (mantener compatibilidad)
window.logout = function() {
    AuthService.logout();
};
// Componente reutilizable para modal de solicitud
class SolicitudModal {
    constructor() {
        this.currentStep = 1;
        this.totalSteps = 3;
        this.modalElement = null;
        this.form = null;
    }

    // Crear el HTML del modal
    createModalHTML() {
        return `
            <div id="solicitudModal" class="modal-overlay">
                <div class="modal-container">
                    <div class="modal-header">
                        <h2>Nueva Solicitud</h2>
                        <button type="button" class="modal-close" onclick="solicitudModal.cerrarModal()">&times;</button>
                    </div>
                    
                    <div class="modal-body">
                        <div class="wizard-container">
                            <!-- Indicador de progreso -->
                            <div class="progress-indicator">
                                <div class="step active" data-step="1">
                                    <span class="step-number">1</span>
                                    <span class="step-title">Datos del Proveedor</span>
                                </div>
                                <div class="step" data-step="2">
                                    <span class="step-number">2</span>
                                    <span class="step-title">Tipo de Servicio</span>
                                </div>
                                <div class="step" data-step="3">
                                    <span class="step-number">3</span>
                                    <span class="step-title">Detalles y Confirmación</span>
                                </div>
                            </div>

                            <form id="modalSolicitudForm" class="solicitud-form">
                                <!-- Paso 1: Datos del Proveedor -->
                                <div class="step-content active" data-step="1">
                                    <h3>Datos del Proveedor</h3>
                                    <p class="step-description">Sus datos de contacto (pre-llenados desde su cuenta)</p>
                                    
                                    <div class="form-group">
                                        <label for="modal_proveedor_nombre">Nombre Completo*</label>
                                        <input type="text" id="modal_proveedor_nombre" name="proveedor_nombre" required>
                                    </div>

                                    <div class="form-group">
                                        <label for="modal_proveedor_email">Email*</label>
                                        <input type="email" id="modal_proveedor_email" name="proveedor_email" required>
                                    </div>

                                    <div class="form-group">
                                        <label for="modal_proveedor_telefono">Teléfono</label>
                                        <input type="tel" id="modal_proveedor_telefono" name="proveedor_telefono" placeholder="Ej: 3001234567">
                                    </div>

                                    <div class="form-group">
                                        <label for="modal_empresa">Empresa (Opcional)</label>
                                        <input type="text" id="modal_empresa" name="empresa" placeholder="Nombre de su empresa">
                                    </div>
                                </div>

                                <!-- Paso 2: Tipo de Servicio -->
                                <div class="step-content" data-step="2">
                                    <h3>Tipo de Servicio</h3>
                                    <p class="step-description">Seleccione el servicio que necesita</p>
                                    
                                    <div class="form-group">
                                        <label for="modal_tipo_servicio">Tipo de Servicio*</label>
                                        <select id="modal_tipo_servicio" name="tipo_servicio" required>
                                            <option value="">Seleccionar servicio</option>
                                            <option value="repuestos">Repuestos y Autopartes</option>
                                            <option value="herramientas">Herramientas Prestadas</option>
                                            <option value="pintura">Servicios de Pintura</option>
                                            <option value="grua">Grúa/Remolque</option>
                                            <option value="mecanico">Servicios Mecánicos</option>
                                            <option value="otros">Otros</option>
                                        </select>
                                    </div>

                                    <div class="form-group">
                                        <label for="modal_urgencia">Nivel de Urgencia*</label>
                                        <div class="urgency-selector">
                                            <label class="urgency-option">
                                                <input type="radio" name="urgencia" value="baja">
                                                <span class="urgency-card baja">
                                                    <strong>Baja</strong>
                                                    <small>1-2 semanas</small>
                                                </span>
                                            </label>
                                            <label class="urgency-option">
                                                <input type="radio" name="urgencia" value="media" checked>
                                                <span class="urgency-card media">
                                                    <strong>Media</strong>
                                                    <small>3-5 días</small>
                                                </span>
                                            </label>
                                            <label class="urgency-option">
                                                <input type="radio" name="urgencia" value="alta">
                                                <span class="urgency-card alta">
                                                    <strong>Alta</strong>
                                                    <small>1-2 días</small>
                                                </span>
                                            </label>
                                            <label class="urgency-option">
                                                <input type="radio" name="urgencia" value="critica">
                                                <span class="urgency-card critica">
                                                    <strong>Crítica</strong>
                                                    <small>Inmediato</small>
                                                </span>
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <!-- Paso 3: Detalles y Confirmación -->
                                <div class="step-content" data-step="3">
                                    <h3>Detalles del Servicio</h3>
                                    <p class="step-description">Describa detalladamente lo que necesita</p>
                                    
                                    <div class="form-group">
                                        <label for="modal_descripcion">Descripción del Servicio*</label>
                                        <textarea id="modal_descripcion" name="descripcion" rows="5" required placeholder="Describa detalladamente el servicio o repuesto que solicita. Incluya marcas, modelos, especificaciones técnicas, etc."></textarea>
                                    </div>

                                    <div class="form-group">
                                        <label for="modal_fecha_preferida">Fecha Preferida (Opcional)</label>
                                        <input type="date" id="modal_fecha_preferida" name="fecha_preferida" min="">
                                    </div>

                                    <div class="form-group">
                                        <label for="modal_presupuesto_estimado">Presupuesto Estimado (Opcional)</label>
                                        <select id="modal_presupuesto_estimado" name="presupuesto_estimado">
                                            <option value="">No especificado</option>
                                            <option value="0-100">$0 - $100.000</option>
                                            <option value="100-500">$100.000 - $500.000</option>
                                            <option value="500-1000">$500.000 - $1.000.000</option>
                                            <option value="1000+">Más de $1.000.000</option>
                                        </select>
                                    </div>

                                    <!-- Resumen -->
                                    <div class="summary-section">
                                        <h4>Resumen de su solicitud:</h4>
                                        <div id="modal-summary-content"></div>
                                    </div>
                                </div>

                                <!-- Botones de navegación -->
                                <div class="wizard-navigation">
                                    <button type="button" id="modalPrevBtn" class="btn btn-secondary" style="display: none;">Anterior</button>
                                    <button type="button" id="modalNextBtn" class="btn btn-primary">Siguiente</button>
                                    <button type="submit" id="modalSubmitBtn" class="btn btn-success btn-block" style="display: none;">Enviar Solicitud</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Inicializar el modal
    init() {
        // Crear el HTML del modal e insertarlo en el DOM
        const modalHTML = this.createModalHTML();
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        this.modalElement = document.getElementById('solicitudModal');
        this.form = document.getElementById('modalSolicitudForm');
        
        this.setupEventListeners();
        this.setupDateMinimum();
    }

    // Configurar event listeners
    setupEventListeners() {
        const nextBtn = document.getElementById('modalNextBtn');
        const prevBtn = document.getElementById('modalPrevBtn');
        const submitBtn = document.getElementById('modalSubmitBtn');

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                if (this.validateCurrentStep()) {
                    if (this.currentStep < this.totalSteps) {
                        this.currentStep++;
                        this.updateWizard();
                        if (this.currentStep === this.totalSteps) {
                            this.updateSummary();
                        }
                    }
                }
            });
        }

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (this.currentStep > 1) {
                    this.currentStep--;
                    this.updateWizard();
                }
            });
        }

        if (this.form) {
            this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        }

        // Cerrar modal con ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modalElement && this.modalElement.style.display === 'block') {
                this.cerrarModal();
            }
        });

        // Cerrar modal al hacer clic fuera
        this.modalElement.addEventListener('click', (e) => {
            if (e.target === this.modalElement) {
                this.cerrarModal();
            }
        });
    }

    // Configurar fecha mínima
    setupDateMinimum() {
        const fechaPreferida = document.getElementById('modal_fecha_preferida');
        if (fechaPreferida) {
            const today = new Date().toISOString().split('T')[0];
            fechaPreferida.min = today;
        }
    }

    // Abrir modal y pre-llenar datos
    abrirModal() {
        this.preLlenarDatos();
        this.modalElement.style.display = 'block';
        document.body.style.overflow = 'hidden'; // Prevenir scroll del fondo
        
        // Reset wizard to first step
        this.currentStep = 1;
        this.updateWizard();
    }

    // Cerrar modal
    cerrarModal() {
        this.modalElement.style.display = 'none';
        document.body.style.overflow = 'auto'; // Restaurar scroll
        
        // Reset form
        this.form.reset();
        this.currentStep = 1;
        this.updateWizard();
    }

    // Pre-llenar datos desde localStorage
    preLlenarDatos() {
        const proveedorData = localStorage.getItem('proveedorData');
        
        if (proveedorData) {
            try {
                const datos = JSON.parse(proveedorData);
                
                // Llenar campos con datos de Google Auth
                const nombreInput = document.getElementById('modal_proveedor_nombre');
                const emailInput = document.getElementById('modal_proveedor_email');
                
                if (nombreInput && datos.nombre) {
                    nombreInput.value = datos.nombre;
                }
                
                if (emailInput && datos.email) {
                    emailInput.value = datos.email;
                }
                
                console.log('Datos pre-llenados:', datos);
            } catch (error) {
                console.error('Error al parsear datos del proveedor:', error);
            }
        }
    }

    // Actualizar wizard
    updateWizard() {
        const modal = this.modalElement;
        
        // Actualizar indicador de progreso
        modal.querySelectorAll('.progress-indicator .step').forEach((step, index) => {
            const stepNumber = index + 1;
            step.classList.remove('active', 'completed');
            
            if (stepNumber === this.currentStep) {
                step.classList.add('active');
            } else if (stepNumber < this.currentStep) {
                step.classList.add('completed');
            }
        });
        
        // Mostrar/ocultar contenido de pasos
        modal.querySelectorAll('.step-content').forEach((content) => {
            content.classList.remove('active');
        });
        modal.querySelector(`.step-content[data-step="${this.currentStep}"]`).classList.add('active');
        
        // Actualizar botones
        const prevBtn = document.getElementById('modalPrevBtn');
        const nextBtn = document.getElementById('modalNextBtn');
        const submitBtn = document.getElementById('modalSubmitBtn');
        
        prevBtn.style.display = this.currentStep === 1 ? 'none' : 'block';
        nextBtn.style.display = this.currentStep === this.totalSteps ? 'none' : 'block';
        submitBtn.style.display = this.currentStep === this.totalSteps ? 'block' : 'none';
    }

    // Validar paso actual
    validateCurrentStep() {
        const modal = this.modalElement;
        const currentStepElement = modal.querySelector(`.step-content[data-step="${this.currentStep}"]`);
        const requiredFields = currentStepElement.querySelectorAll('[required]');
        let isValid = true;
        
        requiredFields.forEach(field => {
            field.classList.remove('error');
            const value = field.value.trim();
            
            if (!value) {
                field.classList.add('error');
                isValid = false;
                return;
            }
            
            // Validación específica por tipo de campo
            if (field.type === 'email' && !AppUtils.validarEmail(value)) {
                field.classList.add('error');
                AppUtils.mostrarMensaje('Por favor ingrese un email válido', 'error');
                isValid = false;
            }
            
            if (field.type === 'tel' && value && !AppUtils.validarTelefono(value)) {
                field.classList.add('error');
                AppUtils.mostrarMensaje('Por favor ingrese un teléfono válido', 'error');
                isValid = false;
            }
            
            // Sanitizar texto para prevenir XSS
            field.value = AppUtils.sanitizarTexto(value);
        });
        
        // Validación especial para step 2 (urgencia)
        if (this.currentStep === 2) {
            const urgenciaSelected = modal.querySelector('input[name="urgencia"]:checked');
            if (!urgenciaSelected) {
                AppUtils.mostrarMensaje('Por favor seleccione el nivel de urgencia', 'error');
                isValid = false;
            }
        }
        
        if (!isValid && requiredFields.length > 0) {
            AppUtils.mostrarMensaje('Por favor complete todos los campos obligatorios', 'error');
        }
        
        return isValid;
    }

    // Actualizar resumen
    updateSummary() {
        const summaryContent = document.getElementById('modal-summary-content');
        const formData = new FormData(this.form);
        const data = Object.fromEntries(formData);
        
        const urgenciaTexts = {
            'baja': 'Baja (1-2 semanas)',
            'media': 'Media (3-5 días)',
            'alta': 'Alta (1-2 días)',
            'critica': 'Crítica (Inmediato)'
        };
        
        const servicioTexts = {
            'repuestos': 'Repuestos y Autopartes',
            'herramientas': 'Herramientas Prestadas',
            'pintura': 'Servicios de Pintura',
            'grua': 'Grúa/Remolque',
            'mecanico': 'Servicios Mecánicos',
            'otros': 'Otros'
        };
        
        let html = `
            <p><strong>Proveedor:</strong> ${data.proveedor_nombre}</p>
            <p><strong>Email:</strong> ${data.proveedor_email}</p>
            ${data.proveedor_telefono ? `<p><strong>Teléfono:</strong> ${data.proveedor_telefono}</p>` : ''}
            ${data.empresa ? `<p><strong>Empresa:</strong> ${data.empresa}</p>` : ''}
            <p><strong>Servicio:</strong> ${servicioTexts[data.tipo_servicio] || data.tipo_servicio}</p>
            <p><strong>Urgencia:</strong> ${urgenciaTexts[data.urgencia] || data.urgencia}</p>
            <p><strong>Descripción:</strong> ${data.descripcion}</p>
            ${data.fecha_preferida ? `<p><strong>Fecha Preferida:</strong> ${new Date(data.fecha_preferida).toLocaleDateString('es-ES')}</p>` : ''}
            ${data.presupuesto_estimado ? `<p><strong>Presupuesto:</strong> ${data.presupuesto_estimado}</p>` : ''}
        `;
        
        summaryContent.innerHTML = html;
    }

    // Manejar envío del formulario
    async handleSubmit(e) {
        e.preventDefault();
        
        if (!this.validateCurrentStep()) {
            return;
        }
        
        const formData = new FormData(this.form);
        const data = Object.fromEntries(formData);
        
        try {
            AppUtils.mostrarMensaje('Enviando solicitud...', 'info');
            
            const response = await fetch('/api/solicitudes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            
            const result = await AppUtils.manejarRespuestaAPI(response);
            
            AppUtils.mostrarMensaje(`¡Solicitud enviada correctamente! Código de seguimiento: ${result.tracker || result.id}. Nos pondremos en contacto pronto.`, 'success');
            
            this.cerrarModal();
            
            // Recargar las solicitudes en el dashboard
            if (typeof cargarSolicitudesOAuth === 'function') {
                const token = localStorage.getItem('proveedorToken');
                if (token) {
                    await cargarSolicitudesOAuth(token);
                }
            } else if (typeof verificarAutenticacion === 'function') {
                await verificarAutenticacion();
            }
            
        } catch (error) {
            console.error('Error al enviar solicitud:', error);
            if (error.message.includes('Failed to fetch')) {
                AppUtils.mostrarMensaje('No se pudo conectar con el servidor. Verifique su conexión a internet.', 'error');
            } else if (error.message.includes('HTTP: 5')) {
                AppUtils.mostrarMensaje('Error interno del servidor. Por favor, intente más tarde.', 'error');
            } else {
                AppUtils.mostrarMensaje(error.message || 'Error al enviar la solicitud. Por favor, intente nuevamente.', 'error');
            }
        }
    }
}

// Instancia global del modal
let solicitudModal = null;

// Función para inicializar el modal (llamar desde otras páginas)
function initSolicitudModal() {
    if (!solicitudModal) {
        solicitudModal = new SolicitudModal();
        solicitudModal.init();
    }
}

// Función para abrir el modal (llamar desde botones)
function abrirModalSolicitud() {
    if (!solicitudModal) {
        initSolicitudModal();
    }
    solicitudModal.abrirModal();
}
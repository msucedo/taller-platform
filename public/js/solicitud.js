document.addEventListener('DOMContentLoaded', function() {
    // Cargar información de versión
    AppUtils.cargarVersion();
    
    const form = document.getElementById('solicitudForm');
    const messageDiv = document.getElementById('message');
    const nextBtn = document.getElementById('nextBtn');
    const prevBtn = document.getElementById('prevBtn');
    const submitBtn = document.getElementById('submitBtn');
    const fechaPreferida = document.getElementById('fecha_preferida');
    
    let currentStep = 1;
    const totalSteps = 3;
    
    // Establecer fecha mínima (hoy)
    if (fechaPreferida) {
        const today = new Date().toISOString().split('T')[0];
        fechaPreferida.min = today;
    }
    
    // Navegación del wizard
    if (nextBtn) {
        nextBtn.addEventListener('click', function() {
            if (validateCurrentStep()) {
                if (currentStep < totalSteps) {
                    currentStep++;
                    updateWizard();
                    if (currentStep === totalSteps) {
                        updateSummary();
                    }
                }
            }
        });
    }
    
    if (prevBtn) {
        prevBtn.addEventListener('click', function() {
            if (currentStep > 1) {
                currentStep--;
                updateWizard();
            }
        });
    }

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (!validateCurrentStep()) {
            return;
        }
        
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        
        try {
            AppUtils.mostrarMensaje('Enviando solicitud...', 'info');
            
            // Debug: mostrar datos que se envían
            console.log('Datos a enviar:', data);
            
            const response = await fetch('/api/solicitudes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            
            const result = await AppUtils.manejarRespuestaAPI(response);
            
            AppUtils.mostrarMensaje(`¡Solicitud enviada correctamente! Código de seguimiento: ${result.tracker || result.id}. Nos pondremos en contacto pronto.`, 'success');
            form.reset();
            currentStep = 1;
            updateWizard();
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
    });
    
    function updateWizard() {
        // Actualizar indicador de progreso
        document.querySelectorAll('.progress-indicator .step').forEach((step, index) => {
            const stepNumber = index + 1;
            step.classList.remove('active', 'completed');
            
            if (stepNumber === currentStep) {
                step.classList.add('active');
            } else if (stepNumber < currentStep) {
                step.classList.add('completed');
            }
        });
        
        // Mostrar/ocultar contenido de pasos
        document.querySelectorAll('.step-content').forEach((content) => {
            content.classList.remove('active');
        });
        document.querySelector(`.step-content[data-step="${currentStep}"]`).classList.add('active');
        
        // Actualizar botones
        prevBtn.style.display = currentStep === 1 ? 'none' : 'block';
        nextBtn.style.display = currentStep === totalSteps ? 'none' : 'block';
        submitBtn.style.display = currentStep === totalSteps ? 'block' : 'none';
    }
    
    function validateCurrentStep() {
        const currentStepElement = document.querySelector(`.step-content[data-step="${currentStep}"]`);
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
            
            if (field.type === 'tel' && !AppUtils.validarTelefono(value)) {
                field.classList.add('error');
                AppUtils.mostrarMensaje('Por favor ingrese un teléfono válido', 'error');
                isValid = false;
            }
            
            // Sanitizar texto para prevenir XSS
            field.value = AppUtils.sanitizarTexto(value);
        });
        
        // Validación especial para step 2 (urgencia)
        if (currentStep === 2) {
            const urgenciaSelected = document.querySelector('input[name="urgencia"]:checked');
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
    
    function updateSummary() {
        const summaryContent = document.getElementById('summary-content');
        const formData = new FormData(form);
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

    
    // Agregar estilos para campos con error
    const style = document.createElement('style');
    style.textContent = `
        .form-group input.error,
        .form-group select.error,
        .form-group textarea.error {
            border-color: #e74c3c !important;
            box-shadow: 0 0 5px rgba(231, 76, 60, 0.3) !important;
        }
    `;
    document.head.appendChild(style);
});


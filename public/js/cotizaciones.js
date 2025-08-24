let vehiculoData = {};
let catalogoLlantas = [];

document.addEventListener('DOMContentLoaded', function() {
    initializePage();
    setupEventListeners();
    cargarMarcas();
});

function initializePage() {
    // Cargar versión de la app
    AppUtils.cargarVersion();
    
    // Mostrar formulario por vehículo por defecto
    mostrarFormulario('vehiculo');
}

function setupEventListeners() {
    // Selector de tipo de búsqueda
    document.querySelectorAll('input[name="search_type"]').forEach(radio => {
        radio.addEventListener('change', function() {
            mostrarFormulario(this.value);
        });
    });

    // Dropdowns de vehículo
    document.getElementById('marca').addEventListener('change', onMarcaChange);
    document.getElementById('modelo').addEventListener('change', onModeloChange);
    document.getElementById('ano').addEventListener('change', onAnoChange);

    // Botones de búsqueda
    document.getElementById('buscar-vehiculo').addEventListener('click', buscarPorVehiculo);
    document.getElementById('buscar-medida').addEventListener('click', buscarPorMedida);
}

function mostrarFormulario(tipo) {
    const formVehiculo = document.getElementById('form-vehiculo');
    const formMedida = document.getElementById('form-medida');
    
    if (tipo === 'vehiculo') {
        formVehiculo.classList.add('active');
        formMedida.classList.remove('active');
    } else {
        formMedida.classList.add('active');
        formVehiculo.classList.remove('active');
    }
    
    // Limpiar resultados
    document.getElementById('resultados').style.display = 'none';
}

// Funciones para datos de vehículos
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



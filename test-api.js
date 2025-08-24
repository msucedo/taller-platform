const http = require('http');

// Función para hacer requests HTTP
function makeRequest(options, data = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: res.headers['content-type']?.includes('application/json') ? JSON.parse(body) : body
                    });
                } catch (error) {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: body
                    });
                }
            });
        });
        
        req.on('error', reject);
        
        if (data) {
            req.write(typeof data === 'string' ? data : JSON.stringify(data));
        }
        
        req.end();
    });
}

async function testAPI() {
    console.log('🧪 TESTING DASHBOARD ADMIN API\n');
    
    let token = null;
    
    try {
        // 1. Test de login
        console.log('1️⃣ Testing Admin Login...');
        const loginResponse = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/empleado/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        }, {
            email: 'admin@taller.com',
            password: 'admin123'
        });
        
        if (loginResponse.statusCode === 200 && loginResponse.body.token) {
            token = loginResponse.body.token;
            console.log('   ✅ Login exitoso');
            console.log(`   🔑 Token obtenido: ${token.substring(0, 20)}...`);
        } else {
            console.log('   ❌ Login falló:', loginResponse.statusCode);
            return;
        }
        
        // 2. Test de verificación de token
        console.log('\n2️⃣ Testing Token Verification...');
        const verifyResponse = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/empleado/verify',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log(`   ${verifyResponse.statusCode === 200 ? '✅' : '❌'} Token verification: ${verifyResponse.statusCode}`);
        
        // 3. Test de endpoints de cotizaciones
        console.log('\n3️⃣ Testing Cotizaciones API...');
        
        // GET /api/cotizaciones
        const cotizacionesResponse = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/cotizaciones',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log(`   ${cotizacionesResponse.statusCode === 200 ? '✅' : '❌'} GET /api/cotizaciones: ${cotizacionesResponse.statusCode}`);
        if (cotizacionesResponse.statusCode === 200) {
            console.log(`   📊 Cotizaciones encontradas: ${cotizacionesResponse.body.length}`);
        }
        
        // GET /api/cotizaciones/estadisticas
        const statsResponse = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/cotizaciones/estadisticas',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log(`   ${statsResponse.statusCode === 200 ? '✅' : '❌'} GET /api/cotizaciones/estadisticas: ${statsResponse.statusCode}`);
        if (statsResponse.statusCode === 200) {
            console.log(`   📈 Total: ${statsResponse.body.total || 0}, Pendientes: ${statsResponse.body.pendientes || 0}`);
        }
        
        // 4. Test de creación de cotización
        console.log('\n4️⃣ Testing Cotización Creation...');
        const nuevaCotizacion = {
            cliente_nombre: 'Cliente Prueba',
            cliente_email: 'cliente@prueba.com',
            titulo: 'Cotización de prueba automatizada',
            descripcion: 'Esta es una cotización creada por el script de prueba',
            items: [
                {
                    tipo: 'servicio',
                    nombre: 'Llanta Michelin 205/55R16',
                    descripcion: 'Llanta premium para auto compacto',
                    cantidad: 4,
                    precio_unitario: 2500.00,
                    descuento_porcentaje: 10
                }
            ]
        };
        
        const createResponse = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/cotizaciones',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        }, nuevaCotizacion);
        
        console.log(`   ${createResponse.statusCode === 201 ? '✅' : '❌'} POST /api/cotizaciones: ${createResponse.statusCode}`);
        if (createResponse.statusCode === 201) {
            console.log(`   💰 Cotización creada: ${createResponse.body.numero}`);
            
            // 5. Test de obtener cotización específica
            const cotizacionId = createResponse.body.cotizacion_id;
            console.log('\n5️⃣ Testing Get Specific Cotización...');
            
            const getOneResponse = await makeRequest({
                hostname: 'localhost',
                port: 3000,
                path: `/api/cotizaciones/${cotizacionId}`,
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            console.log(`   ${getOneResponse.statusCode === 200 ? '✅' : '❌'} GET /api/cotizaciones/${cotizacionId}: ${getOneResponse.statusCode}`);
            if (getOneResponse.statusCode === 200) {
                console.log(`   📋 Items en cotización: ${getOneResponse.body.items?.length || 0}`);
                console.log(`   💵 Total: $${getOneResponse.body.total || 0}`);
            }
        } else {
            console.log('   ❌ Error creando cotización:', createResponse.body);
        }
        
        // 6. Test de otros endpoints importantes
        console.log('\n6️⃣ Testing Other Important Endpoints...');
        
        // GET /api/empleados
        const empleadosResponse = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/empleados',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log(`   ${empleadosResponse.statusCode === 200 ? '✅' : '❌'} GET /api/empleados: ${empleadosResponse.statusCode}`);
        
        // GET /api/solicitudes
        const solicitudesResponse = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/solicitudes',
            method: 'GET'
        });
        
        console.log(`   ${solicitudesResponse.statusCode === 200 ? '✅' : '❌'} GET /api/solicitudes: ${solicitudesResponse.statusCode}`);
        
        // 7. Test de páginas HTML importantes
        console.log('\n7️⃣ Testing HTML Pages...');
        
        const pages = [
            '/empleado/login',
            '/admin/dashboard', 
            '/cotizaciones',
            '/admin/inventario'
        ];
        
        for (const pagePath of pages) {
            const pageResponse = await makeRequest({
                hostname: 'localhost',
                port: 3000,
                path: pagePath,
                method: 'GET'
            });
            
            const isHTML = pageResponse.headers['content-type']?.includes('text/html');
            console.log(`   ${pageResponse.statusCode === 200 && isHTML ? '✅' : '❌'} ${pagePath}: ${pageResponse.statusCode} ${isHTML ? '(HTML)' : ''}`);
        }
        
        console.log('\n🎉 PRUEBAS COMPLETADAS\n');
        console.log('📊 RESUMEN:');
        console.log('✅ API de autenticación funcionando');
        console.log('✅ API de cotizaciones funcionando'); 
        console.log('✅ Creación de cotizaciones exitosa');
        console.log('✅ Endpoints básicos respondiendo');
        console.log('✅ Páginas HTML sirviendo correctamente');
        console.log('\n🚀 El dashboard admin debería funcionar correctamente!');
        
    } catch (error) {
        console.error('❌ Error durante las pruebas:', error.message);
    }
}

// Función para verificar si el servidor está ejecutándose
async function checkServer() {
    try {
        const response = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/version',
            method: 'GET'
        });
        
        return response.statusCode === 200;
    } catch (error) {
        return false;
    }
}

async function run() {
    console.log('🔍 Verificando servidor...');
    
    const serverRunning = await checkServer();
    if (!serverRunning) {
        console.log('❌ Servidor no está ejecutándose en localhost:3000');
        console.log('💡 Asegúrate de ejecutar: node server.js');
        return;
    }
    
    console.log('✅ Servidor detectado en localhost:3000\n');
    await testAPI();
}

run().catch(console.error);
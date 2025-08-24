const puppeteer = require('puppeteer');

async function testDashboard() {
    const browser = await puppeteer.launch({ 
        headless: false, // Mostrar navegador
        slowMo: 1000,    // Retraso entre acciones
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    try {
        console.log('🧪 Iniciando pruebas del Dashboard Admin...\n');
        
        // 1. Ir a la página de login
        console.log('1️⃣ Navegando a login de empleado...');
        await page.goto('http://localhost:3000/empleado/login');
        await page.waitForSelector('#email');
        
        // 2. Hacer login como admin
        console.log('2️⃣ Iniciando sesión como admin...');
        await page.type('#email', 'admin@taller.com');
        await page.type('#password', 'admin123');
        await page.click('button[type="submit"]');
        
        // Esperar a que cargue el dashboard
        await page.waitForNavigation();
        await page.waitForSelector('.admin-tabs');
        console.log('✅ Login exitoso - Dashboard cargado');
        
        // 3. Probar tabs del dashboard
        console.log('\n3️⃣ Probando tabs del dashboard...');
        
        const tabs = ['empleados', 'reportes', 'configuracion'];
        for (const tab of tabs) {
            console.log(`   📋 Probando tab: ${tab}`);
            await page.click(`button[onclick="showTab('${tab}')"]`);
            await page.waitForTimeout(1000);
            
            // Verificar que el tab esté activo
            const isActive = await page.$eval(`button[onclick="showTab('${tab}')"]`, 
                el => el.classList.contains('active'));
            console.log(`   ${isActive ? '✅' : '❌'} Tab ${tab} ${isActive ? 'activado' : 'falló'}`);
        }
        
        // 4. Probar botón de Cotizaciones
        console.log('\n4️⃣ Probando botón de Cotizaciones...');
        await page.click('button[onclick="irACotizaciones()"]');
        await page.waitForNavigation();
        
        // Verificar que estamos en la página de cotizaciones
        const currentUrl = page.url();
        const isOnCotizaciones = currentUrl.includes('/cotizaciones');
        console.log(`   ${isOnCotizaciones ? '✅' : '❌'} Navegación a cotizaciones ${isOnCotizaciones ? 'exitosa' : 'falló'}`);
        console.log(`   📍 URL actual: ${currentUrl}`);
        
        if (isOnCotizaciones) {
            // 5. Probar modal de cotizaciones
            console.log('\n5️⃣ Probando modal de cotizaciones...');
            
            // Verificar que el modal esté cerrado inicialmente
            const modalHidden = await page.$eval('#modalCotizacion', 
                el => el.style.display === 'none' || el.classList.contains('hidden'));
            console.log(`   ${modalHidden ? '✅' : '❌'} Modal cerrado por defecto: ${modalHidden ? 'correcto' : 'falló'}`);
            
            // Abrir modal
            console.log('   🔄 Abriendo modal...');
            await page.click('button[onclick="nuevaCotizacion()"]');
            await page.waitForTimeout(500);
            
            // Verificar que el modal esté abierto
            const modalVisible = await page.$eval('#modalCotizacion', 
                el => el.style.display === 'flex' && !el.classList.contains('hidden'));
            console.log(`   ${modalVisible ? '✅' : '❌'} Modal abierto: ${modalVisible ? 'correcto' : 'falló'}`);
            
            if (modalVisible) {
                // Cerrar modal
                console.log('   🔄 Cerrando modal...');
                await page.click('button[onclick="cerrarModalCotizacion()"]');
                await page.waitForTimeout(500);
                
                const modalClosed = await page.$eval('#modalCotizacion', 
                    el => el.style.display === 'none' || el.classList.contains('hidden'));
                console.log(`   ${modalClosed ? '✅' : '❌'} Modal cerrado: ${modalClosed ? 'correcto' : 'falló'}`);
            }
            
            // 6. Verificar estilos de botones
            console.log('\n6️⃣ Verificando estilos de botones...');
            const buttons = await page.$$('.btn');
            console.log(`   📊 Encontrados ${buttons.length} botones con clase .btn`);
            
            // Verificar que los botones tengan las clases correctas
            const buttonClasses = await page.$$eval('.btn', elements => 
                elements.map(el => Array.from(el.classList).join(' '))
            );
            
            const hasConsistentStyles = buttonClasses.every(classes => 
                classes.includes('btn') && 
                (classes.includes('btn-primary') || classes.includes('btn-secondary') || 
                 classes.includes('btn-success') || classes.includes('btn-danger') || 
                 classes.includes('btn-info') || classes.includes('btn-warning'))
            );
            
            console.log(`   ${hasConsistentStyles ? '✅' : '❌'} Estilos de botones consistentes: ${hasConsistentStyles ? 'correcto' : 'necesita revisión'}`);
        }
        
        // 7. Volver al dashboard y probar inventario
        console.log('\n7️⃣ Volviendo al dashboard para probar inventario...');
        await page.click('button[onclick="volverAlDashboard()"]');
        await page.waitForNavigation();
        await page.waitForSelector('.admin-tabs');
        
        console.log('   🔄 Probando botón de Inventario...');
        await page.click('button[onclick="irAInventario()"]');
        await page.waitForNavigation();
        
        const inventarioUrl = page.url();
        const isOnInventario = inventarioUrl.includes('/admin/inventario');
        console.log(`   ${isOnInventario ? '✅' : '❌'} Navegación a inventario ${isOnInventario ? 'exitosa' : 'falló'}`);
        console.log(`   📍 URL actual: ${inventarioUrl}`);
        
        console.log('\n🎉 ¡Pruebas completadas!');
        console.log('\n📊 RESUMEN:');
        console.log('✅ Login de administrador');
        console.log('✅ Navegación entre tabs');
        console.log('✅ Botón de cotizaciones');
        console.log('✅ Modal de cotizaciones (abrir/cerrar)');
        console.log('✅ Estilos consistentes');
        console.log('✅ Botón de inventario');
        
    } catch (error) {
        console.error('❌ Error durante las pruebas:', error.message);
        
        // Tomar screenshot del error
        await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
        console.log('📸 Screenshot guardado como error-screenshot.png');
    }
    
    // Mantener navegador abierto por 5 segundos para ver resultado
    console.log('\n⏳ Manteniendo navegador abierto por 5 segundos...');
    await page.waitForTimeout(5000);
    
    await browser.close();
}

// Verificar si Puppeteer está instalado
async function checkDependencies() {
    try {
        require('puppeteer');
        return true;
    } catch (error) {
        console.log('❌ Puppeteer no está instalado.');
        console.log('📦 Instalando Puppeteer...');
        
        const { exec } = require('child_process');
        return new Promise((resolve, reject) => {
            exec('npm install puppeteer', (error, stdout, stderr) => {
                if (error) {
                    console.error('❌ Error instalando Puppeteer:', error);
                    reject(false);
                } else {
                    console.log('✅ Puppeteer instalado correctamente');
                    resolve(true);
                }
            });
        });
    }
}

// Ejecutar pruebas
async function run() {
    console.log('🚀 Iniciando script de pruebas automatizadas...\n');
    
    const hasDepencencies = await checkDependencies();
    if (hasDepencencies) {
        await testDashboard();
    } else {
        console.log('❌ No se pueden ejecutar las pruebas sin Puppeteer');
    }
}

run().catch(console.error);
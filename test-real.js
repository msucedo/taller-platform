const puppeteer = require('puppeteer');

async function testDashboardReal() {
    console.log('🧪 TESTING DASHBOARD COMPLETO - Simulando usuario real\n');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        slowMo: 500,
        devtools: true, // Abrir devtools para ver errores
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-web-security'
        ]
    });
    
    const page = await browser.newPage();
    
    // Capturar errores de JavaScript
    const jsErrors = [];
    page.on('pageerror', error => {
        jsErrors.push(`❌ JS ERROR: ${error.message}`);
        console.log(`❌ JS ERROR: ${error.message}`);
    });
    
    page.on('console', msg => {
        if (msg.type() === 'error') {
            console.log(`❌ CONSOLE ERROR: ${msg.text()}`);
        }
    });
    
    try {
        // 1. Login
        console.log('1️⃣ Haciendo login...');
        await page.goto('http://localhost:3000/empleado/login', { waitUntil: 'networkidle0' });
        
        await page.type('#email', 'admin@taller.com');
        await page.type('#password', 'admin123');
        await page.click('button[type="submit"]');
        
        await page.waitForNavigation({ waitUntil: 'networkidle0' });
        console.log('✅ Login exitoso');
        
        // 2. Probar tab Empleados
        console.log('\n2️⃣ Probando tab EMPLEADOS...');
        await page.waitForSelector('.admin-tabs');
        
        // Click en empleados
        await page.click('button[onclick="showTab(\'empleados\')"]');
        await page.waitForTimeout(2000);
        
        // Verificar si se cargó la sección de empleados
        const empleadosVisible = await page.$('#tab-empleados.active');
        console.log(`   ${empleadosVisible ? '✅' : '❌'} Tab empleados ${empleadosVisible ? 'visible' : 'no visible'}`);
        
        // Buscar botón "Nuevo Empleado"
        const btnNuevoEmpleado = await page.$('button[onclick="mostrarFormularioEmpleado()"]');
        console.log(`   ${btnNuevoEmpleado ? '✅' : '❌'} Botón "Nuevo Empleado" ${btnNuevoEmpleado ? 'encontrado' : 'NO encontrado'}`);
        
        if (btnNuevoEmpleado) {
            console.log('   🔄 Probando click en "Nuevo Empleado"...');
            await page.click('button[onclick="mostrarFormularioEmpleado()"]');
            await page.waitForTimeout(1000);
            
            // Verificar si se abrió el modal
            const modalEmpleado = await page.$('#modalEmpleado:not(.hidden)');
            console.log(`   ${modalEmpleado ? '✅' : '❌'} Modal empleado ${modalEmpleado ? 'abierto' : 'NO abierto'}`);
            
            if (modalEmpleado) {
                // Cerrar modal
                await page.click('button[onclick="cerrarModal(\'modalEmpleado\')"]');
                await page.waitForTimeout(500);
            }
        }
        
        // 3. Probar tab Reportes
        console.log('\n3️⃣ Probando tab REPORTES...');
        await page.click('button[onclick="showTab(\'reportes\')"]');
        await page.waitForTimeout(2000);
        
        const reportesVisible = await page.$('#tab-reportes.active');
        console.log(`   ${reportesVisible ? '✅' : '❌'} Tab reportes ${reportesVisible ? 'visible' : 'no visible'}`);
        
        // Probar botones de reportes
        const reporteButtons = await page.$$('#tab-reportes .reporte-card button');
        console.log(`   📊 Encontrados ${reporteButtons.length} botones de reportes`);
        
        if (reporteButtons.length > 0) {
            console.log('   🔄 Probando primer botón de reporte...');
            await reporteButtons[0].click();
            await page.waitForTimeout(1000);
        }
        
        // 4. Volver a solicitudes y probar PDF
        console.log('\n4️⃣ Probando exportación PDF...');
        await page.click('button[onclick="showTab(\'solicitudes\')"]');
        await page.waitForTimeout(2000);
        
        // Buscar botón PDF
        const btnPDF = await page.$('button[onclick="exportarPDF()"]');
        console.log(`   ${btnPDF ? '✅' : '❌'} Botón PDF ${btnPDF ? 'encontrado' : 'NO encontrado'}`);
        
        if (btnPDF) {
            console.log('   🔄 Probando click en PDF...');
            await page.click('button[onclick="exportarPDF()"]');
            await page.waitForTimeout(2000);
        }
        
        // Buscar botón Excel
        const btnExcel = await page.$('button[onclick="exportarExcel()"]');
        console.log(`   ${btnExcel ? '✅' : '❌'} Botón Excel ${btnExcel ? 'encontrado' : 'NO encontrado'}`);
        
        if (btnExcel) {
            console.log('   🔄 Probando click en Excel...');
            await page.click('button[onclick="exportarExcel()"]');
            await page.waitForTimeout(2000);
        }
        
        // 5. Probar navegación a cotizaciones
        console.log('\n5️⃣ Probando navegación a COTIZACIONES...');
        await page.click('button[onclick="irACotizaciones()"]');
        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 });
        
        const currentUrl = page.url();
        const enCotizaciones = currentUrl.includes('/cotizaciones');
        console.log(`   ${enCotizaciones ? '✅' : '❌'} Navegación a cotizaciones ${enCotizaciones ? 'exitosa' : 'falló'}`);
        console.log(`   📍 URL actual: ${currentUrl}`);
        
        if (enCotizaciones) {
            // Probar modal de cotizaciones
            console.log('   🔄 Probando modal de cotizaciones...');
            
            const modalCerrado = await page.$('#modalCotizacion.hidden');
            console.log(`   ${modalCerrado ? '✅' : '❌'} Modal ${modalCerrado ? 'cerrado inicialmente' : 'abierto (problema)'}`);
            
            // Probar botón nueva cotización
            const btnNuevaCot = await page.$('button[onclick="nuevaCotizacion()"]');
            if (btnNuevaCot) {
                await page.click('button[onclick="nuevaCotizacion()"]');
                await page.waitForTimeout(1000);
                
                const modalAbierto = await page.$('#modalCotizacion:not(.hidden)');
                console.log(`   ${modalAbierto ? '✅' : '❌'} Modal ${modalAbierto ? 'abierto correctamente' : 'NO se abrió'}`);
                
                if (modalAbierto) {
                    await page.click('button[onclick="cerrarModalCotizacion()"]');
                    await page.waitForTimeout(500);
                }
            }
        }
        
        // 6. Probar navegación a inventario
        console.log('\n6️⃣ Probando navegación a INVENTARIO...');
        await page.goto('http://localhost:3000/admin/dashboard', { waitUntil: 'networkidle0' });
        await page.waitForTimeout(1000);
        
        await page.click('button[onclick="irAInventario()"]');
        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 });
        
        const inventarioUrl = page.url();
        const enInventario = inventarioUrl.includes('/admin/inventario');
        console.log(`   ${enInventario ? '✅' : '❌'} Navegación a inventario ${enInventario ? 'exitosa' : 'falló'}`);
        console.log(`   📍 URL actual: ${inventarioUrl}`);
        
        // Resumen de errores JavaScript
        if (jsErrors.length > 0) {
            console.log('\n❌ ERRORES JAVASCRIPT ENCONTRADOS:');
            jsErrors.forEach(error => console.log(`   ${error}`));
        } else {
            console.log('\n✅ No se encontraron errores JavaScript');
        }
        
        console.log('\n🎉 PRUEBAS COMPLETADAS');
        
        // Esperar para poder ver los resultados
        console.log('\n⏳ Manteniendo navegador abierto 10 segundos para inspección...');
        await page.waitForTimeout(10000);
        
    } catch (error) {
        console.error('\n❌ ERROR EN PRUEBAS:', error.message);
        
        // Screenshot de error
        try {
            await page.screenshot({ path: 'dashboard-error.png', fullPage: true });
            console.log('📸 Screenshot guardado: dashboard-error.png');
        } catch (screenshotError) {
            console.log('No se pudo tomar screenshot');
        }
    }
    
    await browser.close();
}

// Ejecutar
testDashboardReal().catch(console.error);
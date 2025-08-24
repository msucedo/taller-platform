const puppeteer = require('puppeteer');

async function testDashboard() {
    console.log('🧪 TESTING DASHBOARD - PRUEBA SIMPLE Y REAL\n');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        slowMo: 800,
        devtools: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Capturar errores JavaScript
    page.on('pageerror', error => {
        console.log(`❌ ERROR JS: ${error.message}`);
    });
    
    page.on('console', msg => {
        if (msg.type() === 'error') {
            console.log(`❌ CONSOLE ERROR: ${msg.text()}`);
        }
    });
    
    try {
        // 1. LOGIN
        console.log('1️⃣ Navegando a login...');
        await page.goto('http://localhost:3000/empleado/login');
        await page.waitForSelector('#email');
        
        await page.type('#email', 'admin@taller.com');
        await page.type('#password', 'admin123');
        await page.click('button[type="submit"]');
        await page.waitForNavigation();
        
        console.log('✅ Login exitoso');
        
        // 2. VERIFICAR QUE LLEGAMOS AL DASHBOARD
        await page.waitForSelector('.admin-tabs');
        console.log('✅ Dashboard cargado');
        
        // 3. PROBAR BOTÓN EMPLEADOS
        console.log('\n2️⃣ Probando botón EMPLEADOS...');
        
        // Esperar un poco para que cargue JavaScript
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Click en empleados
        await page.evaluate(() => {
            const btn = document.querySelector('button[onclick="showTab(\'empleados\')"]');
            if (btn) {
                btn.click();
                return 'clicked';
            }
            return 'not found';
        });
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Verificar si se mostró la sección
        const empleadosVisible = await page.evaluate(() => {
            const tab = document.getElementById('tab-empleados');
            return tab && tab.classList.contains('active');
        });
        
        console.log(`   ${empleadosVisible ? '✅' : '❌'} Sección empleados ${empleadosVisible ? 'visible' : 'NO visible'}`);
        
        // Buscar botón nuevo empleado
        const nuevoEmpleadoExists = await page.evaluate(() => {
            return !!document.querySelector('button[onclick="mostrarFormularioEmpleado()"]');
        });
        
        console.log(`   ${nuevoEmpleadoExists ? '✅' : '❌'} Botón "Nuevo Empleado" ${nuevoEmpleadoExists ? 'existe' : 'NO existe'}`);
        
        // 4. PROBAR BOTONES PDF/EXCEL
        console.log('\n3️⃣ Probando botones PDF y Excel...');
        
        // Volver a solicitudes
        await page.evaluate(() => {
            const btn = document.querySelector('button[onclick="showTab(\'solicitudes\')"]');
            if (btn) btn.click();
        });
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Probar PDF
        const pdfExists = await page.evaluate(() => {
            return !!document.querySelector('button[onclick="exportarPDF()"]');
        });
        
        console.log(`   ${pdfExists ? '✅' : '❌'} Botón PDF ${pdfExists ? 'existe' : 'NO existe'}`);
        
        if (pdfExists) {
            const pdfResult = await page.evaluate(() => {
                try {
                    const btn = document.querySelector('button[onclick="exportarPDF()"]');
                    btn.click();
                    return 'clicked';
                } catch (error) {
                    return `error: ${error.message}`;
                }
            });
            console.log(`   📄 PDF click: ${pdfResult}`);
        }
        
        // Probar Excel
        const excelExists = await page.evaluate(() => {
            return !!document.querySelector('button[onclick="exportarExcel()"]');
        });
        
        console.log(`   ${excelExists ? '✅' : '❌'} Botón Excel ${excelExists ? 'existe' : 'NO existe'}`);
        
        if (excelExists) {
            const excelResult = await page.evaluate(() => {
                try {
                    const btn = document.querySelector('button[onclick="exportarExcel()"]');
                    btn.click();
                    return 'clicked';
                } catch (error) {
                    return `error: ${error.message}`;
                }
            });
            console.log(`   📊 Excel click: ${excelResult}`);
        }
        
        // 5. PROBAR NAVEGACIÓN A COTIZACIONES
        console.log('\n4️⃣ Probando navegación a Cotizaciones...');
        
        const cotizacionesResult = await page.evaluate(() => {
            try {
                const btn = document.querySelector('button[onclick="irACotizaciones()"]');
                if (btn) {
                    btn.click();
                    return 'clicked';
                } else {
                    return 'button not found';
                }
            } catch (error) {
                return `error: ${error.message}`;
            }
        });
        
        console.log(`   🔗 Cotizaciones click: ${cotizacionesResult}`);
        
        if (cotizacionesResult === 'clicked') {
            await page.waitForNavigation();
            const url = page.url();
            console.log(`   📍 URL después del click: ${url}`);
        }
        
        console.log('\n🎉 PRUEBA COMPLETADA');
        
        // Mantener abierto 5 segundos para verificar visualmente
        console.log('\n⏳ Manteniendo navegador abierto 5 segundos...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
    }
    
    await browser.close();
}

testDashboard().catch(console.error);
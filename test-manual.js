const fs = require('fs');
const path = require('path');

console.log('🔍 VERIFICANDO ARCHIVOS CRÍTICOS DEL DASHBOARD\n');

// Archivos críticos que deben existir
const criticalFiles = [
    'views/admin-dashboard.html',
    'public/js/admin-dashboard.js', 
    'public/js/utils.js',
    'public/css/styles.css',
    'views/cotizaciones.html',
    'public/js/cotizaciones.js'
];

console.log('📁 Verificando existencia de archivos:');
criticalFiles.forEach(file => {
    const fullPath = path.join(__dirname, file);
    const exists = fs.existsSync(fullPath);
    console.log(`   ${exists ? '✅' : '❌'} ${file}`);
});

// Verificar funciones JavaScript críticas
console.log('\n🔧 Verificando funciones en admin-dashboard.js:');
const adminDashboardPath = path.join(__dirname, 'public/js/admin-dashboard.js');
if (fs.existsSync(adminDashboardPath)) {
    const content = fs.readFileSync(adminDashboardPath, 'utf8');
    
    const functions = [
        'showTab',
        'loadEmpleados', 
        'loadReportes',
        'loadConfiguracion',
        'exportarPDF',
        'exportarExcel',
        'irACotizaciones',
        'irAInventario',
        'mostrarFormularioEmpleado'
    ];
    
    functions.forEach(func => {
        const regex = new RegExp(`function\\s+${func}|const\\s+${func}\\s*=|let\\s+${func}\\s*=|var\\s+${func}\\s*=`);
        const exists = regex.test(content);
        console.log(`   ${exists ? '✅' : '❌'} ${func}()`);
    });
    
    // Verificar si hay errores de sintaxis obvios
    const syntaxIssues = [];
    if (content.includes('AppUtils.') && !content.includes('AppUtils')) {
        syntaxIssues.push('Posible problema con AppUtils');
    }
    
    const braceCount = (content.match(/\{/g) || []).length - (content.match(/\}/g) || []).length;
    if (braceCount !== 0) {
        syntaxIssues.push(`Braces desbalanceadas: ${braceCount > 0 ? 'faltan' : 'sobran'} ${Math.abs(braceCount)}`);
    }
    
    if (syntaxIssues.length > 0) {
        console.log('\n⚠️  POSIBLES PROBLEMAS DE SINTAXIS:');
        syntaxIssues.forEach(issue => console.log(`   ❌ ${issue}`));
    }
    
} else {
    console.log('   ❌ admin-dashboard.js NO EXISTE');
}

// Verificar utils.js
console.log('\n🛠️ Verificando AppUtils en utils.js:');
const utilsPath = path.join(__dirname, 'public/js/utils.js');
if (fs.existsSync(utilsPath)) {
    const content = fs.readFileSync(utilsPath, 'utf8');
    
    const utilFunctions = [
        'mostrarMensaje',
        'formatMoney',
        'formatearFecha',
        'formatearPrecio'
    ];
    
    utilFunctions.forEach(func => {
        const exists = content.includes(`${func}(`);
        console.log(`   ${exists ? '✅' : '❌'} AppUtils.${func}()`);
    });
} else {
    console.log('   ❌ utils.js NO EXISTE');
}

console.log('\n📋 RECOMENDACIONES:');
console.log('1. Abrir http://localhost:3000/admin/dashboard en el navegador');
console.log('2. Abrir Developer Tools (F12)');
console.log('3. Ver la pestaña Console para errores JavaScript');
console.log('4. Ver la pestaña Network para recursos 404');
console.log('5. Probar hacer click en los botones manualmente');

console.log('\n🚀 El servidor debería estar ejecutándose en http://localhost:3000');
console.log('📧 Login: admin@taller.com / admin123');
require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

const dbPath = path.join(__dirname, 'database/taller.db');

function hashPasswordBcrypt(password) {
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    return bcrypt.hashSync(password, saltRounds);
}

function migratePasswords() {
    console.log('🔄 Iniciando migración de contraseñas a bcrypt...');
    const db = new sqlite3.Database(dbPath);
    
    // Recomendación: Regenerar todas las contraseñas ya que no podemos des-hashear SHA-256
    console.log('⚠️  ATENCIÓN: Es necesario recrear todas las contraseñas');
    console.log('📋 Lista de usuarios que necesitan nueva contraseña:');
    
    db.all('SELECT id, email, nombre, rol FROM usuarios', (err, users) => {
        if (err) {
            console.error('❌ Error:', err);
            return;
        }
        
        users.forEach(user => {
            console.log(`- ${user.nombre} (${user.email}) - Rol: ${user.rol}`);
        });
        
        console.log('\n🔧 Para resetear las contraseñas, ejecuta:');
        console.log('node reset-passwords.js');
        
        db.close();
    });
}

if (require.main === module) {
    migratePasswords();
}

module.exports = { migratePasswords };
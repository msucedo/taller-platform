require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

const dbPath = path.join(__dirname, 'database/taller.db');

function hashPasswordBcrypt(password) {
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    return bcrypt.hashSync(password, saltRounds);
}

function resetPasswords() {
    console.log('🔄 Reseteando contraseñas de usuarios existentes...');
    const db = new sqlite3.Database(dbPath);
    
    // Contraseñas por defecto para cada usuario
    const defaultPasswords = {
        'admin@taller.com': 'admin123',
        'carlos.mendez@taller.com': 'mecanico123', 
        'maria.gonzalez@taller.com': 'recepcion123',
        'jhonny.bravo@taller.com': 'mecanico123'
    };
    
    db.all('SELECT id, email, nombre, rol FROM usuarios', (err, users) => {
        if (err) {
            console.error('❌ Error:', err);
            return;
        }
        
        let processed = 0;
        const total = users.length;
        
        users.forEach(user => {
            const defaultPassword = defaultPasswords[user.email] || 'changeme123';
            const hashedPassword = hashPasswordBcrypt(defaultPassword);
            
            db.run('UPDATE usuarios SET password_hash = ? WHERE id = ?', 
                   [hashedPassword, user.id], function(err) {
                if (err) {
                    console.error(`❌ Error actualizando ${user.email}:`, err);
                } else {
                    console.log(`✅ ${user.nombre} (${user.email}) - Nueva contraseña: ${defaultPassword}`);
                }
                
                processed++;
                if (processed === total) {
                    console.log('\n🎉 Migración completada!');
                    console.log('⚠️  IMPORTANTE: Cambia estas contraseñas por defecto en producción');
                    db.close();
                }
            });
        });
    });
}

if (require.main === module) {
    resetPasswords();
}

module.exports = { resetPasswords };
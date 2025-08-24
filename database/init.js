const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');
require('dotenv').config();

const dbPath = path.join(__dirname, 'taller.db');

function generateTrackerCode() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'LL'; // Prefijo "Llantera"
    for (let i = 0; i < 6; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

function generateSessionToken() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

function hashPassword(password) {
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    return bcrypt.hashSync(password, saltRounds);
}

function comparePassword(password, hash) {
    return bcrypt.compareSync(password, hash);
}

function createAdminUser(db) {
    // Crear usuario administrador por defecto usando variables de entorno
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@taller.com';
    const adminPassword = hashPassword(process.env.ADMIN_PASSWORD || 'admin123');
    const adminName = process.env.ADMIN_NAME || 'Administrador';
    
    if (process.env.NODE_ENV !== 'production') {
        console.log(`🔍 Intentando crear admin con email: ${adminEmail}`);
    }
    
    db.get('SELECT id FROM usuarios WHERE email = ?', [adminEmail], (err, row) => {
        if (err) {
            console.error('❌ Error al verificar admin existente:', err.message);
            return;
        }
        
        if (!row) {
            db.run(`INSERT INTO usuarios (email, password_hash, nombre, rol, activo) 
                   VALUES (?, ?, ?, ?, ?)`, 
                   [adminEmail, adminPassword, adminName, 'admin', 1], 
                   function(err) {
                       if (err) {
                           console.error('❌ Error al crear administrador:', err.message);
                       } else if (process.env.NODE_ENV !== 'production') {
                           console.log(`✅ Usuario administrador creado exitosamente: ${adminEmail}`);
                           console.log(`📧 Email: ${adminEmail}`);
                           console.log(`👤 Nombre: ${adminName}`);
                           console.log(`🔐 Password configurado: ${!!process.env.ADMIN_PASSWORD ? 'Desde ENV' : 'Por defecto'}`);
                       }
                   });
        } else if (process.env.NODE_ENV !== 'production') {
            console.log(`ℹ️  Usuario administrador ya existe: ${adminEmail}`);
        }
    });
}

function initDatabase() {
    const db = new sqlite3.Database(dbPath);
    
    db.serialize(() => {
        // Tabla de usuarios del taller (empleados)
        db.run(`CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            nombre TEXT NOT NULL,
            rol TEXT NOT NULL DEFAULT 'mecanico',
            activo BOOLEAN DEFAULT 1,
            fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
        
        // Tabla de sesiones para autenticación
        db.run(`CREATE TABLE IF NOT EXISTS sesiones (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            token TEXT UNIQUE NOT NULL,
            user_id INTEGER NOT NULL,
            expira DATETIME NOT NULL,
            fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES usuarios(id)
        )`);
        
        // Tabla de proveedores con Google OAuth
        db.run(`CREATE TABLE IF NOT EXISTS proveedores_oauth (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            google_id TEXT UNIQUE,
            email TEXT NOT NULL,
            nombre TEXT NOT NULL,
            avatar_url TEXT,
            fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
        
        // Tabla de asignaciones de solicitudes a empleados
        db.run(`CREATE TABLE IF NOT EXISTS solicitudes_asignadas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            solicitud_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            fecha_asignacion DATETIME DEFAULT CURRENT_TIMESTAMP,
            notas_asignacion TEXT,
            FOREIGN KEY (solicitud_id) REFERENCES solicitudes(id),
            FOREIGN KEY (user_id) REFERENCES usuarios(id)
        )`);
        
        // Tabla de bitácora para registrar todas las actividades de una solicitud
        db.run(`CREATE TABLE IF NOT EXISTS solicitudes_bitacora (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            solicitud_id INTEGER NOT NULL,
            tipo_evento TEXT NOT NULL,
            descripcion TEXT NOT NULL,
            usuario_id INTEGER,
            fecha_evento DATETIME DEFAULT CURRENT_TIMESTAMP,
            datos_adicionales TEXT,
            FOREIGN KEY (solicitud_id) REFERENCES solicitudes(id),
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        )`);
        
        // Tabla principal de solicitudes con campos adicionales
        db.run(`CREATE TABLE IF NOT EXISTS solicitudes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tracker_code TEXT UNIQUE NOT NULL,
            proveedor_nombre TEXT NOT NULL,
            proveedor_email TEXT NOT NULL,
            proveedor_telefono TEXT,
            empresa TEXT,
            tipo_servicio TEXT NOT NULL,
            descripcion TEXT NOT NULL,
            urgencia TEXT DEFAULT 'media',
            fecha_solicitud DATETIME DEFAULT CURRENT_TIMESTAMP,
            fecha_preferida DATE,
            presupuesto_estimado TEXT,
            estado TEXT DEFAULT 'pendiente',
            notas_taller TEXT,
            fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
        
        // Verificar si necesitamos agregar las nuevas columnas a registros existentes
        db.all("PRAGMA table_info(solicitudes)", (err, columns) => {
            if (err) {
                console.error('Error al verificar estructura de tabla:', err);
                return;
            }
            
            const columnNames = columns.map(col => col.name);
            
            // Agregar columnas faltantes si es necesario
            if (!columnNames.includes('tracker_code')) {
                db.run("ALTER TABLE solicitudes ADD COLUMN tracker_code TEXT");
                db.run("ALTER TABLE solicitudes ADD COLUMN empresa TEXT");
                db.run("ALTER TABLE solicitudes ADD COLUMN fecha_preferida DATE");
                db.run("ALTER TABLE solicitudes ADD COLUMN presupuesto_estimado TEXT");
                db.run("ALTER TABLE solicitudes ADD COLUMN fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP");
                
                // Generar códigos tracker para registros existentes
                db.all("SELECT id FROM solicitudes WHERE tracker_code IS NULL", (err, rows) => {
                    if (rows && rows.length > 0) {
                        const stmt = db.prepare("UPDATE solicitudes SET tracker_code = ? WHERE id = ?");
                        rows.forEach(row => {
                            const trackerCode = generateTrackerCode();
                            stmt.run(trackerCode, row.id);
                        });
                        stmt.finalize();
                    }
                });
            }
        });
        
        // Tablas del sistema de inventario de llantas
        db.run(`CREATE TABLE IF NOT EXISTS productos_llantas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            marca TEXT NOT NULL,
            modelo TEXT NOT NULL,
            medida TEXT NOT NULL,
            descripcion TEXT,
            precio_compra DECIMAL(10,2),
            precio_venta DECIMAL(10,2) NOT NULL,
            stock_actual INTEGER DEFAULT 0,
            stock_minimo INTEGER DEFAULT 5,
            proveedor TEXT,
            imagen_url TEXT,
            caracteristicas TEXT,
            activo BOOLEAN DEFAULT 1,
            fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
            fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
        
        // Tabla de compatibilidad vehículo-llanta
        db.run(`CREATE TABLE IF NOT EXISTS vehiculo_llanta_compatibilidad (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            marca_vehiculo TEXT NOT NULL,
            modelo_vehiculo TEXT NOT NULL,
            ano_desde INTEGER NOT NULL,
            ano_hasta INTEGER NOT NULL,
            version TEXT,
            medida_llanta TEXT NOT NULL,
            es_original BOOLEAN DEFAULT 0,
            notas TEXT,
            fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
        
        // Tabla de movimientos de stock
        db.run(`CREATE TABLE IF NOT EXISTS movimientos_stock (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            producto_id INTEGER NOT NULL,
            tipo TEXT NOT NULL, -- 'entrada', 'salida', 'ajuste'
            cantidad INTEGER NOT NULL,
            precio_unitario DECIMAL(10,2),
            motivo TEXT,
            usuario_id INTEGER,
            fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (producto_id) REFERENCES productos_llantas(id),
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        )`);
        
        // Tabla de proveedores de llantas
        db.run(`CREATE TABLE IF NOT EXISTS proveedores_llantas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            contacto TEXT,
            telefono TEXT,
            email TEXT,
            direccion TEXT,
            sitio_web TEXT,
            condiciones_pago TEXT,
            tiempo_entrega_dias INTEGER DEFAULT 7,
            activo BOOLEAN DEFAULT 1,
            fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
        
        // Crear usuario administrador por defecto
        createAdminUser(db);
        
        if (process.env.NODE_ENV !== 'production') {
            console.log('Base de datos inicializada correctamente');
        }
    });
    
    db.close();
}

if (require.main === module) {
    initDatabase();
}

module.exports = { 
    initDatabase, 
    dbPath, 
    generateTrackerCode, 
    generateSessionToken, 
    hashPassword, 
    comparePassword 
};
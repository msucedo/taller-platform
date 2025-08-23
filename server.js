require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const { initDatabase, dbPath, generateTrackerCode, generateSessionToken, hashPassword, comparePassword } = require('./database/init');

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

initDatabase();

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

app.post('/api/solicitudes', (req, res) => {
    const { 
        proveedor_nombre, 
        proveedor_email, 
        proveedor_telefono, 
        empresa,
        tipo_servicio, 
        descripcion, 
        urgencia,
        fecha_preferida,
        presupuesto_estimado
    } = req.body;
    
    const trackerCode = generateTrackerCode();
    const db = new sqlite3.Database(dbPath);
    
    const stmt = db.prepare(`INSERT INTO solicitudes 
        (tracker_code, proveedor_nombre, proveedor_email, proveedor_telefono, empresa, tipo_servicio, descripcion, urgencia, fecha_preferida, presupuesto_estimado) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    
    stmt.run([trackerCode, proveedor_nombre, proveedor_email, proveedor_telefono, empresa, tipo_servicio, descripcion, urgencia, fecha_preferida, presupuesto_estimado], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ 
            id: this.lastID,
            tracker: trackerCode,
            message: 'Solicitud enviada correctamente'
        });
    });
    
    stmt.finalize();
    db.close();
});

app.get('/api/solicitudes', (req, res) => {
    const db = new sqlite3.Database(dbPath);
    
    db.all(`SELECT s.*, 
                   u.nombre as empleado_asignado,
                   u.rol as empleado_rol,
                   sa.notas_asignacion,
                   sa.fecha_asignacion
            FROM solicitudes s 
            LEFT JOIN solicitudes_asignadas sa ON s.id = sa.solicitud_id 
            LEFT JOIN usuarios u ON sa.user_id = u.id 
            ORDER BY s.fecha_solicitud DESC`, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
    
    db.close();
});

app.put('/api/solicitudes/:id', (req, res) => {
    const { id } = req.params;
    const { estado, notas_taller } = req.body;
    
    const db = new sqlite3.Database(dbPath);
    
    const stmt = db.prepare('UPDATE solicitudes SET estado = ?, notas_taller = ?, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id = ?');
    
    stmt.run([estado, notas_taller, id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: 'Solicitud actualizada correctamente' });
    });
    
    stmt.finalize();
    db.close();
});

// Página del tracker
app.get('/tracker', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'tracker.html'));
});

// API para buscar por código de tracker
app.get('/api/tracker/:code', (req, res) => {
    const { code } = req.params;
    const db = new sqlite3.Database(dbPath);
    
    db.get('SELECT * FROM solicitudes WHERE tracker_code = ?', [code], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ error: 'Código de seguimiento no encontrado' });
            db.close();
            return;
        }
        
        // Obtener bitácora de eventos
        db.all(`SELECT b.*, u.nombre as usuario_nombre
                FROM solicitudes_bitacora b
                LEFT JOIN usuarios u ON b.usuario_id = u.id
                WHERE b.solicitud_id = ?
                ORDER BY b.fecha_evento ASC`, [row.id], (err, bitacora) => {
            if (err) {
                console.error('Error obteniendo bitácora:', err);
                bitacora = [];
            }
            
            res.json({
                ...row,
                bitacora: bitacora || []
            });
            db.close();
        });
    });
});

// Portal del proveedor
app.get('/proveedor', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'proveedor-login.html'));
});

app.get('/proveedor/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'proveedor-dashboard.html'));
});

// API para login de proveedor (autenticación básica por email)
app.post('/api/proveedor/login', (req, res) => {
    const { email } = req.body;
    const db = new sqlite3.Database(dbPath);
    
    db.all('SELECT * FROM solicitudes WHERE proveedor_email = ? ORDER BY fecha_solicitud DESC', [email], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (rows.length === 0) {
            res.status(404).json({ error: 'No se encontraron solicitudes para este email' });
            return;
        }
        res.json({ 
            message: 'Login exitoso',
            proveedor: rows[0].proveedor_nombre,
            solicitudes: rows 
        });
    });
    
    db.close();
});

// Rutas del sistema de empleados
app.get('/empleado/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'empleado-login.html'));
});

// API Login empleados
app.post('/api/empleado/login', (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }
    
    const db = new sqlite3.Database(dbPath);
    
    db.get('SELECT * FROM usuarios WHERE email = ? AND activo = 1', 
           [email], (err, user) => {
        if (err) {
            res.status(500).json({ error: 'Error de servidor' });
            db.close();
            return;
        }
        
        if (!user || !comparePassword(password, user.password_hash)) {
            res.status(401).json({ error: 'Credenciales inválidas' });
            db.close();
            return;
        }
        
        // Crear sesión
        const token = generateSessionToken();
        const expira = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 horas
        
        db.run('INSERT INTO sesiones (token, user_id, expira) VALUES (?, ?, ?)',
               [token, user.id, expira.toISOString()], function(err) {
            if (err) {
                res.status(500).json({ error: 'Error al crear sesión' });
                db.close();
                return;
            }
            
            res.json({
                message: 'Login exitoso',
                token: token,
                user: {
                    id: user.id,
                    nombre: user.nombre,
                    email: user.email,
                    rol: user.rol
                }
            });
            
            db.close();
        });
    });
});

// API Verificar token
app.get('/api/empleado/verify', (req, res) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token no proporcionado' });
    }
    
    const token = authHeader.substring(7);
    const db = new sqlite3.Database(dbPath);
    
    db.get(`SELECT u.*, s.expira 
            FROM usuarios u 
            JOIN sesiones s ON u.id = s.user_id 
            WHERE s.token = ? AND u.activo = 1 AND s.expira > datetime('now')`,
           [token], (err, user) => {
        if (err || !user) {
            res.status(401).json({ error: 'Token inválido' });
            db.close();
            return;
        }
        
        res.json({
            user: {
                id: user.id,
                nombre: user.nombre,
                email: user.email,
                rol: user.rol
            }
        });
        
        db.close();
    });
});

// Middleware de autenticación
function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token no proporcionado' });
    }
    
    const token = authHeader.substring(7);
    const db = new sqlite3.Database(dbPath);
    
    db.get(`SELECT u.*, s.expira 
            FROM usuarios u 
            JOIN sesiones s ON u.id = s.user_id 
            WHERE s.token = ? AND u.activo = 1 AND s.expira > datetime('now')`,
           [token], (err, user) => {
        db.close();
        
        if (err || !user) {
            return res.status(401).json({ error: 'Token inválido' });
        }
        
        req.user = user;
        next();
    });
}

// Dashboard admin (solo para admin)
app.get('/admin/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin-dashboard.html'));
});

// Dashboard empleado (para mecánicos y recepcionistas)  
app.get('/empleado/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'empleado-dashboard.html'));
});

// Logout
app.post('/api/empleado/logout', requireAuth, (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader.substring(7);
    
    const db = new sqlite3.Database(dbPath);
    db.run('DELETE FROM sesiones WHERE token = ?', [token], (err) => {
        if (err) {
            res.status(500).json({ error: 'Error al cerrar sesión' });
        } else {
            res.json({ message: 'Sesión cerrada exitosamente' });
        }
        db.close();
    });
});

// APIs para gestión de empleados (solo admin)
function requireAdmin(req, res, next) {
    if (req.user.rol !== 'admin') {
        return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador.' });
    }
    next();
}

// Obtener todos los empleados
app.get('/api/empleados', requireAuth, requireAdmin, (req, res) => {
    const db = new sqlite3.Database(dbPath);
    
    db.all('SELECT id, email, nombre, rol, activo, fecha_creacion FROM usuarios ORDER BY fecha_creacion DESC', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            db.close();
            return;
        }
        res.json(rows);
        db.close();
    });
});

// Crear nuevo empleado
app.post('/api/empleados', requireAuth, requireAdmin, (req, res) => {
    const { nombre, email, password, rol } = req.body;
    
    if (!nombre || !email || !password || !rol) {
        return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }
    
    if (!['admin', 'mecanico', 'recepcionista'].includes(rol)) {
        return res.status(400).json({ error: 'Rol inválido' });
    }
    
    const db = new sqlite3.Database(dbPath);
    const passwordHash = hashPassword(password);
    
    // Verificar si el email ya existe
    db.get('SELECT id FROM usuarios WHERE email = ?', [email], (err, row) => {
        if (err) {
            res.status(500).json({ error: 'Error de servidor' });
            db.close();
            return;
        }
        
        if (row) {
            res.status(400).json({ error: 'El email ya está registrado' });
            db.close();
            return;
        }
        
        // Crear el empleado
        db.run('INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES (?, ?, ?, ?)',
               [nombre, email, passwordHash, rol], function(err) {
            if (err) {
                res.status(500).json({ error: 'Error al crear empleado' });
                db.close();
                return;
            }
            
            res.json({ 
                id: this.lastID, 
                message: 'Empleado creado exitosamente' 
            });
            db.close();
        });
    });
});

// Actualizar empleado
app.put('/api/empleados/:id', requireAuth, requireAdmin, (req, res) => {
    const { id } = req.params;
    const { nombre, email, password, rol } = req.body;
    
    if (!nombre || !email || !rol) {
        return res.status(400).json({ error: 'Nombre, email y rol son requeridos' });
    }
    
    if (!['admin', 'mecanico', 'recepcionista'].includes(rol)) {
        return res.status(400).json({ error: 'Rol inválido' });
    }
    
    const db = new sqlite3.Database(dbPath);
    
    // Verificar si el email ya existe en otro usuario
    db.get('SELECT id FROM usuarios WHERE email = ? AND id != ?', [email, id], (err, row) => {
        if (err) {
            res.status(500).json({ error: 'Error de servidor' });
            db.close();
            return;
        }
        
        if (row) {
            res.status(400).json({ error: 'El email ya está registrado por otro usuario' });
            db.close();
            return;
        }
        
        // Actualizar empleado
        let query = 'UPDATE usuarios SET nombre = ?, email = ?, rol = ? WHERE id = ?';
        let params = [nombre, email, rol, id];
        
        // Si se proporciona nueva contraseña, incluirla
        if (password) {
            const passwordHash = hashPassword(password);
            query = 'UPDATE usuarios SET nombre = ?, email = ?, password_hash = ?, rol = ? WHERE id = ?';
            params = [nombre, email, passwordHash, rol, id];
        }
        
        db.run(query, params, function(err) {
            if (err) {
                res.status(500).json({ error: 'Error al actualizar empleado' });
                db.close();
                return;
            }
            
            if (this.changes === 0) {
                res.status(404).json({ error: 'Empleado no encontrado' });
                db.close();
                return;
            }
            
            res.json({ message: 'Empleado actualizado exitosamente' });
            db.close();
        });
    });
});

// Activar/desactivar empleado
app.put('/api/empleados/:id/toggle', requireAuth, requireAdmin, (req, res) => {
    const { id } = req.params;
    const { activo } = req.body;
    
    const db = new sqlite3.Database(dbPath);
    
    db.run('UPDATE usuarios SET activo = ? WHERE id = ?', [activo ? 1 : 0, id], function(err) {
        if (err) {
            res.status(500).json({ error: 'Error al cambiar estado del empleado' });
            db.close();
            return;
        }
        
        if (this.changes === 0) {
            res.status(404).json({ error: 'Empleado no encontrado' });
            db.close();
            return;
        }
        
        res.json({ message: `Empleado ${activo ? 'activado' : 'desactivado'} exitosamente` });
        db.close();
    });
});

// APIs para empleados
// Obtener mis solicitudes asignadas
app.get('/api/empleado/mis-solicitudes', requireAuth, (req, res) => {
    const db = new sqlite3.Database(dbPath);
    
    db.all(`SELECT s.* FROM solicitudes s 
            JOIN solicitudes_asignadas sa ON s.id = sa.solicitud_id 
            WHERE sa.user_id = ? 
            ORDER BY s.fecha_solicitud DESC`, [req.user.id], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            db.close();
            return;
        }
        res.json(rows);
        db.close();
    });
});

// Cambiar contraseña del empleado
app.put('/api/empleado/cambiar-password', requireAuth, (req, res) => {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Contraseña actual y nueva contraseña son requeridas' });
    }
    
    const db = new sqlite3.Database(dbPath);
    const newPasswordHash = hashPassword(newPassword);
    
    // Verificar contraseña actual
    db.get('SELECT password_hash FROM usuarios WHERE id = ?', 
           [req.user.id], (err, user) => {
        if (err) {
            res.status(500).json({ error: 'Error de servidor' });
            db.close();
            return;
        }
        
        if (!user || !comparePassword(currentPassword, user.password_hash)) {
            res.status(400).json({ error: 'Contraseña actual incorrecta' });
            db.close();
            return;
        }
        
        // Actualizar contraseña
        db.run('UPDATE usuarios SET password_hash = ? WHERE id = ?', 
               [newPasswordHash, req.user.id], function(err) {
            if (err) {
                res.status(500).json({ error: 'Error al cambiar contraseña' });
                db.close();
                return;
            }
            
            res.json({ message: 'Contraseña cambiada exitosamente' });
            db.close();
        });
    });
});

// Estadísticas personales del empleado
app.get('/api/empleado/estadisticas', requireAuth, (req, res) => {
    const db = new sqlite3.Database(dbPath);
    
    // Por ahora, estadísticas básicas
    db.all(`SELECT COUNT(*) as totalAsignadas,
                   COUNT(CASE WHEN estado = 'completado' THEN 1 END) as completadas
            FROM solicitudes s 
            JOIN solicitudes_asignadas sa ON s.id = sa.solicitud_id 
            WHERE sa.user_id = ?`, [req.user.id], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            db.close();
            return;
        }
        
        const stats = rows[0] || { totalAsignadas: 0, completadas: 0 };
        const satisfaction = stats.totalAsignadas > 0 ? 
                           Math.round((stats.completadas / stats.totalAsignadas) * 100) : 0;
        
        res.json({
            totalAsignadas: stats.totalAsignadas,
            completadasMes: stats.completadas, // Por simplicidad, usamos completadas totales
            tiempoPromedio: 2, // Placeholder
            satisfaccion: satisfaction
        });
        db.close();
    });
});

// Endpoint para asignar solicitud a empleado
app.post('/api/solicitudes/:id/asignar', requireAuth, requireAdmin, (req, res) => {
    const { empleadoId, notas } = req.body;
    const solicitudId = req.params.id;
    
    if (!empleadoId) {
        return res.status(400).json({ error: 'El ID del empleado es requerido' });
    }
    
    const db = new sqlite3.Database(dbPath);
    
    // Verificar que la solicitud existe
    db.get('SELECT id FROM solicitudes WHERE id = ?', [solicitudId], (err, solicitud) => {
        if (err) {
            res.status(500).json({ error: err.message });
            db.close();
            return;
        }
        
        if (!solicitud) {
            res.status(404).json({ error: 'Solicitud no encontrada' });
            db.close();
            return;
        }
        
        // Verificar que el empleado existe y está activo
        db.get('SELECT id, nombre FROM usuarios WHERE id = ? AND activo = 1', [empleadoId], (err, empleado) => {
            if (err) {
                res.status(500).json({ error: err.message });
                db.close();
                return;
            }
            
            if (!empleado) {
                res.status(404).json({ error: 'Empleado no encontrado o inactivo' });
                db.close();
                return;
            }
            
            // Verificar si ya está asignada
            db.get('SELECT id FROM solicitudes_asignadas WHERE solicitud_id = ?', [solicitudId], (err, existingAssignment) => {
                if (err) {
                    res.status(500).json({ error: err.message });
                    db.close();
                    return;
                }
                
                if (existingAssignment) {
                    // Actualizar asignación existente
                    db.run('UPDATE solicitudes_asignadas SET user_id = ?, notas_asignacion = ?, fecha_asignacion = CURRENT_TIMESTAMP WHERE solicitud_id = ?',
                        [empleadoId, notas, solicitudId], (err) => {
                        if (err) {
                            res.status(500).json({ error: err.message });
                            db.close();
                            return;
                        }
                        
                        // Registrar en bitácora
                        db.run('INSERT INTO solicitudes_bitacora (solicitud_id, tipo_evento, descripcion, usuario_id, datos_adicionales) VALUES (?, ?, ?, ?, ?)',
                            [solicitudId, 'reasignacion', `Solicitud reasignada a ${empleado.nombre}`, req.user.id, JSON.stringify({ empleado_anterior: null, empleado_nuevo: empleado.nombre, notas: notas })], (err) => {
                            if (err) {
                                console.error('Error registrando en bitácora:', err);
                            }
                        });
                        
                        res.json({ message: 'Solicitud reasignada correctamente', empleado: empleado.nombre });
                        db.close();
                    });
                } else {
                    // Crear nueva asignación
                    db.run('INSERT INTO solicitudes_asignadas (solicitud_id, user_id, notas_asignacion) VALUES (?, ?, ?)',
                        [solicitudId, empleadoId, notas], (err) => {
                        if (err) {
                            res.status(500).json({ error: err.message });
                            db.close();
                            return;
                        }
                        
                        // Registrar en bitácora
                        db.run('INSERT INTO solicitudes_bitacora (solicitud_id, tipo_evento, descripcion, usuario_id, datos_adicionales) VALUES (?, ?, ?, ?, ?)',
                            [solicitudId, 'asignacion', `Solicitud asignada a ${empleado.nombre}`, req.user.id, JSON.stringify({ empleado: empleado.nombre, notas: notas })], (err) => {
                            if (err) {
                                console.error('Error registrando en bitácora:', err);
                            }
                        });
                        
                        res.json({ message: 'Solicitud asignada correctamente', empleado: empleado.nombre });
                        db.close();
                    });
                }
            });
        });
    });
});

// DEBUG: Endpoint temporal para verificar admin
app.get('/api/debug/admin', (req, res) => {
    const db = new sqlite3.Database(dbPath);
    
    db.get('SELECT email, nombre, rol, activo FROM usuarios WHERE rol = ?', ['admin'], (err, admin) => {
        if (err) {
            res.status(500).json({ error: err.message });
            db.close();
            return;
        }
        
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@taller.com';
        const adminName = process.env.ADMIN_NAME || 'Administrador';
        
        res.json({
            admin_found: !!admin,
            admin_data: admin || null,
            env_vars: {
                ADMIN_EMAIL: adminEmail,
                ADMIN_NAME: adminName,
                ADMIN_PASSWORD_SET: !!process.env.ADMIN_PASSWORD
            }
        });
        
        db.close();
    });
});

// DEBUG: Endpoint para recrear admin (TEMPORAL)
app.post('/api/debug/recreate-admin', (req, res) => {
    const db = new sqlite3.Database(dbPath);
    const { hashPassword } = require('./database/init');
    
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@taller.com';
    const adminPassword = hashPassword(process.env.ADMIN_PASSWORD || 'admin123');
    const adminName = process.env.ADMIN_NAME || 'Administrador';
    
    // Primero eliminar admin existente si existe
    db.run('DELETE FROM usuarios WHERE email = ?', [adminEmail], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            db.close();
            return;
        }
        
        // Crear nuevo admin
        db.run(`INSERT INTO usuarios (email, password_hash, nombre, rol, activo) 
               VALUES (?, ?, ?, ?, ?)`, 
               [adminEmail, adminPassword, adminName, 'admin', 1], 
               function(err) {
                   if (err) {
                       res.status(500).json({ error: err.message });
                   } else {
                       res.json({ 
                           message: 'Admin recreado exitosamente',
                           email: adminEmail,
                           name: adminName
                       });
                   }
                   db.close();
               });
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
    console.log(`📁 Base de datos: ${dbPath}`);
    console.log(`🌍 Entorno: ${NODE_ENV}`);
    
    if (NODE_ENV === 'production') {
        console.log('✅ Ejecutando en modo PRODUCCIÓN');
        console.log('⚠️  Asegúrate de tener HTTPS configurado');
    } else {
        console.log('🔧 Ejecutando en modo DESARROLLO');
    }
});
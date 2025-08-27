require('dotenv').config();

// Polyfills completos para APIs web (requerido por google-auth-library v10+)
require('whatwg-fetch');
require('web-streams-polyfill/polyfill');

const fetch = require('node-fetch');
const FormData = require('form-data');
const { Blob } = require('buffer');

global.fetch = fetch;
global.Headers = fetch.Headers;
global.Request = fetch.Request;
global.Response = fetch.Response;
global.FormData = FormData;
global.Blob = Blob;

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult, param } = require('express-validator');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const { initDatabase, dbPath, generateTrackerCode, generateSessionToken, hashPassword, comparePassword } = require('./database/init');

// Configuración de Google OAuth
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const app = express();

// Configure trust proxy for Railways deployment
// More secure configuration than 'true'
app.set('trust proxy', process.env.NODE_ENV === 'production' ? 1 : false);

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Configuraciones de seguridad
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://accounts.google.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdnjs.cloudflare.com", "https://accounts.google.com", "https://apis.google.com"],
            scriptSrcAttr: ["'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:", "via.placeholder.com"],
            fontSrc: ["'self'", "https:"],
            connectSrc: ["'self'", "https://accounts.google.com", "https://oauth2.googleapis.com"],
            frameSrc: ["'self'", "https://accounts.google.com"],
            childSrc: ["'self'", "https://accounts.google.com"],
        },
    },
    crossOriginOpenerPolicy: false,
    crossOriginEmbedderPolicy: false
}));

// Rate limiting
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // máximo 100 requests por ventana
    message: { error: 'Demasiadas peticiones, intente más tarde' }
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // máximo 5 intentos de login por ventana
    message: { error: 'Demasiados intentos de login, intente más tarde' }
});

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 200, // máximo 200 requests por ventana para APIs
    message: { error: 'Límite de API excedido, intente más tarde' }
});

app.use(generalLimiter);
app.use('/api/empleado/login', authLimiter);
app.use('/api/', apiLimiter);

app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? process.env.ALLOWED_ORIGINS?.split(',') : true,
    credentials: true
}));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static('public'));

// Middleware para sanitizar y validar inputs
const sanitizeInput = (req, res, next) => {
    if (req.body) {
        for (const key in req.body) {
            if (typeof req.body[key] === 'string') {
                req.body[key] = req.body[key].trim();
            }
        }
    }
    next();
};

app.use(sanitizeInput);

// Middleware para manejar errores de validación
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Datos de entrada inválidos',
            details: errors.array().map(err => ({
                field: err.param,
                message: err.msg,
                value: err.value
            }))
        });
    }
    next();
};

// Configurar multer para upload de imágenes
const uploadDir = path.join(__dirname, 'public', 'images', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Generar nombre único para el archivo
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        cb(null, 'llanta-' + uniqueSuffix + extension);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB máximo
    },
    fileFilter: function (req, file, cb) {
        // Solo permitir imágenes
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos de imagen'));
        }
    }
});

// Initialize database first, then start server
console.log('Initializing database...');
initDatabase();

// Add a small delay to ensure DB is ready
setTimeout(() => {
    console.log('Database initialization completed');
}, 1000);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

app.get('/cotizaciones', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'cotizaciones.html'));
});

app.post('/api/solicitudes', [
    body('proveedor_nombre')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('El nombre debe tener entre 2 y 100 caracteres')
        .matches(/^[a-zA-ZÀ-ÿáéíóúÁÉÍÓÚñÑ\s\.\']+$/)
        .withMessage('El nombre contiene caracteres no permitidos'),
    body('proveedor_email')
        .isEmail()
        .withMessage('Debe ser un email válido')
        .normalizeEmail(),
    body('proveedor_telefono')
        .optional({ nullable: true, checkFalsy: true })
        .matches(/^[\d\s\-\+\(\)]+$/)
        .withMessage('Teléfono debe contener solo números y símbolos válidos'),
    body('tipo_servicio')
        .isIn(['repuestos', 'herramientas', 'pintura', 'grua', 'mecanico', 'otros'])
        .withMessage('Tipo de servicio inválido'),
    body('descripcion')
        .trim()
        .isLength({ min: 10, max: 1000 })
        .withMessage('La descripción debe tener entre 10 y 1000 caracteres'),
    body('urgencia')
        .isIn(['baja', 'media', 'alta', 'critica'])
        .withMessage('Nivel de urgencia inválido'),
    handleValidationErrors
], (req, res) => {
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
    
    // Buscar si existe un proveedor OAuth con este email para vincularlo automáticamente
    db.get('SELECT id FROM proveedores_oauth WHERE email = ?', [proveedor_email], (err, proveedor) => {
        if (err) {
            console.error('Error buscando proveedor OAuth:', err);
            res.status(500).json({ error: 'Error de servidor' });
            db.close();
            return;
        }
        
        const proveedorOauthId = proveedor ? proveedor.id : null;
        
        const stmt = db.prepare(`INSERT INTO solicitudes 
            (tracker_code, proveedor_nombre, proveedor_email, proveedor_telefono, proveedor_oauth_id, empresa, tipo_servicio, descripcion, urgencia, fecha_preferida, presupuesto_estimado) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
        
        stmt.run([trackerCode, proveedor_nombre, proveedor_email, proveedor_telefono, proveedorOauthId, empresa, tipo_servicio, descripcion, urgencia, fecha_preferida, presupuesto_estimado], function(err) {
            stmt.finalize();
            
            if (err) {
                res.status(500).json({ error: err.message });
                db.close();
                return;
            }
            
            res.json({ 
                id: this.lastID,
                tracker: trackerCode,
                message: 'Solicitud enviada correctamente'
            });
            db.close();
        });
    });
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
    // Leer el archivo HTML y reemplazar el placeholder del Google Client ID
    fs.readFile(path.join(__dirname, 'views', 'proveedor-login.html'), 'utf8', (err, data) => {
        if (err) {
            return res.status(500).send('Error al cargar la página');
        }
        
        // Reemplazar el placeholder con el Client ID real
        const html = data.replace('{{ GOOGLE_CLIENT_ID }}', process.env.GOOGLE_CLIENT_ID || '');
        res.send(html);
    });
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
app.post('/api/empleado/login', [
    body('email')
        .isEmail()
        .withMessage('Debe ser un email válido')
        .normalizeEmail(),
    body('password')
        .isLength({ min: 6 })
        .withMessage('La contraseña debe tener al menos 6 caracteres'),
    handleValidationErrors
], (req, res) => {
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

app.get('/admin/inventario', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin-inventario.html'));
});

// Ruta temporal para probar el inventario sin autenticación (ELIMINAR EN PRODUCCIÓN)
app.get('/inventario-demo', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin-inventario.html'));
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

// ===== GOOGLE OAUTH ENDPOINTS =====

// Endpoint de prueba para validar configuración
app.get('/api/test/google-config', (req, res) => {
    const db = new sqlite3.Database(dbPath);
    
    // Verificar si la tabla proveedores_oauth existe
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='proveedores_oauth'", (err, table) => {
        if (err) {
            console.error('Error checking table:', err);
        }
        
        db.close();
        
        res.json({
            clientId: process.env.GOOGLE_CLIENT_ID ? 'Configured' : 'Missing',
            clientIdPreview: process.env.GOOGLE_CLIENT_ID ? process.env.GOOGLE_CLIENT_ID.substring(0, 20) + '...' : 'N/A',
            jwtSecret: process.env.JWT_SECRET ? 'Configured' : 'Missing',
            nodeEnv: process.env.NODE_ENV,
            database: {
                path: dbPath,
                proveedoresOauthTable: table ? 'Exists' : 'Missing'
            },
            polyfills: {
                fetch: typeof global.fetch !== 'undefined',
                Headers: typeof global.Headers !== 'undefined',
                FormData: typeof global.FormData !== 'undefined',
                ReadableStream: typeof global.ReadableStream !== 'undefined'
            }
        });
    });
});

// Endpoint de prueba simple para POST
app.post('/api/test/echo', (req, res) => {
    console.log('=== TEST ECHO REQUEST ===');
    console.log('Body:', req.body);
    console.log('Headers:', req.headers);
    res.json({
        received: req.body,
        timestamp: new Date().toISOString(),
        success: true
    });
});

// Endpoint de diagnóstico para la base de datos
app.get('/api/test/database', (req, res) => {
    console.log('=== DATABASE TEST ===');
    const db = new sqlite3.Database(dbPath);
    
    // Test basic connectivity
    db.get("SELECT datetime('now') as current_time", (err, row) => {
        if (err) {
            console.error('Database connection error:', err);
            db.close();
            return res.status(500).json({
                error: 'Database connection failed',
                details: err.message
            });
        }
        
        // Check if proveedores_oauth table exists and is accessible
        db.get("SELECT COUNT(*) as count FROM proveedores_oauth", (err, countResult) => {
            const tableAccessible = !err;
            
            db.close();
            
            res.json({
                success: true,
                database_time: row.current_time,
                proveedores_oauth_accessible: tableAccessible,
                count: tableAccessible ? countResult.count : null,
                error: err ? err.message : null
            });
        });
    });
});

// Endpoint para autenticación con Google
app.post('/api/auth/google', async (req, res) => {
    console.log('=== GOOGLE AUTH REQUEST ===');
    console.log('Request body:', req.body);
    console.log('Request headers:', req.headers);
    
    // Set response timeout
    const timeoutId = setTimeout(() => {
        console.error('Request timeout - sending 408 response');
        if (!res.headersSent) {
            res.status(408).json({ error: 'Request timeout' });
        }
    }, 25000); // 25 seconds timeout
    
    try {
        const { credential } = req.body;
        
        console.log('Received credential:', credential ? credential.substring(0, 50) + '...' : 'null');
        console.log('Credential length:', credential ? credential.length : 0);
        console.log('Using CLIENT_ID:', process.env.GOOGLE_CLIENT_ID);
        
        if (!credential) {
            clearTimeout(timeoutId);
            console.log('ERROR: No credential provided');
            console.log('Request body keys:', Object.keys(req.body || {}));
            return res.status(400).json({ error: 'Token de Google requerido', received: req.body });
        }
        
        console.log('Starting token verification...');
        
        // Verificar el token con Google
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });
        
        const payload = ticket.getPayload();
        const { sub: googleId, email, name, picture } = payload;
        
        console.log('Token verified successfully for:', email);
        console.log('Google ID:', googleId);
        console.log('Name:', name);
        
        const db = new sqlite3.Database(dbPath);
        
        // Buscar si el proveedor ya existe
        db.get('SELECT * FROM proveedores_oauth WHERE google_id = ? OR email = ?', 
               [googleId, email], (err, proveedor) => {
            if (err) {
                clearTimeout(timeoutId);
                console.error('Database error:', err);
                if (!res.headersSent) {
                    res.status(500).json({ error: 'Error de servidor' });
                }
                db.close();
                return;
            }
            
            if (proveedor) {
                // Usuario existente - actualizar datos si es necesario
                db.run(`UPDATE proveedores_oauth 
                       SET nombre = ?, avatar_url = ? 
                       WHERE id = ?`,
                       [name, picture, proveedor.id], (err) => {
                    if (err) {
                        clearTimeout(timeoutId);
                        console.error('Update error:', err);
                        if (!res.headersSent) {
                            res.status(500).json({ error: 'Error al actualizar usuario' });
                        }
                        db.close();
                        return;
                    }
                    
                    // Generar JWT
                    try {
                        const token = jwt.sign(
                            { 
                                proveedorId: proveedor.id, 
                                email: proveedor.email, 
                                nombre: proveedor.nombre,
                                tipo: 'proveedor' 
                            },
                            process.env.JWT_SECRET,
                            { expiresIn: '7d' }
                        );
                        
                        clearTimeout(timeoutId);
                        if (!res.headersSent) {
                            res.json({
                                success: true,
                                token,
                                proveedor: {
                                    id: proveedor.id,
                                    email: proveedor.email,
                                    nombre: proveedor.nombre,
                                    avatar_url: picture
                                }
                            });
                        }
                        db.close();
                    } catch (jwtError) {
                        clearTimeout(timeoutId);
                        console.error('JWT error:', jwtError);
                        if (!res.headersSent) {
                            res.status(500).json({ error: 'Error al generar token' });
                        }
                        db.close();
                    }
                });
            } else {
                // Usuario nuevo - crear cuenta
                db.run(`INSERT INTO proveedores_oauth (google_id, email, nombre, avatar_url) 
                       VALUES (?, ?, ?, ?)`,
                       [googleId, email, name, picture], function(err) {
                    if (err) {
                        clearTimeout(timeoutId);
                        console.error('Insert error:', err);
                        if (!res.headersSent) {
                            res.status(500).json({ error: 'Error al crear usuario' });
                        }
                        db.close();
                        return;
                    }
                    
                    const nuevoProveedorId = this.lastID;
                    
                    // Generar JWT
                    try {
                        const token = jwt.sign(
                            { 
                                proveedorId: nuevoProveedorId, 
                                email, 
                                nombre: name,
                                tipo: 'proveedor' 
                            },
                            process.env.JWT_SECRET,
                            { expiresIn: '7d' }
                        );
                        
                        clearTimeout(timeoutId);
                        if (!res.headersSent) {
                            res.json({
                                success: true,
                                token,
                                proveedor: {
                                    id: nuevoProveedorId,
                                    email,
                                    nombre: name,
                                    avatar_url: picture
                                },
                                isNewUser: true
                            });
                        }
                        db.close();
                    } catch (jwtError) {
                        clearTimeout(timeoutId);
                        console.error('JWT error for new user:', jwtError);
                        if (!res.headersSent) {
                            res.status(500).json({ error: 'Error al generar token' });
                        }
                        db.close();
                    }
                });
            }
        });
        
    } catch (error) {
        clearTimeout(timeoutId);
        console.error('Error en autenticación Google:', error);
        console.error('Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
        if (!res.headersSent) {
            res.status(400).json({ 
                error: 'Token de Google inválido',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
});


// Middleware para verificar tokens JWT de proveedores
function requireProveedorAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token de autorización requerido' });
    }
    
    const token = authHeader.substring(7);
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.tipo !== 'proveedor') {
            return res.status(403).json({ error: 'Token inválido para proveedores' });
        }
        req.proveedor = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Token inválido' });
    }
}

// Endpoint para verificar autenticación de proveedor
app.get('/api/proveedor/verify', requireProveedorAuth, (req, res) => {
    res.json({ 
        valid: true, 
        proveedor: {
            id: req.proveedor.proveedorId,
            email: req.proveedor.email,
            nombre: req.proveedor.nombre
        }
    });
});

// Endpoint para obtener solicitudes de un proveedor autenticado con Google
app.get('/api/proveedor/solicitudes', requireProveedorAuth, (req, res) => {
    const db = new sqlite3.Database(dbPath);
    const proveedorId = req.proveedor.proveedorId;
    const email = req.proveedor.email;
    
    // Obtener solicitudes tanto por OAuth ID como por email (para solicitudes anteriores al registro)
    db.all(`SELECT * FROM solicitudes 
            WHERE proveedor_oauth_id = ? OR proveedor_email = ? 
            ORDER BY fecha_solicitud DESC`, 
           [proveedorId, email], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            db.close();
            return;
        }
        
        // Actualizar las solicitudes que coincidan por email para vincularlas al OAuth ID
        if (rows.length > 0) {
            const solicitudesParaVincular = rows.filter(row => 
                !row.proveedor_oauth_id && row.proveedor_email === email
            );
            
            if (solicitudesParaVincular.length > 0) {
                const updateStmt = db.prepare('UPDATE solicitudes SET proveedor_oauth_id = ? WHERE id = ?');
                solicitudesParaVincular.forEach(solicitud => {
                    updateStmt.run([proveedorId, solicitud.id]);
                });
                updateStmt.finalize();
            }
        }
        
        res.json({
            solicitudes: rows,
            total: rows.length,
            proveedor: {
                id: proveedorId,
                email,
                nombre: req.proveedor.nombre
            }
        });
        db.close();
    });
});

// Endpoint para crear solicitud autenticada con Google OAuth
app.post('/api/proveedor/solicitudes', requireProveedorAuth, [
    body('tipo_servicio')
        .isIn(['repuestos', 'herramientas', 'pintura', 'grua', 'mecanico', 'otros'])
        .withMessage('Tipo de servicio inválido'),
    body('descripcion')
        .trim()
        .isLength({ min: 10, max: 1000 })
        .withMessage('La descripción debe tener entre 10 y 1000 caracteres'),
    body('urgencia')
        .isIn(['baja', 'media', 'alta', 'critica'])
        .withMessage('Nivel de urgencia inválido'),
    handleValidationErrors
], (req, res) => {
    const { 
        tipo_servicio, 
        descripcion, 
        urgencia,
        fecha_preferida,
        presupuesto_estimado,
        proveedor_telefono,
        empresa
    } = req.body;
    
    const trackerCode = generateTrackerCode();
    const db = new sqlite3.Database(dbPath);
    const proveedorId = req.proveedor.proveedorId;
    const proveedor_nombre = req.proveedor.nombre;
    const proveedor_email = req.proveedor.email;
    
    const stmt = db.prepare(`INSERT INTO solicitudes 
        (tracker_code, proveedor_nombre, proveedor_email, proveedor_telefono, proveedor_oauth_id, empresa, tipo_servicio, descripcion, urgencia, fecha_preferida, presupuesto_estimado) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    
    stmt.run([trackerCode, proveedor_nombre, proveedor_email, proveedor_telefono, proveedorId, empresa, tipo_servicio, descripcion, urgencia, fecha_preferida, presupuesto_estimado], function(err) {
        stmt.finalize();
        
        if (err) {
            res.status(500).json({ error: err.message });
            db.close();
            return;
        }
        
        res.json({ 
            id: this.lastID,
            tracker: trackerCode,
            message: 'Solicitud creada correctamente'
        });
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
                            if (err && process.env.NODE_ENV !== 'production') {
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
                            if (err && process.env.NODE_ENV !== 'production') {
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
app.get('/api/version', (req, res) => {
    try {
        const packagePath = path.join(__dirname, 'package.json');
        const packageData = require(packagePath);
        res.json({
            version: packageData.version,
            name: packageData.name,
            description: packageData.description
        });
    } catch (error) {
        res.status(500).json({ error: 'Could not load version info' });
    }
});

// API endpoints para inventario de llantas
app.get('/api/inventario/productos', requireAuth, requireAdmin, (req, res) => {
    const db = new sqlite3.Database(dbPath);
    
    db.all('SELECT * FROM productos_llantas WHERE activo = 1 ORDER BY marca, modelo', (err, productos) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(productos);
    });
    
    db.close();
});

app.post('/api/inventario/productos', [
    body('marca')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('La marca debe tener entre 2 y 50 caracteres')
        .matches(/^[a-zA-Z0-9À-ÿ\s\-]+$/)
        .withMessage('La marca contiene caracteres inválidos'),
    body('modelo')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('El modelo debe tener entre 2 y 100 caracteres'),
    body('medida')
        .matches(/^\d{3}\/\d{2}R\d{2}$/)
        .withMessage('La medida debe tener el formato correcto (ej: 205/55R16)'),
    body('precio_venta')
        .isFloat({ min: 0.01 })
        .withMessage('El precio de venta debe ser mayor a 0'),
    body('stock_actual')
        .isInt({ min: 0 })
        .withMessage('El stock actual debe ser un número entero positivo'),
    body('stock_minimo')
        .isInt({ min: 0 })
        .withMessage('El stock mínimo debe ser un número entero positivo'),
    body('imagen_url')
        .optional()
        .isURL()
        .withMessage('La URL de imagen debe ser válida'),
    handleValidationErrors
], requireAuth, requireAdmin, (req, res) => {
    const {
        marca, modelo, medida, descripcion, precio_compra, precio_venta,
        stock_actual, stock_minimo, proveedor, imagen_url, caracteristicas
    } = req.body;
    
    if (!marca || !modelo || !medida || !precio_venta) {
        return res.status(400).json({ error: 'Campos requeridos: marca, modelo, medida, precio_venta' });
    }
    
    const db = new sqlite3.Database(dbPath);
    
    const stmt = db.prepare(`INSERT INTO productos_llantas 
        (marca, modelo, medida, descripcion, precio_compra, precio_venta, 
         stock_actual, stock_minimo, proveedor, imagen_url, caracteristicas)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    
    stmt.run([
        marca, modelo, medida, descripcion, precio_compra || null, precio_venta,
        stock_actual || 0, stock_minimo || 5, proveedor || null, imagen_url || null,
        caracteristicas || null
    ], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            // Registrar movimiento de stock inicial
            if (stock_actual > 0) {
                const stmtMovimiento = db.prepare(`INSERT INTO movimientos_stock 
                    (producto_id, tipo, cantidad, motivo, usuario_id) 
                    VALUES (?, 'entrada', ?, 'Stock inicial', ?)`);
                stmtMovimiento.run([this.lastID, stock_actual, req.user.id]);
                stmtMovimiento.finalize();
            }
            
            res.json({ 
                id: this.lastID, 
                mensaje: 'Producto agregado correctamente',
                producto: {
                    id: this.lastID,
                    marca, modelo, medida, descripcion, precio_compra, precio_venta,
                    stock_actual: stock_actual || 0, stock_minimo: stock_minimo || 5,
                    proveedor, imagen_url, caracteristicas, activo: 1
                }
            });
        }
    });
    
    stmt.finalize();
    db.close();
});

app.put('/api/inventario/productos/:id', [
    param('id').isInt({ min: 1 }).withMessage('ID debe ser un número entero positivo'),
    body('marca')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('La marca debe tener entre 2 y 50 caracteres')
        .matches(/^[a-zA-Z0-9À-ÿ\s\-]+$/)
        .withMessage('La marca contiene caracteres inválidos'),
    body('modelo')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('El modelo debe tener entre 2 y 100 caracteres'),
    body('medida')
        .matches(/^\d{3}\/\d{2}R\d{2}$/)
        .withMessage('La medida debe tener el formato correcto (ej: 205/55R16)'),
    body('precio_venta')
        .isFloat({ min: 0.01 })
        .withMessage('El precio de venta debe ser mayor a 0'),
    body('stock_actual')
        .isInt({ min: 0 })
        .withMessage('El stock actual debe ser un número entero positivo'),
    body('stock_minimo')
        .isInt({ min: 0 })
        .withMessage('El stock mínimo debe ser un número entero positivo'),
    handleValidationErrors
], requireAuth, requireAdmin, (req, res) => {
    const { id } = req.params;
    const {
        marca, modelo, medida, descripcion, precio_compra, precio_venta,
        stock_actual, stock_minimo, proveedor, imagen_url, caracteristicas
    } = req.body;
    
    if (!marca || !modelo || !medida || !precio_venta) {
        return res.status(400).json({ error: 'Campos requeridos: marca, modelo, medida, precio_venta' });
    }
    
    const db = new sqlite3.Database(dbPath);
    
    // Obtener stock actual para comparar
    db.get('SELECT stock_actual FROM productos_llantas WHERE id = ?', [id], (err, producto) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        if (!producto) {
            res.status(404).json({ error: 'Producto no encontrado' });
            return;
        }
        
        const stockAnterior = producto.stock_actual;
        const nuevoStock = parseInt(stock_actual) || 0;
        
        const stmt = db.prepare(`UPDATE productos_llantas SET 
            marca = ?, modelo = ?, medida = ?, descripcion = ?, precio_compra = ?, 
            precio_venta = ?, stock_actual = ?, stock_minimo = ?, proveedor = ?, 
            imagen_url = ?, caracteristicas = ?, fecha_actualizacion = CURRENT_TIMESTAMP
            WHERE id = ?`);
        
        stmt.run([
            marca, modelo, medida, descripcion, precio_compra || null, precio_venta,
            nuevoStock, stock_minimo || 5, proveedor || null, imagen_url || null,
            caracteristicas || null, id
        ], function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
            } else {
                // Registrar movimiento de stock si cambió
                if (stockAnterior !== nuevoStock) {
                    const diferencia = nuevoStock - stockAnterior;
                    const tipoMovimiento = diferencia > 0 ? 'entrada' : 'salida';
                    const motivo = 'Ajuste manual desde inventario';
                    
                    const stmtMovimiento = db.prepare(`INSERT INTO movimientos_stock 
                        (producto_id, tipo, cantidad, motivo, usuario_id) 
                        VALUES (?, ?, ?, ?, ?)`);
                    stmtMovimiento.run([id, tipoMovimiento, Math.abs(diferencia), motivo, req.user.id]);
                    stmtMovimiento.finalize();
                }
                
                res.json({ 
                    mensaje: 'Producto actualizado correctamente',
                    cambiosStock: stockAnterior !== nuevoStock
                });
            }
        });
        
        stmt.finalize();
    });
    
    db.close();
});

app.delete('/api/inventario/productos/:id', [
    param('id').isInt({ min: 1 }).withMessage('ID debe ser un número entero positivo'),
    handleValidationErrors
], requireAuth, requireAdmin, (req, res) => {
    const { id } = req.params;
    const db = new sqlite3.Database(dbPath);
    
    const stmt = db.prepare('UPDATE productos_llantas SET activo = 0 WHERE id = ?');
    
    stmt.run([id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else if (this.changes === 0) {
            res.status(404).json({ error: 'Producto no encontrado' });
        } else {
            res.json({ mensaje: 'Producto eliminado correctamente' });
        }
    });
    
    stmt.finalize();
    db.close();
});

// API para estadísticas del inventario
app.get('/api/inventario/estadisticas', requireAuth, requireAdmin, (req, res) => {
    const db = new sqlite3.Database(dbPath);
    
    const estadisticas = {};
    
    // Total de productos
    db.get('SELECT COUNT(*) as total FROM productos_llantas WHERE activo = 1', (err, result) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        estadisticas.totalProductos = result.total;
        
        // Productos con stock bajo
        db.get(`SELECT COUNT(*) as total FROM productos_llantas 
                WHERE activo = 1 AND stock_actual <= stock_minimo`, (err, result) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            estadisticas.stockBajo = result.total;
            
            // Valor total del inventario
            db.get(`SELECT SUM(stock_actual * precio_venta) as valor FROM productos_llantas 
                    WHERE activo = 1`, (err, result) => {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                estadisticas.valorInventario = result.valor || 0;
                
                // Productos activos
                db.get('SELECT COUNT(*) as total FROM productos_llantas WHERE activo = 1', (err, result) => {
                    if (err) {
                        res.status(500).json({ error: err.message });
                        return;
                    }
                    estadisticas.productosActivos = result.total;
                    
                    res.json(estadisticas);
                });
            });
        });
    });
    
    db.close();
});

// API para compatibilidades vehículo-llanta
app.get('/api/inventario/compatibilidades', requireAuth, requireAdmin, (req, res) => {
    const db = new sqlite3.Database(dbPath);
    
    db.all(`SELECT c.*, p.marca as marca_llanta, p.modelo as modelo_llanta 
            FROM vehiculo_llanta_compatibilidad c
            LEFT JOIN productos_llantas p ON c.medida_llanta = p.medida
            ORDER BY c.marca_vehiculo, c.modelo_vehiculo, c.ano_desde`, (err, compatibilidades) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(compatibilidades);
    });
    
    db.close();
});

app.post('/api/inventario/compatibilidades', requireAuth, requireAdmin, (req, res) => {
    const {
        marca_vehiculo, modelo_vehiculo, ano_desde, ano_hasta, 
        version, medida_llanta, es_original, notas
    } = req.body;
    
    if (!marca_vehiculo || !modelo_vehiculo || !ano_desde || !ano_hasta || !medida_llanta) {
        return res.status(400).json({ error: 'Campos requeridos: marca_vehiculo, modelo_vehiculo, ano_desde, ano_hasta, medida_llanta' });
    }
    
    const db = new sqlite3.Database(dbPath);
    
    const stmt = db.prepare(`INSERT INTO vehiculo_llanta_compatibilidad 
        (marca_vehiculo, modelo_vehiculo, ano_desde, ano_hasta, version, medida_llanta, es_original, notas)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    
    stmt.run([
        marca_vehiculo, modelo_vehiculo, ano_desde, ano_hasta, 
        version || null, medida_llanta, es_original || 0, notas || null
    ], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json({ 
                id: this.lastID, 
                mensaje: 'Compatibilidad agregada correctamente'
            });
        }
    });
    
    stmt.finalize();
    db.close();
});

app.delete('/api/inventario/compatibilidades/:id', requireAuth, requireAdmin, (req, res) => {
    const { id } = req.params;
    const db = new sqlite3.Database(dbPath);
    
    const stmt = db.prepare('DELETE FROM vehiculo_llanta_compatibilidad WHERE id = ?');
    
    stmt.run([id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else if (this.changes === 0) {
            res.status(404).json({ error: 'Compatibilidad no encontrada' });
        } else {
            res.json({ mensaje: 'Compatibilidad eliminada correctamente' });
        }
    });
    
    stmt.finalize();
    db.close();
});

// API para buscar llantas por vehículo
app.get('/api/inventario/buscar-por-vehiculo', (req, res) => {
    const { marca, modelo, ano } = req.query;
    
    if (!marca || !modelo || !ano) {
        return res.status(400).json({ error: 'Faltan parámetros: marca, modelo, ano' });
    }
    
    const db = new sqlite3.Database(dbPath);
    
    const query = `
        SELECT DISTINCT p.* 
        FROM productos_llantas p
        INNER JOIN vehiculo_llanta_compatibilidad c ON p.medida = c.medida_llanta
        WHERE c.marca_vehiculo = ? 
        AND c.modelo_vehiculo = ? 
        AND ? BETWEEN c.ano_desde AND c.ano_hasta
        AND p.activo = 1
        ORDER BY p.marca, p.modelo
    `;
    
    db.all(query, [marca, modelo, ano], (err, productos) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(productos);
    });
    
    db.close();
});

// API para upload de imágenes de llantas
app.post('/api/inventario/upload-imagen', requireAuth, requireAdmin, upload.single('imagen'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se recibió ninguna imagen' });
        }
        
        const imageUrl = `/images/uploads/${req.file.filename}`;
        
        res.json({ 
            mensaje: 'Imagen subida correctamente',
            url: imageUrl,
            filename: req.file.filename
        });
        
    } catch (error) {
        console.error('Error subiendo imagen:', error);
        res.status(500).json({ error: 'Error al subir la imagen' });
    }
});

// Ruta para eliminar imagen
app.delete('/api/inventario/eliminar-imagen/:filename', requireAuth, requireAdmin, (req, res) => {
    const { filename } = req.params;
    const imagePath = path.join(uploadDir, filename);
    
    fs.unlink(imagePath, (err) => {
        if (err) {
            console.error('Error eliminando imagen:', err);
            res.status(500).json({ error: 'Error al eliminar la imagen' });
        } else {
            res.json({ mensaje: 'Imagen eliminada correctamente' });
        }
    });
});

// ====== API COTIZACIONES ======

// Generar número de cotización
function generateCotizacionNumber() {
    const fecha = new Date();
    const year = fecha.getFullYear().toString().slice(-2);
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const timestamp = Date.now().toString().slice(-6);
    return `COT-${year}${month}-${timestamp}`;
}

// Obtener estadísticas de cotizaciones
app.get('/api/cotizaciones/estadisticas', requireAuth, (req, res) => {
    const db = new sqlite3.Database(dbPath);
    
    const queries = [
        'SELECT COUNT(*) as total FROM cotizaciones',
        'SELECT COUNT(*) as borradores FROM cotizaciones WHERE estado = "borrador"',
        'SELECT COUNT(*) as pendientes FROM cotizaciones WHERE estado = "pendiente"',
        'SELECT COUNT(*) as aprobadas FROM cotizaciones WHERE estado = "aprobada"',
        'SELECT COUNT(*) as rechazadas FROM cotizaciones WHERE estado = "rechazada"',
        'SELECT SUM(total) as valor_total FROM cotizaciones WHERE estado = "aprobada"',
        'SELECT AVG(total) as valor_promedio FROM cotizaciones'
    ];
    
    let completedQueries = 0;
    const stats = {};
    
    queries.forEach((query, index) => {
        db.get(query, (err, row) => {
            if (err) {
                console.error('Error en estadística:', err);
            } else {
                Object.assign(stats, row);
            }
            
            completedQueries++;
            if (completedQueries === queries.length) {
                res.json(stats);
                db.close();
            }
        });
    });
});

// Obtener todas las cotizaciones
app.get('/api/cotizaciones', requireAuth, (req, res) => {
    const db = new sqlite3.Database(dbPath);
    
    const query = `
        SELECT c.*, u.nombre as usuario_nombre
        FROM cotizaciones c
        LEFT JOIN usuarios u ON c.usuario_creador = u.id
        ORDER BY c.fecha_creacion DESC
    `;
    
    db.all(query, (err, rows) => {
        if (err) {
            console.error('Error al obtener cotizaciones:', err);
            return res.status(500).json({ error: 'Error interno del servidor' });
        }
        res.json(rows);
    });
    
    db.close();
});

// Obtener cotización por ID con items
app.get('/api/cotizaciones/:id', requireAuth, (req, res) => {
    const db = new sqlite3.Database(dbPath);
    const cotizacionId = req.params.id;
    
    // Obtener cotización
    db.get(`
        SELECT c.*, u.nombre as usuario_nombre
        FROM cotizaciones c
        LEFT JOIN usuarios u ON c.usuario_creador = u.id
        WHERE c.id = ?
    `, [cotizacionId], (err, cotizacion) => {
        if (err) {
            console.error('Error al obtener cotización:', err);
            return res.status(500).json({ error: 'Error interno del servidor' });
        }
        
        if (!cotizacion) {
            return res.status(404).json({ error: 'Cotización no encontrada' });
        }
        
        // Obtener items de la cotización
        db.all(`
            SELECT ci.*, p.marca, p.modelo, p.medida
            FROM cotizacion_items ci
            LEFT JOIN productos_llantas p ON ci.producto_id = p.id
            WHERE ci.cotizacion_id = ?
            ORDER BY ci.orden, ci.id
        `, [cotizacionId], (err, items) => {
            if (err) {
                console.error('Error al obtener items:', err);
                return res.status(500).json({ error: 'Error interno del servidor' });
            }
            
            cotizacion.items = items;
            res.json(cotizacion);
        });
    });
    
    db.close();
});

// Crear nueva cotización
app.post('/api/cotizaciones', [
    requireAuth,
    body('cliente_nombre').notEmpty().withMessage('Nombre del cliente es requerido'),
    body('cliente_email').isEmail().withMessage('Email válido es requerido'),
    body('titulo').notEmpty().withMessage('Título es requerido'),
    body('items').isArray({ min: 1 }).withMessage('Debe incluir al menos un item')
], handleValidationErrors, (req, res) => {
    const db = new sqlite3.Database(dbPath);
    
    const {
        solicitud_id,
        cliente_nombre,
        cliente_email,
        cliente_telefono,
        cliente_empresa,
        titulo,
        descripcion,
        validez_dias = 30,
        descuento_porcentaje = 0,
        impuesto_porcentaje = 16,
        terminos_condiciones,
        notas_internas,
        items
    } = req.body;
    
    const numero = generateCotizacionNumber();
    const fecha_expiracion = new Date();
    fecha_expiracion.setDate(fecha_expiracion.getDate() + parseInt(validez_dias));
    
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        // Insertar cotización
        db.run(`
            INSERT INTO cotizaciones (
                numero, solicitud_id, cliente_nombre, cliente_email, cliente_telefono,
                cliente_empresa, titulo, descripcion, validez_dias, fecha_expiracion,
                descuento_porcentaje, impuesto_porcentaje, terminos_condiciones,
                notas_internas, usuario_creador
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            numero, solicitud_id, cliente_nombre, cliente_email, cliente_telefono,
            cliente_empresa, titulo, descripcion, validez_dias, fecha_expiracion,
            descuento_porcentaje, impuesto_porcentaje, terminos_condiciones,
            notas_internas, req.user.id
        ], function(err) {
            if (err) {
                console.error('Error al crear cotización:', err);
                db.run('ROLLBACK');
                db.close();
                return res.status(500).json({ error: 'Error interno del servidor' });
            }
            
            const cotizacionId = this.lastID;
            let subtotal = 0;
            
            // Insertar items
            const stmt = db.prepare(`
                INSERT INTO cotizacion_items (
                    cotizacion_id, tipo, producto_id, codigo, nombre, descripcion,
                    cantidad, precio_unitario, descuento_porcentaje, descuento_monto,
                    subtotal, orden
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            
            let itemsProcessed = 0;
            let hasError = false;
            
            items.forEach((item, index) => {
                const itemDescuentoMonto = (item.precio_unitario * item.cantidad * (item.descuento_porcentaje || 0)) / 100;
                const itemSubtotal = (item.precio_unitario * item.cantidad) - itemDescuentoMonto;
                subtotal += itemSubtotal;
                
                stmt.run([
                    cotizacionId, item.tipo || 'servicio', item.producto_id || null, item.codigo || null,
                    item.nombre, item.descripcion || '', parseInt(item.cantidad), parseFloat(item.precio_unitario),
                    parseFloat(item.descuento_porcentaje) || 0, itemDescuentoMonto, itemSubtotal, index
                ], function(err) {
                    if (err && !hasError) {
                        hasError = true;
                        console.error('Error al insertar item:', err);
                        stmt.finalize();
                        db.run('ROLLBACK');
                        db.close();
                        return res.status(500).json({ error: 'Error al procesar items de cotización' });
                    }
                    
                    itemsProcessed++;
                    if (itemsProcessed === items.length && !hasError) {
                        finalizeCotizacion();
                    }
                });
            });
            
            function finalizeCotizacion() {
                stmt.finalize();
                
                // Calcular totales
                const descuento_monto = (subtotal * parseFloat(descuento_porcentaje)) / 100;
                const subtotal_con_descuento = subtotal - descuento_monto;
                const impuesto_monto = (subtotal_con_descuento * parseFloat(impuesto_porcentaje)) / 100;
                const total = subtotal_con_descuento + impuesto_monto;
            
            // Actualizar totales
            db.run(`
                UPDATE cotizaciones 
                SET subtotal = ?, descuento_monto = ?, impuesto_monto = ?, total = ?
                WHERE id = ?
            `, [subtotal, descuento_monto, impuesto_monto, total, cotizacionId], (err) => {
                if (err) {
                    console.error('Error al actualizar totales:', err);
                    db.run('ROLLBACK');
                    db.close();
                    return res.status(500).json({ error: 'Error interno del servidor' });
                }
                
                // Registrar en historial
                db.run(`
                    INSERT INTO cotizacion_historial (cotizacion_id, estado_nuevo, comentario, usuario_id)
                    VALUES (?, 'borrador', 'Cotización creada', ?)
                `, [cotizacionId, req.user.id], (err) => {
                    if (err) {
                        console.error('Error al registrar historial:', err);
                        db.run('ROLLBACK');
                        db.close();
                        return res.status(500).json({ error: 'Error interno del servidor' });
                    }
                    
                    db.run('COMMIT');
                    res.status(201).json({
                        message: 'Cotización creada exitosamente',
                        cotizacion_id: cotizacionId,
                        numero: numero
                    });
                    db.close();
                });
            });
            }
        });
    });
});

// Actualizar cotización
app.put('/api/cotizaciones/:id', [
    requireAuth,
    body('cliente_nombre').optional().notEmpty(),
    body('cliente_email').optional().isEmail(),
    body('titulo').optional().notEmpty()
], handleValidationErrors, (req, res) => {
    const db = new sqlite3.Database(dbPath);
    const cotizacionId = req.params.id;
    
    // Verificar que la cotización existe y está en borrador
    db.get('SELECT * FROM cotizaciones WHERE id = ? AND estado = "borrador"', [cotizacionId], (err, cotizacion) => {
        if (err) {
            console.error('Error al verificar cotización:', err);
            return res.status(500).json({ error: 'Error interno del servidor' });
        }
        
        if (!cotizacion) {
            return res.status(404).json({ error: 'Cotización no encontrada o no se puede modificar' });
        }
        
        const updates = [];
        const values = [];
        
        Object.keys(req.body).forEach(key => {
            if (['items'].includes(key)) return; // Manejar items por separado
            updates.push(`${key} = ?`);
            values.push(req.body[key]);
        });
        
        if (updates.length === 0) {
            return res.status(400).json({ error: 'No hay campos para actualizar' });
        }
        
        values.push(cotizacionId);
        
        db.run(`
            UPDATE cotizaciones 
            SET ${updates.join(', ')}, fecha_actualizacion = CURRENT_TIMESTAMP
            WHERE id = ?
        `, values, (err) => {
            if (err) {
                console.error('Error al actualizar cotización:', err);
                return res.status(500).json({ error: 'Error interno del servidor' });
            }
            
            res.json({ message: 'Cotización actualizada exitosamente' });
        });
    });
    
    db.close();
});

// Cambiar estado de cotización
app.put('/api/cotizaciones/:id/estado', [
    requireAuth,
    body('estado').isIn(['borrador', 'pendiente', 'aprobada', 'rechazada', 'expirada']),
    body('comentario').optional()
], handleValidationErrors, (req, res) => {
    const db = new sqlite3.Database(dbPath);
    const cotizacionId = req.params.id;
    const { estado, comentario } = req.body;
    
    db.get('SELECT estado FROM cotizaciones WHERE id = ?', [cotizacionId], (err, cotizacion) => {
        if (err) {
            console.error('Error al verificar cotización:', err);
            return res.status(500).json({ error: 'Error interno del servidor' });
        }
        
        if (!cotizacion) {
            return res.status(404).json({ error: 'Cotización no encontrada' });
        }
        
        const estadoAnterior = cotizacion.estado;
        
        db.serialize(() => {
            db.run('BEGIN TRANSACTION');
            
            // Actualizar estado
            const fechaField = estado === 'pendiente' ? 'fecha_enviado' :
                             estado === 'aprobada' ? 'fecha_aprobacion' : null;
            
            const updateQuery = fechaField ? 
                `UPDATE cotizaciones SET estado = ?, ${fechaField} = CURRENT_TIMESTAMP, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id = ?` :
                `UPDATE cotizaciones SET estado = ?, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id = ?`;
            
            db.run(updateQuery, [estado, cotizacionId], (err) => {
                if (err) {
                    console.error('Error al actualizar estado:', err);
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: 'Error interno del servidor' });
                }
                
                // Registrar en historial
                db.run(`
                    INSERT INTO cotizacion_historial (cotizacion_id, estado_anterior, estado_nuevo, comentario, usuario_id)
                    VALUES (?, ?, ?, ?, ?)
                `, [cotizacionId, estadoAnterior, estado, comentario, req.user.id], (err) => {
                    if (err) {
                        console.error('Error al registrar historial:', err);
                        db.run('ROLLBACK');
                        return res.status(500).json({ error: 'Error interno del servidor' });
                    }
                    
                    db.run('COMMIT');
                    res.json({ message: 'Estado actualizado exitosamente' });
                });
            });
        });
    });
    
    db.close();
});

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

// Middleware global de manejo de errores
app.use((error, req, res, next) => {
    console.error('Error no manejado:', error);
    
    // Error de multer
    if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Archivo muy grande. Tamaño máximo: 5MB' });
    }
    
    // Error de validación de multer
    if (error.message === 'Solo se permiten archivos de imagen') {
        return res.status(400).json({ error: error.message });
    }
    
    // Error de base de datos
    if (error.code === 'SQLITE_ERROR') {
        return res.status(500).json({ error: 'Error de base de datos' });
    }
    
    // Error genérico
    res.status(500).json({ 
        error: NODE_ENV === 'development' ? error.message : 'Error interno del servidor',
        ...(NODE_ENV === 'development' && { stack: error.stack })
    });
});

// Manejo de rutas no encontradas
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
});

const HOST = NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';

app.listen(PORT, HOST, () => {
    console.log(`🚀 Servidor ejecutándose en http://${HOST}:${PORT}`);
    console.log(`📁 Base de datos: ${dbPath}`);
    console.log(`🌍 Entorno: ${NODE_ENV}`);
    console.log(`🔒 Seguridad: Helmet activado, Rate limiting activado`);
    console.log(`📍 Host: ${HOST}`);
    
    if (NODE_ENV === 'production') {
        console.log('✅ Ejecutando en modo PRODUCCIÓN');
        console.log('⚠️  Asegúrate de tener HTTPS configurado');
    } else {
        console.log('🔧 Ejecutando en modo DESARROLLO');
    }
});
// 1. Cargar variables de entorno SIEMPRE primero
require('dotenv').config(); 

// 2. Importar librerías (UNA sola vez cada una)
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

// 3. Importar tus rutas de la carpeta src
const authRoutes = require('./src/routes/auth'); 
const householdsRoutes = require('./src/routes/households');
const {
  householdInviteLinksRouter,
  householdJoinRequestsRouter,
  inviteLinksRouter,
} = require('./src/routes/inviteLinks');
const invitationsRoutes = require('./src/routes/invitations');
const usersRoutes = require('./src/routes/users');
const peopleRoutes = require('./src/routes/people');
const plannerRoutes = require('./src/routes/planner');
const inventoryRoutes = require('./src/routes/inventory');

const app = express();

// 4. Middlewares de seguridad y logs
app.use(helmet());
app.use(morgan('dev'));

// CORS configurable por ambiente
const isProduction = process.env.NODE_ENV === 'production';
const corsOrigin = process.env.CORS_ORIGIN;

if (isProduction) {
  // Producción: usar CORS_ORIGIN o restringir
  if (corsOrigin) {
    const origins = corsOrigin.split(',').map(o => o.trim());
    app.use(cors({ origin: origins, credentials: true }));
  } else {
    // Sin CORS_ORIGIN en producción: permitir solo requests sin origin (mobile/Expo)
    app.use(cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        console.warn('⚠️  CORS: Origin no configurado en producción. Considerar establecer CORS_ORIGIN.');
        callback(null, false);
      },
      credentials: true
    }));
  }
} else {
  // Desarrollo: permitir todo (Expo, local, Postman)
  app.use(cors());
}

app.use(express.json());

// 5. Health check endpoint (antes de rutas)
app.get('/health', (req, res) => {
  res.status(200).json({
    ok: true,
    service: 'homeplus-backend',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
  });
});

// 6. Conectar rutas
app.use('/api/auth', authRoutes);
app.use('/api/invite-links', inviteLinksRouter);
app.use('/api/households/:household_id/join-requests', householdJoinRequestsRouter);
app.use('/api/households/:household_id/invite-links', householdInviteLinksRouter);
app.use('/api/households', householdsRoutes);
app.use('/households', householdsRoutes);
app.use('/api/invitations', invitationsRoutes);
app.use('/invitations', invitationsRoutes);
app.use('/api/users', usersRoutes);
app.use('/users', usersRoutes);
app.use('/api/people', peopleRoutes);
app.use('/api/planner', plannerRoutes);
app.use('/api/inventory', inventoryRoutes);
// Ruta de prueba
app.get('/', (req, res) => {
    res.send('¡El servidor de FamilyHub está funcionando correctamente!');
});

// 7. Not found handler (404) - después de todas las rutas
app.use((req, res, next) => {
  res.status(404).json({
    error: 'Ruta no encontrada.',
    code: 'not_found'
  });
});

// 8. Global error handler - debe ir al final
app.use((err, req, res, next) => {
  // Si ya se enviaron headers, no podemos modificar la respuesta
  if (res.headersSent) {
    return next(err);
  }

  // Extraer información del error respetando propiedades existentes
  const statusCode = err.statusCode || err.status || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  // Para errores 503 de Supabase (BUGFIX-002), mantener el código
  if (err.code === 'supabase_timeout' || err.code === 'supabase_unreachable') {
    return res.status(503).json({
      error: 'Servicio de base de datos no disponible temporalmente.',
      code: err.code
    });
  }

  // Para errores 401, mantener el status
  if (statusCode === 401) {
    return res.status(401).json({
      error: err.message || 'No autorizado.',
      code: 'unauthorized'
    });
  }

  // Error genérico
  if (isProduction) {
    // Producción: no exponer stack trace ni detalles sensibles
    console.error('Error:', err.message);
    res.status(500).json({
      error: 'Internal server error.',
      code: 'internal_error'
    });
  } else {
    // Desarrollo: incluir detalles mínimos
    console.error('Error:', err.message);
    res.status(statusCode).json({
      error: err.message || 'Internal server error.',
      code: err.code || 'internal_error',
      ...(err.stack && { stack: err.stack.split('\n')[0] })
    });
  }
});

// 9. Encender servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor listo en http://localhost:${PORT}`);
});

// Load env vars FIRST before anything else
require('dotenv').config();

// Fix: Override local router DNS that blocks MongoDB Atlas SRV records
require('dns').setDefaultResultOrder('ipv4first');
require('dns').setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const express = require('express');
const http    = require('http');
const { Server } = require('socket.io');
const mongoose   = require('mongoose');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const fileUpload = require('express-fileupload');
const path       = require('path');

// ── Allowed origins (dev + production) ──────────────────────────────────────
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://social-media-app-uq3l.vercel.app',
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (Postman, mobile apps, curl)
    if (!origin) return callback(null, true);
    if (
      ALLOWED_ORIGINS.includes(origin) ||
      /^https:\/\/social-media-app-uq3l.*\.vercel\.app$/.test(origin)
    ) {
      return callback(null, true);
    }
    console.warn(`CORS blocked origin: ${origin}`);
    return callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// ── DB Connection (cached across Vercel cold-starts) ─────────────────────────
let isConnected = false;

const connectDB = async () => {
  if (isConnected && mongoose.connection.readyState === 1) return;

  if (!process.env.MONGO_URI) {
    console.error('❌ MONGO_URI is not set! Check Vercel Environment Variables.');
    return;
  }

  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
    });
    isConnected = true;
    console.log('✅ MongoDB Connected');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    isConnected = false;
  }
};

// ── Kick off DB connection immediately at module load ─────────────────────────
// (Vercel caches modules between requests, so this only runs on cold-start)
const dbReady = connectDB();

// ── App setup ─────────────────────────────────────────────────────────────────
const app    = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: false,
  },
});

// ── Core Middleware (ORDER MATTERS) ───────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: false }));
app.options('*', cors(corsOptions));   // preflight must be FIRST
app.use(cors(corsOptions));
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(fileUpload({
  useTempFiles: false,
  limits: { fileSize: 50 * 1024 * 1024 },
  abortOnLimit: false,
}));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── DB wait middleware — ensures DB is ready before ANY route runs ─────────────
app.use(async (req, res, next) => {
  try {
    await dbReady;            // wait for initial connect (no-op on warm requests)
    if (mongoose.connection.readyState !== 1) {
      await connectDB();      // retry if somehow disconnected
    }
    next();
  } catch (err) {
    next(err);
  }
});

// ── Socket.io ────────────────────────────────────────────────────────────────
const onlineUsers = new Map();

io.on('connection', (socket) => {
  socket.on('userOnline', (userId) => {
    onlineUsers.set(userId, socket.id);
    io.emit('onlineUsers', Array.from(onlineUsers.keys()));
  });

  socket.on('sendNotification', ({ targetUserId, notification }) => {
    const targetSocketId = onlineUsers.get(targetUserId);
    if (targetSocketId) io.to(targetSocketId).emit('receiveNotification', notification);
  });

  socket.on('disconnect', () => {
    for (const [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) { onlineUsers.delete(userId); break; }
    }
    io.emit('onlineUsers', Array.from(onlineUsers.keys()));
  });
});

// Attach io to every request
app.use((req, res, next) => { req.io = io; next(); });

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/users',         require('./routes/users'));
app.use('/api/posts',         require('./routes/posts'));
app.use('/api/comments',      require('./routes/comments'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/upload',        require('./routes/upload'));

// Health check
app.get('/api/health', (req, res) => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  res.json({
    status:  'OK',
    message: 'SocialSphere API Running',
    db:      states[mongoose.connection.readyState] || 'unknown',
    env:     process.env.NODE_ENV || 'not set',
    mongo_uri_set: !!process.env.MONGO_URI,
    jwt_set: !!process.env.JWT_SECRET,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// ── Local dev server (Vercel uses module.exports instead) ─────────────────────
const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'production') {
  server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} in use. Run: npx kill-port ${PORT}`);
      process.exit(1);
    }
  });
}

module.exports = app;

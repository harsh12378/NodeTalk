const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { default: mongoose } = require('mongoose');
const http = require("http");
const { Server } = require("socket.io");
const setupSocket = require("./socket");
const { verifyToken } = require("./middleware/authMiddleware");
const redisClient = require("./config/redis");
dotenv.config();
const app = express();

app.use(express.json());
const allowedOrigins = [
  "http://localhost:5173",                  // local dev
  "https://nodetalk-client.vercel.app",     // deployed frontend
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log("cors error");
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));

const DBPath = process.env.MONGO_URI;
async function connectDB() {
  try {
    await mongoose.connect(DBPath, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    process.exit(1);
  }
}
connectDB();

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      console.log("Socket.IO origin:", origin); 
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log("CORS blocked origin:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST"],
    credentials: true,
  }
});

setupSocket(io);

// Attach Socket.IO instance to request BEFORE defining routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

const authRoutes = require('./routes/authRoutes');
const usersRoutes = require('./routes/usersRoutes');
const messageRoutes = require('./routes/messageRoutes');
const chatRoutes = require('./routes/chatRoutes');
app.use('/api/auth', authRoutes);
app.use('/api/users', verifyToken, usersRoutes);
app.use('/api/messages', verifyToken, messageRoutes);
app.use('/api/chat', verifyToken, chatRoutes);

const port = process.env.PORT||5000;
server.listen(port, () => {
  console.log(`✅ Server + Socket.IO running on http://localhost:${port}`);
});

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { default: mongoose } = require('mongoose');
const http = require("http");
const { Server } = require("socket.io");
const setupSocket = require("./socket");
const { verifyToken } = require("./middleware/authMiddleware");

dotenv.config();
const app = express();

app.use(express.json());


app.use(cors({
  origin: "http://localhost:5173",
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


const authRoutes = require('./routes/authRoutes');
const usersRoutes = require('./routes/usersRoutes');
const messageRoutes = require('./routes/messageRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/users', verifyToken, usersRoutes);
app.use('/api/messages', verifyToken, messageRoutes);


const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  }
});
setupSocket(io);

const port = process.env.PORT||5000;
server.listen(port, () => {
  console.log(`✅ Server + Socket.IO running on http://localhost:${port}`);
});

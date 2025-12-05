const express = require("express");
const mongoose = require("mongoose");

const cors = require("cors");
const http = require("http");

const { Server } = require("socket.io");

require("dotenv").config();

const mongoUri = process.env.MONGO_URI;
const authroute = require("./routes/Registration");
const nexroute = require("./routes/profile");
const loginhandler = require("./controllers/loginhandller");
const CreateWorldChat = require("./controllers/WorldChat");

const app = express();
const PORT = 405;

// Create HTTP server
const server = http.createServer(app);

// ✅ Create real Socket.io instance here
const io = new Server(server, {
  cors: {
    origin: "https://wall-books.vercel.app",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 5e6,
  transports: ["websocket", "polling"],
  allowEIO3: true,
});

// enable CORS
app.use(
  cors({
    origin: "https://wall-books.vercel.app",
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test route
app.get("/", (req, res) => {
  res.send("Welcome, just a normal check");
});

// MongoDB Connection
mongoose
  .connect(
    mongoUri,

    {
      ssl: true,

      maxPoolSize: 10,
      minPoolSize: 2,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 5000,
      family: 4,
    }
  )
  .then(() => {
    console.log("connected to DB");
    app.listen(PORT, () => {
      console.log(`server is running on Port ${PORT}`);
    });
  })

  .catch((error) => {
    console.log(error);
  });

// Routes
app.use("/auth", authroute);
app.use("/auth", nexroute);
app.use("/register", loginhandler);

// ✅ Initialize World Chat Socket Logic
CreateWorldChat(io);

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Express + Socket.io running on port ${PORT}`);
});

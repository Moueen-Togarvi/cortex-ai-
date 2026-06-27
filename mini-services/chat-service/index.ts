import { createServer } from "http";
import { Server } from "socket.io";

const PORT = 3004;

const httpServer = createServer();
const io = new Server(httpServer, {
  // DO NOT change the path, it is used by Caddy to forward the request to the correct port
  path: "/",
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

io.on("connection", (socket) => {
  console.log(`[Chat] Client connected: ${socket.id}`);

  socket.on("join", (conversationId: string) => {
    socket.join(conversationId);
    console.log(`[Chat] ${socket.id} joined room: ${conversationId}`);
  });

  socket.on("leave", (conversationId: string) => {
    socket.leave(conversationId);
    console.log(`[Chat] ${socket.id} left room: ${conversationId}`);
  });

  socket.on(
    "message",
    (data: { conversationId: string; content: string; role: string }) => {
      // Broadcast to all clients in the conversation room (except sender)
      socket.to(data.conversationId).emit("message", {
        id: `socket-${Date.now()}`,
        ...data,
        timestamp: new Date().toISOString(),
      });
      console.log(
        `[Chat] Message in ${data.conversationId} from ${socket.id}: ${data.content.substring(0, 80)}`
      );
    }
  );

  socket.on(
    "typing",
    (data: { conversationId: string }) => {
      socket.to(data.conversationId).emit("user_typing", {
        socketId: socket.id,
        ...data,
      });
    }
  );

  socket.on(
    "stop_typing",
    (data: { conversationId: string }) => {
      socket.to(data.conversationId).emit("user_stop_typing", {
        socketId: socket.id,
        ...data,
      });
    }
  );

  socket.on("disconnect", () => {
    console.log(`[Chat] Client disconnected: ${socket.id}`);
  });

  socket.on("error", (error) => {
    console.error(`[Chat] Socket error (${socket.id}):`, error);
  });
});

httpServer.listen(PORT, () => {
  console.log(`[Chat Service] Socket.IO server running on port ${PORT}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("[Chat Service] Received SIGTERM, shutting down...");
  httpServer.close(() => {
    console.log("[Chat Service] Server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("[Chat Service] Received SIGINT, shutting down...");
  httpServer.close(() => {
    console.log("[Chat Service] Server closed");
    process.exit(0);
  });
});

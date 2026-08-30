/* SupportFlow realtime server (Socket.IO)
 *
 * Run alongside `next dev` with:   npm run socket
 *
 * This process:
 *   1. Connects to MongoDB.
 *   2. Watches the `tickets` collection via change streams.
 *   3. Pushes realtime events to connected browser clients:
 *        - ticket:new     -> a ticket was created (agents/admins/customer)
 *        - ticket:update  -> ticket fields changed (status, AI review, ...)
 *        - ticket:message -> a new message was posted
 *
 * The Next.js app keeps doing all authentication/authorization over the REST
 * API (cookie-based). The browser authenticates its socket with the JSON web
 * token fetched from /api/socket-token.
 *
 * AI keys are never used here — triage stays 100% server-side in the app.
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

function loadEnv() {
  try {
    const envPath = path.join(__dirname, ".env");
    if (!fs.existsSync(envPath)) return;
    for (const raw of fs.readFileSync(envPath, "utf8").split("\n")) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch (err) {
    console.warn("[socket] could not load .env", err);
  }
}
loadEnv();

const PORT = Number(process.env.SOCKET_PORT || 4000);
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const preferWebSockets = process.env.SOCKET_WS_ONLY === "true";

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ ok: true, service: "supportflow-realtime" }));
});

const io = new Server(server, {
  cors: {
    origin: (origin, cb) => {
      const allowed = [
        process.env.APP_URL,
        "http://localhost:3000",
        "http://127.0.0.1:3000",
      ].filter(Boolean);
      if (!origin || allowed.includes(origin)) return cb(null, true);
      cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
  },
  transports: preferWebSockets ? ["websocket"] : ["websocket", "polling"],
});

io.use((socket, next) => {
  const token = socket.handshake.auth && socket.handshake.auth.token;
  if (!token) return next(new Error("Unauthorized"));
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    socket.data.userId = payload.sub;
    next();
  } catch {
    next(new Error("Unauthorized"));
  }
});

function shortTicket(doc) {
  return {
    id: doc._id ? doc._id.toString() : null,
    ticketNumber: doc.ticketNumber,
    subject: doc.subject,
    status: doc.status,
    priority: doc.priority,
    updatedAt: doc.updatedAt,
  };
}

async function main() {
  console.log("[socket] connecting to MongoDB...");
  await mongoose.connect(process.env.MONGO_URI);
  console.log("[socket] connected to MongoDB.");

  const tickets = mongoose.connection.collection("tickets");

  tickets
    .watch([], { fullDocument: "updateLookup" })
    .on("change", async (change) => {
      try {
        if (change.operationType === "delete") {
          const ticketId = change.documentKey._id.toString();
          io.to(`role:agent`).to(`role:admin`).emit("ticket:update", { id: ticketId });
          return;
        }

        const doc =
          change.fullDocument ||
          (change.operationType === "insert" ? change.fullDocument : null);
        if (!doc) return;

        const ticketId = doc._id.toString();
        const customerId = doc.customer ? doc.customer.toString() : "";
        const base = shortTicket(doc);

        if (change.operationType === "insert") {
          io.to(`role:agent`).to(`role:admin`).to(`user:${customerId}`)
            .emit("ticket:new", base);
          return;
        }

        const updatedFields = (change.updateDescription && change.updateDescription.updatedFields) || {};
        const hasMessageChange = Object.keys(updatedFields).some(
          (k) => k === "messages" || k.startsWith("messages.")
        );
        const hasStatusChange = "status" in updatedFields;

        io.to(`ticket:${ticketId}`)
          .to(`user:${customerId}`)
          .to(`role:admin`)
          .emit("ticket:update", base);

        if (hasMessageChange) {
          io.to(`ticket:${ticketId}`)
            .to(`user:${customerId}`)
            .to(`role:agent`)
            .to(`role:admin`)
            .emit("ticket:message", base);
        } else if (hasStatusChange) {
          io.to(`role:agent`).emit("ticket:update", base);
        }
      } catch (err) {
        console.error("[socket] change handler error", err);
      }
    });

  const notifications = mongoose.connection.collection("notifications");
  notifications
    .watch([], { fullDocument: "insertLookup" })
    .on("change", (change) => {
      try {
        if (change.operationType !== "insert") return;
        const doc = change.fullDocument;
        const userId = doc.user ? doc.user.toString() : "";
        if (!userId) return;
        io.to(`user:${userId}`).emit("notification:new", {
          id: doc._id.toString(),
          type: doc.type,
          message: doc.message,
          ticketId: doc.ticketId ? doc.ticketId.toString() : null,
          read: false,
          createdAt: doc.createdAt,
        });
      } catch (err) {
        console.error("[socket] notification change error", err);
      }
    });

  io.on("connection", async (socket) => {
    const userId = socket.data.userId;

    try {
      const users = mongoose.connection.collection("users");
      const user = await users.findOne({ _id: new mongoose.Types.ObjectId(userId) });
      const role = (user && user.role) || "customer";

      socket.join(`user:${userId}`);
      socket.join(`role:${role}`);
      socket.data.role = role;

      socket.emit("joined", { userId, role });
    } catch (err) {
      console.error("[socket] join error", err);
    }

    socket.on("ticket:join", (data) => {
      if (data && data.ticketId) socket.join(`ticket:${data.ticketId}`);
    });

    socket.on("ticket:leave", (data) => {
      if (data && data.ticketId) socket.leave(`ticket:${data.ticketId}`);
    });
  });

  server.listen(PORT, () => {
    console.log(`[socket] SupportFlow realtime server listening on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error("[socket] fatal:", err);
  process.exit(1);
});
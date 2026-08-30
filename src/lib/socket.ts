import { io, type Socket } from "socket.io-client";

let socketPromise: Promise<Socket> | null = null;
let activeSocket: Socket | null = null;
let connectionStatus: "idle" | "connected" | "disconnected" = "idle";
const listeners = new Set<(status: "idle" | "connected" | "disconnected") => void>();

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000";

function setStatus(status: "idle" | "connected" | "disconnected") {
  connectionStatus = status;
  listeners.forEach((cb) => cb(status));
}

export function onSocketStatus(
  cb: (status: "idle" | "connected" | "disconnected") => void
): () => void {
  listeners.add(cb);
  cb(connectionStatus);
  return () => {
    listeners.delete(cb);
  };
}

export function getSocket(): Promise<Socket> {
  if (!socketPromise) {
    socketPromise = (async () => {
      const res = await fetch("/api/socket-token");
      if (!res.ok) throw new Error("Not authenticated");
      const data = (await res.json()) as { token?: string };
      const socket = io(SOCKET_URL, {
        auth: { token: data.token },
        transports: ["websocket", "polling"],
      });
      activeSocket = socket;
      socket.on("connect", () => setStatus("connected"));
      socket.on("disconnect", () => setStatus("disconnected"));
      socket.on("connect_error", () => setStatus("disconnected"));
      return socket;
    })().catch((err) => {
      socketPromise = null;
      setStatus("disconnected");
      throw err;
    });
  }
  return socketPromise;
}

export function resetSocket() {
  socketPromise = null;
  setStatus("idle");
  activeSocket?.disconnect();
  activeSocket = null;
}
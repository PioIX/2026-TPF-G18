"use client";

import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000";

export default function useSocket(userId) {
  const [socket, setSocket] = useState(null);
  const [conectado, setConectado] = useState(false);
  useEffect(() => {
    if (!userId) return undefined;
    const client = io(SOCKET_URL, { transports: ["websocket", "polling"], auth: { userId } });
    client.on("connect", () => setConectado(true));
    client.on("disconnect", () => setConectado(false));
    setSocket(client);
    return () => { client.disconnect(); setSocket(null); setConectado(false); };
  }, [userId]);
  return { socket, conectado };
}
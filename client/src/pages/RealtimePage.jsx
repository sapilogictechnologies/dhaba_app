import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { io } from "socket.io-client";
import { playSound, setSoundEnabled, isSoundEnabled } from "../utils/sounds.js";

const socketUrl =
  import.meta.env.VITE_SOCKET_URL || "https://dhaba-app.onrender.com";

const MAX_EVENTS = 80;

const eventColor = {
  "order:new": "badge-green",
  "order:update": "badge-blue",
  "order:payment_under_review": "badge-amber",
  "order:call_waiter": "badge-orange",
  "menu:stock_changed": "badge-purple",
  connect: "badge-teal",
  disconnect: "badge-red",
};

const RealtimePage = () => {
  const { token, user } = useSelector((state) => state.auth);
  const [events, setEvents] = useState([]);
  const [connected, setConnected] = useState(false);
  const [soundOn, setSoundOn] = useState(isSoundEnabled());

  const push = (type, data) =>
    setEvents((prev) => [
      {
        id: Date.now() + Math.random(),
        type,
        data,
        time: new Date().toLocaleTimeString("en-IN"),
      },
      ...prev.slice(0, MAX_EVENTS - 1),
    ]);

  useEffect(() => {
    if (!token || !user) return;
    const socket = io(socketUrl, { auth: { token } });
    socket.emit("join", { role: user.role });

    socket.on("connect", () => {
      setConnected(true);
      push("connect", { message: `Connected as ${user.role}` });
    });
    socket.on("disconnect", () => {
      setConnected(false);
      push("disconnect", { message: "Disconnected" });
    });

    const evtList = [
      "order:new",
      "order:update",
      "order:payment_under_review",
      "order:call_waiter",
      "menu:stock_changed",
    ];
    evtList.forEach((evt) => {
      socket.on(evt, (data) => {
        push(evt, data);
        if (data.soundType) playSound(data.soundType);
      });
    });

    return () => socket.disconnect();
  }, [token, user]);

  return (
    <section className="shell">
      <div className="page-header">
        <h1>Live Socket Monitor</h1>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              fontSize: "0.85rem",
              color: connected ? "#16a34a" : "#dc2626",
              fontWeight: 600,
            }}>
            <span
              className={`connection-dot ${connected ? "connected" : "disconnected"}`}></span>
            {connected ? "Connected" : "Disconnected"}
          </span>
          <button
            className={soundOn ? "success sm" : "sm"}
            onClick={() => {
              const n = !soundOn;
              setSoundOn(n);
              setSoundEnabled(n);
              if (n) playSound("NOTIFY_SOUND");
            }}>
            {soundOn ? "🔊 On" : "🔇 Off"}
          </button>
          <button className="sm" onClick={() => setEvents([])}>
            Clear
          </button>
        </div>
      </div>

      <div
        className="panel"
        style={{ fontSize: "0.8rem", color: "#78716c", marginBottom: "1rem" }}>
        Listening as <strong>{user?.role}</strong>. Events appear in real-time
        below.
      </div>

      {events.length === 0 && (
        <div className="empty-state">
          <div className="icon">📡</div>
          <p>Waiting for events…</p>
        </div>
      )}

      <div style={{ display: "grid", gap: "0.4rem" }}>
        {events.map((evt) => (
          <div
            key={evt.id}
            className="panel"
            style={{ margin: 0, padding: "0.6rem 0.9rem" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                flexWrap: "wrap",
              }}>
              <span className={`badge ${eventColor[evt.type] || "badge-gray"}`}>
                {evt.type}
              </span>
              <span style={{ color: "#78716c", fontSize: "0.75rem" }}>
                {evt.time}
              </span>
              {evt.data?.orderNo && (
                <span style={{ fontWeight: 600 }}>{evt.data.orderNo}</span>
              )}
              {evt.data?.message && (
                <span style={{ color: "#57534e" }}>{evt.data.message}</span>
              )}
              {evt.data?.status && (
                <span className={`badge status-${evt.data.status}`}>
                  {evt.data.status}
                </span>
              )}
              {evt.data?.soundType && (
                <span className="badge badge-purple">{evt.data.soundType}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default RealtimePage;

import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { io } from "socket.io-client";
import { baseApi } from "../api/baseApi.js";
import {
  useGetOrdersQuery,
  useUpdateOrderStatusMutation,
} from "../api/orderApi.js";
import { useUpdateMenuStockMutation } from "../api/menuApi.js";
import { playSound, setSoundEnabled, isSoundEnabled } from "../utils/sounds.js";

const socketUrl =
  import.meta.env.VITE_SOCKET_URL || "https://dhaba-app.onrender.com";

const SOURCE_LABELS = {
  WALKIN_TABLE: { label: "Walk-in", cls: "source-WALKIN_TABLE" },
  TAKEAWAY_COUNTER: { label: "Takeaway", cls: "source-TAKEAWAY_COUNTER" },
  PHONE_MANUAL: { label: "Phone", cls: "source-PHONE_MANUAL" },
  QR_TABLE: { label: "QR Order", cls: "source-QR_TABLE" },
  ONLINE_PICKUP: { label: "Online Pickup", cls: "source-ONLINE_PICKUP" },
  ONLINE_DELIVERY: { label: "Delivery", cls: "source-ONLINE_DELIVERY" },
};

/* Returns minutes elapsed since a date */
const elapsedMins = (date) =>
  Math.floor((Date.now() - new Date(date).getTime()) / 60000);

const ElapsedTimer = ({ date }) => {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const mins = elapsedMins(date);
  const cls = mins >= 20 ? "urgent" : mins >= 10 ? "warn" : "ok";
  const label = mins < 1 ? "Just now" : mins === 1 ? "1 min" : `${mins} min`;

  return (
    <span
      className={`kds-timer ${cls}`}
      title={new Date(date).toLocaleTimeString("en-IN")}>
      ⏱ {label}
    </span>
  );
};

/* ─── Single KDS card ─────────────────────────── */
const KdsCard = ({ order, onAction, isLoading }) => {
  const [updateMenuStock] = useUpdateMenuStockMutation();
  const src = SOURCE_LABELS[order.source] || {
    label: order.source,
    cls: "badge-gray",
  };
  const eta =
    order.delivery?.etaMinutesOverride ?? order.delivery?.etaMinutesCalculated;
  const mins = elapsedMins(order.createdAt);
  const isUrgent = mins >= 20;

  return (
    <div
      className={`kds-card ${order.status.toLowerCase()}`}
      style={{ border: isUrgent ? "2px solid #dc2626" : undefined }}>
      {/* Row 1 — source + timer */}
      <div className="order-header">
        <div
          style={{
            display: "flex",
            gap: "0.35rem",
            flexWrap: "wrap",
            alignItems: "center",
          }}>
          <span className={`badge ${src.cls}`}>{src.label}</span>
          {order.tableNumber && (
            <span className="badge badge-blue" style={{ fontWeight: 700 }}>
              Table {order.tableNumber}
            </span>
          )}
        </div>
        <ElapsedTimer date={order.createdAt} />
      </div>

      {/* Row 2 — KOT + Order numbers */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          alignItems: "center",
          flexWrap: "wrap",
        }}>
        <span style={{ fontSize: "1rem", fontWeight: 800, color: "#1c1917" }}>
          {order.kotNo}
        </span>
        <span style={{ fontSize: "0.78rem", color: "#78716c" }}>·</span>
        <span style={{ fontSize: "0.78rem", color: "#78716c" }}>
          {order.orderNo}
        </span>
      </div>

      {/* Row 3 — customer name */}
      {order.customerName && (
        <div
          style={{
            fontSize: "0.875rem",
            color: "#57534e",
            display: "flex",
            gap: "0.35rem",
            alignItems: "center",
          }}>
          👤 {order.customerName}
          {order.customerPhone && (
            <span style={{ color: "#78716c", fontSize: "0.78rem" }}>
              {order.customerPhone}
            </span>
          )}
        </div>
      )}

      {/* Row 4 — ETA */}
      {eta > 0 && (
        <div
          style={{
            fontSize: "0.82rem",
            color: "#57534e",
            background: "#fef3c7",
            borderRadius: 6,
            padding: "0.25rem 0.5rem",
            display: "inline-block",
          }}>
          ETA: {eta} min
        </div>
      )}

      {/* Row 5 — special notes */}
      {order.notes && (
        <div
          style={{
            fontSize: "0.85rem",
            background: "#fffbeb",
            border: "1px solid #fde68a",
            borderRadius: 8,
            padding: "0.4rem 0.65rem",
            color: "#92400e",
            lineHeight: 1.4,
          }}>
          📝 {order.notes}
        </div>
      )}

      {/* Row 6 — items list */}
      <ul className="order-items" style={{ fontSize: "0.95rem" }}>
        {(order.kotItemsSnapshot?.length
          ? order.kotItemsSnapshot
          : order.items
        ).map((item, i) => (
          <li
            key={i}
            style={{
              padding: "0.45rem 0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: "0.5rem",
            }}>
            <div>
              <span style={{ fontWeight: 700, fontSize: "1rem" }}>
                {item.qty}×
              </span>{" "}
              <span style={{ fontWeight: 600 }}>{item.nameSnapshot}</span>
              {item.itemNotes && (
                <div
                  style={{
                    fontSize: "0.78rem",
                    color: "#c2410c",
                    fontStyle: "italic",
                    marginTop: "0.1rem",
                  }}>
                  ⚠ {item.itemNotes}
                </div>
              )}
            </div>
            {/* Out-of-stock quick toggle */}
            {item.itemId && (
              <button
                className="sm danger"
                style={{
                  padding: "0.2rem 0.45rem",
                  fontSize: "0.7rem",
                  flexShrink: 0,
                  opacity: 0.65,
                }}
                title="Mark out of stock"
                onClick={() =>
                  updateMenuStock({
                    id: item.itemId,
                    stockStatus: "OUT_OF_STOCK",
                  })
                }>
                ✕ Stock
              </button>
            )}
          </li>
        ))}
      </ul>

      {/* Row 7 — action button */}
      <div style={{ marginTop: "0.5rem" }}>
        {order.status === "ACCEPTED" && (
          <button
            className="kds-action-btn start"
            onClick={() => onAction(order._id, "PREPARING")}
            disabled={isLoading}>
            🍳 Start Preparing
          </button>
        )}
        {order.status === "PREPARING" && (
          <button
            className="kds-action-btn ready"
            onClick={() => onAction(order._id, "READY")}
            disabled={isLoading}>
            ✅ Mark Ready
          </button>
        )}
        {order.status === "READY" && (
          <button
            className="kds-action-btn done"
            onClick={() => onAction(order._id, "COMPLETED")}
            disabled={isLoading}>
            ✓ Mark Completed
          </button>
        )}
      </div>
    </div>
  );
};

/* ─── KDS column ──────────────────────────────── */
const KdsColumn = ({
  title,
  emoji,
  colorCls,
  orders,
  onAction,
  loadingId,
  emptyIcon,
  emptyText,
}) => (
  <div className="kds-col">
    <div
      className={`kds-col-header ${colorCls}`}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
      <span>
        {emoji} {title}
      </span>
      {orders.length > 0 && (
        <span
          style={{
            background: "rgba(0,0,0,0.12)",
            borderRadius: 999,
            padding: "0.15rem 0.5rem",
            fontSize: "0.85rem",
            fontWeight: 800,
          }}>
          {orders.length}
        </span>
      )}
    </div>
    <div className="kds-col-body">
      {orders.length === 0 ? (
        <div className="empty-state" style={{ padding: "2rem 1rem" }}>
          <div className="icon" style={{ fontSize: "2rem" }}>
            {emptyIcon}
          </div>
          <p style={{ fontSize: "0.82rem" }}>{emptyText}</p>
        </div>
      ) : (
        orders.map((o) => (
          <KdsCard
            key={o._id}
            order={o}
            onAction={onAction}
            isLoading={loadingId === o._id}
          />
        ))
      )}
    </div>
  </div>
);

/* ─── Kitchen Display Page ────────────────────── */
const KitchenPage = () => {
  const dispatch = useDispatch();
  const { token, user } = useSelector((state) => state.auth);
  const { data, isLoading, error } = useGetOrdersQuery(
    { status: "ACCEPTED,PREPARING,READY" },
    { pollingInterval: 30000 },
  );
  const [updateOrderStatus, updateState] = useUpdateOrderStatusMutation();
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const [connected, setConnected] = useState(false);
  const [loadingId, setLoadingId] = useState(null);
  const knownOrders = useRef(new Set());

  const orders = data?.data?.orders || [];
  const newOrders = orders.filter((o) => o.status === "ACCEPTED");
  const prepOrders = orders.filter((o) => o.status === "PREPARING");
  const readyOrders = orders.filter((o) => o.status === "READY");

  useEffect(() => {
    if (!token || !user) return;
    const socket = io(socketUrl, { auth: { token }, reconnectionDelay: 2000 });
    socket.emit("join", { role: user.role });

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("order:new", (data) => {
      if (!knownOrders.current.has(data.orderNo)) {
        knownOrders.current.add(data.orderNo);
        playSound(data.soundType || "WALKIN_SOUND", `kitchen-${data.orderNo}`);
        dispatch(baseApi.util.invalidateTags(["Orders"]));
      }
    });

    socket.on("order:update", () => {
      dispatch(baseApi.util.invalidateTags(["Orders"]));
    });

    socket.on("menu:stock_changed", () => {
      dispatch(baseApi.util.invalidateTags(["Menu"]));
    });

    return () => socket.disconnect();
  }, [dispatch, token, user]);

  const handleAction = async (id, status) => {
    setLoadingId(id);
    try {
      await updateOrderStatus({ id, status }).unwrap();
    } catch (err) {
      console.error("KDS action failed", err);
    } finally {
      setLoadingId(null);
    }
  };

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
    if (next) playSound("NOTIFY_SOUND");
  };

  const totalActive = orders.length;

  return (
    <div className="kds-page">
      {/* ── KDS Topbar ── */}
      <div
        style={{
          padding: "0.65rem 1.25rem",
          background: "#1c1917",
          borderBottom: "2px solid #d97706",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          flexWrap: "wrap",
          flexShrink: 0,
        }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.9rem" }}>
          <h1 style={{ margin: 0, fontSize: "1.25rem", color: "#fef3c7" }}>
            🍳 Kitchen Display
          </h1>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              fontSize: "0.82rem",
              color: connected ? "#4ade80" : "#f87171",
              fontWeight: 600,
            }}>
            <span
              className={`connection-dot ${connected ? "connected" : "disconnected"}`}
              style={{ background: connected ? "#4ade80" : "#f87171" }}></span>
            {connected ? "Live" : "Reconnecting…"}
          </span>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          {/* Quick counts */}
          <div style={{ display: "flex", gap: "0.5rem", fontSize: "0.82rem" }}>
            {newOrders.length > 0 && (
              <span
                style={{
                  background: "#fef3c7",
                  color: "#92400e",
                  padding: "0.25rem 0.5rem",
                  borderRadius: 6,
                  fontWeight: 700,
                }}>
                🆕 {newOrders.length}
              </span>
            )}
            {prepOrders.length > 0 && (
              <span
                style={{
                  background: "#f3e8ff",
                  color: "#7c3aed",
                  padding: "0.25rem 0.5rem",
                  borderRadius: 6,
                  fontWeight: 700,
                }}>
                🍳 {prepOrders.length}
              </span>
            )}
            {readyOrders.length > 0 && (
              <span
                style={{
                  background: "#dcfce7",
                  color: "#15803d",
                  padding: "0.25rem 0.5rem",
                  borderRadius: 6,
                  fontWeight: 700,
                }}>
                ✅ {readyOrders.length}
              </span>
            )}
            {totalActive === 0 && (
              <span style={{ color: "#78716c", fontSize: "0.82rem" }}>
                No active orders
              </span>
            )}
          </div>

          <button
            onClick={toggleSound}
            className={soundOn ? "success sm" : "sm"}
            style={{ borderRadius: 8 }}>
            {soundOn ? "🔊 On" : "🔇 Off"}
          </button>
        </div>
      </div>

      {/* ── Loading / Error states ── */}
      {isLoading && (
        <div style={{ padding: "3rem", textAlign: "center", flex: 1 }}>
          <span
            className="spinner"
            style={{ width: "2rem", height: "2rem", borderWidth: 3 }}></span>
        </div>
      )}
      {error && (
        <div className="alert alert-error" style={{ margin: "1rem" }}>
          {error?.data?.message || "Failed to load kitchen orders"}
        </div>
      )}

      {/* ── Three-column KDS layout ── */}
      {!isLoading && (
        <div style={{ flex: 1, overflow: "hidden", padding: "0.75rem" }}>
          <div className="kds-layout">
            <KdsColumn
              title="New Orders"
              emoji="🆕"
              colorCls="new"
              orders={newOrders}
              onAction={handleAction}
              loadingId={loadingId}
              emptyIcon="✓"
              emptyText="No new orders"
            />
            <KdsColumn
              title="Preparing"
              emoji="🍳"
              colorCls="prep"
              orders={prepOrders}
              onAction={handleAction}
              loadingId={loadingId}
              emptyIcon="👨‍🍳"
              emptyText="Nothing being prepared"
            />
            <KdsColumn
              title="Ready to Serve"
              emoji="✅"
              colorCls="ready"
              orders={readyOrders}
              onAction={handleAction}
              loadingId={loadingId}
              emptyIcon="🛎"
              emptyText="Nothing ready yet"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default KitchenPage;

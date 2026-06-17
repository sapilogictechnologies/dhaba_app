import { useState } from "react";
import {
  useCreateTableMutation,
  useDeleteTableMutation,
  useGenerateTableQrMutation,
  useGetTablesQuery,
  useUpdateTableMutation,
} from "../api/tableApi.js";
import { useToast } from "../components/Toast.jsx";

const QR_PRINT_STYLE = `
  body { background:#fff; font-family:sans-serif; }
  .qr-sheet { display:grid; grid-template-columns: repeat(auto-fill, minmax(200px,1fr)); gap:1rem; padding:1rem; }
  .qr-item { border:2px solid #333; border-radius:8px; padding:1rem; text-align:center; page-break-inside:avoid; }
  .qr-item img { width:180px; height:180px; }
  .qr-item h2 { margin:0.5rem 0 0.25rem; font-size:1.4rem; }
  .qr-item p { margin:0; font-size:0.8rem; color:#555; }
`;

const getTableStatus = (table) => {
  if (!table.isActive) return "inactive";
  if (!table.currentOrderId) return "free";
  return "occupied";
};

const statusLabel = {
  free: "FREE",
  occupied: "OCCUPIED",
  inactive: "INACTIVE",
};
const statusColor = {
  free: "#16a34a",
  occupied: "#d97706",
  inactive: "#78716c",
};

const TablesPage = () => {
  const toast = useToast();
  const { data, isLoading, error } = useGetTablesQuery();
  const [createTable] = useCreateTableMutation();
  const [updateTable] = useUpdateTableMutation();
  const [deleteTable] = useDeleteTableMutation();
  const [generateTableQr] = useGenerateTableQrMutation();
  const [newTable, setNewTable] = useState({ tableNumber: "", capacity: 4 });
  const [printMode, setPrintMode] = useState(false);

  const tables = data?.data?.tables || [];
  const apiBase =
    import.meta.env.VITE_SOCKET_URL || "https://dhaba-app.onrender.com";

  const act = async (fn, msg) => {
    try {
      await fn();
      toast(msg, "success");
    } catch (err) {
      toast(err.data?.message || "Action failed", "error");
    }
  };

  const addTable = async (e) => {
    e.preventDefault();
    if (!newTable.tableNumber) return;
    await act(
      () =>
        createTable({
          tableNumber: Number(newTable.tableNumber),
          capacity: Number(newTable.capacity),
        }).unwrap(),
      `Table ${newTable.tableNumber} created`,
    );
    setNewTable({ tableNumber: "", capacity: 4 });
  };

  const printQR = (table) => {
    const win = window.open("", "_blank");
    const appUrl = window.location.origin;
    win.document.write(`
      <html><head><title>QR Table ${table.tableNumber}</title>
      <style>${QR_PRINT_STYLE}</style></head>
      <body>
        <div class="qr-item" style="max-width:240px;margin:2rem auto;">
          <img src="${table.qrCodeUrl}" alt="QR" />
          <h2>Table ${table.tableNumber}</h2>
          <p>Capacity: ${table.capacity}</p>
          <p style="font-size:0.7rem;word-break:break-all;margin-top:0.5rem;">${appUrl}/order?table=${table.tableNumber}&token=${table.token}</p>
        </div>
        <script>window.onload=()=>{window.print();}<\/script>
      </body></html>
    `);
    win.document.close();
  };

  const printAllQR = () => {
    const win = window.open("", "_blank");
    const appUrl = window.location.origin;
    const items = tables
      .filter((t) => t.isActive && t.qrCodeUrl)
      .map(
        (t) => `
      <div class="qr-item">
        <img src="${t.qrCodeUrl}" alt="QR" />
        <h2>Table ${t.tableNumber}</h2>
        <p>Capacity: ${t.capacity}</p>
        <p style="font-size:0.7rem;word-break:break-all;margin-top:0.5rem;">${appUrl}/order?table=${t.tableNumber}&token=${t.token}</p>
      </div>
    `,
      )
      .join("");
    win.document.write(`
      <html><head><title>All QR Codes</title><style>${QR_PRINT_STYLE}</style></head>
      <body><div class="qr-sheet">${items}</div>
      <script>window.onload=()=>{window.print();}<\/script></body></html>
    `);
    win.document.close();
  };

  const copyLink = (table) => {
    const url = `${window.location.origin}/order?table=${table.tableNumber}&token=${table.token}`;
    navigator.clipboard
      .writeText(url)
      .then(() => toast("Link copied!", "success"));
  };

  return (
    <section className="shell">
      <div className="page-header">
        <h1>Tables & QR Codes</h1>
        <div className="actions">
          <button onClick={printAllQR}>🖨 Print All QRs</button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error.data?.message}</div>}

      {/* Add table form */}
      <div className="panel">
        <h2>Add New Table</h2>
        <form onSubmit={addTable}>
          <div className="form-grid">
            <label>
              Table Number
              <input
                type="number"
                value={newTable.tableNumber}
                min="1"
                onChange={(e) =>
                  setNewTable({ ...newTable, tableNumber: e.target.value })
                }
                placeholder="e.g. 11"
                required
              />
            </label>
            <label>
              Capacity
              <input
                type="number"
                value={newTable.capacity}
                min="1"
                onChange={(e) =>
                  setNewTable({ ...newTable, capacity: e.target.value })
                }
              />
            </label>
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <button type="submit" className="primary">
                Add Table
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Summary */}
      <div className="cards" style={{ marginBottom: "1rem" }}>
        <div className="metric">
          <span>Total</span>
          <strong>{tables.length}</strong>
        </div>
        <div className="metric">
          <span style={{ color: "#16a34a" }}>Free</span>
          <strong style={{ color: "#16a34a" }}>
            {tables.filter((t) => getTableStatus(t) === "free").length}
          </strong>
        </div>
        <div className="metric">
          <span style={{ color: "#d97706" }}>Occupied</span>
          <strong style={{ color: "#d97706" }}>
            {tables.filter((t) => getTableStatus(t) === "occupied").length}
          </strong>
        </div>
        <div className="metric">
          <span>Inactive</span>
          <strong>{tables.filter((t) => !t.isActive).length}</strong>
        </div>
      </div>

      {isLoading && (
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <span className="spinner"></span>
        </div>
      )}

      {/* Table grid */}
      <div className="table-grid">
        {tables.map((table) => {
          const status = getTableStatus(table);
          return (
            <div key={table._id} className={`table-card ${status}`}>
              <div className="table-num">T{table.tableNumber}</div>
              <div
                className="table-status"
                style={{ color: statusColor[status] }}>
                {statusLabel[status]}
              </div>
              <div style={{ fontSize: "0.78rem", color: "#78716c" }}>
                Cap: {table.capacity}
              </div>

              {table.qrCodeUrl && (
                <img
                  className="qr"
                  src={table.qrCodeUrl}
                  alt={`QR Table ${table.tableNumber}`}
                />
              )}

              <div
                style={{
                  display: "flex",
                  gap: "0.3rem",
                  flexWrap: "wrap",
                  justifyContent: "center",
                  marginTop: "0.3rem",
                }}>
                <button
                  className="sm"
                  onClick={() => printQR(table)}
                  title="Print QR">
                  🖨
                </button>
                <button
                  className="sm"
                  onClick={() => copyLink(table)}
                  title="Copy order link">
                  🔗
                </button>
                <button
                  className="sm"
                  onClick={() =>
                    act(
                      () => generateTableQr(table._id).unwrap(),
                      "New QR generated",
                    )
                  }>
                  ↺ QR
                </button>
                <button
                  className="sm"
                  onClick={() =>
                    act(
                      () =>
                        updateTable({
                          id: table._id,
                          isActive: !table.isActive,
                        }).unwrap(),
                      table.isActive ? "Deactivated" : "Activated",
                    )
                  }>
                  {table.isActive ? "Deactivate" : "Activate"}
                </button>
                <button
                  className="sm danger"
                  onClick={() => {
                    if (window.confirm(`Delete Table ${table.tableNumber}?`))
                      act(
                        () => deleteTable(table._id).unwrap(),
                        "Table deleted",
                      );
                  }}>
                  Del
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {tables.length === 0 && !isLoading && (
        <div className="empty-state">
          <div className="icon">🪑</div>
          <p>No tables yet. Add one above.</p>
        </div>
      )}
    </section>
  );
};

export default TablesPage;

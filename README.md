# Dhaba Management System

A complete MERN Dhaba Management System with a production-style Node/Express/MongoDB backend and a basic React/Vite testing UI. The app uses real MongoDB through Mongoose, JWT auth, role guards, RTK Query, Socket.IO events, QR table ordering, payment proof uploads, audit logs, seed data, billing, and reports.

## Stack

- Backend: Node.js, Express.js, MongoDB, Mongoose, JWT, bcrypt, Socket.IO, multer, helmet, cors, express-rate-limit, express-validator, compression, morgan, dotenv, qrcode
- Frontend: React + Vite, JavaScript, Redux Toolkit, RTK Query, React Router, Socket.IO client, simple CSS

## Install

```powershell
npm run install-all
```

## Environment

Create backend env:

```powershell
Copy-Item server/.env.example server/.env
```

Edit `server/.env` and set `MONGO_URI` to your real MongoDB connection string. For local testing, the other values can stay as provided.

Create client env:

```powershell
Copy-Item client/.env.example client/.env
```

## Seed Database

```powershell
npm run seed
```

Seed logins:

- Admin: `admin@dhaba.com` / `Admin@12345`
- Staff: `staff@dhaba.com` / `Staff@12345`
- Kitchen: `kitchen@dhaba.com` / `Kitchen@12345`

Seed includes settings, 12 menu items, and tables 1 through 10 with secure QR tokens and QR data URLs.

## Run Locally

```powershell
npm run dev
```

Backend: `http://localhost:5000`
Frontend: `http://localhost:5173`

You can also run separately:

```powershell
npm run server
npm run client
```

## API Summary

All JSON APIs return:

```json
{ "success": true, "message": "Readable message", "data": {} }
```

Errors return:

```json
{ "success": false, "message": "Readable error" }
```

Main routes:

- Auth: `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- Settings: `GET /api/settings`, `PATCH /api/settings`
- Menu: `GET /api/menu`, `POST /api/menu`, `PATCH /api/menu/:id`, `PATCH /api/menu/:id/toggle`, `PATCH /api/menu/:id/stock`, `DELETE /api/menu/:id`
- Tables: `GET /api/tables`, `POST /api/tables`, `PATCH /api/tables/:id`, `DELETE /api/tables/:id`, `POST /api/tables/:id/qr`, `GET /api/tables/validate`
- Orders: table, takeaway, phone, customer creation plus status, accept/reject, ETA, payment verify/reject/record, move table, merge, cancel, waiter call
- Reports: `GET /api/reports/daily?date=YYYY-MM-DD`, `GET /api/reports/export?date=YYYY-MM-DD`
- Health: `GET /api/health`

## RTK Query Architecture

`client/src/api/baseApi.js` owns the shared RTK Query base API. It reads `VITE_API_BASE_URL`, injects `Authorization: Bearer <token>` from Redux/localStorage, enables focus/reconnect refetching, and defines tags for `Auth`, `Settings`, `Menu`, `Tables`, `Orders`, and `Reports`.

Feature APIs are split into `authApi`, `settingsApi`, `menuApi`, `tableApi`, `orderApi`, and `reportApi`. Mutations invalidate the relevant tags, polling is enabled on kitchen/admin/dashboard pages, and Socket.IO events only trigger RTK Query invalidation/refetch.

Components do not use plain `fetch` or `axios`.

## Test Flows

Walk-in table order:

1. Login as Staff.
2. Open `Tables` and confirm tables exist.
3. Open `Staff Orders`, choose `TABLE`, select a table, add menu quantities, and send to kitchen.
4. Login as Kitchen in another browser/session and open `Kitchen`.
5. Move the order through `PREPARING`, `READY`, and `COMPLETED`.
6. Login as Staff/Admin, open `Billing`, record full payment, and close the order.

Takeaway order:

1. Login as Staff.
2. Open `Staff Orders`, choose `TAKEAWAY`, add items, and send to kitchen.
3. Kitchen marks preparing and ready.
4. Billing records cash/UPI/mixed payment and closes when possible.

QR table order:

1. Login as Staff/Admin and open `Tables`.
2. Copy a table token or use the generated QR URL payload.
3. Open `/customer?tableNumber=1&token=<token>`.
4. Choose `QR_TABLE`, add items, and place the order.
5. Kitchen receives the order immediately.

Online delivery manual payment verification:

1. Open `/customer`.
2. Choose `DELIVERY`, select `WITHIN_5` or `BETWEEN_5_10`, add enough items to meet the delivery minimum, and enter a UTR or upload a proof file.
3. The order is created as `UNDER_REVIEW` with payment `UNDER_REVIEW`.
4. Login as Admin, open `Admin Orders`, and verify payment.
5. After verification the order becomes `ACCEPTED` and emits to kitchen.

Kitchen queue:

1. Login as Kitchen.
2. Open `Kitchen`.
3. The page polls every 5 seconds.
4. Use the status buttons to move accepted orders through preparing, ready, and completed.
5. Use item stock buttons to mark a menu item out of stock.

Billing/payment:

1. Login as Staff/Admin.
2. Open `Billing`.
3. Pick an active order, enter paid amount, choose `CASH`, `UPI`, or `MIXED`.
4. Partial payments stay `PARTIAL`; full payments become `PAID`.
5. Closing creates a bill number and frees the table when the order reaches a closable state.

Reports:

1. Login as Admin/Staff.
2. Open `Reports`.
3. Pick a date to view sales, payment breakdown, counts, and top items.
4. Click `Export CSV` to download the generated CSV.

Realtime:

1. Login as any role.
2. Open `Realtime`.
3. Join `ADMIN`, `STAFF`, or `KITCHEN`.
4. Create or update orders in another tab to see incoming events and `soundType` values.

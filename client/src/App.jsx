import { useEffect, useRef } from 'react';
import { Route, Routes } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useDispatch, useSelector } from 'react-redux';
import { baseApi } from './api/baseApi.js';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { useToast } from './components/Toast.jsx';
import { playSound, unlockAudio } from './utils/sounds.js';
import { setCustomerCredentials } from './features/customerAuthSlice.js';
import { getCustomerToken } from './utils/customerAuth.js';

import LoginPage from './pages/LoginPage.jsx';
import LandingPage from './pages/LandingPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import MenuPage from './pages/MenuPage.jsx';
import TablesPage from './pages/TablesPage.jsx';
import StaffOrdersPage from './pages/StaffOrdersPage.jsx';
import CustomerOrderPage from './pages/CustomerOrderPage.jsx';
import KitchenPage from './pages/KitchenPage.jsx';
import AdminOrdersPage from './pages/AdminOrdersPage.jsx';
import BillingPage from './pages/BillingPage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import ExpensesPage from './pages/ExpensesPage.jsx';
import RealtimePage from './pages/RealtimePage.jsx';
import OrderStatusPage from './pages/OrderStatusPage.jsx';
import MyOrdersPage from './pages/MyOrdersPage.jsx';
import CustomerLoginPage from './pages/CustomerLoginPage.jsx';
import CustomerAccountPage from './pages/CustomerAccountPage.jsx';

const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

const App = () => {
  const dispatch = useDispatch();
  const { token, user } = useSelector((state) => state.auth);
  const { token: custToken } = useSelector((state) => state.customerAuth);
  const toast = useToast();
  const socketRef = useRef(null);

  // Hydrate customer auth token from localStorage on first load
  useEffect(() => {
    const storedToken = getCustomerToken();
    if (storedToken && !custToken) {
      dispatch(setCustomerCredentials({ token: storedToken, user: null }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const unlock = () => unlockAudio();
    document.addEventListener('click', unlock, { once: true });
    document.addEventListener('touchstart', unlock, { once: true });
    return () => {
      document.removeEventListener('click', unlock);
      document.removeEventListener('touchstart', unlock);
    };
  }, []);

  useEffect(() => {
    if (!token || !user) return undefined;

    const socket = io(socketUrl, { auth: { token }, reconnectionDelay: 2000 });
    socketRef.current = socket;

    socket.emit('join', { role: user.role });

    const invalidateOrders = () => dispatch(baseApi.util.invalidateTags(['Orders', 'Reports', 'Tables']));
    const invalidateMenu = () => dispatch(baseApi.util.invalidateTags(['Menu']));

    socket.on('order:new', (data) => {
      invalidateOrders();
      playSound(data.soundType, `new-${data.orderNo}`);
      toast(`New order ${data.orderNo} — ${data.source?.replace(/_/g, ' ')}`, 'info');
    });

    socket.on('order:update', (data) => {
      invalidateOrders();
      if (data.status === 'READY') {
        playSound('NOTIFY_SOUND', `ready-${data.orderNo}`);
        toast(`Order ${data.orderNo} is READY`, 'success');
      }
      if (data.status === 'CANCELLED') {
        toast(`Order ${data.orderNo} cancelled`, 'error');
      }
    });

    socket.on('order:payment_under_review', (data) => {
      invalidateOrders();
      playSound('PAYMENT_SOUND', `pay-${data.orderNo}`);
      toast(`Payment review needed — ${data.orderNo}`, 'warn');
    });

    socket.on('order:call_waiter', (data) => {
      invalidateOrders();
      playSound('WAITER_SOUND', `waiter-${data.orderNo}`);
      toast(`🔔 Waiter called — ${data.message || data.orderNo}`, 'warn');
    });

    socket.on('menu:stock_changed', () => {
      invalidateMenu();
      toast('Menu stock updated', 'info');
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [dispatch, token, user, toast]);

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/landing" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/order" element={<CustomerOrderPage />} />
      <Route path="/order-status/:orderNo" element={<OrderStatusPage />} />
      <Route path="/my-orders" element={<MyOrdersPage />} />
      <Route path="/customer/login" element={<CustomerLoginPage />} />
      <Route path="/customer/account" element={<CustomerAccountPage />} />

      {/* Protected routes */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />

        <Route
          path="settings"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <SettingsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="menu"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'STAFF', 'KITCHEN']}>
              <MenuPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="tables"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'STAFF']}>
              <TablesPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="staff-orders"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'STAFF']}>
              <StaffOrdersPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="kitchen"
          element={
            <ProtectedRoute allowedRoles={['KITCHEN', 'ADMIN']}>
              <KitchenPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="admin-orders"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdminOrdersPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="billing"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'STAFF']}>
              <BillingPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="reports"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'STAFF']}>
              <ReportsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="expenses"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'STAFF']}>
              <ExpensesPage />
            </ProtectedRoute>
          }
        />

        <Route path="realtime" element={<RealtimePage />} />
      </Route>
    </Routes>
  );
};

export default App;

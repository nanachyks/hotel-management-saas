import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { BrandProvider } from './context/BrandContext';
import { ToastProvider } from './context/ToastContext';
import { NotificationProvider } from './context/NotificationContext';
import { CurrencyProvider } from './context/CurrencyContext';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import RoleBasedRoute from './components/RoleBasedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import CheckEmail from './pages/CheckEmail';
import VerifyEmail from './pages/VerifyEmail';
import NotFound from './pages/NotFound';
import Dashboard from './pages/Dashboard';
import Rooms from './pages/Rooms';
import RoomTypes from './pages/RoomTypes';
import BookingDetail from './pages/BookingDetail';
import RoomCalendar from './pages/RoomCalendar';
import Bookings from './pages/Bookings';
import Guests from './pages/Guests';
import Invoices from './pages/Invoices';
import Services from './pages/Services';
import Users from './pages/Users';
import HotelSetup from './pages/HotelSetup';
import Expenses from './pages/Expenses';
import Inventory from './pages/Inventory';
import Reports from './pages/Reports';
import Housekeeping from './pages/Housekeeping';
import Maintenance from './pages/Maintenance';
import RoomService from './pages/RoomService';
import Staff from './pages/Staff';
import Notifications from './pages/Notifications';
import Subscriptions from './pages/Subscriptions';
import PaymentCallback from './pages/PaymentCallback';
import AIInsights from './pages/AIInsights';
import Payroll from './pages/Payroll';
import Integrations from './pages/Integrations';
import Corporate from './pages/Corporate';
import Franchise from './pages/Franchise';
import Roles from './pages/Roles';
import ApiKeys from './pages/ApiKeys';
import WhiteLabel from './pages/WhiteLabel';
import Enterprise from './pages/Enterprise';
import Channels from './pages/Channels';

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
      <AuthProvider>
        <BrandProvider>
        <CurrencyProvider>
        <NotificationProvider>
        <ToastProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/check-email" element={<CheckEmail />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/payment-callback" element={<PaymentCallback />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/rooms" element={<Rooms />} />
              <Route path="/room-types" element={<RoomTypes />} />
              <Route path="/calendar" element={<RoomCalendar />} />
              <Route path="/bookings" element={<Bookings />} />
              <Route path="/bookings/:id" element={<BookingDetail />} />
              <Route path="/guests" element={<Guests />} />
              <Route path="/invoices" element={<Invoices />} />
              <Route path="/services" element={<Services />} />
               <Route path="/expenses" element={<Expenses />} />
               <Route path="/inventory" element={<Inventory />} />
               <Route path="/reports" element={<Reports />} />
              <Route path="/housekeeping" element={<Housekeeping />} />
              <Route path="/maintenance" element={<Maintenance />} />
              <Route path="/room-service" element={<RoomService />} />
              <Route path="/staff" element={<Staff />} />
               <Route path="/notifications" element={<Notifications />} />
               <Route path="/ai" element={<AIInsights />} />
               <Route path="/payroll" element={<Payroll />} />
               <Route path="/integrations" element={<Integrations />} />
               <Route path="/subscriptions" element={<Subscriptions />} />
              <Route element={<RoleBasedRoute allowedRoles={['admin', 'owner']} />}>
                <Route path="/users" element={<Users />} />
              </Route>
              <Route path="/hotel" element={<HotelSetup />} />
              <Route path="/corporate" element={<Corporate />} />
              <Route path="/franchise" element={<Franchise />} />
              <Route path="/roles" element={<Roles />} />
              <Route path="/api-keys" element={<ApiKeys />} />
              <Route path="/white-label" element={<WhiteLabel />} />
              <Route path="/enterprise" element={<Enterprise />} />
              <Route path="/channels" element={<Channels />} />
            </Route>
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
        </ToastProvider>
        </NotificationProvider>
        </CurrencyProvider>
        </BrandProvider>
      </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

import { Route, Routes, Navigate } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ReservationMap from './pages/ReservationMap';
import Reservations from './pages/Reservations';
import FrontDesk from './pages/FrontDesk';
import Guests from './pages/Guests';
import Rooms from './pages/Rooms';
import Housekeeping from './pages/Housekeeping';
import Maintenance from './pages/Maintenance';
import Rates from './pages/Rates';
import Finance from './pages/Finance';
import Reports from './pages/Reports';
import Integrations from './pages/Integrations';
import BookingEngineAdmin from './pages/BookingEngineAdmin';
import UsersPage from './pages/UsersPage';
import SettingsPage from './pages/SettingsPage';
import PlatformAdmin from './pages/PlatformAdmin';
import PublicBooking from './pages/PublicBooking';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/reservar/:slug" element={<PublicBooking />} />
      <Route path="/app" element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="mapa" element={<ReservationMap />} />
        <Route path="reservas" element={<Reservations />} />
        <Route path="recepcao" element={<FrontDesk />} />
        <Route path="hospedes" element={<Guests />} />
        <Route path="quartos" element={<Rooms />} />
        <Route path="governanca" element={<Housekeeping />} />
        <Route path="manutencao" element={<Maintenance />} />
        <Route path="tarifas" element={<Rates />} />
        <Route path="financeiro" element={<Finance />} />
        <Route path="relatorios" element={<Reports />} />
        <Route path="integracoes" element={<Integrations />} />
        <Route path="motor" element={<BookingEngineAdmin />} />
        <Route path="usuarios" element={<UsersPage />} />
        <Route path="configuracoes" element={<SettingsPage />} />
        <Route path="admin" element={<PlatformAdmin />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

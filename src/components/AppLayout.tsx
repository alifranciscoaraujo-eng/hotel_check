import React, { useState } from 'react';
import { NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import {
  LayoutDashboard, CalendarRange, BookOpenCheck, Users, DoorOpen, BedDouble,
  Sparkles, Wrench, Tag, Wallet, BarChart3, Plug, UserCog, Settings, Globe,
  Bell, LogOut, Menu, X, ShieldCheck, RotateCcw, Building2,
} from 'lucide-react';
import { useStore, type Permission } from '../lib/store';
import { Logo } from './ui';
import { ROLE_LABELS, fmtDateTime } from '../lib/utils';

interface NavItem { to: string; label: string; icon: React.ReactNode; perm: Permission; }

const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: 'Operação',
    items: [
      { to: '/app', label: 'Visão geral', icon: <LayoutDashboard size={16} />, perm: 'dashboard' },
      { to: '/app/mapa', label: 'Mapa de reservas', icon: <CalendarRange size={16} />, perm: 'mapa' },
      { to: '/app/reservas', label: 'Reservas', icon: <BookOpenCheck size={16} />, perm: 'reservas' },
      { to: '/app/recepcao', label: 'Check-in / Check-out', icon: <DoorOpen size={16} />, perm: 'checkin' },
      { to: '/app/hospedes', label: 'Hóspedes', icon: <Users size={16} />, perm: 'hospedes' },
    ],
  },
  {
    group: 'Hospedagem',
    items: [
      { to: '/app/quartos', label: 'Quartos e acomodações', icon: <BedDouble size={16} />, perm: 'quartos' },
      { to: '/app/governanca', label: 'Governança', icon: <Sparkles size={16} />, perm: 'governanca' },
      { to: '/app/manutencao', label: 'Manutenção', icon: <Wrench size={16} />, perm: 'manutencao' },
      { to: '/app/tarifas', label: 'Tarifas', icon: <Tag size={16} />, perm: 'tarifas' },
    ],
  },
  {
    group: 'Gestão',
    items: [
      { to: '/app/financeiro', label: 'Financeiro', icon: <Wallet size={16} />, perm: 'financeiro' },
      { to: '/app/relatorios', label: 'Relatórios', icon: <BarChart3 size={16} />, perm: 'relatorios' },
      { to: '/app/integracoes', label: 'Integrações', icon: <Plug size={16} />, perm: 'integracoes' },
      { to: '/app/motor', label: 'Motor de reservas', icon: <Globe size={16} />, perm: 'motor' },
    ],
  },
  {
    group: 'Administração',
    items: [
      { to: '/app/usuarios', label: 'Usuários', icon: <UserCog size={16} />, perm: 'usuarios' },
      { to: '/app/configuracoes', label: 'Configurações', icon: <Settings size={16} />, perm: 'configuracoes' },
      { to: '/app/admin', label: 'Admin da plataforma', icon: <ShieldCheck size={16} />, perm: 'admin' },
    ],
  },
];

export default function AppLayout() {
  const { currentUser, db, propertyId, logout, can, markNotificationsRead, resetDemo } = useStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const navigate = useNavigate();

  if (!currentUser) return <Navigate to="/login" replace />;

  const property = db.properties.find(p => p.id === propertyId);
  const notifications = db.notifications.filter(n => n.propertyId === propertyId).slice(0, 12);
  const unread = notifications.filter(n => !n.read).length;

  const nav = NAV.map(g => ({ ...g, items: g.items.filter(i => can(i.perm)) })).filter(g => g.items.length > 0);

  const dateStr = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  const sidebar = (
    <div className="flex h-full flex-col bg-brand-950 text-white">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-[15px]">
        <Logo light />
        <button className="lg:hidden text-white/60" onClick={() => setSidebarOpen(false)}><X size={18} /></button>
      </div>
      <div className="px-3 pt-3">
        <div className="flex items-center gap-2.5 rounded-lg border border-white/[0.07] bg-white/[0.05] px-3 py-2">
          <Building2 size={15} className="shrink-0 text-white/40" />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-white/90">{property?.name}</p>
            <p className="text-[11px] text-white/35">Hospedagem ativa</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {nav.map(g => (
          <div key={g.group} className="mt-4">
            <p className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/25">{g.group}</p>
            <div className="space-y-0.5">
              {g.items.map(i => (
                <NavLink
                  key={i.to} to={i.to} end={i.to === '/app'}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) => clsx(
                    'flex items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[13px] font-medium transition-colors',
                    isActive ? 'bg-white/10 text-white' : 'text-white/55 hover:bg-white/[0.05] hover:text-white/90'
                  )}
                >
                  <span className="text-current opacity-80">{i.icon}</span>{i.label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-white/[0.06] p-3">
        <div className="flex items-center gap-2.5 px-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-[11px] font-semibold shrink-0">
            {currentUser.name.split(' ').map(p => p[0]).slice(0, 2).join('')}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-white/90">{currentUser.name}</p>
            <p className="truncate text-[11px] text-white/35">{ROLE_LABELS[currentUser.role]}</p>
          </div>
          <button title="Sair" onClick={() => { logout(); navigate('/login'); }} className="rounded-md p-1.5 text-white/40 hover:bg-white/[0.07] hover:text-white/80"><LogOut size={15} /></button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="hidden lg:block w-[248px] shrink-0">{sidebar}</aside>
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-950/50" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72">{sidebar}</aside>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[52px] shrink-0 items-center justify-between border-b border-slate-200/80 bg-white px-4">
          <button className="lg:hidden text-slate-500" onClick={() => setSidebarOpen(true)}><Menu size={20} /></button>
          <p className="hidden lg:block text-[13px] text-slate-400 first-letter:capitalize">{dateStr}</p>
          <div className="flex items-center gap-1">
            <button title="Restaurar dados de demonstração" onClick={() => { if (confirm('Restaurar os dados de demonstração? Todas as alterações serão perdidas.')) resetDemo(); }} className="rounded-md p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600"><RotateCcw size={16} /></button>
            <div className="relative">
              <button onClick={() => { setNotifOpen(o => !o); if (!notifOpen) markNotificationsRead(); }} className="relative rounded-md p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600">
                <Bell size={17} />
                {unread > 0 && <span className="absolute top-0.5 right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">{unread}</span>}
              </button>
              {notifOpen && (
                <div className="absolute right-0 z-30 mt-2 w-80 card p-1.5 max-h-96 overflow-y-auto shadow-lg">
                  <p className="px-2.5 py-2 text-[11px] font-medium uppercase tracking-wider text-slate-400">Notificações</p>
                  {notifications.length === 0 && <p className="px-2.5 py-3 text-[13px] text-slate-500">Nenhuma notificação.</p>}
                  {notifications.map(n => (
                    <div key={n.id} className="rounded-md px-2.5 py-2 hover:bg-slate-50">
                      <p className="text-[13px] text-slate-700">{n.message}</p>
                      <p className="mt-0.5 text-[11px] text-slate-400">{fmtDateTime(n.createdAt)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6" onClick={() => notifOpen && setNotifOpen(false)}>
          <div className="mx-auto max-w-[1280px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

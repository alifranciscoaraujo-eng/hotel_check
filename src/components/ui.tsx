import React from 'react';
import clsx from 'clsx';
import { X, SearchX } from 'lucide-react';
import type { Channel, ReservationStatus, RoomStatus } from '../lib/types';
import { CHANNEL_COLORS, CHANNEL_LABELS, RES_STATUS_COLORS, RES_STATUS_LABELS, ROOM_STATUS_COLORS, ROOM_STATUS_LABELS } from '../lib/utils';

export function StatusBadge({ status }: { status: ReservationStatus }) {
  return <span className={clsx('inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium', RES_STATUS_COLORS[status])}>{RES_STATUS_LABELS[status]}</span>;
}

export function RoomBadge({ status }: { status: RoomStatus }) {
  return <span className={clsx('inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium', ROOM_STATUS_COLORS[status])}>{ROOM_STATUS_LABELS[status]}</span>;
}

export function ChannelBadge({ channel }: { channel: Channel }) {
  return <span className={clsx('inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium', CHANNEL_COLORS[channel])}>{CHANNEL_LABELS[channel]}</span>;
}

export function StatCard({ icon, label, value, sub, tone = 'default' }: {
  icon: React.ReactNode; label: string; value: React.ReactNode; sub?: string;
  tone?: 'default' | 'success' | 'warn' | 'danger';
}) {
  const tones = {
    default: 'text-slate-900',
    success: 'text-emerald-600',
    warn: 'text-amber-600',
    danger: 'text-rose-600',
  };
  return (
    <div className="card px-4 py-4">
      <div className="flex items-center gap-2">
        <span className="text-slate-400 [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
        <p className="text-[13px] font-medium text-slate-500 truncate">{label}</p>
      </div>
      <p className={clsx('mt-2.5 text-2xl font-semibold leading-none tracking-tight tabular-nums', tones[tone])}>{value}</p>
      {sub && <p className="mt-1.5 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/40 backdrop-blur-[2px] p-4 overflow-y-auto" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={clsx('card w-full my-8 max-h-none shadow-xl', wide ? 'max-w-3xl' : 'max-w-lg')}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="text-[15px] font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X size={17} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirmar', danger }: {
  open: boolean; onClose: () => void; onConfirm: () => void; title: string; message: string; confirmLabel?: string; danger?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-[13px] text-slate-600">{message}</p>
      <div className="mt-5 flex justify-end gap-2">
        <button className="btn-secondary" onClick={onClose}>Voltar</button>
        <button className={danger ? 'btn-danger' : 'btn-primary'} onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</button>
      </div>
    </Modal>
  );
}

export function EmptyState({ title, message }: { title: string; message?: string }) {
  return (
    <div className="card flex flex-col items-center justify-center py-14 text-center">
      <div className="rounded-full bg-slate-50 border border-slate-100 p-3.5 text-slate-300"><SearchX size={24} /></div>
      <p className="mt-3 text-sm font-medium text-slate-700">{title}</p>
      {message && <p className="mt-1 text-[13px] text-slate-400 max-w-sm">{message}</p>}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-lg md:text-xl font-semibold text-slate-900">{title}</h1>
        {subtitle && <p className="text-[13px] text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

export function Logo({ light, size = 'md' }: { light?: boolean; size?: 'sm' | 'md' | 'lg' }) {
  const s = size === 'lg' ? 38 : size === 'sm' ? 22 : 28;
  return (
    <div className="flex items-center gap-2.5">
      <svg width={s} height={s} viewBox="0 0 32 32">
        <rect width="32" height="32" rx="8" fill={light ? '#ffffff1e' : '#2b6a73'} />
        <path d="M8 22V12l8-5 8 5v10" stroke="white" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="16" cy="16" r="2.2" fill="white" />
      </svg>
      <div className="leading-tight">
        <span className={clsx('font-logo font-bold tracking-tight', light ? 'text-white' : 'text-slate-900', size === 'lg' ? 'text-2xl' : 'text-[17px]')}>Reserva<span className="text-brand-400">Flow</span></span>
        {size === 'lg' && <p className={clsx('text-xs', light ? 'text-white/60' : 'text-slate-400')}>Gestão inteligente para hospedagens</p>}
      </div>
    </div>
  );
}

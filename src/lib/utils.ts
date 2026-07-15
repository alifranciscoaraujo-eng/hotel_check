import { addDays, differenceInCalendarDays, format, parseISO, isWeekend } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Channel, PaymentMethod, ReservationStatus, RoomStatus, Role, MaintenancePriority, MaintenanceStatus } from './types';

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export const todayISO = () => format(new Date(), 'yyyy-MM-dd');
export const iso = (d: Date) => format(d, 'yyyy-MM-dd');
export const fromISO = (s: string) => parseISO(s);
export const addDaysISO = (s: string, n: number) => iso(addDays(parseISO(s), n));
export const nightsBetween = (a: string, b: string) => Math.max(0, differenceInCalendarDays(parseISO(b), parseISO(a)));
export const fmtDate = (s: string | null | undefined) => (s ? format(parseISO(s), 'dd/MM/yyyy') : '—');
export const fmtDateShort = (s: string) => format(parseISO(s), 'dd/MM');
export const fmtDateTime = (s: string | null | undefined) => (s ? format(new Date(s), "dd/MM/yyyy HH:mm") : '—');
export const fmtWeekday = (s: string) => format(parseISO(s), 'EEE', { locale: ptBR });
export const fmtMonth = (s: string) => format(parseISO(s), 'MMMM yyyy', { locale: ptBR });
export const isWeekendISO = (s: string) => isWeekend(parseISO(s));

export const money = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const pct = (v: number) => `${(v * 100).toFixed(0)}%`;

// Duas reservas conflitam se os períodos se sobrepõem (checkout não conta como noite)
export const overlaps = (aIn: string, aOut: string, bIn: string, bOut: string) => aIn < bOut && bIn < aOut;

export const CHANNEL_LABELS: Record<Channel, string> = {
  balcao: 'Balcão', telefone: 'Telefone', whatsapp: 'WhatsApp', site: 'Site próprio',
  booking: 'Booking.com', airbnb: 'Airbnb', expedia: 'Expedia', decolar: 'Decolar',
  agoda: 'Agoda', vrbo: 'Vrbo', indicacao: 'Indicação', agencia: 'Agência',
  corporativo: 'Corporativo', outros: 'Outros',
};

export const CHANNEL_COLORS: Record<Channel, string> = {
  balcao: 'bg-slate-100 text-slate-700', telefone: 'bg-slate-100 text-slate-700',
  whatsapp: 'bg-emerald-100 text-emerald-700', site: 'bg-brand-100 text-brand-700',
  booking: 'bg-blue-100 text-blue-800', airbnb: 'bg-rose-100 text-rose-700',
  expedia: 'bg-yellow-100 text-yellow-800', decolar: 'bg-orange-100 text-orange-700',
  agoda: 'bg-purple-100 text-purple-700', vrbo: 'bg-cyan-100 text-cyan-700',
  indicacao: 'bg-lime-100 text-lime-700', agencia: 'bg-indigo-100 text-indigo-700',
  corporativo: 'bg-stone-200 text-stone-700', outros: 'bg-slate-100 text-slate-600',
};

export const RES_STATUS_LABELS: Record<ReservationStatus, string> = {
  pre_reserva: 'Pré-reserva', confirmada: 'Confirmada', hospedado: 'Hospedado',
  finalizada: 'Finalizada', cancelada: 'Cancelada', no_show: 'No-show',
  bloqueada: 'Bloqueio', manutencao: 'Manutenção',
};

export const RES_STATUS_COLORS: Record<ReservationStatus, string> = {
  pre_reserva: 'bg-amber-100 text-amber-800 border-amber-300',
  confirmada: 'bg-brand-100 text-brand-800 border-brand-300',
  hospedado: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  finalizada: 'bg-slate-100 text-slate-600 border-slate-300',
  cancelada: 'bg-rose-100 text-rose-700 border-rose-300',
  no_show: 'bg-rose-100 text-rose-700 border-rose-300',
  bloqueada: 'bg-slate-200 text-slate-600 border-slate-400',
  manutencao: 'bg-orange-100 text-orange-700 border-orange-300',
};

// Cores dos blocos no mapa de reservas
export const RES_BLOCK_COLORS: Record<ReservationStatus, string> = {
  pre_reserva: 'bg-amber-400/90 hover:bg-amber-500 text-amber-950',
  confirmada: 'bg-brand-500 hover:bg-brand-600 text-white',
  hospedado: 'bg-emerald-500 hover:bg-emerald-600 text-white',
  finalizada: 'bg-slate-400 hover:bg-slate-500 text-white',
  cancelada: 'bg-rose-300 text-rose-900',
  no_show: 'bg-rose-400 text-white',
  bloqueada: 'bg-slate-300 hover:bg-slate-400 text-slate-700',
  manutencao: 'bg-orange-400 hover:bg-orange-500 text-white',
};

export const ROOM_STATUS_LABELS: Record<RoomStatus, string> = {
  disponivel: 'Disponível', ocupado: 'Ocupado', sujo: 'Sujo', em_limpeza: 'Em limpeza',
  limpo: 'Limpo', bloqueado: 'Bloqueado', manutencao: 'Manutenção', vistoriado: 'Vistoriado',
};

export const ROOM_STATUS_COLORS: Record<RoomStatus, string> = {
  disponivel: 'bg-emerald-100 text-emerald-800',
  ocupado: 'bg-brand-100 text-brand-800',
  sujo: 'bg-amber-100 text-amber-800',
  em_limpeza: 'bg-cyan-100 text-cyan-800',
  limpo: 'bg-emerald-100 text-emerald-800',
  bloqueado: 'bg-slate-200 text-slate-600',
  manutencao: 'bg-orange-100 text-orange-800',
  vistoriado: 'bg-indigo-100 text-indigo-800',
};

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  dinheiro: 'Dinheiro', pix: 'Pix', credito: 'Cartão de crédito', debito: 'Cartão de débito',
  transferencia: 'Transferência', boleto: 'Boleto', link: 'Link de pagamento',
  cortesia: 'Cortesia', faturado: 'Faturado', outros: 'Outros',
};

export const ROLE_LABELS: Record<Role, string> = {
  platform_admin: 'Admin da plataforma', owner: 'Proprietário', manager: 'Gerente',
  reception: 'Recepção', finance: 'Financeiro', housekeeping: 'Governança',
};

export const PRIORITY_LABELS: Record<MaintenancePriority, string> = {
  baixa: 'Baixa', media: 'Média', alta: 'Alta', urgente: 'Urgente',
};
export const PRIORITY_COLORS: Record<MaintenancePriority, string> = {
  baixa: 'bg-slate-100 text-slate-600', media: 'bg-amber-100 text-amber-800',
  alta: 'bg-orange-100 text-orange-800', urgente: 'bg-rose-100 text-rose-700',
};
export const MAINT_STATUS_LABELS: Record<MaintenanceStatus, string> = {
  aberto: 'Aberto', em_andamento: 'Em andamento', aguardando_peca: 'Aguardando peça',
  concluido: 'Concluído', cancelado: 'Cancelado',
};

// Comissões padrão por canal (usadas nos relatórios financeiros)
export const CHANNEL_COMMISSION: Partial<Record<Channel, number>> = {
  booking: 0.15, airbnb: 0.14, expedia: 0.18, decolar: 0.16, agoda: 0.17, vrbo: 0.08, agencia: 0.10,
};

export function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = '﻿' + [headers.map(esc).join(';'), ...rows.map(r => r.map(esc).join(';'))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

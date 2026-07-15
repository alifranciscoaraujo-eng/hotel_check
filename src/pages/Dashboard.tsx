import { useMemo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle, Hourglass, Plus, ArrowRight, Percent, LogIn, LogOut, BedDouble,
  Wallet, TrendingUp, BarChart3, CalendarCheck, Moon, CalendarClock, CalendarX,
} from 'lucide-react';
import {
  ResponsiveContainer, ComposedChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';
import clsx from 'clsx';
import { addDays, format, startOfMonth, endOfMonth, subMonths, eachMonthOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useStore } from '../lib/store';
import { PageHeader, ChannelBadge, StatusBadge } from '../components/ui';
import { CHANNEL_LABELS, money, nightsBetween, overlaps, todayISO, fmtDateShort } from '../lib/utils';
import type { ReservationStatus } from '../lib/types';

const REVENUE_STATUSES: ReservationStatus[] = ['confirmada', 'hospedado', 'finalizada'];
const PIE_COLORS = ['#2b6a73', '#4d9da4', '#f59e0b', '#e11d48', '#8b5cf6', '#0ea5e9', '#84cc16', '#64748b'];

function Stat({ icon, label, value, sub, tone }: { icon: ReactNode; label: string; value: ReactNode; sub?: ReactNode; tone?: 'success' | 'warn' | 'danger' }) {
  const valueTones = { success: 'text-emerald-600', warn: 'text-amber-600', danger: 'text-rose-600' };
  const iconTones = {
    default: 'bg-brand-50 text-brand-600',
    success: 'bg-emerald-50 text-emerald-600',
    warn: 'bg-amber-50 text-amber-600',
    danger: 'bg-rose-50 text-rose-500',
  };
  return (
    <div className="bg-white px-4 py-4 md:px-5">
      <div className="flex items-center gap-2.5">
        <span className={clsx('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg [&>svg]:h-[15px] [&>svg]:w-[15px]', iconTones[tone ?? 'default'])}>{icon}</span>
        <p className="text-[13px] font-medium text-slate-500 truncate">{label}</p>
      </div>
      <p className={clsx('mt-3 text-2xl font-semibold leading-none tracking-tight tabular-nums', tone ? valueTones[tone] : 'text-slate-900')}>{value}</p>
      {sub && <div className="mt-1.5 text-xs text-slate-400">{sub}</div>}
    </div>
  );
}

function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2.5 mt-6 flex items-center justify-between first:mt-0">
      <h2 className="text-[13px] font-semibold uppercase tracking-wider text-slate-400">{children}</h2>
      {action}
    </div>
  );
}

export default function Dashboard() {
  const { db, propertyId, paidAmount } = useStore();
  const today = todayISO();

  const rooms = db.rooms.filter(r => r.propertyId === propertyId);
  const reservations = db.reservations.filter(r => r.propertyId === propertyId);
  const sellable = rooms.filter(r => r.status !== 'manutencao' && r.status !== 'bloqueado');

  const m = useMemo(() => {
    const active = reservations.filter(r => REVENUE_STATUSES.includes(r.status));
    const occupiedToday = active.filter(r => r.checkinDate <= today && r.checkoutDate > today && r.status !== 'finalizada');
    const checkinsToday = reservations.filter(r => r.checkinDate === today && ['confirmada', 'pre_reserva', 'hospedado'].includes(r.status));
    const checkoutsToday = reservations.filter(r => r.checkoutDate === today && ['hospedado', 'finalizada'].includes(r.status));
    const pending = reservations.filter(r => r.status === 'pre_reserva');
    const confirmed = reservations.filter(r => r.status === 'confirmada');

    const mStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
    const mEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');
    const monthRes = active.filter(r => overlaps(r.checkinDate, r.checkoutDate, mStart, mEnd));
    const monthRevenue = monthRes.reduce((a, r) => a + r.totalAmount, 0);
    const receivable = active.reduce((a, r) => a + Math.max(0, r.totalAmount - paidAmount(r.id)), 0);
    const cancelled = reservations.filter(r => (r.status === 'cancelada' || r.status === 'no_show') && r.checkinDate >= mStart && r.checkinDate <= mEnd);

    const totalNights = monthRes.reduce((a, r) => a + nightsBetween(r.checkinDate, r.checkoutDate), 0);
    const adr = totalNights > 0 ? monthRevenue / totalNights : 0;
    const daysInMonth = nightsBetween(mStart, mEnd) + 1;
    const occRate = sellable.length > 0 ? totalNights / (sellable.length * daysInMonth) : 0;
    const revpar = sellable.length > 0 ? monthRevenue / (sellable.length * daysInMonth) : 0;
    const avgStay = monthRes.length > 0 ? totalNights / monthRes.length : 0;
    const leadTimes = monthRes.map(r => nightsBetween(r.createdAt.slice(0, 10), r.checkinDate)).filter(n => n >= 0);
    const leadTime = leadTimes.length ? leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length : 0;
    const cancelRate = monthRes.length + cancelled.length > 0 ? cancelled.length / (monthRes.length + cancelled.length) : 0;

    return {
      occupiedToday, checkinsToday, checkoutsToday, pending, confirmed, monthRevenue,
      receivable, cancelled, adr, occRate, revpar, avgStay, leadTime, cancelRate,
    };
  }, [db, propertyId]);

  // Ocupação e faturamento dos últimos 6 meses
  const monthly = useMemo(() => {
    const months = eachMonthOfInterval({ start: subMonths(startOfMonth(new Date()), 5), end: new Date() });
    return months.map(mo => {
      const s = format(startOfMonth(mo), 'yyyy-MM-dd');
      const e = format(endOfMonth(mo), 'yyyy-MM-dd');
      const res = reservations.filter(r => REVENUE_STATUSES.includes(r.status) && overlaps(r.checkinDate, r.checkoutDate, s, e));
      const nights = res.reduce((a, r) => a + nightsBetween(r.checkinDate < s ? s : r.checkinDate, r.checkoutDate > e ? e : r.checkoutDate), 0);
      const days = nightsBetween(s, e) + 1;
      return {
        name: format(mo, 'MMM', { locale: ptBR }),
        receita: res.reduce((a, r) => a + r.totalAmount, 0),
        ocupacao: sellable.length ? Math.round((nights / (sellable.length * days)) * 100) : 0,
      };
    });
  }, [db, propertyId]);

  const byChannel = useMemo(() => {
    const map = new Map<string, number>();
    reservations.filter(r => REVENUE_STATUSES.includes(r.status)).forEach(r => {
      const label = CHANNEL_LABELS[r.channel];
      map.set(label, (map.get(label) ?? 0) + 1);
    });
    return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [db, propertyId]);

  const next7 = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = format(addDays(new Date(), i), 'yyyy-MM-dd');
      const occ = reservations.filter(r => REVENUE_STATUSES.includes(r.status) && r.checkinDate <= d && r.checkoutDate > d).length;
      return { name: fmtDateShort(d), quartos: occ };
    });
  }, [db, propertyId]);

  const dirtyNearCheckin = rooms.filter(r => (r.status === 'sujo' || r.status === 'em_limpeza') &&
    reservations.some(x => x.roomId === r.id && x.checkinDate === today && ['confirmada', 'pre_reserva'].includes(x.status)));

  const occPct = sellable.length ? Math.round((m.occupiedToday.length / sellable.length) * 100) : 0;

  return (
    <div>
      <PageHeader
        title="Visão geral"
        subtitle="Acompanhe a operação de hoje e o desempenho do mês"
        actions={<Link to="/app/reservas?nova=1" className="btn-primary"><Plus size={15} /> Nova reserva</Link>}
      />

      {(dirtyNearCheckin.length > 0 || m.pending.length > 0) && (
        <div className="mb-5 space-y-1.5">
          {dirtyNearCheckin.map(r => (
            <div key={r.id} className="flex items-center gap-2.5 rounded-lg border border-amber-200/70 bg-amber-50/70 px-3.5 py-2.5 text-[13px] text-amber-900">
              <AlertCircle size={15} className="shrink-0 text-amber-500" />
              <span className="flex-1"><span className="font-semibold">{r.name}</span> ainda não está limpo e tem check-in hoje.</span>
              <Link to="/app/governanca" className="font-medium text-amber-800 underline underline-offset-2 hover:text-amber-950">Ver governança</Link>
            </div>
          ))}
          {m.pending.length > 0 && (
            <div className="flex items-center gap-2.5 rounded-lg border border-brand-200/70 bg-brand-50/70 px-3.5 py-2.5 text-[13px] text-brand-900">
              <Hourglass size={15} className="shrink-0 text-brand-500" />
              <span className="flex-1">{m.pending.length} pré-reserva(s) aguardando confirmação.</span>
              <Link to="/app/reservas" className="font-medium text-brand-800 underline underline-offset-2 hover:text-brand-950">Revisar</Link>
            </div>
          )}
        </div>
      )}

      <SectionTitle>Hoje</SectionTitle>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-slate-200/80 bg-slate-100 shadow-card lg:grid-cols-4">
        <Stat
          icon={<Percent />}
          label="Ocupação"
          value={`${occPct}%`}
          sub={
            <div>
              <div className="h-1 w-full max-w-[120px] overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-brand-500" style={{ width: `${occPct}%` }} />
              </div>
              <p className="mt-1.5">{m.occupiedToday.length} de {sellable.length} quartos ocupados</p>
            </div>
          }
        />
        <Stat icon={<LogIn />} label="Check-ins" value={m.checkinsToday.filter(r => r.status !== 'hospedado').length} sub={`${m.checkinsToday.filter(r => r.status === 'hospedado').length} já realizados`} />
        <Stat icon={<LogOut />} label="Check-outs" value={m.checkoutsToday.filter(r => r.status === 'hospedado').length} sub={`${m.checkoutsToday.filter(r => r.status === 'finalizada').length} já realizados`} />
        <Stat icon={<BedDouble />} label="Disponíveis para venda" value={sellable.length - m.occupiedToday.length} sub={`${rooms.length - sellable.length} em manutenção ou bloqueados`} />
      </div>

      <SectionTitle>Desempenho do mês</SectionTitle>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-slate-200/80 bg-slate-100 shadow-card md:grid-cols-4">
        <Stat icon={<Wallet />} label="Receita" value={money(m.monthRevenue)} sub="reservas do período" tone="success" />
        <Stat icon={<Hourglass />} label="A receber" value={money(m.receivable)} sub="saldos pendentes" tone="warn" />
        <Stat icon={<TrendingUp />} label="Diária média" value={money(m.adr)} sub="ADR" />
        <Stat icon={<BarChart3 />} label="RevPAR" value={money(m.revpar)} sub="receita por quarto disponível" />
        <Stat icon={<CalendarCheck />} label="Reservas confirmadas" value={m.confirmed.length} sub={`${m.pending.length} pré-reservas em aberto`} />
        <Stat icon={<Moon />} label="Permanência média" value={`${m.avgStay.toFixed(1)} noites`} sub="por reserva" />
        <Stat icon={<CalendarClock />} label="Antecedência média" value={`${m.leadTime.toFixed(0)} dias`} sub="entre reserva e chegada" />
        <Stat icon={<CalendarX />} label="Cancelamentos" value={m.cancelled.length} sub={`taxa de ${(m.cancelRate * 100).toFixed(0)}% no mês`} tone={m.cancelled.length > 0 ? 'danger' : undefined} />
      </div>

      <SectionTitle>Análise</SectionTitle>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card p-4 lg:col-span-2">
          <p className="text-sm font-semibold text-slate-800">Faturamento e ocupação</p>
          <p className="mb-3 text-xs text-slate-400">Últimos 6 meses</p>
          <ResponsiveContainer width="100%" height={250}>
            <ComposedChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef1f5" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="l" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} domain={[0, 100]} />
              <Tooltip formatter={(v: number, n: string) => n === 'Receita' ? money(v) : `${v}%`} contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(16,24,40,0.08)', fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar yAxisId="l" dataKey="receita" name="Receita" fill="#2b6a73" radius={[5, 5, 0, 0]} maxBarSize={36} />
              <Line yAxisId="r" dataKey="ocupacao" name="Ocupação" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="card p-4">
          <p className="text-sm font-semibold text-slate-800">Reservas por canal</p>
          <p className="mb-1 text-xs text-slate-400">Todas as reservas ativas</p>
          <ResponsiveContainer width="100%" height={190}>
            <PieChart>
              <Pie data={byChannel} dataKey="value" nameKey="name" innerRadius={52} outerRadius={78} paddingAngle={2} strokeWidth={2}>
                {byChannel.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(16,24,40,0.08)', fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 space-y-1">
            {byChannel.slice(0, 5).map((c, i) => (
              <div key={c.name} className="flex items-center gap-2 text-xs text-slate-500">
                <span className="h-2 w-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                <span className="flex-1">{c.name}</span>
                <span className="font-medium tabular-nums text-slate-700">{c.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="card p-4">
          <p className="text-sm font-semibold text-slate-800">Ocupação prevista</p>
          <p className="mb-3 text-xs text-slate-400">Quartos ocupados nos próximos 7 dias</p>
          <ResponsiveContainer width="100%" height={190}>
            <LineChart data={next7}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef1f5" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} domain={[0, rooms.length]} />
              <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(16,24,40,0.08)', fontSize: 12 }} />
              <Line dataKey="quartos" name="Quartos ocupados" stroke="#2b6a73" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5">
            <div>
              <p className="text-sm font-semibold text-slate-800">Movimentação de hoje</p>
              <p className="text-xs text-slate-400">Entradas e saídas previstas</p>
            </div>
            <Link to="/app/recepcao" className="flex items-center gap-1 text-[13px] font-medium text-brand-700 hover:text-brand-800">
              Ir para recepção <ArrowRight size={14} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr><th className="th">Hóspede</th><th className="th">Quarto</th><th className="th">Movimento</th><th className="th">Canal</th><th className="th">Status</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {[...m.checkinsToday.map(r => ({ r, kind: 'Entrada' })), ...m.checkoutsToday.map(r => ({ r, kind: 'Saída' }))].map(({ r, kind }) => {
                  const g = db.guests.find(x => x.id === r.guestId);
                  const room = db.rooms.find(x => x.id === r.roomId);
                  return (
                    <tr key={r.id + kind}>
                      <td className="td font-medium text-slate-800">{g?.name ?? '—'}</td>
                      <td className="td text-slate-500">{room?.name}</td>
                      <td className="td">
                        <span className={clsx('rounded-md px-1.5 py-0.5 text-[11px] font-medium', kind === 'Entrada' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700')}>{kind}</span>
                      </td>
                      <td className="td"><ChannelBadge channel={r.channel} /></td>
                      <td className="td"><StatusBadge status={r.status} /></td>
                    </tr>
                  );
                })}
                {m.checkinsToday.length + m.checkoutsToday.length === 0 && (
                  <tr><td className="td text-slate-400" colSpan={5}>Nenhuma entrada ou saída prevista para hoje.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

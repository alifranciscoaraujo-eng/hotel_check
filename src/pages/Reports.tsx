import { useMemo, useState } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { FileText, Download, Printer } from 'lucide-react';
import { useStore } from '../lib/store';
import { PageHeader } from '../components/ui';
import { exportReportPDF } from '../lib/pdf';
import {
  CHANNEL_COMMISSION, CHANNEL_LABELS, RES_STATUS_LABELS, downloadCSV, fmtDate,
  money, nightsBetween, overlaps,
} from '../lib/utils';

type ReportId = 'reservas' | 'ocupacao' | 'faturamento' | 'canais' | 'hospedes' | 'cancelamentos' | 'governanca' | 'manutencao';

const REPORTS: { id: ReportId; name: string; desc: string }[] = [
  { id: 'reservas', name: 'Reservas por período', desc: 'Todas as reservas com valores, status e canal' },
  { id: 'ocupacao', name: 'Ocupação e desempenho por quarto', desc: 'Noites vendidas e receita por unidade' },
  { id: 'faturamento', name: 'Faturamento', desc: 'Receita por tipo de acomodação' },
  { id: 'canais', name: 'Desempenho por canal', desc: 'Reservas, receita e comissões por origem' },
  { id: 'hospedes', name: 'Hóspedes', desc: 'Base de hóspedes com histórico' },
  { id: 'cancelamentos', name: 'Cancelamentos e no-show', desc: 'Reservas perdidas no período' },
  { id: 'governanca', name: 'Governança', desc: 'Status atual dos quartos e limpezas' },
  { id: 'manutencao', name: 'Manutenção', desc: 'Chamados e custos' },
];

export default function Reports() {
  const { db, propertyId } = useStore();
  const [active, setActive] = useState<ReportId>('reservas');
  const [from, setFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [to, setTo] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  const property = db.properties.find(p => p.id === propertyId)!;
  const period = `Período: ${fmtDate(from)} a ${fmtDate(to)}`;

  const data = useMemo((): { head: string[]; rows: (string | number)[][]; summary: [string, string][] } => {
    const inPeriod = db.reservations.filter(r => r.propertyId === propertyId && overlaps(r.checkinDate, r.checkoutDate, from, to));
    const sold = inPeriod.filter(r => ['confirmada', 'hospedado', 'finalizada'].includes(r.status));

    switch (active) {
      case 'reservas': {
        const rows = inPeriod
          .filter(r => !['manutencao', 'bloqueada'].includes(r.status))
          .sort((a, b) => a.checkinDate.localeCompare(b.checkinDate))
          .map(r => {
            const g = db.guests.find(x => x.id === r.guestId);
            const room = db.rooms.find(x => x.id === r.roomId);
            return [r.code, g?.name ?? '', room?.name ?? '', fmtDate(r.checkinDate), fmtDate(r.checkoutDate),
              nightsBetween(r.checkinDate, r.checkoutDate), CHANNEL_LABELS[r.channel], RES_STATUS_LABELS[r.status], money(r.totalAmount)];
          });
        return {
          head: ['Código', 'Hóspede', 'Quarto', 'Entrada', 'Saída', 'Noites', 'Canal', 'Status', 'Total'],
          rows,
          summary: [['Reservas', String(rows.length)], ['Receita total', money(sold.reduce((a, r) => a + r.totalAmount, 0))]],
        };
      }
      case 'ocupacao': {
        const rows = db.rooms.filter(r => r.propertyId === propertyId).map(room => {
          const res = sold.filter(r => r.roomId === room.id);
          const nights = res.reduce((a, r) => a + nightsBetween(r.checkinDate, r.checkoutDate), 0);
          const revenue = res.reduce((a, r) => a + r.totalAmount, 0);
          const days = nightsBetween(from, to) + 1;
          return [room.name, res.length, nights, `${Math.round((nights / days) * 100)}%`, money(revenue)];
        });
        return { head: ['Quarto', 'Reservas', 'Noites vendidas', 'Ocupação', 'Receita'], rows, summary: [] };
      }
      case 'faturamento': {
        const rows = db.roomTypes.filter(t => t.propertyId === propertyId).map(t => {
          const res = sold.filter(r => r.roomTypeId === t.id);
          const nights = res.reduce((a, r) => a + nightsBetween(r.checkinDate, r.checkoutDate), 0);
          const revenue = res.reduce((a, r) => a + r.totalAmount, 0);
          return [t.name, res.length, nights, money(nights ? revenue / nights : 0), money(revenue)];
        });
        return {
          head: ['Tipo de acomodação', 'Reservas', 'Noites', 'Diária média', 'Receita'],
          rows,
          summary: [['Receita total', money(sold.reduce((a, r) => a + r.totalAmount, 0))]],
        };
      }
      case 'canais': {
        const map = new Map<string, { count: number; revenue: number }>();
        sold.forEach(r => {
          const cur = map.get(r.channel) ?? { count: 0, revenue: 0 };
          cur.count++; cur.revenue += r.totalAmount;
          map.set(r.channel, cur);
        });
        const rows = [...map.entries()].sort((a, b) => b[1].revenue - a[1].revenue).map(([ch, v]) => {
          const rate = CHANNEL_COMMISSION[ch as keyof typeof CHANNEL_COMMISSION] ?? 0;
          return [CHANNEL_LABELS[ch as keyof typeof CHANNEL_LABELS], v.count, money(v.revenue), `${(rate * 100).toFixed(0)}%`, money(v.revenue * rate), money(v.revenue * (1 - rate))];
        });
        return { head: ['Canal', 'Reservas', 'Receita', 'Comissão %', 'Comissão R$', 'Líquido'], rows, summary: [] };
      }
      case 'hospedes': {
        const rows = db.guests.filter(g => g.propertyId === propertyId).map(g => {
          const stays = db.reservations.filter(r => r.guestId === g.id && ['confirmada', 'hospedado', 'finalizada'].includes(r.status));
          return [g.name + (g.vip ? ' ⭐' : ''), g.phone, g.email, `${g.city}/${g.state}`, stays.length, money(stays.reduce((a, r) => a + r.totalAmount, 0))];
        });
        return { head: ['Nome', 'Telefone', 'E-mail', 'Cidade', 'Hospedagens', 'Total gasto'], rows, summary: [['Hóspedes cadastrados', String(rows.length)]] };
      }
      case 'cancelamentos': {
        const rows = inPeriod.filter(r => ['cancelada', 'no_show'].includes(r.status)).map(r => {
          const g = db.guests.find(x => x.id === r.guestId);
          return [r.code, g?.name ?? '', fmtDate(r.checkinDate), CHANNEL_LABELS[r.channel], RES_STATUS_LABELS[r.status], money(r.totalAmount)];
        });
        return { head: ['Código', 'Hóspede', 'Check-in previsto', 'Canal', 'Status', 'Valor perdido'], rows, summary: [['Receita perdida', money(inPeriod.filter(r => ['cancelada', 'no_show'].includes(r.status)).reduce((a, r) => a + r.totalAmount, 0))]] };
      }
      case 'governanca': {
        const rows = db.rooms.filter(r => r.propertyId === propertyId).map(r => {
          const rt = db.roomTypes.find(t => t.id === r.roomTypeId);
          return [r.name, rt?.name ?? '', r.status, r.lastCleanedAt ? fmtDate(r.lastCleanedAt) : '—', r.notes];
        });
        return { head: ['Quarto', 'Tipo', 'Status', 'Última limpeza', 'Observações'], rows, summary: [] };
      }
      case 'manutencao': {
        const rows = db.maintenanceTickets.filter(t => t.propertyId === propertyId).map(t => {
          const room = db.rooms.find(r => r.id === t.roomId);
          return [room?.name ?? '', t.title, t.priority, t.status, fmtDate(t.openedAt), money(t.estimatedCost), money(t.finalCost)];
        });
        return { head: ['Quarto', 'Problema', 'Prioridade', 'Status', 'Abertura', 'Custo est.', 'Custo real'], rows, summary: [['Custo estimado total', money(db.maintenanceTickets.filter(t => t.propertyId === propertyId).reduce((a, t) => a + t.estimatedCost, 0))]] };
      }
    }
  }, [db, propertyId, active, from, to]);

  const reportName = REPORTS.find(r => r.id === active)!.name;

  return (
    <div>
      <PageHeader title="Relatórios" subtitle="Visualize na tela, exporte em PDF ou CSV"
        actions={
          <div className="flex items-center gap-2">
            <input type="date" className="input !w-auto" value={from} onChange={e => setFrom(e.target.value)} />
            <span className="text-slate-400">→</span>
            <input type="date" className="input !w-auto" value={to} onChange={e => setTo(e.target.value)} />
          </div>
        } />

      <div className="grid gap-4 lg:grid-cols-4">
        <div className="card p-2 lg:col-span-1 h-fit">
          {REPORTS.map(r => (
            <button key={r.id} onClick={() => setActive(r.id)}
              className={`w-full rounded-lg px-3 py-2.5 text-left transition-colors ${active === r.id ? 'bg-brand-600 text-white' : 'hover:bg-slate-50'}`}>
              <p className="text-sm font-semibold">{r.name}</p>
              <p className={`text-xs ${active === r.id ? 'text-white/70' : 'text-slate-400'}`}>{r.desc}</p>
            </button>
          ))}
        </div>

        <div className="card lg:col-span-3 h-fit">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 p-4">
            <div>
              <p className="font-display font-bold">{reportName}</p>
              <p className="text-xs text-slate-500">{period}</p>
            </div>
            <div className="flex gap-2">
              <button className="btn-secondary" onClick={() => exportReportPDF(property, reportName, period, data.head, data.rows, data.summary)}><FileText size={15} /> PDF</button>
              <button className="btn-secondary" onClick={() => downloadCSV(`${active}.csv`, data.head, data.rows)}><Download size={15} /> CSV</button>
              <button className="btn-secondary" onClick={() => window.print()}><Printer size={15} /> Imprimir</button>
            </div>
          </div>
          {data.summary.length > 0 && (
            <div className="flex flex-wrap gap-6 border-b border-slate-100 px-4 py-3">
              {data.summary.map(([k, v]) => (
                <div key={k}><p className="label">{k}</p><p className="font-display font-bold text-lg">{v}</p></div>
              ))}
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50"><tr>{data.head.map(h => <th key={h} className="th">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100">
                {data.rows.map((row, i) => (
                  <tr key={i}>{row.map((c, j) => <td key={j} className="td">{c}</td>)}</tr>
                ))}
                {data.rows.length === 0 && <tr><td colSpan={data.head.length} className="td text-slate-500">Sem dados para o período selecionado.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

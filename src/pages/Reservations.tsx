import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Download } from 'lucide-react';
import { useStore } from '../lib/store';
import { ChannelBadge, EmptyState, PageHeader, StatusBadge } from '../components/ui';
import { ReservationDetailModal, ReservationFormModal } from '../components/ReservationModal';
import type { Reservation, ReservationStatus } from '../lib/types';
import { CHANNEL_LABELS, RES_STATUS_LABELS, downloadCSV, fmtDate, money, nightsBetween } from '../lib/utils';

export default function Reservations() {
  const { db, propertyId, paidAmount } = useStore();
  const [params, setParams] = useSearchParams();
  const [formOpen, setFormOpen] = useState(params.get('nova') === '1');
  const [editRes, setEditRes] = useState<Reservation | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [channel, setChannel] = useState('');

  const list = useMemo(() => {
    return db.reservations
      .filter(r => r.propertyId === propertyId && r.status !== 'manutencao')
      .filter(r => !status || r.status === status)
      .filter(r => !channel || r.channel === channel)
      .filter(r => {
        if (!search) return true;
        const g = db.guests.find(x => x.id === r.guestId);
        const q = search.toLowerCase();
        return r.code.toLowerCase().includes(q) || (g?.name.toLowerCase().includes(q) ?? false);
      })
      .sort((a, b) => b.checkinDate.localeCompare(a.checkinDate));
  }, [db, propertyId, search, status, channel]);

  const exportCsv = () => {
    downloadCSV('reservas.csv',
      ['Código', 'Hóspede', 'Quarto', 'Canal', 'Status', 'Check-in', 'Check-out', 'Diárias', 'Total', 'Pago', 'Saldo'],
      list.map(r => {
        const g = db.guests.find(x => x.id === r.guestId);
        const room = db.rooms.find(x => x.id === r.roomId);
        const paid = paidAmount(r.id);
        return [r.code, g?.name ?? '', room?.name ?? '', CHANNEL_LABELS[r.channel], RES_STATUS_LABELS[r.status],
          fmtDate(r.checkinDate), fmtDate(r.checkoutDate), nightsBetween(r.checkinDate, r.checkoutDate),
          r.totalAmount.toFixed(2), paid.toFixed(2), (r.totalAmount - paid).toFixed(2)];
      }));
  };

  return (
    <div>
      <PageHeader title="Reservas" subtitle={`${list.length} reserva(s) encontrada(s)`}
        actions={
          <>
            <button className="btn-secondary" onClick={exportCsv}><Download size={16} /> CSV</button>
            <button className="btn-primary" onClick={() => { setEditRes(null); setFormOpen(true); setParams({}); }}><Plus size={16} /> Nova reserva</button>
          </>
        } />

      <div className="card mb-4 flex flex-wrap gap-2 p-3">
        <input className="input !w-60" placeholder="Buscar por código ou hóspede…" value={search} onChange={e => setSearch(e.target.value)} />
        <select className="input !w-44" value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">Todos os status</option>
          {(Object.keys(RES_STATUS_LABELS) as ReservationStatus[]).filter(s => s !== 'manutencao').map(s => <option key={s} value={s}>{RES_STATUS_LABELS[s]}</option>)}
        </select>
        <select className="input !w-44" value={channel} onChange={e => setChannel(e.target.value)}>
          <option value="">Todos os canais</option>
          {Object.entries(CHANNEL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {list.length === 0 ? (
        <EmptyState title="Nenhuma reserva encontrada" message="Ajuste os filtros ou crie uma nova reserva." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">Código</th><th className="th">Hóspede</th><th className="th">Quarto</th>
                <th className="th">Período</th><th className="th">Canal</th><th className="th">Status</th>
                <th className="th text-right">Total</th><th className="th text-right">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.map(r => {
                const g = db.guests.find(x => x.id === r.guestId);
                const room = db.rooms.find(x => x.id === r.roomId);
                const balance = r.totalAmount - paidAmount(r.id);
                return (
                  <tr key={r.id} className="cursor-pointer hover:bg-slate-50" onClick={() => setDetailId(r.id)}>
                    <td className="td font-mono text-xs font-semibold text-slate-500">{r.code}</td>
                    <td className="td font-medium">{r.status === 'bloqueada' ? <span className="italic text-slate-400">Bloqueio</span> : <>{g?.name}{g?.vip && ' ⭐'}</>}</td>
                    <td className="td">{room?.name}</td>
                    <td className="td whitespace-nowrap">{fmtDate(r.checkinDate)} → {fmtDate(r.checkoutDate)}</td>
                    <td className="td"><ChannelBadge channel={r.channel} /></td>
                    <td className="td"><StatusBadge status={r.status} /></td>
                    <td className="td text-right font-semibold">{money(r.totalAmount)}</td>
                    <td className={`td text-right font-semibold ${balance > 0 && !['cancelada', 'bloqueada'].includes(r.status) ? 'text-rose-600' : 'text-emerald-700'}`}>
                      {['cancelada', 'bloqueada'].includes(r.status) ? '—' : money(balance)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ReservationFormModal open={formOpen} onClose={() => setFormOpen(false)} reservation={editRes} />
      <ReservationDetailModal open={!!detailId} onClose={() => setDetailId(null)} reservationId={detailId}
        onEdit={r => { setEditRes(r); setFormOpen(true); }} />
    </div>
  );
}

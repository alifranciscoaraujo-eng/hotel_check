import { useState } from 'react';
import clsx from 'clsx';
import { DoorOpen, DoorClosed, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useStore } from '../lib/store';
import { ChannelBadge, EmptyState, PageHeader, StatusBadge } from '../components/ui';
import { ReservationDetailModal, ReservationFormModal } from '../components/ReservationModal';
import type { Reservation } from '../lib/types';
import { fmtDate, money, todayISO } from '../lib/utils';

export default function FrontDesk() {
  const { db, propertyId, paidAmount, doCheckin, doCheckout } = useStore();
  const [tab, setTab] = useState<'in' | 'out'>('in');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [editRes, setEditRes] = useState<Reservation | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const today = todayISO();

  // Entradas: reservas com chegada prevista até hoje ainda não hospedadas + as que já entraram hoje
  const arrivals = db.reservations
    .filter(r => r.propertyId === propertyId && r.checkoutDate > today && (
      (['confirmada', 'pre_reserva'].includes(r.status) && r.checkinDate <= today) ||
      (r.status === 'hospedado' && r.checkinDate === today)
    ))
    .sort((a, b) => (a.status === 'hospedado' ? 1 : 0) - (b.status === 'hospedado' ? 1 : 0) || (a.arrivalTime || '99').localeCompare(b.arrivalTime || '99'));

  const departures = db.reservations
    .filter(r => r.propertyId === propertyId && r.checkoutDate === today && ['hospedado', 'finalizada'].includes(r.status))
    .sort((a, b) => (a.status === 'finalizada' ? 1 : 0) - (b.status === 'finalizada' ? 1 : 0));

  const list = tab === 'in' ? arrivals : departures;

  return (
    <div>
      <PageHeader title="Recepção" subtitle={`Movimentação de hoje — ${fmtDate(today)}`} />

      <div className="mb-4 flex gap-2">
        <button onClick={() => setTab('in')} className={clsx('btn flex-1 sm:flex-none sm:px-8', tab === 'in' ? 'bg-brand-600 text-white' : 'bg-white border border-slate-300 text-slate-600')}>
          <DoorOpen size={17} /> Check-ins ({arrivals.filter(r => r.status !== 'hospedado').length})
        </button>
        <button onClick={() => setTab('out')} className={clsx('btn flex-1 sm:flex-none sm:px-8', tab === 'out' ? 'bg-brand-600 text-white' : 'bg-white border border-slate-300 text-slate-600')}>
          <DoorClosed size={17} /> Check-outs ({departures.filter(r => r.status === 'hospedado').length})
        </button>
      </div>

      {list.length === 0 ? (
        <EmptyState title={tab === 'in' ? 'Nenhuma entrada pendente' : 'Nenhuma saída pendente'} message="Tudo em dia por aqui." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {list.map(r => {
            const g = db.guests.find(x => x.id === r.guestId);
            const room = db.rooms.find(x => x.id === r.roomId);
            const rt = db.roomTypes.find(t => t.id === r.roomTypeId);
            const paid = paidAmount(r.id);
            const balance = r.totalAmount - paid;
            const done = tab === 'in' ? r.status === 'hospedado' : r.status === 'finalizada';
            const roomNotReady = tab === 'in' && room && ['sujo', 'em_limpeza', 'manutencao'].includes(room.status);
            return (
              <div key={r.id} className={clsx('card p-4', done && 'opacity-60')}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{g?.name ?? '—'}{g?.vip && ' ⭐'}</p>
                    <p className="text-sm text-slate-500">{room?.name} · {rt?.name}</p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div><p className="label">Período</p><p>{fmtDate(r.checkinDate)} → {fmtDate(r.checkoutDate)}</p></div>
                  <div><p className="label">{tab === 'in' ? 'Chegada prevista' : 'Ocupantes'}</p><p>{tab === 'in' ? (r.arrivalTime || 'Não informada') : `${r.adults} ad. ${r.children} cri.`}</p></div>
                  <div><p className="label">Canal</p><ChannelBadge channel={r.channel} /></div>
                  <div>
                    <p className="label">Saldo</p>
                    <p className={clsx('font-semibold', balance > 0 ? 'text-rose-600' : 'text-emerald-700')}>{money(balance)}</p>
                  </div>
                </div>
                {roomNotReady && (
                  <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1.5 text-xs font-semibold text-amber-800">
                    <AlertCircle size={14} /> Quarto ainda não está pronto ({room?.status === 'manutencao' ? 'manutenção' : 'limpeza pendente'})
                  </div>
                )}
                {balance > 0 && tab === 'out' && (
                  <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-rose-50 border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-700">
                    <AlertCircle size={14} /> Receber {money(balance)} antes de finalizar
                  </div>
                )}
                <div className="mt-4 flex gap-2">
                  {done ? (
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600"><CheckCircle2 size={16} /> {tab === 'in' ? 'Check-in realizado' : 'Check-out realizado'}</span>
                  ) : (
                    <>
                      <button className="btn-primary flex-1" onClick={() => (tab === 'in' ? doCheckin(r.id) : doCheckout(r.id))}>
                        {tab === 'in' ? <><DoorOpen size={15} /> Fazer check-in</> : <><DoorClosed size={15} /> Fazer check-out</>}
                      </button>
                      <button className="btn-secondary" onClick={() => setDetailId(r.id)}>Detalhes</button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ReservationDetailModal open={!!detailId} onClose={() => setDetailId(null)} reservationId={detailId}
        onEdit={r => { setEditRes(r); setFormOpen(true); }} />
      <ReservationFormModal open={formOpen} onClose={() => setFormOpen(false)} reservation={editRes} />
    </div>
  );
}

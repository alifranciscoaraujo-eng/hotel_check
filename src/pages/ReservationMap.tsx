import { useMemo, useState } from 'react';
import { addDays, format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useStore } from '../lib/store';
import { PageHeader } from '../components/ui';
import { ReservationDetailModal, ReservationFormModal } from '../components/ReservationModal';
import type { Reservation, ReservationStatus } from '../lib/types';
import { RES_BLOCK_COLORS, RES_STATUS_LABELS, iso, todayISO } from '../lib/utils';

const VISIBLE_STATUSES: ReservationStatus[] = ['pre_reserva', 'confirmada', 'hospedado', 'bloqueada', 'manutencao'];
const CELL_W = 52; // px por dia
const LABEL_W = 148;

export default function ReservationMap() {
  const { db, propertyId } = useStore();
  const [start, setStart] = useState(() => subDays(new Date(), 2));
  const [span, setSpan] = useState<7 | 14 | 30>(14);
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editRes, setEditRes] = useState<Reservation | null>(null);
  const [defaults, setDefaults] = useState<{ roomId?: string; checkinDate?: string }>();

  const days = useMemo(() => Array.from({ length: span }, (_, i) => addDays(start, i)), [start, span]);
  const startISO = iso(days[0]);
  const endISO = iso(addDays(days[span - 1], 1));
  const today = todayISO();

  const roomTypes = db.roomTypes.filter(t => t.propertyId === propertyId);
  const rooms = db.rooms
    .filter(r => r.propertyId === propertyId && (!typeFilter || r.roomTypeId === typeFilter))
    .sort((a, b) => a.name.localeCompare(b.name));

  const visibleRes = db.reservations.filter(r => {
    if (r.propertyId !== propertyId || !VISIBLE_STATUSES.includes(r.status)) return false;
    if (statusFilter && r.status !== statusFilter) return false;
    if (r.checkoutDate <= startISO || r.checkinDate >= endISO) return false;
    if (search) {
      const g = db.guests.find(x => x.id === r.guestId);
      const q = search.toLowerCase();
      if (!g?.name.toLowerCase().includes(q) && !r.code.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const openNew = (roomId?: string, date?: string) => {
    setEditRes(null);
    setDefaults({ roomId, checkinDate: date });
    setFormOpen(true);
  };

  return (
    <div>
      <PageHeader
        title="Mapa de reservas"
        subtitle="Clique em uma célula vazia para criar reserva ou bloqueio"
        actions={
          <>
            <button className="btn-secondary" onClick={() => setStart(subDays(new Date(), 2))}>Hoje</button>
            <button className="btn-secondary !px-2.5" onClick={() => setStart(s => subDays(s, span))}><ChevronLeft size={17} /></button>
            <button className="btn-secondary !px-2.5" onClick={() => setStart(s => addDays(s, span))}><ChevronRight size={17} /></button>
            <button className="btn-primary" onClick={() => openNew()}><Plus size={16} /> Nova reserva</button>
          </>
        }
      />

      <div className="card mb-4 flex flex-wrap items-center gap-2 p-3">
        <input className="input !w-56" placeholder="Buscar hóspede ou código…" value={search} onChange={e => setSearch(e.target.value)} />
        <select className="input !w-52" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="">Todos os tipos</option>
          {roomTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select className="input !w-44" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">Todos os status</option>
          {VISIBLE_STATUSES.map(s => <option key={s} value={s}>{RES_STATUS_LABELS[s]}</option>)}
        </select>
        <div className="ml-auto flex rounded-lg border border-slate-300 overflow-hidden">
          {([7, 14, 30] as const).map(n => (
            <button key={n} onClick={() => setSpan(n)}
              className={clsx('px-3 py-1.5 text-sm font-semibold', span === n ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50')}>
              {n}d
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-x-auto">
        <div style={{ minWidth: LABEL_W + span * CELL_W }}>
          {/* Cabeçalho de dias */}
          <div className="flex border-b border-slate-200 bg-slate-50 sticky top-0">
            <div className="shrink-0 px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-500" style={{ width: LABEL_W }}>Quarto</div>
            {days.map(d => {
              const dISO = iso(d);
              const weekend = [0, 6].includes(d.getDay());
              return (
                <div key={dISO} style={{ width: CELL_W }}
                  className={clsx('shrink-0 border-l border-slate-200 py-1.5 text-center', dISO === today ? 'bg-brand-100' : weekend ? 'bg-amber-50' : '')}>
                  <p className="text-[10px] uppercase text-slate-400">{format(d, 'EEE', { locale: ptBR }).slice(0, 3)}</p>
                  <p className={clsx('text-sm font-bold', dISO === today ? 'text-brand-700' : 'text-slate-700')}>{format(d, 'dd')}</p>
                </div>
              );
            })}
          </div>

          {/* Linhas por quarto */}
          {rooms.map(room => {
            const rt = roomTypes.find(t => t.id === room.roomTypeId);
            const resRoom = visibleRes.filter(r => r.roomId === room.id);
            return (
              <div key={room.id} className="relative flex border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                <div className="shrink-0 px-3 py-2" style={{ width: LABEL_W }}>
                  <p className="text-sm font-semibold text-slate-800 truncate">{room.name}</p>
                  <p className="text-[11px] text-slate-400 truncate">{rt?.name}</p>
                </div>
                {days.map(d => {
                  const dISO = iso(d);
                  return (
                    <button key={dISO} style={{ width: CELL_W }}
                      className={clsx('h-[52px] shrink-0 border-l border-slate-100', dISO === today && 'bg-brand-50/60')}
                      onClick={() => openNew(room.id, dISO)}
                      title={`Criar reserva em ${room.name} — ${format(d, 'dd/MM')}`}
                    />
                  );
                })}
                {/* Blocos de reserva sobrepostos */}
                {resRoom.map(r => {
                  const from = Math.max(0, (new Date(r.checkinDate + 'T12:00').getTime() - new Date(iso(days[0]) + 'T12:00').getTime()) / 86400000);
                  const to = Math.min(span, (new Date(r.checkoutDate + 'T12:00').getTime() - new Date(iso(days[0]) + 'T12:00').getTime()) / 86400000);
                  const width = (to - from) * CELL_W - 6;
                  if (width <= 0) return null;
                  const guest = db.guests.find(g => g.id === r.guestId);
                  const label = r.status === 'bloqueada' ? 'Bloqueado' : r.status === 'manutencao' ? 'Manutenção' : guest?.name ?? r.code;
                  return (
                    <button key={r.id}
                      onClick={() => setDetailId(r.id)}
                      className={clsx('absolute top-2 z-10 flex h-9 items-center overflow-hidden rounded-lg px-2 text-xs font-semibold shadow-sm transition-colors', RES_BLOCK_COLORS[r.status])}
                      style={{ left: LABEL_W + from * CELL_W + 3 + CELL_W / 2, width: width }}
                      title={`${label} · ${RES_STATUS_LABELS[r.status]} · ${r.checkinDate} → ${r.checkoutDate}`}
                    >
                      <span className="truncate">{label}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-600">
        {VISIBLE_STATUSES.concat('finalizada').map(s => (
          <span key={s} className="flex items-center gap-1.5">
            <span className={clsx('h-3 w-4 rounded', RES_BLOCK_COLORS[s].split(' ')[0])} />
            {RES_STATUS_LABELS[s]}
          </span>
        ))}
      </div>

      <ReservationFormModal open={formOpen} onClose={() => setFormOpen(false)} reservation={editRes} defaults={defaults} />
      <ReservationDetailModal open={!!detailId} onClose={() => setDetailId(null)} reservationId={detailId}
        onEdit={r => { setEditRes(r); setDefaults(undefined); setFormOpen(true); }} />
    </div>
  );
}

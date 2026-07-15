import { useState } from 'react';
import clsx from 'clsx';
import { Sparkles, Wrench, CheckCircle2 } from 'lucide-react';
import { useStore } from '../lib/store';
import { Field, Modal, PageHeader, RoomBadge, StatusBadge } from '../components/ui';
import type { RoomStatus } from '../lib/types';
import { ROOM_STATUS_LABELS, fmtDate, todayISO } from '../lib/utils';

const QUICK_ACTIONS: { from: RoomStatus[]; to: RoomStatus; label: string }[] = [
  { from: ['sujo'], to: 'em_limpeza', label: 'Iniciar limpeza' },
  { from: ['em_limpeza'], to: 'limpo', label: 'Concluir limpeza' },
  { from: ['limpo'], to: 'vistoriado', label: 'Marcar vistoriado' },
  { from: ['limpo', 'vistoriado'], to: 'disponivel', label: 'Liberar para venda' },
];

export default function Housekeeping() {
  const { db, propertyId, setRoomStatus, saveMaintenance, currentUser } = useStore();
  const [filter, setFilter] = useState<'todos' | 'pendentes'>('pendentes');
  const [maintFor, setMaintFor] = useState<string | null>(null);
  const [maint, setMaint] = useState({ title: '', description: '', priority: 'media' as const });
  const today = todayISO();

  const rooms = db.rooms
    .filter(r => r.propertyId === propertyId)
    .filter(r => filter === 'todos' || ['sujo', 'em_limpeza', 'manutencao'].includes(r.status))
    .sort((a, b) => a.name.localeCompare(b.name));

  const currentGuest = (roomId: string) => {
    const r = db.reservations.find(x => x.roomId === roomId && x.status === 'hospedado');
    return r ? db.guests.find(g => g.id === r.guestId)?.name : null;
  };
  const nextArrival = (roomId: string) => {
    const r = db.reservations
      .filter(x => x.roomId === roomId && ['confirmada', 'pre_reserva'].includes(x.status) && x.checkinDate >= today)
      .sort((a, b) => a.checkinDate.localeCompare(b.checkinDate))[0];
    return r?.checkinDate ?? null;
  };

  const pendingCount = db.rooms.filter(r => r.propertyId === propertyId && ['sujo', 'em_limpeza'].includes(r.status)).length;

  return (
    <div>
      <PageHeader title="Governança" subtitle={`${pendingCount} quarto(s) aguardando limpeza`}
        actions={
          <div className="flex rounded-lg border border-slate-300 overflow-hidden">
            {(['pendentes', 'todos'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={clsx('px-4 py-1.5 text-sm font-semibold capitalize', filter === f ? 'bg-brand-600 text-white' : 'bg-white text-slate-600')}>
                {f}
              </button>
            ))}
          </div>
        } />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {rooms.map(room => {
          const rt = db.roomTypes.find(t => t.id === room.roomTypeId);
          const guest = currentGuest(room.id);
          const next = nextArrival(room.id);
          const urgent = next === today && ['sujo', 'em_limpeza'].includes(room.status);
          const actions = QUICK_ACTIONS.filter(a => a.from.includes(room.status));
          return (
            <div key={room.id} className={clsx('card p-4', urgent && 'ring-2 ring-rose-400')}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{room.name}</p>
                  <p className="text-xs text-slate-500">{rt?.name} · {room.floor}</p>
                </div>
                <RoomBadge status={room.status} />
              </div>
              <div className="mt-3 space-y-1 text-sm text-slate-600">
                {guest && <p>Hóspede atual: <b>{guest}</b></p>}
                <p>Próxima entrada: <b className={urgent ? 'text-rose-600' : ''}>{next ? fmtDate(next) : '—'}{urgent && ' (HOJE!)'}</b></p>
                <p>Última limpeza: <b>{room.lastCleanedAt ? fmtDate(room.lastCleanedAt) : '—'}</b></p>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {actions.map(a => (
                  <button key={a.to} className="btn-primary !px-3 !py-1.5 !text-xs" onClick={() => setRoomStatus(room.id, a.to)}>
                    {a.to === 'disponivel' ? <CheckCircle2 size={13} /> : <Sparkles size={13} />} {a.label}
                  </button>
                ))}
                {room.status !== 'manutencao' && (
                  <button className="btn-secondary !px-3 !py-1.5 !text-xs" onClick={() => { setMaintFor(room.id); setMaint({ title: '', description: '', priority: 'media' }); }}>
                    <Wrench size={13} /> Reportar problema
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {rooms.length === 0 && (
          <div className="card col-span-full py-12 text-center text-slate-500">
            <Sparkles className="mx-auto mb-2 text-emerald-400" size={26} />
            Nenhum quarto pendente de limpeza. Bom trabalho!
          </div>
        )}
      </div>

      <Modal open={!!maintFor} onClose={() => setMaintFor(null)} title="Reportar problema de manutenção">
        <form className="space-y-3" onSubmit={e => {
          e.preventDefault();
          if (!maintFor || !maint.title.trim()) return;
          saveMaintenance({ roomId: maintFor, title: maint.title, description: maint.description, priority: maint.priority, assignedTo: '', openedAt: today, dueDate: today });
          setMaintFor(null);
        }}>
          <Field label="Problema *"><input className="input" value={maint.title} onChange={e => setMaint({ ...maint, title: e.target.value })} placeholder="Ex.: chuveiro sem água quente" required /></Field>
          <Field label="Detalhes"><textarea className="input" rows={3} value={maint.description} onChange={e => setMaint({ ...maint, description: e.target.value })} /></Field>
          <Field label="Prioridade">
            <select className="input" value={maint.priority} onChange={e => setMaint({ ...maint, priority: e.target.value as typeof maint.priority })}>
              <option value="baixa">Baixa</option><option value="media">Média</option><option value="alta">Alta (bloqueia o quarto)</option><option value="urgente">Urgente (bloqueia o quarto)</option>
            </select>
          </Field>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setMaintFor(null)}>Cancelar</button>
            <button type="submit" className="btn-primary">Abrir chamado</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

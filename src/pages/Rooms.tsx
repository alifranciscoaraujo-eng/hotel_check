import { useState } from 'react';
import clsx from 'clsx';
import { BedDouble, Layers, Pencil, Plus, Trash2 } from 'lucide-react';
import { useStore } from '../lib/store';
import { ConfirmDialog, Field, Modal, PageHeader, RoomBadge } from '../components/ui';
import type { Room, RoomType, RoomStatus } from '../lib/types';
import { ROOM_STATUS_LABELS, money } from '../lib/utils';

export default function Rooms() {
  const { db, propertyId, saveRoom, deleteRoom, saveRoomType, can } = useStore();
  const [tab, setTab] = useState<'rooms' | 'types'>('rooms');
  const [roomForm, setRoomForm] = useState<Partial<Room> | null>(null);
  const [typeForm, setTypeForm] = useState<Partial<RoomType> | null>(null);
  const [delRoom, setDelRoom] = useState<Room | null>(null);
  const [error, setError] = useState('');

  const rooms = db.rooms.filter(r => r.propertyId === propertyId).sort((a, b) => a.name.localeCompare(b.name));
  const types = db.roomTypes.filter(t => t.propertyId === propertyId);
  const canEdit = can('configuracoes') || can('tarifas');

  return (
    <div>
      <PageHeader title="Quartos e acomodações" subtitle={`${rooms.length} unidades · ${types.length} tipos`}
        actions={canEdit && (tab === 'rooms'
          ? <button className="btn-primary" onClick={() => setRoomForm({ roomTypeId: types[0]?.id })}><Plus size={16} /> Novo quarto</button>
          : <button className="btn-primary" onClick={() => setTypeForm({ amenities: [] })}><Plus size={16} /> Novo tipo</button>)} />

      <div className="mb-4 flex gap-2">
        <button onClick={() => setTab('rooms')} className={clsx('btn', tab === 'rooms' ? 'bg-brand-600 text-white' : 'bg-white border border-slate-300 text-slate-600')}><BedDouble size={16} /> Quartos</button>
        <button onClick={() => setTab('types')} className={clsx('btn', tab === 'types' ? 'bg-brand-600 text-white' : 'bg-white border border-slate-300 text-slate-600')}><Layers size={16} /> Tipos de acomodação</button>
      </div>

      {error && <div className="mb-3 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}

      {tab === 'rooms' ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rooms.map(r => {
            const rt = types.find(t => t.id === r.roomTypeId);
            return (
              <div key={r.id} className="card p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{r.name}</p>
                    <p className="text-[13px] text-slate-400">{rt?.name}</p>
                  </div>
                  <RoomBadge status={r.status} />
                </div>
                <div className="mt-3 space-y-1 text-sm text-slate-600">
                  <p>Localização: <b>{r.floor || '—'}</b></p>
                  <p>Capacidade: <b>{rt ? `${rt.capacityAdults} ad. + ${rt.capacityChildren} cri.` : '—'}</b></p>
                  <p>Diária base: <b>{rt ? money(rt.basePrice) : '—'}</b></p>
                </div>
                {r.notes && <p className="mt-2 rounded bg-slate-50 px-2 py-1 text-xs text-slate-500">{r.notes}</p>}
                {canEdit && (
                  <div className="mt-3 flex justify-end gap-1">
                    <button className="btn-ghost !p-2" onClick={() => setRoomForm(r)}><Pencil size={15} /></button>
                    <button className="btn-ghost !p-2 text-rose-500 hover:bg-rose-50" onClick={() => setDelRoom(r)}><Trash2 size={15} /></button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {types.map(t => (
            <div key={t.id} className="card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[15px] font-semibold text-slate-900">{t.name}</p>
                  <p className="mt-1 text-sm text-slate-500">{t.description}</p>
                </div>
                {canEdit && <button className="btn-ghost !p-2" onClick={() => setTypeForm(t)}><Pencil size={15} /></button>}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                <div><p className="label">Diária</p><p className="font-bold">{money(t.basePrice)}</p></div>
                <div><p className="label">Fim de semana</p><p className="font-bold">{money(t.weekendPrice)}</p></div>
                <div><p className="label">Capacidade</p><p className="font-bold">{t.capacityAdults}+{t.capacityChildren}</p></div>
                <div><p className="label">Hósp. extra</p><p className="font-bold">{money(t.extraGuestFee)}</p></div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {t.amenities.map(a => <span key={a} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600">{a}</span>)}
              </div>
              <p className="mt-3 text-xs text-slate-400">{rooms.filter(r => r.roomTypeId === t.id).length} quarto(s) deste tipo</p>
            </div>
          ))}
        </div>
      )}

      {/* Form quarto */}
      <Modal open={!!roomForm} onClose={() => setRoomForm(null)} title={roomForm?.id ? 'Editar quarto' : 'Novo quarto'}>
        {roomForm && (
          <form className="space-y-3" onSubmit={e => { e.preventDefault(); if (!roomForm.name?.trim()) return; saveRoom(roomForm); setRoomForm(null); }}>
            <Field label="Nome / número *"><input className="input" value={roomForm.name ?? ''} onChange={e => setRoomForm({ ...roomForm, name: e.target.value })} required /></Field>
            <Field label="Tipo de acomodação">
              <select className="input" value={roomForm.roomTypeId ?? ''} onChange={e => setRoomForm({ ...roomForm, roomTypeId: e.target.value })}>
                {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </Field>
            <Field label="Andar / bloco"><input className="input" value={roomForm.floor ?? ''} onChange={e => setRoomForm({ ...roomForm, floor: e.target.value })} placeholder="Ex.: Térreo, 1º andar, Jardim" /></Field>
            <Field label="Status">
              <select className="input" value={roomForm.status ?? 'disponivel'} onChange={e => setRoomForm({ ...roomForm, status: e.target.value as RoomStatus })}>
                {Object.entries(ROOM_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <Field label="Observações"><textarea className="input" rows={2} value={roomForm.notes ?? ''} onChange={e => setRoomForm({ ...roomForm, notes: e.target.value })} /></Field>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setRoomForm(null)}>Cancelar</button>
              <button type="submit" className="btn-primary">Salvar</button>
            </div>
          </form>
        )}
      </Modal>

      {/* Form tipo */}
      <Modal open={!!typeForm} onClose={() => setTypeForm(null)} title={typeForm?.id ? 'Editar tipo' : 'Novo tipo de acomodação'} wide>
        {typeForm && (
          <form className="grid grid-cols-1 gap-3 sm:grid-cols-2" onSubmit={e => { e.preventDefault(); if (!typeForm.name?.trim()) return; saveRoomType(typeForm); setTypeForm(null); }}>
            <Field label="Nome *"><input className="input" value={typeForm.name ?? ''} onChange={e => setTypeForm({ ...typeForm, name: e.target.value })} required /></Field>
            <Field label="Emoji / ícone"><input className="input" value={typeForm.photoEmoji ?? ''} onChange={e => setTypeForm({ ...typeForm, photoEmoji: e.target.value })} placeholder="🛏️" /></Field>
            <Field label="Descrição" className="sm:col-span-2"><textarea className="input" rows={2} value={typeForm.description ?? ''} onChange={e => setTypeForm({ ...typeForm, description: e.target.value })} /></Field>
            <Field label="Capacidade adultos"><input type="number" min={1} className="input" value={typeForm.capacityAdults ?? 2} onChange={e => setTypeForm({ ...typeForm, capacityAdults: +e.target.value })} /></Field>
            <Field label="Capacidade crianças"><input type="number" min={0} className="input" value={typeForm.capacityChildren ?? 0} onChange={e => setTypeForm({ ...typeForm, capacityChildren: +e.target.value })} /></Field>
            <Field label="Diária padrão (R$)"><input type="number" min={0} step="0.01" className="input" value={typeForm.basePrice ?? 0} onChange={e => setTypeForm({ ...typeForm, basePrice: +e.target.value })} /></Field>
            <Field label="Diária fim de semana (R$)"><input type="number" min={0} step="0.01" className="input" value={typeForm.weekendPrice ?? 0} onChange={e => setTypeForm({ ...typeForm, weekendPrice: +e.target.value })} /></Field>
            <Field label="Taxa por hóspede extra (R$)"><input type="number" min={0} step="0.01" className="input" value={typeForm.extraGuestFee ?? 0} onChange={e => setTypeForm({ ...typeForm, extraGuestFee: +e.target.value })} /></Field>
            <Field label="Comodidades (separadas por vírgula)" className="sm:col-span-2">
              <input className="input" value={(typeForm.amenities ?? []).join(', ')} onChange={e => setTypeForm({ ...typeForm, amenities: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} />
            </Field>
            <div className="flex justify-end gap-2 sm:col-span-2">
              <button type="button" className="btn-secondary" onClick={() => setTypeForm(null)}>Cancelar</button>
              <button type="submit" className="btn-primary">Salvar</button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmDialog open={!!delRoom} onClose={() => setDelRoom(null)} danger title="Excluir quarto" confirmLabel="Excluir"
        message={`Excluir ${delRoom?.name}? Esta ação não pode ser desfeita.`}
        onConfirm={() => {
          if (!delRoom) return;
          const res = deleteRoom(delRoom.id);
          setError(res.ok ? '' : res.error ?? '');
        }} />
    </div>
  );
}

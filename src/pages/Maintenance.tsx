import { useState } from 'react';
import clsx from 'clsx';
import { Plus, Wrench } from 'lucide-react';
import { useStore } from '../lib/store';
import { EmptyState, Field, Modal, PageHeader } from '../components/ui';
import type { MaintenancePriority, MaintenanceStatus, MaintenanceTicket } from '../lib/types';
import { MAINT_STATUS_LABELS, PRIORITY_COLORS, PRIORITY_LABELS, fmtDate, money, todayISO } from '../lib/utils';

export default function Maintenance() {
  const { db, propertyId, saveMaintenance } = useStore();
  const [form, setForm] = useState<Partial<MaintenanceTicket> | null>(null);
  const [showClosed, setShowClosed] = useState(false);

  const tickets = db.maintenanceTickets
    .filter(t => t.propertyId === propertyId)
    .filter(t => showClosed || !['concluido', 'cancelado'].includes(t.status))
    .sort((a, b) => b.openedAt.localeCompare(a.openedAt));

  const rooms = db.rooms.filter(r => r.propertyId === propertyId);

  return (
    <div>
      <PageHeader title="Manutenção" subtitle="Chamados de manutenção — prioridade alta/urgente bloqueia a disponibilidade do quarto"
        actions={
          <>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" className="rounded" checked={showClosed} onChange={e => setShowClosed(e.target.checked)} /> Mostrar concluídos
            </label>
            <button className="btn-primary" onClick={() => setForm({ priority: 'media', status: 'aberto', openedAt: todayISO(), dueDate: todayISO(), roomId: rooms[0]?.id })}><Plus size={16} /> Novo chamado</button>
          </>
        } />

      {tickets.length === 0 ? <EmptyState title="Nenhum chamado aberto" message="Quando a governança reportar um problema, ele aparece aqui." /> : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {tickets.map(t => {
            const room = rooms.find(r => r.id === t.roomId);
            return (
              <div key={t.id} className="card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="rounded-lg bg-orange-50 p-2 text-orange-600 shrink-0"><Wrench size={17} /></div>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{t.title}</p>
                      <p className="text-xs text-slate-500">{room?.name}</p>
                    </div>
                  </div>
                  <span className={clsx('rounded-full px-2 py-0.5 text-[11px] font-bold shrink-0', PRIORITY_COLORS[t.priority])}>{PRIORITY_LABELS[t.priority]}</span>
                </div>
                {t.description && <p className="mt-2 text-sm text-slate-600">{t.description}</p>}
                <div className="mt-3 grid grid-cols-2 gap-1.5 text-xs text-slate-500">
                  <p>Aberto: <b>{fmtDate(t.openedAt)}</b></p>
                  <p>Previsão: <b>{fmtDate(t.dueDate)}</b></p>
                  <p>Responsável: <b>{t.assignedTo || '—'}</b></p>
                  <p>Custo est.: <b>{money(t.estimatedCost)}</b></p>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <select className="input !py-1.5 !text-xs" value={t.status}
                    onChange={e => saveMaintenance({ ...t, status: e.target.value as MaintenanceStatus, closedAt: ['concluido', 'cancelado'].includes(e.target.value) ? todayISO() : null })}>
                    {Object.entries(MAINT_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <button className="btn-secondary !px-3 !py-1.5 !text-xs" onClick={() => setForm(t)}>Editar</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? 'Editar chamado' : 'Novo chamado'} wide>
        {form && (
          <form className="grid grid-cols-1 gap-3 sm:grid-cols-2" onSubmit={e => { e.preventDefault(); if (!form.title?.trim() || !form.roomId) return; saveMaintenance(form); setForm(null); }}>
            <Field label="Quarto *">
              <select className="input" value={form.roomId ?? ''} onChange={e => setForm({ ...form, roomId: e.target.value })}>
                {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </Field>
            <Field label="Prioridade">
              <select className="input" value={form.priority ?? 'media'} onChange={e => setForm({ ...form, priority: e.target.value as MaintenancePriority })}>
                {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}{['alta', 'urgente'].includes(k) ? ' — bloqueia o quarto' : ''}</option>)}
              </select>
            </Field>
            <Field label="Título do problema *" className="sm:col-span-2"><input className="input" value={form.title ?? ''} onChange={e => setForm({ ...form, title: e.target.value })} required /></Field>
            <Field label="Descrição" className="sm:col-span-2"><textarea className="input" rows={2} value={form.description ?? ''} onChange={e => setForm({ ...form, description: e.target.value })} /></Field>
            <Field label="Responsável"><input className="input" value={form.assignedTo ?? ''} onChange={e => setForm({ ...form, assignedTo: e.target.value })} /></Field>
            <Field label="Previsão de conclusão"><input type="date" className="input" value={form.dueDate ?? ''} onChange={e => setForm({ ...form, dueDate: e.target.value })} /></Field>
            <Field label="Custo estimado (R$)"><input type="number" min={0} step="0.01" className="input" value={form.estimatedCost ?? 0} onChange={e => setForm({ ...form, estimatedCost: +e.target.value })} /></Field>
            <Field label="Custo realizado (R$)"><input type="number" min={0} step="0.01" className="input" value={form.finalCost ?? 0} onChange={e => setForm({ ...form, finalCost: +e.target.value })} /></Field>
            <div className="flex justify-end gap-2 sm:col-span-2">
              <button type="button" className="btn-secondary" onClick={() => setForm(null)}>Cancelar</button>
              <button type="submit" className="btn-primary">Salvar</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { addDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import clsx from 'clsx';
import { Plus, Pencil, Trash2, Info } from 'lucide-react';
import { useStore } from '../lib/store';
import { Field, Modal, PageHeader } from '../components/ui';
import type { RateRule } from '../lib/types';
import { fmtDate, iso, isWeekendISO, money, todayISO } from '../lib/utils';

const KIND_LABELS: Record<RateRule['kind'], string> = {
  periodo: 'Período', fim_de_semana: 'Fim de semana', feriado: 'Feriado',
  alta_temporada: 'Alta temporada', promocional: 'Promocional',
};

export default function Rates() {
  const { db, propertyId, saveRateRule, deleteRateRule, rateForDate } = useStore();
  const [form, setForm] = useState<Partial<RateRule> | null>(null);
  const types = db.roomTypes.filter(t => t.propertyId === propertyId);
  const rules = db.rateRules.filter(r => r.propertyId === propertyId);
  const [calType, setCalType] = useState(types[0]?.id ?? '');

  const days = useMemo(() => Array.from({ length: 28 }, (_, i) => iso(addDays(new Date(), i))), []);
  const selType = types.find(t => t.id === calType);

  return (
    <div>
      <PageHeader title="Tarifas" subtitle="Regras de preço por tipo de acomodação e calendário tarifário"
        actions={<button className="btn-primary" onClick={() => setForm({ roomTypeId: types[0]?.id, kind: 'periodo', startDate: todayISO(), endDate: todayISO(), minNights: 1, active: true })}><Plus size={16} /> Nova regra</button>} />

      <div className="mb-4 flex items-start gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2.5 text-sm text-brand-800">
        <Info size={16} className="mt-0.5 shrink-0" />
        <span>A tarifa aplicada em uma reserva é a vigente na data da hospedagem. Alterar regras aqui <b>não muda o valor de reservas já criadas</b> — para isso, edite a reserva e recalcule manualmente.</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-4">
          <p className="font-display font-bold mb-3">Regras de tarifa</p>
          <div className="space-y-2">
            {rules.map(r => {
              const t = types.find(x => x.id === r.roomTypeId);
              return (
                <div key={r.id} className={clsx('flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2.5', r.active ? 'border-slate-200' : 'border-slate-100 opacity-50')}>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{r.name}</p>
                    <p className="text-xs text-slate-500">{t?.name} · {KIND_LABELS[r.kind]} · {fmtDate(r.startDate)} → {fmtDate(r.endDate)} · mín. {r.minNights}n</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-brand-700">{money(r.price)}</span>
                    <button className="btn-ghost !p-1.5" onClick={() => setForm(r)}><Pencil size={14} /></button>
                    <button className="btn-ghost !p-1.5 text-rose-500" onClick={() => deleteRateRule(r.id)}><Trash2 size={14} /></button>
                  </div>
                </div>
              );
            })}
            {rules.length === 0 && <p className="text-sm text-slate-500 py-4 text-center">Nenhuma regra criada. A diária padrão e a de fim de semana do tipo de quarto serão usadas.</p>}
          </div>

          <p className="font-display font-bold mb-2 mt-6">Diárias base por tipo</p>
          <table className="w-full">
            <thead className="bg-slate-50"><tr><th className="th">Tipo</th><th className="th text-right">Semana</th><th className="th text-right">Fim de semana</th><th className="th text-right">Hósp. extra</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {types.map(t => (
                <tr key={t.id}>
                  <td className="td font-medium">{t.name}</td>
                  <td className="td text-right">{money(t.basePrice)}</td>
                  <td className="td text-right">{money(t.weekendPrice)}</td>
                  <td className="td text-right">{money(t.extraGuestFee)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-slate-400">Edite as diárias base em Quartos e acomodações → Tipos.</p>
        </div>

        <div className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-display font-bold">Calendário tarifário — próximos 28 dias</p>
            <select className="input !w-auto !py-1.5" value={calType} onChange={e => setCalType(e.target.value)}>
              {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {days.map(d => {
              const price = rateForDate(calType, d);
              const hasRule = rules.some(r => r.active && r.roomTypeId === calType && d >= r.startDate && d <= r.endDate);
              const weekend = isWeekendISO(d);
              return (
                <div key={d} className={clsx('rounded-lg border p-1.5 text-center',
                  hasRule ? 'border-brand-300 bg-brand-50' : weekend ? 'border-amber-200 bg-amber-50' : 'border-slate-200')}>
                  <p className="text-[10px] uppercase text-slate-400">{format(new Date(d + 'T12:00'), 'EEE', { locale: ptBR }).slice(0, 3)}</p>
                  <p className="text-sm font-bold text-slate-700">{format(new Date(d + 'T12:00'), 'dd')}</p>
                  <p className={clsx('text-[10px] font-semibold', hasRule ? 'text-brand-700' : weekend ? 'text-amber-700' : 'text-slate-500')}>
                    {selType ? `${Math.round(price)}` : '—'}
                  </p>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-brand-100 border border-brand-300" /> Regra ativa</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-amber-50 border border-amber-200" /> Fim de semana</span>
            <span>Valores em R$ por diária</span>
          </div>
        </div>
      </div>

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? 'Editar regra de tarifa' : 'Nova regra de tarifa'} wide>
        {form && (
          <form className="grid grid-cols-1 gap-3 sm:grid-cols-2" onSubmit={e => { e.preventDefault(); if (!form.name?.trim()) return; saveRateRule(form); setForm(null); }}>
            <Field label="Nome da regra *" className="sm:col-span-2"><input className="input" value={form.name ?? ''} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex.: Alta temporada — julho" required /></Field>
            <Field label="Tipo de acomodação">
              <select className="input" value={form.roomTypeId ?? ''} onChange={e => setForm({ ...form, roomTypeId: e.target.value })}>
                {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </Field>
            <Field label="Tipo de regra">
              <select className="input" value={form.kind ?? 'periodo'} onChange={e => setForm({ ...form, kind: e.target.value as RateRule['kind'] })}>
                {Object.entries(KIND_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <Field label="Início"><input type="date" className="input" value={form.startDate ?? ''} onChange={e => setForm({ ...form, startDate: e.target.value })} /></Field>
            <Field label="Fim"><input type="date" className="input" value={form.endDate ?? ''} onChange={e => setForm({ ...form, endDate: e.target.value })} /></Field>
            <Field label="Diária (R$)"><input type="number" min={0} step="0.01" className="input" value={form.price ?? 0} onChange={e => setForm({ ...form, price: +e.target.value })} /></Field>
            <Field label="Mínimo de diárias"><input type="number" min={1} className="input" value={form.minNights ?? 1} onChange={e => setForm({ ...form, minNights: +e.target.value })} /></Field>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" className="rounded" checked={form.active ?? true} onChange={e => setForm({ ...form, active: e.target.checked })} /> Regra ativa
            </label>
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

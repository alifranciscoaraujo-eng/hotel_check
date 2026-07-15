import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Plus, Download, Wallet, TrendingDown, Hourglass, Percent } from 'lucide-react';
import { useStore } from '../lib/store';
import { ChannelBadge, EmptyState, Field, Modal, PageHeader, StatCard } from '../components/ui';
import type { Expense } from '../lib/types';
import { CHANNEL_COMMISSION, CHANNEL_LABELS, PAYMENT_LABELS, downloadCSV, fmtDate, fmtDateTime, money, todayISO } from '../lib/utils';

type Tab = 'receber' | 'pagamentos' | 'despesas' | 'comissoes';

export default function Finance() {
  const { db, propertyId, paidAmount, saveExpense } = useStore();
  const [tab, setTab] = useState<Tab>('receber');
  const [expForm, setExpForm] = useState<Partial<Expense> | null>(null);
  const [from, setFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [to, setTo] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  const reservations = db.reservations.filter(r => r.propertyId === propertyId);
  const receivables = useMemo(() =>
    reservations
      .filter(r => ['pre_reserva', 'confirmada', 'hospedado', 'finalizada'].includes(r.status))
      .map(r => ({ r, paid: paidAmount(r.id), balance: r.totalAmount - paidAmount(r.id) }))
      .filter(x => x.balance > 0.005)
      .sort((a, b) => a.r.checkinDate.localeCompare(b.r.checkinDate)),
    [db, propertyId]);

  const payments = db.payments
    .filter(p => p.propertyId === propertyId && p.paidAt.slice(0, 10) >= from && p.paidAt.slice(0, 10) <= to)
    .sort((a, b) => b.paidAt.localeCompare(a.paidAt));

  const expenses = db.expenses.filter(e => e.propertyId === propertyId).sort((a, b) => b.dueDate.localeCompare(a.dueDate));

  const commissions = useMemo(() => {
    const map = new Map<string, { count: number; revenue: number; commission: number }>();
    reservations
      .filter(r => ['confirmada', 'hospedado', 'finalizada'].includes(r.status) && r.checkinDate >= from && r.checkinDate <= to)
      .forEach(r => {
        const rate = CHANNEL_COMMISSION[r.channel] ?? 0;
        const cur = map.get(r.channel) ?? { count: 0, revenue: 0, commission: 0 };
        cur.count++; cur.revenue += r.totalAmount; cur.commission += r.totalAmount * rate;
        map.set(r.channel, cur);
      });
    return [...map.entries()].sort((a, b) => b[1].revenue - a[1].revenue);
  }, [db, propertyId, from, to]);

  const received = payments.filter(p => p.amount > 0).reduce((a, p) => a + p.amount, 0);
  const totalReceivable = receivables.reduce((a, x) => a + x.balance, 0);
  const totalExpensesPending = expenses.filter(e => e.status === 'pendente').reduce((a, e) => a + e.amount, 0);
  const totalCommission = commissions.reduce((a, [, v]) => a + v.commission, 0);

  const TABS: { id: Tab; label: string }[] = [
    { id: 'receber', label: `Contas a receber (${receivables.length})` },
    { id: 'pagamentos', label: 'Pagamentos' },
    { id: 'despesas', label: 'Contas a pagar' },
    { id: 'comissoes', label: 'Comissões por canal' },
  ];

  return (
    <div>
      <PageHeader title="Financeiro" subtitle="Recebimentos, despesas e comissões da hospedagem"
        actions={
          <div className="flex items-center gap-2">
            <input type="date" className="input !w-auto" value={from} onChange={e => setFrom(e.target.value)} />
            <span className="text-slate-400">→</span>
            <input type="date" className="input !w-auto" value={to} onChange={e => setTo(e.target.value)} />
          </div>
        } />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard icon={<Wallet size={20} />} label="Recebido no período" value={money(received)} tone="success" />
        <StatCard icon={<Hourglass size={20} />} label="A receber (total)" value={money(totalReceivable)} tone="warn" />
        <StatCard icon={<TrendingDown size={20} />} label="Despesas pendentes" value={money(totalExpensesPending)} tone="danger" />
        <StatCard icon={<Percent size={20} />} label="Comissões OTAs (est.)" value={money(totalCommission)} sub="no período" />
      </div>

      <div className="mt-5 mb-4 flex flex-wrap gap-2">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={clsx('btn', tab === t.id ? 'bg-brand-600 text-white' : 'bg-white border border-slate-300 text-slate-600')}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'receber' && (
        receivables.length === 0 ? <EmptyState title="Nenhum saldo pendente" message="Todas as reservas estão quitadas. 🎉" /> : (
          <div className="card overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50"><tr><th className="th">Reserva</th><th className="th">Hóspede</th><th className="th">Check-in</th><th className="th">Canal</th><th className="th text-right">Total</th><th className="th text-right">Pago</th><th className="th text-right">Saldo</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {receivables.map(({ r, paid, balance }) => {
                  const g = db.guests.find(x => x.id === r.guestId);
                  return (
                    <tr key={r.id}>
                      <td className="td font-mono text-xs text-slate-500">{r.code}</td>
                      <td className="td font-medium">{g?.name}</td>
                      <td className="td">{fmtDate(r.checkinDate)}</td>
                      <td className="td"><ChannelBadge channel={r.channel} /></td>
                      <td className="td text-right">{money(r.totalAmount)}</td>
                      <td className="td text-right text-emerald-700">{money(paid)}</td>
                      <td className="td text-right font-bold text-rose-600">{money(balance)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {tab === 'pagamentos' && (
        <div className="card overflow-x-auto">
          <div className="flex justify-end p-3">
            <button className="btn-secondary" onClick={() => downloadCSV('pagamentos.csv',
              ['Data', 'Reserva', 'Hóspede', 'Forma', 'Observação', 'Valor'],
              payments.map(p => {
                const r = reservations.find(x => x.id === p.reservationId);
                const g = db.guests.find(x => x.id === r?.guestId);
                return [fmtDateTime(p.paidAt), r?.code ?? '', g?.name ?? '', PAYMENT_LABELS[p.method], p.notes, p.amount.toFixed(2)];
              }))}><Download size={15} /> CSV</button>
          </div>
          <table className="w-full">
            <thead className="bg-slate-50"><tr><th className="th">Data</th><th className="th">Reserva</th><th className="th">Hóspede</th><th className="th">Forma</th><th className="th">Obs.</th><th className="th text-right">Valor</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {payments.map(p => {
                const r = reservations.find(x => x.id === p.reservationId);
                const g = db.guests.find(x => x.id === r?.guestId);
                return (
                  <tr key={p.id}>
                    <td className="td whitespace-nowrap">{fmtDateTime(p.paidAt)}</td>
                    <td className="td font-mono text-xs text-slate-500">{r?.code}</td>
                    <td className="td">{g?.name ?? '—'}</td>
                    <td className="td">{PAYMENT_LABELS[p.method]}</td>
                    <td className="td text-slate-500">{p.notes}</td>
                    <td className={clsx('td text-right font-semibold', p.amount < 0 ? 'text-rose-600' : 'text-emerald-700')}>{money(p.amount)}</td>
                  </tr>
                );
              })}
              {payments.length === 0 && <tr><td colSpan={6} className="td text-slate-500">Nenhum pagamento no período.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'despesas' && (
        <>
          <div className="mb-3 flex justify-end">
            <button className="btn-primary" onClick={() => setExpForm({ dueDate: todayISO(), status: 'pendente', category: 'Insumos' })}><Plus size={15} /> Nova despesa</button>
          </div>
          <div className="card overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50"><tr><th className="th">Vencimento</th><th className="th">Categoria</th><th className="th">Descrição</th><th className="th">Status</th><th className="th text-right">Valor</th><th className="th"></th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {expenses.map(e => (
                  <tr key={e.id}>
                    <td className="td">{fmtDate(e.dueDate)}</td>
                    <td className="td"><span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{e.category}</span></td>
                    <td className="td">{e.description}</td>
                    <td className="td">
                      <span className={clsx('rounded-full px-2 py-0.5 text-[11px] font-bold', e.status === 'pago' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800')}>
                        {e.status === 'pago' ? 'Pago' : 'Pendente'}
                      </span>
                    </td>
                    <td className="td text-right font-semibold">{money(e.amount)}</td>
                    <td className="td text-right">
                      {e.status === 'pendente' && (
                        <button className="btn-secondary !px-2.5 !py-1 !text-xs" onClick={() => saveExpense({ ...e, status: 'pago', paidAt: todayISO() })}>Dar baixa</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'comissoes' && (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50"><tr><th className="th">Canal</th><th className="th text-center">Reservas</th><th className="th text-right">Receita</th><th className="th text-right">Taxa</th><th className="th text-right">Comissão est.</th><th className="th text-right">Líquido est.</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {commissions.map(([ch, v]) => (
                <tr key={ch}>
                  <td className="td"><ChannelBadge channel={ch as keyof typeof CHANNEL_LABELS} /></td>
                  <td className="td text-center">{v.count}</td>
                  <td className="td text-right">{money(v.revenue)}</td>
                  <td className="td text-right">{((CHANNEL_COMMISSION[ch as keyof typeof CHANNEL_COMMISSION] ?? 0) * 100).toFixed(0)}%</td>
                  <td className="td text-right font-semibold text-rose-600">{money(v.commission)}</td>
                  <td className="td text-right font-semibold text-emerald-700">{money(v.revenue - v.commission)}</td>
                </tr>
              ))}
              {commissions.length === 0 && <tr><td colSpan={6} className="td text-slate-500">Nenhuma reserva no período.</td></tr>}
            </tbody>
          </table>
          <p className="px-4 py-3 text-xs text-slate-400">Comissões estimadas com base nas taxas médias de mercado por canal. Configure taxas reais em Integrações (fase Channel Manager).</p>
        </div>
      )}

      <Modal open={!!expForm} onClose={() => setExpForm(null)} title="Nova despesa">
        {expForm && (
          <form className="space-y-3" onSubmit={e => { e.preventDefault(); if (!expForm.description?.trim()) return; saveExpense(expForm); setExpForm(null); }}>
            <Field label="Descrição *"><input className="input" value={expForm.description ?? ''} onChange={e => setExpForm({ ...expForm, description: e.target.value })} required /></Field>
            <Field label="Categoria">
              <select className="input" value={expForm.category ?? 'Insumos'} onChange={e => setExpForm({ ...expForm, category: e.target.value })}>
                {['Insumos', 'Energia', 'Água', 'Internet', 'Lavanderia', 'Manutenção', 'Pessoal', 'Marketing', 'Impostos', 'Outros'].map(c => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Valor (R$)"><input type="number" min={0} step="0.01" className="input" value={expForm.amount ?? 0} onChange={e => setExpForm({ ...expForm, amount: +e.target.value })} /></Field>
              <Field label="Vencimento"><input type="date" className="input" value={expForm.dueDate ?? ''} onChange={e => setExpForm({ ...expForm, dueDate: e.target.value })} /></Field>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setExpForm(null)}>Cancelar</button>
              <button type="submit" className="btn-primary">Salvar</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

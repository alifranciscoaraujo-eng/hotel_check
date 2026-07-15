import { useState } from 'react';
import { Plus, Pencil } from 'lucide-react';
import { useStore } from '../lib/store';
import { Field, Modal, PageHeader } from '../components/ui';
import type { AppUser, Role } from '../lib/types';
import { ROLE_LABELS } from '../lib/utils';

const ROLE_DESCRIPTIONS: Record<Role, string> = {
  platform_admin: 'Acesso total à plataforma (interno ReservaFlow)',
  owner: 'Acesso completo: financeiro, tarifas, usuários e configurações',
  manager: 'Reservas, indicadores e relatórios operacionais — sem dados críticos da conta',
  reception: 'Reservas, check-in/out, hóspedes e mapa — sem financeiro',
  finance: 'Contas, pagamentos, comissões e relatórios financeiros',
  housekeeping: 'Somente governança e manutenção — sem dados financeiros',
};

export default function UsersPage() {
  const { db, propertyId, saveUser, currentUser } = useStore();
  const [form, setForm] = useState<Partial<AppUser> | null>(null);
  const users = db.users.filter(u => u.propertyId === propertyId || u.role === 'platform_admin');

  return (
    <div>
      <PageHeader title="Usuários e permissões" subtitle="Cada perfil vê apenas o que precisa para trabalhar"
        actions={<button className="btn-primary" onClick={() => setForm({ role: 'reception', status: 'ativo' })}><Plus size={16} /> Novo usuário</button>} />

      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50"><tr><th className="th">Nome</th><th className="th">E-mail</th><th className="th">Perfil</th><th className="th">Status</th><th className="th"></th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {users.map(u => (
              <tr key={u.id}>
                <td className="td font-medium">{u.name}{u.id === currentUser?.id && <span className="ml-2 rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-bold text-brand-700">VOCÊ</span>}</td>
                <td className="td text-slate-500">{u.email}</td>
                <td className="td">{ROLE_LABELS[u.role]}</td>
                <td className="td">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${u.status === 'ativo' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {u.status === 'ativo' ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="td text-right">
                  {u.role !== 'platform_admin' && <button className="btn-ghost !p-2" onClick={() => setForm(u)}><Pencil size={15} /></button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {(Object.keys(ROLE_DESCRIPTIONS) as Role[]).filter(r => r !== 'platform_admin').map(r => (
          <div key={r} className="card p-4">
            <p className="font-semibold text-slate-800">{ROLE_LABELS[r]}</p>
            <p className="mt-1 text-sm text-slate-500">{ROLE_DESCRIPTIONS[r]}</p>
          </div>
        ))}
      </div>

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? 'Editar usuário' : 'Novo usuário'}>
        {form && (
          <form className="space-y-3" onSubmit={e => { e.preventDefault(); if (!form.name?.trim() || !form.email?.trim()) return; saveUser(form); setForm(null); }}>
            <Field label="Nome *"><input className="input" value={form.name ?? ''} onChange={e => setForm({ ...form, name: e.target.value })} required /></Field>
            <Field label="E-mail *"><input type="email" className="input" value={form.email ?? ''} onChange={e => setForm({ ...form, email: e.target.value })} required /></Field>
            <Field label="Perfil de acesso">
              <select className="input" value={form.role ?? 'reception'} onChange={e => setForm({ ...form, role: e.target.value as Role })}>
                {(Object.keys(ROLE_LABELS) as Role[]).filter(r => r !== 'platform_admin').map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select className="input" value={form.status ?? 'ativo'} onChange={e => setForm({ ...form, status: e.target.value as 'ativo' | 'inativo' })}>
                <option value="ativo">Ativo</option><option value="inativo">Inativo</option>
              </select>
            </Field>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setForm(null)}>Cancelar</button>
              <button type="submit" className="btn-primary">Salvar</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

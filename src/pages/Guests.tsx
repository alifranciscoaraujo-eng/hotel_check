import { useMemo, useState } from 'react';
import { Plus, Star, Download, Pencil } from 'lucide-react';
import { useStore } from '../lib/store';
import { EmptyState, Field, Modal, PageHeader, StatusBadge } from '../components/ui';
import type { Guest } from '../lib/types';
import { downloadCSV, fmtDate, money } from '../lib/utils';

const EMPTY: Partial<Guest> = { name: '', cpf: '', phone: '', whatsapp: '', email: '', city: '', state: '', country: 'Brasil', nationality: 'Brasileira', company: '', notes: '', preferences: '', vip: false, address: '', birthDate: '' };

export default function Guests() {
  const { db, propertyId, saveGuest } = useStore();
  const [search, setSearch] = useState('');
  const [onlyVip, setOnlyVip] = useState(false);
  const [form, setForm] = useState<Partial<Guest> | null>(null);
  const [detail, setDetail] = useState<Guest | null>(null);

  const guests = useMemo(() =>
    db.guests
      .filter(g => g.propertyId === propertyId)
      .filter(g => !onlyVip || g.vip)
      .filter(g => {
        const q = search.toLowerCase();
        return !q || g.name.toLowerCase().includes(q) || g.email.toLowerCase().includes(q) || g.cpf.includes(q) || g.phone.includes(q);
      })
      .sort((a, b) => a.name.localeCompare(b.name)),
    [db, propertyId, search, onlyVip]);

  const staysOf = (gId: string) => db.reservations
    .filter(r => r.guestId === gId && ['confirmada', 'hospedado', 'finalizada'].includes(r.status))
    .sort((a, b) => b.checkinDate.localeCompare(a.checkinDate));

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form?.name?.trim()) return;
    saveGuest(form);
    setForm(null);
  };

  return (
    <div>
      <PageHeader title="Hóspedes" subtitle={`${guests.length} hóspede(s)`}
        actions={
          <>
            <button className="btn-secondary" onClick={() => downloadCSV('hospedes.csv',
              ['Nome', 'CPF', 'Telefone', 'E-mail', 'Cidade', 'UF', 'VIP', 'Hospedagens'],
              guests.map(g => [g.name, g.cpf, g.phone, g.email, g.city, g.state, g.vip ? 'Sim' : 'Não', staysOf(g.id).length]))}>
              <Download size={16} /> CSV
            </button>
            <button className="btn-primary" onClick={() => setForm(EMPTY)}><Plus size={16} /> Novo hóspede</button>
          </>
        } />

      <div className="card mb-4 flex flex-wrap items-center gap-3 p-3">
        <input className="input !w-72" placeholder="Buscar por nome, CPF, telefone ou e-mail…" value={search} onChange={e => setSearch(e.target.value)} />
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={onlyVip} onChange={e => setOnlyVip(e.target.checked)} className="rounded" /> Apenas VIP
        </label>
      </div>

      {guests.length === 0 ? <EmptyState title="Nenhum hóspede encontrado" /> : (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr><th className="th">Nome</th><th className="th">Contato</th><th className="th">Cidade</th><th className="th text-center">Hospedagens</th><th className="th">Última estadia</th><th className="th"></th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {guests.map(g => {
                const stays = staysOf(g.id);
                return (
                  <tr key={g.id} className="cursor-pointer hover:bg-slate-50" onClick={() => setDetail(g)}>
                    <td className="td font-medium">{g.name}{g.vip && <Star size={13} className="ml-1.5 inline text-amber-500 fill-amber-400" />}{stays.length > 1 && <span className="ml-2 rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-bold text-brand-700">RECORRENTE</span>}</td>
                    <td className="td text-slate-600">{g.phone}<br /><span className="text-xs text-slate-400">{g.email}</span></td>
                    <td className="td">{g.city}{g.state ? `/${g.state}` : ''}</td>
                    <td className="td text-center font-semibold">{stays.length}</td>
                    <td className="td">{stays[0] ? fmtDate(stays[0].checkinDate) : '—'}</td>
                    <td className="td text-right">
                      <button className="btn-ghost !px-2 !py-1" onClick={e => { e.stopPropagation(); setForm(g); }}><Pencil size={15} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Ficha do hóspede */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail ? `Ficha — ${detail.name}` : ''} wide>
        {detail && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
              <div><p className="label">CPF</p><p>{detail.cpf || '—'}</p></div>
              <div><p className="label">Nascimento</p><p>{detail.birthDate ? fmtDate(detail.birthDate) : '—'}</p></div>
              <div><p className="label">Nacionalidade</p><p>{detail.nationality || '—'}</p></div>
              <div><p className="label">Telefone</p><p>{detail.phone || '—'}</p></div>
              <div><p className="label">E-mail</p><p className="truncate">{detail.email || '—'}</p></div>
              <div><p className="label">Cidade</p><p>{detail.city}{detail.state ? `/${detail.state}` : ''}</p></div>
              {detail.company && <div><p className="label">Empresa</p><p>{detail.company}</p></div>}
              {detail.preferences && <div className="col-span-2"><p className="label">Preferências</p><p>{detail.preferences}</p></div>}
            </div>
            {detail.notes && <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">{detail.notes}</div>}
            <div>
              <p className="label">Histórico de hospedagens</p>
              <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                {staysOf(detail.id).map(r => {
                  const room = db.rooms.find(x => x.id === r.roomId);
                  return (
                    <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                      <span className="font-mono text-xs text-slate-400">{r.code}</span>
                      <span>{fmtDate(r.checkinDate)} → {fmtDate(r.checkoutDate)}</span>
                      <span className="text-slate-500">{room?.name}</span>
                      <StatusBadge status={r.status} />
                      <span className="font-semibold">{money(r.totalAmount)}</span>
                    </div>
                  );
                })}
                {staysOf(detail.id).length === 0 && <p className="px-3 py-3 text-sm text-slate-500">Nenhuma hospedagem registrada.</p>}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => { setForm(detail); setDetail(null); }}><Pencil size={15} /> Editar cadastro</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Formulário */}
      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? 'Editar hóspede' : 'Novo hóspede'} wide>
        {form && (
          <form onSubmit={save} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Nome completo *" className="sm:col-span-2">
              <input className="input" value={form.name ?? ''} onChange={e => setForm({ ...form, name: e.target.value })} required />
            </Field>
            <Field label="CPF"><input className="input" value={form.cpf ?? ''} onChange={e => setForm({ ...form, cpf: e.target.value })} /></Field>
            <Field label="Data de nascimento"><input type="date" className="input" value={form.birthDate ?? ''} onChange={e => setForm({ ...form, birthDate: e.target.value })} /></Field>
            <Field label="Telefone / WhatsApp"><input className="input" value={form.phone ?? ''} onChange={e => setForm({ ...form, phone: e.target.value, whatsapp: e.target.value })} /></Field>
            <Field label="E-mail"><input type="email" className="input" value={form.email ?? ''} onChange={e => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Endereço" className="sm:col-span-2"><input className="input" value={form.address ?? ''} onChange={e => setForm({ ...form, address: e.target.value })} /></Field>
            <Field label="Cidade"><input className="input" value={form.city ?? ''} onChange={e => setForm({ ...form, city: e.target.value })} /></Field>
            <Field label="Estado"><input className="input" value={form.state ?? ''} onChange={e => setForm({ ...form, state: e.target.value })} /></Field>
            <Field label="Empresa (corporativo)"><input className="input" value={form.company ?? ''} onChange={e => setForm({ ...form, company: e.target.value })} /></Field>
            <Field label="Preferências"><input className="input" value={form.preferences ?? ''} onChange={e => setForm({ ...form, preferences: e.target.value })} placeholder="Ex.: quarto no térreo" /></Field>
            <Field label="Observações importantes" className="sm:col-span-2">
              <textarea className="input" rows={2} value={form.notes ?? ''} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Restrições, alergias, cuidados…" />
            </Field>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input type="checkbox" className="rounded" checked={form.vip ?? false} onChange={e => setForm({ ...form, vip: e.target.checked })} />
              Hóspede VIP <Star size={14} className="text-amber-500" />
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

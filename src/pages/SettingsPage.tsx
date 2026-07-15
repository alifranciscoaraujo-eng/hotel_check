import { useState } from 'react';
import { Save, CheckCircle2 } from 'lucide-react';
import { useStore } from '../lib/store';
import { Field, PageHeader } from '../components/ui';
import { fmtDateTime } from '../lib/utils';

export default function SettingsPage() {
  const { db, propertyId, saveProperty } = useStore();
  const property = db.properties.find(p => p.id === propertyId)!;
  const [f, setF] = useState({ ...property });
  const [saved, setSaved] = useState(false);
  const logs = db.auditLogs.filter(l => l.propertyId === propertyId).slice(0, 15);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    saveProperty(f);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div>
      <PageHeader title="Configurações da hospedagem" subtitle="Dados cadastrais, horários e políticas" />

      <div className="grid gap-4 lg:grid-cols-3">
        <form onSubmit={submit} className="card p-5 lg:col-span-2">
          <p className="font-display font-bold mb-4">Dados da hospedagem</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Nome"><input className="input" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></Field>
            <Field label="CNPJ/CPF"><input className="input" value={f.document} onChange={e => setF({ ...f, document: e.target.value })} /></Field>
            <Field label="Telefone"><input className="input" value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} /></Field>
            <Field label="WhatsApp"><input className="input" value={f.whatsapp} onChange={e => setF({ ...f, whatsapp: e.target.value })} /></Field>
            <Field label="E-mail" className="sm:col-span-2"><input type="email" className="input" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} /></Field>
            <Field label="Endereço" className="sm:col-span-2"><input className="input" value={f.address} onChange={e => setF({ ...f, address: e.target.value })} /></Field>
            <Field label="Cidade"><input className="input" value={f.city} onChange={e => setF({ ...f, city: e.target.value })} /></Field>
            <Field label="Estado"><input className="input" value={f.state} onChange={e => setF({ ...f, state: e.target.value })} /></Field>
          </div>

          <p className="font-display font-bold mb-4 mt-6">Operação</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Horário padrão de check-in"><input type="time" className="input" value={f.checkinTime} onChange={e => setF({ ...f, checkinTime: e.target.value })} /></Field>
            <Field label="Horário padrão de check-out"><input type="time" className="input" value={f.checkoutTime} onChange={e => setF({ ...f, checkoutTime: e.target.value })} /></Field>
          </div>

          <p className="font-display font-bold mb-4 mt-6">Políticas</p>
          <div className="space-y-3">
            <Field label="Política de cancelamento"><textarea className="input" rows={2} value={f.cancellationPolicy} onChange={e => setF({ ...f, cancellationPolicy: e.target.value })} /></Field>
            <Field label="Política de crianças"><textarea className="input" rows={2} value={f.childrenPolicy} onChange={e => setF({ ...f, childrenPolicy: e.target.value })} /></Field>
            <Field label="Política de animais"><textarea className="input" rows={2} value={f.petsPolicy} onChange={e => setF({ ...f, petsPolicy: e.target.value })} /></Field>
            <Field label="Regras da casa"><textarea className="input" rows={3} value={f.houseRules} onChange={e => setF({ ...f, houseRules: e.target.value })} /></Field>
          </div>

          <div className="mt-5 flex items-center justify-end gap-3">
            {saved && <span className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600"><CheckCircle2 size={16} /> Salvo!</span>}
            <button type="submit" className="btn-primary"><Save size={16} /> Salvar configurações</button>
          </div>
        </form>

        <div className="card p-5 h-fit">
          <p className="font-display font-bold mb-3">Log de auditoria</p>
          <p className="mb-3 text-xs text-slate-500">Alterações sensíveis ficam registradas automaticamente.</p>
          <div className="space-y-2.5">
            {logs.map(l => (
              <div key={l.id} className="border-l-2 border-brand-200 pl-3">
                <p className="text-sm text-slate-700"><b>{l.userName}</b> {l.action} <b>{l.entity}</b>{l.detail ? ` — ${l.detail}` : ''}</p>
                <p className="text-[11px] text-slate-400">{fmtDateTime(l.createdAt)}</p>
              </div>
            ))}
            {logs.length === 0 && <p className="text-sm text-slate-500">Nenhum registro ainda.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

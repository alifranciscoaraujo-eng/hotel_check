import { useState } from 'react';
import clsx from 'clsx';
import { Copy, Link2, Plus, RefreshCw, Trash2, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { useStore } from '../lib/store';
import { ChannelBadge, Field, Modal, PageHeader } from '../components/ui';
import type { Channel, IcalFeed } from '../lib/types';
import { CHANNEL_LABELS, fmtDateTime } from '../lib/utils';

const OTA_CHANNELS: Channel[] = ['booking', 'airbnb', 'expedia', 'decolar', 'agoda', 'vrbo'];

export default function Integrations() {
  const { db, propertyId, saveIcalFeed, deleteIcalFeed, syncIcalNow } = useStore();
  const [form, setForm] = useState<Partial<IcalFeed> | null>(null);
  const [copied, setCopied] = useState('');

  const feeds = db.icalFeeds.filter(f => f.propertyId === propertyId);
  const logs = db.integrationLogs.filter(l => l.propertyId === propertyId).slice(0, 20);
  const rooms = db.rooms.filter(r => r.propertyId === propertyId);
  const property = db.properties.find(p => p.id === propertyId)!;

  const copy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(''), 1500);
  };

  return (
    <div>
      <PageHeader title="Integrações" subtitle="Sincronização de calendários iCal — Fase 1 do plano de integração com canais"
        actions={
          <>
            <button className="btn-secondary" onClick={syncIcalNow}><RefreshCw size={16} /> Sincronizar agora</button>
            <button className="btn-primary" onClick={() => setForm({ direction: 'import', channel: 'booking', roomId: rooms[0]?.id })}><Plus size={16} /> Novo calendário</button>
          </>
        } />

      <div className="mb-5 rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm text-brand-900">
        <p className="font-bold">Como funciona a sincronização iCal</p>
        <p className="mt-1">O iCal sincroniza apenas <b>disponibilidade</b> (bloqueios e períodos ocupados) entre o ReservaFlow e canais como Booking.com e Airbnb. Tarifas, dados completos do hóspede e pagamentos exigem integração via Channel Manager/API oficial — a arquitetura já está preparada (adapters por canal) e será habilitada após credenciamento junto às OTAs. Reservas importadas nunca sobrescrevem reservas internas: conflitos geram alerta para revisão manual.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <p className="mb-2 font-display font-bold text-slate-800">Calendários conectados</p>
          <div className="space-y-2">
            {feeds.map(f => {
              const room = rooms.find(r => r.id === f.roomId);
              return (
                <div key={f.id} className="card p-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <ChannelBadge channel={f.channel} />
                      <span className={clsx('rounded-full px-2 py-0.5 text-[11px] font-bold',
                        f.direction === 'import' ? 'bg-indigo-100 text-indigo-700' : 'bg-cyan-100 text-cyan-700')}>
                        {f.direction === 'import' ? '↓ Importa' : '↑ Exporta'}
                      </span>
                      <span className="text-sm font-semibold">{room?.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {f.status === 'ativo' && <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600"><CheckCircle2 size={13} /> Ativo</span>}
                      {f.status === 'erro' && <span className="flex items-center gap-1 text-xs font-semibold text-rose-600"><AlertTriangle size={13} /> Erro</span>}
                      {f.status === 'pausado' && <span className="flex items-center gap-1 text-xs font-semibold text-slate-500"><Clock size={13} /> Pausado</span>}
                      <button className="btn-ghost !p-1.5 text-rose-500" onClick={() => deleteIcalFeed(f.id)}><Trash2 size={14} /></button>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <code className="flex-1 truncate rounded bg-slate-50 px-2 py-1 text-xs text-slate-500">{f.feedUrl}</code>
                    <button className="btn-ghost !p-1.5" title="Copiar link" onClick={() => copy(f.feedUrl, f.id)}>
                      {copied === f.id ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    </button>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-400">
                    Última sinc.: {f.lastSyncAt ? fmtDateTime(f.lastSyncAt) : 'nunca'} · {f.lastMessage}
                  </p>
                </div>
              );
            })}
            {feeds.length === 0 && <div className="card p-6 text-center text-sm text-slate-500">Nenhum calendário conectado ainda.</div>}
          </div>

          <p className="mb-2 mt-6 font-display font-bold text-slate-800">Links de exportação do ReservaFlow</p>
          <div className="card p-3.5 text-sm text-slate-600">
            <p className="flex items-center gap-1.5 font-semibold text-slate-700"><Link2 size={15} /> Cole estes links no extranet do canal para ele enxergar sua disponibilidade:</p>
            <div className="mt-2 space-y-1.5">
              {rooms.slice(0, 4).map(r => {
                const url = `https://app.reservaflow.com.br/ical/${property.slug}/${r.id}.ics`;
                return (
                  <div key={r.id} className="flex items-center gap-2">
                    <span className="w-28 shrink-0 text-xs font-semibold">{r.name}</span>
                    <code className="flex-1 truncate rounded bg-slate-50 px-2 py-1 text-xs text-slate-400">{url}</code>
                    <button className="btn-ghost !p-1.5" onClick={() => copy(url, 'exp-' + r.id)}>
                      {copied === 'exp-' + r.id ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div>
          <p className="mb-2 font-display font-bold text-slate-800">Fase 2 — Channel Manager / API oficial</p>
          <div className="card p-4">
            <p className="text-sm text-slate-600">Arquitetura de adapters pronta para homologação futura. Nenhuma credencial configurada ainda.</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {OTA_CHANNELS.map(ch => (
                <div key={ch} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5">
                  <ChannelBadge channel={ch} />
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">EM BREVE</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-400">A conexão completa (tarifas, reservas em tempo real, cancelamentos) exige credenciais oficiais de cada OTA ou um provedor de Channel Manager homologado.</p>
          </div>

          <p className="mb-2 mt-6 font-display font-bold text-slate-800">Logs de sincronização</p>
          <div className="card divide-y divide-slate-100 max-h-96 overflow-y-auto">
            {logs.map(l => (
              <div key={l.id} className="flex items-start gap-2.5 px-3.5 py-2.5">
                {l.status === 'ok' ? <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-500" /> : <AlertTriangle size={15} className="mt-0.5 shrink-0 text-rose-500" />}
                <div className="min-w-0">
                  <p className="text-sm text-slate-700">{l.message}</p>
                  <p className="text-xs text-slate-400">{CHANNEL_LABELS[l.channel]} · {l.action} · {fmtDateTime(l.createdAt)}</p>
                </div>
              </div>
            ))}
            {logs.length === 0 && <p className="p-4 text-sm text-slate-500">Nenhum log ainda.</p>}
          </div>
        </div>
      </div>

      <Modal open={!!form} onClose={() => setForm(null)} title="Conectar calendário iCal">
        {form && (
          <form className="space-y-3" onSubmit={e => { e.preventDefault(); if (form.direction === 'import' && !form.feedUrl?.trim()) return; saveIcalFeed(form.direction === 'export' ? { ...form, feedUrl: `https://app.reservaflow.com.br/ical/${property.slug}/${form.roomId}.ics` } : form); setForm(null); }}>
            <Field label="Direção">
              <select className="input" value={form.direction} onChange={e => setForm({ ...form, direction: e.target.value as 'import' | 'export' })}>
                <option value="import">Importar do canal (o canal bloqueia datas aqui)</option>
                <option value="export">Exportar para o canal (o canal lê nossa disponibilidade)</option>
              </select>
            </Field>
            <Field label="Canal">
              <select className="input" value={form.channel} onChange={e => setForm({ ...form, channel: e.target.value as Channel })}>
                {[...OTA_CHANNELS, 'site' as Channel, 'outros' as Channel].map(c => <option key={c} value={c}>{CHANNEL_LABELS[c]}</option>)}
              </select>
            </Field>
            <Field label="Quarto">
              <select className="input" value={form.roomId} onChange={e => setForm({ ...form, roomId: e.target.value })}>
                {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </Field>
            {form.direction === 'import' && (
              <Field label="Link iCal do canal *">
                <input className="input" value={form.feedUrl ?? ''} onChange={e => setForm({ ...form, feedUrl: e.target.value })} placeholder="https://ical.booking.com/…" required />
              </Field>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setForm(null)}>Cancelar</button>
              <button type="submit" className="btn-primary">Conectar</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

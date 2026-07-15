import { Building2, BedDouble, BookOpenCheck, AlertTriangle } from 'lucide-react';
import { useStore } from '../lib/store';
import { PageHeader, StatCard } from '../components/ui';
import { fmtDate, fmtDateTime } from '../lib/utils';

const PLAN_LABELS = { basico: 'Básico', profissional: 'Profissional', premium: 'Premium' } as const;
const STATUS_STYLES = {
  ativo: 'bg-emerald-100 text-emerald-700',
  trial: 'bg-amber-100 text-amber-800',
  bloqueado: 'bg-rose-100 text-rose-700',
} as const;

export default function PlatformAdmin() {
  const { db, setOrgStatus, setOrgPlan } = useStore();
  const orgs = db.organizations;
  const errors = db.integrationLogs.filter(l => l.status === 'erro').slice(0, 8);

  return (
    <div>
      <PageHeader title="Administração da plataforma" subtitle="Visão interna do SaaS — clientes, planos e saúde do sistema" />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard icon={<Building2 size={20} />} label="Organizações" value={orgs.length} sub={`${orgs.filter(o => o.status === 'ativo').length} ativas`} />
        <StatCard icon={<BedDouble size={20} />} label="Quartos na base" value={db.rooms.length} />
        <StatCard icon={<BookOpenCheck size={20} />} label="Reservas na base" value={db.reservations.filter(r => !['bloqueada', 'manutencao'].includes(r.status)).length} />
        <StatCard icon={<AlertTriangle size={20} />} label="Erros de integração" value={errors.length} tone={errors.length ? 'danger' : 'success'} />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <div className="card overflow-x-auto lg:col-span-2">
          <p className="border-b border-slate-100 px-4 py-3 font-display font-bold">Clientes</p>
          <table className="w-full">
            <thead className="bg-slate-50"><tr><th className="th">Organização</th><th className="th">Plano</th><th className="th">Status</th><th className="th">Desde</th><th className="th">Ações</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {orgs.map(o => (
                <tr key={o.id}>
                  <td className="td font-medium">{o.name}</td>
                  <td className="td">
                    <select className="input !w-auto !py-1 !text-xs" value={o.plan} onChange={e => setOrgPlan(o.id, e.target.value as keyof typeof PLAN_LABELS)}>
                      {Object.entries(PLAN_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </td>
                  <td className="td"><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${STATUS_STYLES[o.status]}`}>{o.status === 'trial' ? 'Trial' : o.status === 'ativo' ? 'Ativo' : 'Bloqueado'}</span></td>
                  <td className="td text-slate-500">{fmtDate(o.createdAt)}</td>
                  <td className="td">
                    {o.status === 'bloqueado'
                      ? <button className="btn-secondary !px-3 !py-1 !text-xs" onClick={() => setOrgStatus(o.id, 'ativo')}>Ativar</button>
                      : <button className="btn-ghost !px-3 !py-1 !text-xs text-rose-600 hover:bg-rose-50" onClick={() => setOrgStatus(o.id, 'bloqueado')}>Bloquear</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card p-4 h-fit">
          <p className="font-display font-bold mb-3">Erros recentes</p>
          <div className="space-y-2.5">
            {errors.map(e => (
              <div key={e.id} className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2">
                <p className="text-sm text-rose-700">{e.message}</p>
                <p className="text-[11px] text-rose-400">{fmtDateTime(e.createdAt)}</p>
              </div>
            ))}
            {errors.length === 0 && <p className="text-sm text-slate-500">Nenhum erro registrado. ✅</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { useStore } from '../lib/store';
import { Logo } from '../components/ui';
import { ROLE_LABELS } from '../lib/utils';

export default function Login() {
  const { db, login } = useStore();
  const navigate = useNavigate();
  const [email, setEmail] = useState('marina@pousadasoldorio.com.br');
  const [password, setPassword] = useState('demo1234');
  const [error, setError] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const u = login(email);
    if (!u) { setError('E-mail não encontrado. Use um dos acessos de demonstração abaixo.'); return; }
    navigate(u.role === 'housekeeping' ? '/app/governanca' : u.role === 'platform_admin' ? '/app/admin' : '/app');
  };

  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex w-1/2 flex-col justify-between bg-brand-950 p-10 text-white">
        <Logo light size="lg" />
        <div>
          <h2 className="font-display text-3xl font-bold leading-snug">Toda a operação da sua hospedagem<br />em um único lugar.</h2>
          <p className="mt-3 max-w-md text-white/70">Mapa de reservas, check-in rápido, financeiro claro e sincronização de calendários com os principais canais de venda.</p>
        </div>
        <p className="text-xs text-white/40">© {new Date().getFullYear()} ReservaFlow — Gestão inteligente para hospedagens</p>
      </div>
      <div className="flex flex-1 items-center justify-center bg-slate-100 p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-6 flex justify-center"><Logo /></div>
          <div className="card p-6">
            <h1 className="font-display text-xl font-bold text-slate-900">Entrar</h1>
            <p className="text-sm text-slate-500 mb-4">Acesse o painel da sua hospedagem.</p>
            <form onSubmit={submit} className="space-y-3">
              <div>
                <label className="label">E-mail</label>
                <input className="input" value={email} onChange={e => setEmail(e.target.value)} type="email" required />
              </div>
              <div>
                <label className="label">Senha</label>
                <input className="input" value={password} onChange={e => setPassword(e.target.value)} type="password" required />
              </div>
              {error && <p className="text-sm text-rose-600">{error}</p>}
              <button className="btn-primary w-full" type="submit"><LogIn size={16} /> Entrar</button>
            </form>
          </div>
          <div className="card mt-4 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">Acessos de demonstração (senha: qualquer)</p>
            <div className="space-y-1">
              {db.users.map(u => (
                <button key={u.id} onClick={() => { setEmail(u.email); setError(''); }}
                  className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm hover:bg-slate-50">
                  <span className="text-slate-700">{u.name}</span>
                  <span className="text-xs text-slate-400">{ROLE_LABELS[u.role]}</span>
                </button>
              ))}
            </div>
          </div>
          <p className="mt-4 text-center text-sm text-slate-500">
            <Link to="/" className="text-brand-600 font-semibold hover:underline">← Voltar para o site</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

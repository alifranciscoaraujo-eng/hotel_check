import { Link } from 'react-router-dom';
import {
  CalendarRange, Wallet, Sparkles, Globe, BarChart3, Plug, CheckCircle2,
  AlertTriangle, TableProperties, MessageSquareWarning, TrendingUp, Users,
} from 'lucide-react';
import { Logo } from '../components/ui';

const PLANS = [
  { name: 'Básico', price: 'R$ 89', desc: 'Para quem está saindo da planilha', items: ['Até 10 quartos', 'Reservas manuais', 'Cadastro de hóspedes', 'Mapa de reservas', 'Dashboard simples'] },
  { name: 'Profissional', price: 'R$ 179', desc: 'O mais escolhido pelas pousadas', items: ['Até 30 quartos', 'Financeiro completo', 'Relatórios em PDF e Excel', 'Motor de reservas próprio', 'Sincronização iCal (Booking, Airbnb)'], featured: true },
  { name: 'Premium', price: 'R$ 299', desc: 'Para operações maiores', items: ['Quartos ilimitados', 'Multiusuários com permissões', 'Relatórios avançados', 'Integrações avançadas', 'Suporte prioritário'] },
];

export default function Landing() {
  return (
    <div className="bg-white text-slate-800">
      <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Logo />
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a href="#funcionalidades" className="hover:text-brand-600">Funcionalidades</a>
            <a href="#planos" className="hover:text-brand-600">Planos</a>
            <Link to="/reservar/pousada-sol-do-rio" className="hover:text-brand-600">Demo do motor de reservas</Link>
          </nav>
          <Link to="/login" className="btn-primary">Entrar</Link>
        </div>
      </header>

      <section className="bg-gradient-to-b from-brand-950 to-brand-800 text-white">
        <div className="mx-auto max-w-6xl px-4 py-20 text-center">
          <span className="inline-block rounded-full bg-white/10 px-4 py-1 text-xs font-semibold tracking-wide">PMS + Motor de reservas + Sincronização de canais</span>
          <h1 className="mx-auto mt-5 max-w-3xl font-display text-4xl md:text-5xl font-extrabold leading-tight">
            Organize sua hospedagem em uma única plataforma
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/75">
            Chega de planilha, caderno e agenda. O ReservaFlow reúne reservas, quartos, hóspedes, financeiro e canais de venda em um painel simples feito para pousadas, hotéis, hostels e chalés.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/login" className="btn bg-white text-brand-800 hover:bg-brand-50 px-6 py-3 text-base">Testar grátis</Link>
            <Link to="/login" className="btn border border-white/40 text-white hover:bg-white/10 px-6 py-3 text-base">Ver demonstração</Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-center font-display text-2xl md:text-3xl font-bold">Sua rotina hoje parece com isso?</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: <AlertTriangle className="text-rose-500" />, t: 'Overbooking', d: 'Dois hóspedes para o mesmo quarto porque o caderno não avisou.' },
            { icon: <TableProperties className="text-amber-500" />, t: 'Planilhas frágeis', d: 'Fórmulas quebradas, versões duplicadas e ninguém sabe qual vale.' },
            { icon: <MessageSquareWarning className="text-orange-500" />, t: 'Reservas perdidas', d: 'Pedidos no WhatsApp que ninguém respondeu a tempo.' },
            { icon: <Wallet className="text-slate-500" />, t: 'Financeiro no escuro', d: 'Sem saber quanto entrou, quanto falta receber e quanto a OTA levou.' },
          ].map(x => (
            <div key={x.t} className="card p-5">
              <div className="mb-2">{x.icon}</div>
              <p className="font-bold">{x.t}</p>
              <p className="mt-1 text-sm text-slate-500">{x.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="funcionalidades" className="bg-slate-50 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center font-display text-2xl md:text-3xl font-bold">Tudo o que sua hospedagem precisa</h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-slate-500">Do check-in à governança, do financeiro à sincronização com a Booking e o Airbnb.</p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: <CalendarRange />, t: 'Mapa de reservas', d: 'Grade visual por quarto e por dia, com bloqueio automático contra overbooking.' },
              { icon: <Users />, t: 'Hóspedes e check-in', d: 'Ficha completa do hóspede, histórico de hospedagens e check-in em poucos cliques.' },
              { icon: <Sparkles />, t: 'Governança', d: 'Status de limpeza em tempo real: sujo, em limpeza, limpo e vistoriado.' },
              { icon: <Wallet />, t: 'Financeiro', d: 'Contas a receber, sinal, saldo pendente, despesas e comissões por canal.' },
              { icon: <Globe />, t: 'Motor de reservas', d: 'Página pública para receber reservas diretas, sem pagar comissão.' },
              { icon: <Plug />, t: 'Sincronização de canais', d: 'Calendários iCal com Booking, Airbnb e outros — preparado para Channel Manager.' },
            ].map(x => (
              <div key={x.t} className="card p-5">
                <div className="mb-3 inline-flex rounded-lg bg-brand-50 p-2.5 text-brand-600">{x.icon}</div>
                <p className="font-bold">{x.t}</p>
                <p className="mt-1 text-sm text-slate-500">{x.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-2xl md:text-3xl font-bold">Resultados desde a primeira semana</h2>
            <ul className="mt-6 space-y-3">
              {['Menos retrabalho e anotações duplicadas', 'Fim do overbooking com bloqueio automático', 'Visão gerencial com ocupação, diária média e RevPAR', 'Mais reservas diretas sem comissão de OTA', 'Equipe alinhada: recepção, governança e financeiro no mesmo sistema'].map(b => (
                <li key={b} className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-500" size={20} />
                  <span className="text-slate-700">{b}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="card p-6 bg-brand-950 text-white border-0">
            <TrendingUp size={28} className="text-brand-300" />
            <p className="mt-4 font-display text-xl font-bold">“Painel executivo com os indicadores que o dono precisa ver.”</p>
            <p className="mt-2 text-sm text-white/70">Taxa de ocupação, diária média, RevPAR, receita prevista × realizada, cancelamentos e desempenho por canal — atualizados em tempo real.</p>
            <BarChart3 size={80} className="mt-6 text-white/20" />
          </div>
        </div>
      </section>

      <section id="planos" className="bg-slate-50 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center font-display text-2xl md:text-3xl font-bold">Planos para cada tamanho de hospedagem</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {PLANS.map(p => (
              <div key={p.name} className={`card p-6 ${p.featured ? 'ring-2 ring-brand-500 relative' : ''}`}>
                {p.featured && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-3 py-0.5 text-xs font-bold text-white">Mais popular</span>}
                <p className="font-display text-lg font-bold">{p.name}</p>
                <p className="text-sm text-slate-500">{p.desc}</p>
                <p className="mt-3"><span className="font-display text-3xl font-extrabold">{p.price}</span><span className="text-sm text-slate-500">/mês</span></p>
                <ul className="mt-4 space-y-2 text-sm">
                  {p.items.map(i => <li key={i} className="flex items-start gap-2"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-500" />{i}</li>)}
                </ul>
                <Link to="/login" className={`mt-6 w-full ${p.featured ? 'btn-primary' : 'btn-secondary'}`}>Começar agora</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-brand-950 py-16 text-center text-white">
        <h2 className="font-display text-2xl md:text-3xl font-bold">Organize sua hospedagem em uma única plataforma.</h2>
        <p className="mt-2 text-white/70">Teste grátis, sem cartão de crédito.</p>
        <Link to="/login" className="btn bg-white text-brand-800 hover:bg-brand-50 mt-6 px-8 py-3 text-base">Criar minha conta</Link>
      </section>

      <footer className="border-t border-slate-100 py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 text-sm text-slate-500">
          <Logo size="sm" />
          <p>© {new Date().getFullYear()} ReservaFlow — Gestão inteligente para hospedagens</p>
        </div>
      </footer>
    </div>
  );
}

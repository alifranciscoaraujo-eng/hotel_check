import { Link } from 'react-router-dom';
import { ExternalLink, Globe } from 'lucide-react';
import { useStore } from '../lib/store';
import { Field, PageHeader } from '../components/ui';
import type { Property } from '../lib/types';

const CONFIRM_MODES: { id: Property['bookingConfirmMode']; label: string; desc: string }[] = [
  { id: 'imediata', label: 'Reserva imediata', desc: 'A reserva entra confirmada direto no mapa.' },
  { id: 'pre_reserva', label: 'Pré-reserva', desc: 'Entra como pré-reserva e sua equipe confirma manualmente.' },
  { id: 'pagamento', label: 'Mediante pagamento', desc: 'Confirmada apenas após pagamento integral (integração de pagamento futura).' },
  { id: 'sinal', label: 'Mediante sinal', desc: 'Confirmada após pagamento de sinal (integração de pagamento futura).' },
];

export default function BookingEngineAdmin() {
  const { db, propertyId, saveProperty } = useStore();
  const property = db.properties.find(p => p.id === propertyId)!;
  const publicUrl = `/reservar/${property.slug}`;

  return (
    <div>
      <PageHeader title="Motor de reservas" subtitle="Receba reservas diretas pela sua própria página, sem comissão"
        actions={<Link to={publicUrl} target="_blank" className="btn-primary"><ExternalLink size={16} /> Abrir página pública</Link>} />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Globe size={18} className="text-brand-600" />
            <p className="font-display font-bold">Configuração</p>
          </div>

          <label className="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-3">
            <input type="checkbox" className="h-4 w-4 rounded" checked={property.bookingEngineEnabled}
              onChange={e => saveProperty({ bookingEngineEnabled: e.target.checked })} />
            <div>
              <p className="text-sm font-semibold">Motor de reservas ativo</p>
              <p className="text-xs text-slate-500">Quando desativado, a página pública mostra apenas contato por WhatsApp.</p>
            </div>
          </label>

          <div className="mt-4">
            <p className="label">Como confirmar reservas do site</p>
            <div className="space-y-2">
              {CONFIRM_MODES.map(m => (
                <label key={m.id} className={`flex items-start gap-3 rounded-lg border px-4 py-3 cursor-pointer ${property.bookingConfirmMode === m.id ? 'border-brand-500 bg-brand-50' : 'border-slate-200'}`}>
                  <input type="radio" name="mode" className="mt-1" checked={property.bookingConfirmMode === m.id}
                    onChange={() => saveProperty({ bookingConfirmMode: m.id })} />
                  <div>
                    <p className="text-sm font-semibold">{m.label}</p>
                    <p className="text-xs text-slate-500">{m.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <Field label="Mensagem de confirmação exibida ao hóspede">
              <textarea className="input" rows={3} value={property.bookingWelcomeMessage}
                onChange={e => saveProperty({ bookingWelcomeMessage: e.target.value })} />
            </Field>
          </div>
        </div>

        <div className="card p-5">
          <p className="font-display font-bold mb-3">Sua página pública</p>
          <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3">
            <p className="text-xs text-slate-500">Endereço da página de reservas</p>
            <p className="font-mono text-sm font-semibold text-brand-700 break-all">reservaflow.com.br{publicUrl}</p>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-slate-600">
            <li>✅ O hóspede escolhe as datas e vê somente acomodações realmente disponíveis;</li>
            <li>✅ Os preços seguem o calendário tarifário (fim de semana, alta temporada, promoções);</li>
            <li>✅ A reserva entra automaticamente no mapa e no dashboard;</li>
            <li>✅ Overbooking é bloqueado na hora da solicitação;</li>
            <li>✅ Você recebe uma notificação a cada nova solicitação.</li>
          </ul>
          <p className="mt-4 rounded-lg bg-amber-50/70 border border-amber-200/70 px-3 py-2 text-xs text-amber-800">
            Dica: divulgue este link no Instagram, no Google Maps e no WhatsApp da pousada para aumentar as reservas diretas sem comissão.
          </p>
        </div>
      </div>
    </div>
  );
}

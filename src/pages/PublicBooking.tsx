import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, MapPin, Phone, Users } from 'lucide-react';
import { useStore } from '../lib/store';
import { Field, Logo } from '../components/ui';
import { addDaysISO, money, nightsBetween, todayISO } from '../lib/utils';

export default function PublicBooking() {
  const { slug } = useParams();
  const { db, quoteStay, findConflict, saveGuest, saveReservation, notify } = useStore();
  const property = db.properties.find(p => p.slug === slug);

  const [checkin, setCheckin] = useState(addDaysISO(todayISO(), 1));
  const [checkout, setCheckout] = useState(addDaysISO(todayISO(), 3));
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [guest, setGuest] = useState({ name: '', phone: '', email: '', notes: '', accept: false });
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState('');

  const nights = nightsBetween(checkin, checkout);

  // Disponibilidade: tipos com pelo menos um quarto livre no período
  const availability = useMemo(() => {
    if (!property || nights <= 0) return [];
    const types = db.roomTypes.filter(t => t.propertyId === property.id && t.status === 'ativo');
    return types.map(t => {
      const rooms = db.rooms.filter(r => r.propertyId === property.id && r.roomTypeId === t.id);
      const freeRoom = rooms.find(r => !findConflict(r.id, checkin, checkout) && r.status !== 'manutencao' && r.status !== 'bloqueado');
      const fits = t.capacityAdults + t.capacityChildren >= adults + children && t.capacityAdults >= Math.min(adults, t.capacityAdults);
      const quote = quoteStay(t.id, checkin, checkout, adults);
      return { type: t, freeRoom, fits, total: quote.total };
    }).filter(x => x.freeRoom && x.fits && x.type.capacityAdults + x.type.capacityChildren >= adults + children);
  }, [db, property, checkin, checkout, adults, children, nights]);

  if (!property) return <div className="flex min-h-screen items-center justify-center text-slate-500">Hospedagem não encontrada.</div>;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const sel = availability.find(a => a.type.id === selectedType);
    if (!sel || !sel.freeRoom) { setError('Selecione uma acomodação disponível.'); return; }
    if (!guest.accept) { setError('É preciso aceitar as políticas da hospedagem.'); return; }
    const g = saveGuest({ name: guest.name, phone: guest.phone, whatsapp: guest.phone, email: guest.email });
    const status = property.bookingConfirmMode === 'imediata' ? 'confirmada' : 'pre_reserva';
    const res = saveReservation({
      guestId: g.id, roomId: sel.freeRoom.id, roomTypeId: sel.type.id, channel: 'site', status,
      checkinDate: checkin, checkoutDate: checkout, adults, children,
      dailyRate: sel.total / nights, totalAmount: sel.total, guestNotes: guest.notes,
      expiresAt: status === 'pre_reserva' ? addDaysISO(todayISO(), 2) : null,
    });
    if (!res.ok) { setError('Ops! Este quarto acabou de ser reservado. Escolha outra acomodação.'); return; }
    notify('motor', `Nova ${status === 'confirmada' ? 'reserva' : 'pré-reserva'} pelo motor de reservas: ${res.reservation?.code} (${sel.type.name}).`);
    setDone(res.reservation?.code ?? '');
  };

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
        <div className="card max-w-md p-8 text-center">
          <CheckCircle2 size={48} className="mx-auto text-emerald-500" />
          <h1 className="mt-4 font-display text-xl font-bold">Solicitação enviada!</h1>
          <p className="mt-2 text-sm text-slate-600">{property.bookingWelcomeMessage}</p>
          <p className="mt-4 rounded-lg bg-slate-50 px-4 py-2 font-mono text-sm">Código: <b>{done}</b></p>
          <a href={`https://wa.me/55${property.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="btn-primary mt-5 w-full">Falar no WhatsApp</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="bg-brand-950 text-white">
        <div className="mx-auto max-w-4xl px-4 py-10">
          <h1 className="font-display text-3xl font-bold">{property.name}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/70">
            <span className="flex items-center gap-1"><MapPin size={14} /> {property.address}, {property.city}/{property.state}</span>
            <span className="flex items-center gap-1"><Phone size={14} /> {property.whatsapp}</span>
          </p>
          <p className="mt-3 text-sm text-white/80">Check-in a partir de {property.checkinTime} · Check-out até {property.checkoutTime}</p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-6 pb-16">
        {!property.bookingEngineEnabled ? (
          <div className="card p-8 text-center">
            <p className="font-semibold text-slate-700">Reservas online temporariamente indisponíveis.</p>
            <a href={`https://wa.me/55${property.whatsapp.replace(/\D/g, '')}`} className="btn-primary mt-4">Reservar pelo WhatsApp</a>
          </div>
        ) : (
          <>
            <div className="card -mt-10 relative z-10 grid grid-cols-2 gap-3 p-4 md:grid-cols-5">
              <Field label="Entrada"><input type="date" min={todayISO()} className="input" value={checkin} onChange={e => { setCheckin(e.target.value); setSelectedType(null); }} /></Field>
              <Field label="Saída"><input type="date" min={checkin} className="input" value={checkout} onChange={e => { setCheckout(e.target.value); setSelectedType(null); }} /></Field>
              <Field label="Adultos"><input type="number" min={1} className="input" value={adults} onChange={e => { setAdults(+e.target.value); setSelectedType(null); }} /></Field>
              <Field label="Crianças"><input type="number" min={0} className="input" value={children} onChange={e => { setChildren(+e.target.value); setSelectedType(null); }} /></Field>
              <div className="col-span-2 flex items-end md:col-span-1">
                <div className="w-full rounded-lg bg-brand-50 px-3 py-2 text-center text-sm font-semibold text-brand-700">{nights > 0 ? `${nights} diária${nights > 1 ? 's' : ''}` : 'Escolha as datas'}</div>
              </div>
            </div>

            <h2 className="mt-6 mb-3 font-display text-lg font-bold text-slate-800">Acomodações disponíveis</h2>
            {nights <= 0 ? (
              <div className="card p-6 text-center text-slate-500">A data de saída precisa ser depois da entrada.</div>
            ) : availability.length === 0 ? (
              <div className="card p-6 text-center text-slate-500">
                Nenhuma acomodação disponível para {adults + children} pessoa(s) neste período.<br />
                <a className="font-semibold text-brand-600 underline" href={`https://wa.me/55${property.whatsapp.replace(/\D/g, '')}`}>Fale conosco no WhatsApp</a> — pode haver opções com datas flexíveis.
              </div>
            ) : (
              <div className="space-y-3">
                {availability.map(({ type: t, total }) => (
                  <button key={t.id} onClick={() => setSelectedType(t.id)}
                    className={`card w-full p-4 text-left transition-all ${selectedType === t.id ? 'ring-2 ring-brand-500' : 'hover:shadow-md'}`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex gap-3 min-w-0">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-3xl">{t.photoEmoji}</div>
                        <div className="min-w-0">
                          <p className="font-display font-bold text-slate-900">{t.name}</p>
                          <p className="text-sm text-slate-500">{t.description}</p>
                          <p className="mt-1 flex items-center gap-1 text-xs text-slate-400"><Users size={13} /> Até {t.capacityAdults} adultos + {t.capacityChildren} crianças</p>
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {t.amenities.slice(0, 4).map(a => <span key={a} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">{a}</span>)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-display text-xl font-extrabold text-brand-700">{money(total)}</p>
                        <p className="text-xs text-slate-400">total · {money(total / nights)}/noite</p>
                        {selectedType === t.id && <p className="mt-1 text-xs font-bold text-brand-600">✓ Selecionado</p>}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {selectedType && nights > 0 && (
              <form onSubmit={submit} className="card mt-6 p-5">
                <h3 className="font-display font-bold text-slate-800 mb-3">Seus dados</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Nome completo *"><input className="input" required value={guest.name} onChange={e => setGuest({ ...guest, name: e.target.value })} /></Field>
                  <Field label="WhatsApp *"><input className="input" required value={guest.phone} onChange={e => setGuest({ ...guest, phone: e.target.value })} placeholder="(00) 00000-0000" /></Field>
                  <Field label="E-mail" className="sm:col-span-2"><input type="email" className="input" value={guest.email} onChange={e => setGuest({ ...guest, email: e.target.value })} /></Field>
                  <Field label="Observações (chegada, pedidos especiais…)" className="sm:col-span-2">
                    <textarea className="input" rows={2} value={guest.notes} onChange={e => setGuest({ ...guest, notes: e.target.value })} />
                  </Field>
                </div>
                <div className="mt-4 rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600">
                  <p className="font-bold text-slate-700 mb-1">Políticas da hospedagem</p>
                  <p>{property.cancellationPolicy}</p>
                  <p className="mt-1">{property.childrenPolicy} {property.petsPolicy}</p>
                </div>
                <label className="mt-3 flex items-center gap-2 text-sm">
                  <input type="checkbox" className="rounded" checked={guest.accept} onChange={e => setGuest({ ...guest, accept: e.target.checked })} />
                  Li e aceito as políticas da hospedagem *
                </label>
                {error && <p className="mt-2 text-sm font-semibold text-rose-600">{error}</p>}
                <button type="submit" className="btn-primary mt-4 w-full py-3 text-base">
                  {property.bookingConfirmMode === 'imediata' ? 'Confirmar reserva' : 'Solicitar reserva'} — {money(availability.find(a => a.type.id === selectedType)?.total ?? 0)}
                </button>
              </form>
            )}
          </>
        )}

        <div className="mt-10 flex items-center justify-center gap-2 text-xs text-slate-400">
          Reservas online por <Logo size="sm" />
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Copy, CreditCard, DoorClosed, DoorOpen, FileText, MessageCircle, Pencil, XCircle } from 'lucide-react';
import { useStore } from '../lib/store';
import type { Channel, PaymentMethod, Reservation, ReservationStatus } from '../lib/types';
import {
  CHANNEL_LABELS, PAYMENT_LABELS, RES_STATUS_LABELS, fmtDate, money,
  nightsBetween, todayISO, addDaysISO,
} from '../lib/utils';
import { ChannelBadge, ConfirmDialog, Field, Modal, StatusBadge } from './ui';
import { exportVoucherPDF } from '../lib/pdf';

const EDITABLE_STATUSES: ReservationStatus[] = ['pre_reserva', 'confirmada', 'hospedado', 'bloqueada'];

export function ReservationFormModal({ open, onClose, reservation, defaults }: {
  open: boolean; onClose: () => void; reservation?: Reservation | null;
  defaults?: { roomId?: string; checkinDate?: string };
}) {
  const { db, propertyId, saveReservation, quoteStay, findConflict, saveGuest } = useStore();
  const rooms = db.rooms.filter(r => r.propertyId === propertyId);
  const guests = db.guests.filter(g => g.propertyId === propertyId);

  const [f, setF] = useState({
    guestId: '', newGuestName: '', newGuestPhone: '', roomId: '', channel: 'balcao' as Channel,
    status: 'confirmada' as ReservationStatus, checkinDate: todayISO(), checkoutDate: addDaysISO(todayISO(), 1),
    adults: 2, children: 0, dailyRate: 0, discount: 0, fees: 0, arrivalTime: '',
    internalNotes: '', guestNotes: '', manualRate: false,
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    if (reservation) {
      setF({
        guestId: reservation.guestId ?? '', newGuestName: '', newGuestPhone: '',
        roomId: reservation.roomId, channel: reservation.channel, status: reservation.status,
        checkinDate: reservation.checkinDate, checkoutDate: reservation.checkoutDate,
        adults: reservation.adults, children: reservation.children, dailyRate: reservation.dailyRate,
        discount: reservation.discount, fees: reservation.fees, arrivalTime: reservation.arrivalTime,
        internalNotes: reservation.internalNotes, guestNotes: reservation.guestNotes, manualRate: true,
      });
    } else {
      setF(prev => ({
        ...prev, guestId: '', newGuestName: '', roomId: defaults?.roomId ?? '',
        checkinDate: defaults?.checkinDate ?? todayISO(),
        checkoutDate: addDaysISO(defaults?.checkinDate ?? todayISO(), 1),
        status: 'confirmada', channel: 'balcao', dailyRate: 0, discount: 0, fees: 0,
        internalNotes: '', guestNotes: '', arrivalTime: '', manualRate: false,
      }));
    }
  }, [open, reservation, defaults?.roomId, defaults?.checkinDate]);

  const room = rooms.find(r => r.id === f.roomId);
  const nights = nightsBetween(f.checkinDate, f.checkoutDate);
  const quote = useMemo(
    () => (room ? quoteStay(room.roomTypeId, f.checkinDate, f.checkoutDate, f.adults) : { total: 0, nightly: [] }),
    [room?.roomTypeId, f.checkinDate, f.checkoutDate, f.adults]
  );
  const suggestedRate = nights > 0 ? quote.total / nights : 0;
  const rate = f.manualRate ? f.dailyRate : suggestedRate;
  const total = Math.max(0, rate * nights - f.discount + f.fees);
  const conflict = f.roomId && nights > 0 ? findConflict(f.roomId, f.checkinDate, f.checkoutDate, reservation?.id) : null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (nights <= 0) { setError('A data de saída deve ser posterior à de entrada.'); return; }
    if (!f.roomId) { setError('Selecione um quarto.'); return; }
    let guestId = f.guestId;
    if (!guestId && f.status !== 'bloqueada') {
      if (!f.newGuestName.trim()) { setError('Selecione um hóspede ou informe o nome para cadastro rápido.'); return; }
      guestId = saveGuest({ name: f.newGuestName.trim(), phone: f.newGuestPhone, whatsapp: f.newGuestPhone }).id;
    }
    const res = saveReservation({
      id: reservation?.id, guestId: f.status === 'bloqueada' ? null : guestId,
      roomId: f.roomId, roomTypeId: room!.roomTypeId, channel: f.channel, status: f.status,
      checkinDate: f.checkinDate, checkoutDate: f.checkoutDate, adults: f.adults, children: f.children,
      dailyRate: rate, discount: f.discount, fees: f.fees, totalAmount: total,
      arrivalTime: f.arrivalTime, internalNotes: f.internalNotes, guestNotes: f.guestNotes,
      expiresAt: f.status === 'pre_reserva' ? addDaysISO(todayISO(), 2) : null,
    });
    if (!res.ok) { setError(res.error ?? 'Erro ao salvar.'); return; }
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={reservation ? `Editar reserva ${reservation.code}` : 'Nova reserva'} wide>
      <form onSubmit={submit} className="space-y-4">
        {conflict && (
          <div className="flex items-start gap-2 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
            <AlertTriangle size={17} className="mt-0.5 shrink-0" />
            <span>Este quarto já possui <b>{conflict.code}</b> ({RES_STATUS_LABELS[conflict.status]}) de {fmtDate(conflict.checkinDate)} a {fmtDate(conflict.checkoutDate)}. Salvar será bloqueado para evitar overbooking.</span>
          </div>
        )}
        {error && <div className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{error}</div>}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Hóspede">
            <select className="input" value={f.guestId} onChange={e => setF({ ...f, guestId: e.target.value })} disabled={f.status === 'bloqueada'}>
              <option value="">— Cadastro rápido abaixo —</option>
              {guests.map(g => <option key={g.id} value={g.id}>{g.name}{g.vip ? ' ⭐' : ''}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select className="input" value={f.status} onChange={e => setF({ ...f, status: e.target.value as ReservationStatus })}>
              {EDITABLE_STATUSES.map(s => <option key={s} value={s}>{RES_STATUS_LABELS[s]}</option>)}
            </select>
          </Field>
          {!f.guestId && f.status !== 'bloqueada' && (
            <>
              <Field label="Nome do hóspede (cadastro rápido)">
                <input className="input" value={f.newGuestName} onChange={e => setF({ ...f, newGuestName: e.target.value })} placeholder="Nome completo" />
              </Field>
              <Field label="Telefone / WhatsApp">
                <input className="input" value={f.newGuestPhone} onChange={e => setF({ ...f, newGuestPhone: e.target.value })} placeholder="(00) 00000-0000" />
              </Field>
            </>
          )}
          <Field label="Quarto">
            <select className="input" value={f.roomId} onChange={e => setF({ ...f, roomId: e.target.value, manualRate: false })}>
              <option value="">Selecione…</option>
              {rooms.map(r => {
                const rt = db.roomTypes.find(t => t.id === r.roomTypeId);
                return <option key={r.id} value={r.id}>{r.name} — {rt?.name}</option>;
              })}
            </select>
          </Field>
          <Field label="Canal / Origem">
            <select className="input" value={f.channel} onChange={e => setF({ ...f, channel: e.target.value as Channel })}>
              {(Object.keys(CHANNEL_LABELS) as Channel[]).map(c => <option key={c} value={c}>{CHANNEL_LABELS[c]}</option>)}
            </select>
          </Field>
          <Field label="Check-in">
            <input type="date" className="input" value={f.checkinDate} onChange={e => setF({ ...f, checkinDate: e.target.value, manualRate: false })} />
          </Field>
          <Field label="Check-out">
            <input type="date" className="input" value={f.checkoutDate} onChange={e => setF({ ...f, checkoutDate: e.target.value, manualRate: false })} />
          </Field>
          <Field label="Adultos">
            <input type="number" min={0} className="input" value={f.adults} onChange={e => setF({ ...f, adults: +e.target.value })} />
          </Field>
          <Field label="Crianças">
            <input type="number" min={0} className="input" value={f.children} onChange={e => setF({ ...f, children: +e.target.value })} />
          </Field>
          <Field label={`Diária (sugerida: ${money(suggestedRate || 0)})`}>
            <input type="number" min={0} step="0.01" className="input" value={rate ? Number(rate.toFixed(2)) : 0}
              onChange={e => setF({ ...f, dailyRate: +e.target.value, manualRate: true })} />
          </Field>
          <Field label="Horário previsto de chegada">
            <input type="time" className="input" value={f.arrivalTime} onChange={e => setF({ ...f, arrivalTime: e.target.value })} />
          </Field>
          <Field label="Desconto (R$)">
            <input type="number" min={0} step="0.01" className="input" value={f.discount} onChange={e => setF({ ...f, discount: +e.target.value })} />
          </Field>
          <Field label="Taxas (R$)">
            <input type="number" min={0} step="0.01" className="input" value={f.fees} onChange={e => setF({ ...f, fees: +e.target.value })} />
          </Field>
          <Field label="Observações internas" className="sm:col-span-2">
            <textarea className="input" rows={2} value={f.internalNotes} onChange={e => setF({ ...f, internalNotes: e.target.value })} />
          </Field>
        </div>

        <div className="flex items-center justify-between rounded-lg bg-slate-50 border border-slate-200 px-4 py-3">
          <div className="text-sm text-slate-600">{nights > 0 ? `${nights} diária${nights > 1 ? 's' : ''} × ${money(rate || 0)}` : 'Período inválido'}</div>
          <div className="text-lg font-bold font-display text-slate-900">{money(total)}</div>
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={!!conflict}>{reservation ? 'Salvar alterações' : 'Criar reserva'}</button>
        </div>
      </form>
    </Modal>
  );
}

export function ReservationDetailModal({ open, onClose, reservationId, onEdit }: {
  open: boolean; onClose: () => void; reservationId: string | null; onEdit: (r: Reservation) => void;
}) {
  const { db, propertyId, paidAmount, doCheckin, doCheckout, cancelReservation, addPayment, setReservationStatus } = useStore();
  const [payOpen, setPayOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [pay, setPay] = useState({ amount: 0, method: 'pix' as PaymentMethod, notes: '' });
  const [copied, setCopied] = useState(false);

  const r = db.reservations.find(x => x.id === reservationId);
  if (!open || !r) return null;

  const guest = db.guests.find(g => g.id === r.guestId);
  const room = db.rooms.find(x => x.id === r.roomId);
  const rt = db.roomTypes.find(t => t.id === r.roomTypeId);
  const property = db.properties.find(p => p.id === propertyId)!;
  const paid = paidAmount(r.id);
  const balance = r.totalAmount - paid;
  const payments = db.payments.filter(p => p.reservationId === r.id);
  const nights = nightsBetween(r.checkinDate, r.checkoutDate);
  const isBlock = r.status === 'bloqueada' || r.status === 'manutencao';

  const whatsappMsg = `Olá${guest ? `, ${guest.name.split(' ')[0]}` : ''}! Sua reserva na ${property.name} está ${RES_STATUS_LABELS[r.status].toLowerCase()}.\n\n📋 Reserva: ${r.code}\n🛏️ Acomodação: ${rt?.name ?? ''} (${room?.name ?? ''})\n📅 Entrada: ${fmtDate(r.checkinDate)} a partir de ${property.checkinTime}\n📅 Saída: ${fmtDate(r.checkoutDate)} até ${property.checkoutTime}\n💰 Total: ${money(r.totalAmount)}${balance > 0 ? `\n💳 Saldo pendente: ${money(balance)}` : ''}\n\nQualquer dúvida estamos à disposição. Até breve! 🌅`;

  const copyWhatsapp = async () => {
    await navigator.clipboard.writeText(whatsappMsg);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal open={open} onClose={onClose} title={isBlock ? `${RES_STATUS_LABELS[r.status]} — ${room?.name ?? ''}` : `Reserva ${r.code}`} wide>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={r.status} />
          <ChannelBadge channel={r.channel} />
          {r.externalRef && <span className="text-xs text-slate-500">Ref. externa: {r.externalRef}</span>}
          {r.status === 'pre_reserva' && r.expiresAt && <span className="text-xs font-semibold text-amber-700">Expira em {fmtDate(r.expiresAt)}</span>}
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
          {!isBlock && <div><p className="label">Hóspede</p><p className="font-semibold">{guest?.name ?? '—'}{guest?.vip && ' ⭐'}</p></div>}
          <div><p className="label">Quarto</p><p className="font-semibold">{room?.name} · {rt?.name}</p></div>
          <div><p className="label">Período</p><p className="font-semibold">{fmtDate(r.checkinDate)} → {fmtDate(r.checkoutDate)} <span className="text-slate-400">({nights}n)</span></p></div>
          {!isBlock && <div><p className="label">Ocupantes</p><p className="font-semibold">{r.adults} adulto(s){r.children > 0 ? `, ${r.children} criança(s)` : ''}</p></div>}
          {!isBlock && <div><p className="label">Diária</p><p className="font-semibold">{money(r.dailyRate)}</p></div>}
          {!isBlock && <div><p className="label">Total</p><p className="font-semibold">{money(r.totalAmount)}</p></div>}
          {!isBlock && <div><p className="label">Pago</p><p className="font-semibold text-emerald-700">{money(paid)}</p></div>}
          {!isBlock && <div><p className="label">Saldo</p><p className={`font-semibold ${balance > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>{money(balance)}</p></div>}
          {r.arrivalTime && <div><p className="label">Chegada prevista</p><p className="font-semibold">{r.arrivalTime}</p></div>}
        </div>

        {r.internalNotes && !r.internalNotes.startsWith('#mt:') && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">{r.internalNotes}</div>
        )}

        {!isBlock && payments.length > 0 && (
          <div>
            <p className="label">Pagamentos</p>
            <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {payments.map(p => (
                <div key={p.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span>{PAYMENT_LABELS[p.method]}{p.notes ? ` · ${p.notes}` : ''}</span>
                  <span className={`font-semibold ${p.amount < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>{money(p.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
          {r.status === 'pre_reserva' && (
            <button className="btn-primary" onClick={() => setReservationStatus(r.id, 'confirmada')}>Confirmar reserva</button>
          )}
          {r.status === 'confirmada' && (
            <button className="btn-primary" onClick={() => { doCheckin(r.id); }}><DoorOpen size={16} /> Check-in</button>
          )}
          {r.status === 'hospedado' && (
            <button className="btn-primary" onClick={() => { doCheckout(r.id); }}><DoorClosed size={16} /> Check-out</button>
          )}
          {!isBlock && r.status !== 'cancelada' && r.status !== 'finalizada' && (
            <button className="btn-secondary" onClick={() => { setPay({ amount: Math.max(0, balance), method: 'pix', notes: '' }); setPayOpen(true); }}><CreditCard size={16} /> Pagamento</button>
          )}
          {EDITABLE_STATUSES.includes(r.status) && (
            <button className="btn-secondary" onClick={() => { onClose(); onEdit(r); }}><Pencil size={16} /> Editar</button>
          )}
          {!isBlock && (
            <>
              <button className="btn-secondary" onClick={copyWhatsapp}><MessageCircle size={16} /> {copied ? 'Copiado!' : 'Mensagem WhatsApp'}</button>
              <button className="btn-secondary" onClick={() => exportVoucherPDF(property, r, guest, room, rt, paid)}><FileText size={16} /> Voucher PDF</button>
            </>
          )}
          {r.status !== 'cancelada' && r.status !== 'finalizada' && (
            <button className="btn-ghost text-rose-600 hover:bg-rose-50" onClick={() => setCancelOpen(true)}><XCircle size={16} /> Cancelar</button>
          )}
        </div>
      </div>

      <Modal open={payOpen} onClose={() => setPayOpen(false)} title="Registrar pagamento">
        <div className="space-y-3">
          <Field label="Valor (use negativo para estorno)">
            <input type="number" step="0.01" className="input" value={pay.amount} onChange={e => setPay({ ...pay, amount: +e.target.value })} />
          </Field>
          <Field label="Forma de pagamento">
            <select className="input" value={pay.method} onChange={e => setPay({ ...pay, method: e.target.value as PaymentMethod })}>
              {(Object.keys(PAYMENT_LABELS) as PaymentMethod[]).map(m => <option key={m} value={m}>{PAYMENT_LABELS[m]}</option>)}
            </select>
          </Field>
          <Field label="Observação">
            <input className="input" value={pay.notes} onChange={e => setPay({ ...pay, notes: e.target.value })} placeholder="Ex.: sinal de 50%" />
          </Field>
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setPayOpen(false)}>Voltar</button>
            <button className="btn-primary" onClick={() => {
              if (!pay.amount) return;
              addPayment({ reservationId: r.id, amount: pay.amount, method: pay.method, status: 'pago', paidAt: new Date().toISOString(), notes: pay.notes });
              setPayOpen(false);
            }}>Registrar</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={cancelOpen} onClose={() => setCancelOpen(false)}
        onConfirm={() => { cancelReservation(r.id); onClose(); }}
        title="Cancelar reserva" danger confirmLabel="Cancelar reserva"
        message={`Tem certeza que deseja cancelar ${isBlock ? 'este bloqueio' : `a reserva ${r.code}`}? O quarto ficará disponível para o período.`}
      />
    </Modal>
  );
}

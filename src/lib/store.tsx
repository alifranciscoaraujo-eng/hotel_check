import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type {
  DB, Reservation, Room, Guest, Payment, Expense, RoomType, RateRule,
  MaintenanceTicket, HousekeepingTask, IcalFeed, Notification, ReservationStatus,
  RoomStatus, AppUser, Role, Channel,
} from './types';
import { buildSeed } from './seed';
import { overlaps, uid, todayISO, isWeekendISO, addDaysISO, nightsBetween } from './utils';

const LS_KEY = 'reservaflow-db-v1';
const LS_SESSION = 'reservaflow-session-v1';

function loadDB(): DB {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const db = JSON.parse(raw) as DB;
      if (db.reservations && db.rooms) return db;
    }
  } catch { /* seed abaixo */ }
  const seed = buildSeed();
  localStorage.setItem(LS_KEY, JSON.stringify(seed));
  return seed;
}

interface StoreCtx {
  db: DB;
  currentUser: AppUser | null;
  propertyId: string;
  login: (email: string) => AppUser | null;
  logout: () => void;
  resetDemo: () => void;
  can: (perm: Permission) => boolean;

  // Regras de negócio
  findConflict: (roomId: string, checkin: string, checkout: string, ignoreResId?: string) => Reservation | null;
  rateForDate: (roomTypeId: string, date: string) => number;
  quoteStay: (roomTypeId: string, checkin: string, checkout: string, adults: number) => { total: number; nightly: number[] };
  paidAmount: (resId: string) => number;

  saveReservation: (r: Partial<Reservation> & { roomId: string; checkinDate: string; checkoutDate: string }, userName?: string) => { ok: boolean; error?: string; reservation?: Reservation };
  setReservationStatus: (id: string, status: ReservationStatus) => void;
  doCheckin: (id: string) => void;
  doCheckout: (id: string) => void;
  cancelReservation: (id: string) => void;
  addPayment: (p: Omit<Payment, 'id' | 'propertyId'>) => void;
  setRoomStatus: (roomId: string, status: RoomStatus) => void;
  saveGuest: (g: Partial<Guest>) => Guest;
  saveRoom: (r: Partial<Room>) => void;
  deleteRoom: (id: string) => { ok: boolean; error?: string };
  saveRoomType: (rt: Partial<RoomType>) => void;
  saveRateRule: (r: Partial<RateRule>) => void;
  deleteRateRule: (id: string) => void;
  saveExpense: (e: Partial<Expense>) => void;
  saveMaintenance: (t: Partial<MaintenanceTicket>) => void;
  saveHousekeeping: (t: Partial<HousekeepingTask>) => void;
  saveIcalFeed: (f: Partial<IcalFeed>) => void;
  deleteIcalFeed: (id: string) => void;
  syncIcalNow: () => void;
  notify: (kind: string, message: string) => void;
  markNotificationsRead: () => void;
  saveUser: (u: Partial<AppUser>) => void;
  saveProperty: (p: Partial<DB['properties'][0]>) => void;
  setOrgStatus: (orgId: string, status: 'ativo' | 'bloqueado' | 'trial') => void;
  setOrgPlan: (orgId: string, plan: 'basico' | 'profissional' | 'premium') => void;
}

export type Permission =
  | 'dashboard' | 'reservas' | 'mapa' | 'hospedes' | 'checkin' | 'quartos'
  | 'governanca' | 'manutencao' | 'tarifas' | 'financeiro' | 'relatorios'
  | 'integracoes' | 'usuarios' | 'configuracoes' | 'admin' | 'motor';

const ROLE_PERMS: Record<Role, Permission[]> = {
  platform_admin: ['admin', 'dashboard', 'reservas', 'mapa', 'hospedes', 'checkin', 'quartos', 'governanca', 'manutencao', 'tarifas', 'financeiro', 'relatorios', 'integracoes', 'usuarios', 'configuracoes', 'motor'],
  owner: ['dashboard', 'reservas', 'mapa', 'hospedes', 'checkin', 'quartos', 'governanca', 'manutencao', 'tarifas', 'financeiro', 'relatorios', 'integracoes', 'usuarios', 'configuracoes', 'motor'],
  manager: ['dashboard', 'reservas', 'mapa', 'hospedes', 'checkin', 'quartos', 'governanca', 'manutencao', 'tarifas', 'relatorios', 'motor'],
  reception: ['dashboard', 'reservas', 'mapa', 'hospedes', 'checkin', 'governanca', 'quartos'],
  finance: ['dashboard', 'financeiro', 'relatorios', 'reservas'],
  housekeeping: ['governanca', 'manutencao'],
};

const Ctx = createContext<StoreCtx>(null as unknown as StoreCtx);
export const useStore = () => useContext(Ctx);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<DB>(loadDB);
  const [currentUserId, setCurrentUserId] = useState<string | null>(() => localStorage.getItem(LS_SESSION));

  useEffect(() => { localStorage.setItem(LS_KEY, JSON.stringify(db)); }, [db]);

  const currentUser = db.users.find(u => u.id === currentUserId) ?? null;
  const propertyId = currentUser?.propertyId ?? db.properties[0].id;

  const mutate = (fn: (d: DB) => DB) => setDb(prev => fn(structuredClone(prev)));

  const notifyIn = (d: DB, kind: string, message: string) => {
    d.notifications.unshift({ id: uid(), propertyId, kind, message, read: false, createdAt: new Date().toISOString() });
  };
  const audit = (d: DB, action: string, entity: string, detail: string) => {
    d.auditLogs.unshift({ id: uid(), propertyId, userName: currentUser?.name ?? 'Sistema', action, entity, detail, createdAt: new Date().toISOString() });
  };

  const ACTIVE: ReservationStatus[] = ['pre_reserva', 'confirmada', 'hospedado', 'bloqueada', 'manutencao'];

  const findConflict = (roomId: string, checkin: string, checkout: string, ignoreResId?: string) =>
    db.reservations.find(r =>
      r.roomId === roomId && r.id !== ignoreResId && ACTIVE.includes(r.status) &&
      overlaps(checkin, checkout, r.checkinDate, r.checkoutDate)
    ) ?? null;

  // Tarifa vigente na data: regra ativa > preço de fim de semana > diária padrão
  const rateForDate = (roomTypeId: string, date: string) => {
    const rt = db.roomTypes.find(t => t.id === roomTypeId);
    if (!rt) return 0;
    const rule = db.rateRules.find(r => r.active && r.roomTypeId === roomTypeId && date >= r.startDate && date <= r.endDate);
    if (rule) return rule.price;
    if (isWeekendISO(date) && rt.weekendPrice > 0) return rt.weekendPrice;
    return rt.basePrice;
  };

  const quoteStay = (roomTypeId: string, checkin: string, checkout: string, adults: number) => {
    const rt = db.roomTypes.find(t => t.id === roomTypeId);
    const nights = nightsBetween(checkin, checkout);
    const nightly: number[] = [];
    for (let i = 0; i < nights; i++) nightly.push(rateForDate(roomTypeId, addDaysISO(checkin, i)));
    let total = nightly.reduce((a, b) => a + b, 0);
    if (rt && adults > rt.capacityAdults) total += (adults - rt.capacityAdults) * rt.extraGuestFee * nights;
    return { total, nightly };
  };

  const paidAmount = (resId: string) =>
    db.payments.filter(p => p.reservationId === resId && p.status === 'pago').reduce((a, p) => a + p.amount, 0);

  const value: StoreCtx = {
    db, currentUser, propertyId,

    login(email) {
      const u = db.users.find(x => x.email.toLowerCase() === email.toLowerCase() && x.status === 'ativo') ?? null;
      if (u) { setCurrentUserId(u.id); localStorage.setItem(LS_SESSION, u.id); }
      return u;
    },
    logout() { setCurrentUserId(null); localStorage.removeItem(LS_SESSION); },
    resetDemo() {
      const seed = buildSeed();
      localStorage.setItem(LS_KEY, JSON.stringify(seed));
      setDb(seed);
    },
    can(perm) { return currentUser ? ROLE_PERMS[currentUser.role].includes(perm) : false; },

    findConflict, rateForDate, quoteStay, paidAmount,

    saveReservation(input) {
      // Regra 1: impedir overbooking
      const conflict = findConflict(input.roomId, input.checkinDate, input.checkoutDate, input.id);
      if (conflict) {
        const room = db.rooms.find(r => r.id === input.roomId);
        return { ok: false, error: `Conflito de disponibilidade: ${room?.name ?? 'o quarto'} já possui "${conflict.code}" (${conflict.checkinDate} → ${conflict.checkoutDate}). Escolha outro quarto ou período.` };
      }
      // Monta o objeto fora do setState para poder retorná-lo de forma síncrona
      let saved: Reservation;
      if (input.id) {
        const existing = db.reservations.find(r => r.id === input.id);
        if (!existing) return { ok: false, error: 'Reserva não encontrada.' };
        saved = { ...existing, ...input } as Reservation;
      } else {
        const code = `RF-${1000 + db.reservations.length * 7 + Math.floor(Math.random() * 6)}`;
        saved = {
          id: uid(), propertyId, code, guestId: null, roomTypeId: '', channel: 'balcao',
          status: 'confirmada', adults: 2, children: 0, dailyRate: 0, discount: 0, fees: 0,
          totalAmount: 0, arrivalTime: '', internalNotes: '', guestNotes: '', externalRef: '',
          companions: [], checkinDoneAt: null, checkoutDoneAt: null, expiresAt: null,
          createdAt: new Date().toISOString(), ...input,
        } as Reservation;
      }
      mutate(d => {
        const idx = d.reservations.findIndex(r => r.id === saved.id);
        if (idx >= 0) {
          d.reservations[idx] = saved;
          audit(d, 'atualizou', 'Reserva', saved.code);
        } else {
          d.reservations.unshift(saved);
          audit(d, 'criou', 'Reserva', `${saved.code} — ${saved.channel}`);
          if (saved.status === 'pre_reserva') notifyIn(d, 'reserva', `Nova pré-reserva ${saved.code} aguardando confirmação.`);
        }
        return d;
      });
      return { ok: true, reservation: saved };
    },

    setReservationStatus(id, status) {
      mutate(d => {
        const r = d.reservations.find(x => x.id === id);
        if (r) { r.status = status; audit(d, 'alterou status', 'Reserva', `${r.code} → ${status}`); }
        return d;
      });
    },

    // Regra 3: check-in → reserva "hospedado", quarto "ocupado"
    doCheckin(id) {
      mutate(d => {
        const r = d.reservations.find(x => x.id === id);
        if (!r) return d;
        r.status = 'hospedado';
        r.checkinDoneAt = new Date().toISOString();
        const room = d.rooms.find(x => x.id === r.roomId);
        if (room) room.status = 'ocupado';
        audit(d, 'realizou check-in', 'Reserva', r.code);
        return d;
      });
    },

    // Regra 4: check-out → reserva "finalizada", quarto "sujo" + tarefa de governança
    doCheckout(id) {
      mutate(d => {
        const r = d.reservations.find(x => x.id === id);
        if (!r) return d;
        r.status = 'finalizada';
        r.checkoutDoneAt = new Date().toISOString();
        const room = d.rooms.find(x => x.id === r.roomId);
        if (room) {
          room.status = 'sujo';
          d.housekeepingTasks.unshift({
            id: uid(), propertyId, roomId: room.id, status: 'pendente', assignedTo: '',
            notes: `Saída da reserva ${r.code}`, createdAt: new Date().toISOString(), finishedAt: null,
          });
        }
        audit(d, 'realizou check-out', 'Reserva', r.code);
        return d;
      });
    },

    // Regra 7: cancelar libera o quarto
    cancelReservation(id) {
      mutate(d => {
        const r = d.reservations.find(x => x.id === id);
        if (!r) return d;
        r.status = 'cancelada';
        notifyIn(d, 'cancelamento', `Reserva ${r.code} foi cancelada.`);
        audit(d, 'cancelou', 'Reserva', r.code);
        return d;
      });
    },

    addPayment(p) {
      mutate(d => {
        d.payments.unshift({ ...p, id: uid(), propertyId });
        const r = d.reservations.find(x => x.id === p.reservationId);
        audit(d, p.amount >= 0 ? 'registrou pagamento' : 'registrou estorno', 'Financeiro', `${r?.code ?? ''} — R$ ${Math.abs(p.amount).toFixed(2)}`);
        return d;
      });
    },

    setRoomStatus(roomId, status) {
      mutate(d => {
        const room = d.rooms.find(r => r.id === roomId);
        if (!room) return d;
        room.status = status;
        if (status === 'limpo' || status === 'disponivel') {
          room.lastCleanedAt = todayISO();
          d.housekeepingTasks.forEach(t => {
            if (t.roomId === roomId && t.status !== 'concluida') { t.status = 'concluida'; t.finishedAt = new Date().toISOString(); }
          });
        }
        audit(d, 'alterou status', 'Quarto', `${room.name} → ${status}`);
        return d;
      });
    },

    saveGuest(g) {
      const guest: Guest = {
        id: g.id ?? uid(), propertyId, name: '', cpf: '', rg: '', passport: '', birthDate: '',
        nationality: 'Brasileira', phone: '', whatsapp: '', email: '', address: '', city: '', state: '',
        country: 'Brasil', company: '', notes: '', preferences: '', vip: false,
        createdAt: todayISO(), ...g,
      } as Guest;
      mutate(d => {
        const idx = d.guests.findIndex(x => x.id === guest.id);
        if (idx >= 0) d.guests[idx] = { ...d.guests[idx], ...guest };
        else d.guests.unshift(guest);
        audit(d, idx >= 0 ? 'atualizou' : 'criou', 'Hóspede', guest.name);
        return d;
      });
      return guest;
    },

    saveRoom(r) {
      mutate(d => {
        if (r.id) {
          const idx = d.rooms.findIndex(x => x.id === r.id);
          if (idx >= 0) d.rooms[idx] = { ...d.rooms[idx], ...r } as Room;
        } else {
          d.rooms.push({ id: uid(), propertyId, roomTypeId: '', name: '', floor: '', status: 'disponivel', notes: '', lastCleanedAt: null, ...r } as Room);
        }
        audit(d, r.id ? 'atualizou' : 'criou', 'Quarto', r.name ?? '');
        return d;
      });
    },

    deleteRoom(id) {
      const hasRes = db.reservations.some(r => r.roomId === id && ACTIVE.includes(r.status));
      if (hasRes) return { ok: false, error: 'Este quarto possui reservas ativas e não pode ser excluído.' };
      mutate(d => { d.rooms = d.rooms.filter(r => r.id !== id); return d; });
      return { ok: true };
    },

    saveRoomType(rt) {
      mutate(d => {
        if (rt.id && d.roomTypes.some(x => x.id === rt.id)) {
          const idx = d.roomTypes.findIndex(x => x.id === rt.id);
          d.roomTypes[idx] = { ...d.roomTypes[idx], ...rt } as RoomType;
        } else {
          d.roomTypes.push({ id: rt.id ?? uid(), propertyId, name: '', description: '', capacityAdults: 2, capacityChildren: 0, basePrice: 0, weekendPrice: 0, extraGuestFee: 0, amenities: [], photoEmoji: '🛏️', status: 'ativo', ...rt } as RoomType);
        }
        audit(d, 'salvou', 'Tipo de acomodação', rt.name ?? '');
        return d;
      });
    },

    saveRateRule(r) {
      mutate(d => {
        if (r.id && d.rateRules.some(x => x.id === r.id)) {
          const idx = d.rateRules.findIndex(x => x.id === r.id);
          d.rateRules[idx] = { ...d.rateRules[idx], ...r } as RateRule;
        } else {
          d.rateRules.push({ id: uid(), propertyId, roomTypeId: '', name: '', kind: 'periodo', startDate: todayISO(), endDate: todayISO(), price: 0, minNights: 1, active: true, ...r } as RateRule);
        }
        // Regra 9: tarifas novas não alteram reservas existentes
        audit(d, 'salvou', 'Tarifa', r.name ?? '');
        return d;
      });
    },
    deleteRateRule(id) { mutate(d => { d.rateRules = d.rateRules.filter(r => r.id !== id); return d; }); },

    saveExpense(e) {
      mutate(d => {
        if (e.id && d.expenses.some(x => x.id === e.id)) {
          const idx = d.expenses.findIndex(x => x.id === e.id);
          d.expenses[idx] = { ...d.expenses[idx], ...e } as Expense;
        } else {
          d.expenses.unshift({ id: uid(), propertyId, category: 'Outros', description: '', amount: 0, dueDate: todayISO(), paidAt: null, status: 'pendente', ...e } as Expense);
        }
        return d;
      });
    },

    // Regra 6: manutenção bloqueia disponibilidade no período
    saveMaintenance(t) {
      mutate(d => {
        let ticket: MaintenanceTicket;
        if (t.id && d.maintenanceTickets.some(x => x.id === t.id)) {
          const idx = d.maintenanceTickets.findIndex(x => x.id === t.id);
          d.maintenanceTickets[idx] = { ...d.maintenanceTickets[idx], ...t } as MaintenanceTicket;
          ticket = d.maintenanceTickets[idx];
        } else {
          ticket = { id: uid(), propertyId, roomId: '', title: '', description: '', priority: 'media', status: 'aberto', assignedTo: '', estimatedCost: 0, finalCost: 0, openedAt: todayISO(), dueDate: todayISO(), closedAt: null, ...t } as MaintenanceTicket;
          d.maintenanceTickets.unshift(ticket);
        }
        const room = d.rooms.find(r => r.id === ticket.roomId);
        if (room) {
          if (ticket.status === 'concluido' || ticket.status === 'cancelado') {
            if (room.status === 'manutencao') room.status = 'sujo';
            d.reservations = d.reservations.filter(r => !(r.status === 'manutencao' && r.internalNotes === `#mt:${ticket.id}`));
          } else if (ticket.priority === 'alta' || ticket.priority === 'urgente') {
            room.status = 'manutencao';
            const hasBlock = d.reservations.some(r => r.status === 'manutencao' && r.internalNotes === `#mt:${ticket.id}`);
            if (!hasBlock && !findConflict(room.id, ticket.openedAt, ticket.dueDate)) {
              d.reservations.push({
                id: uid(), propertyId, code: `RF-MNT-${d.maintenanceTickets.length}`, guestId: null,
                roomId: room.id, roomTypeId: room.roomTypeId, channel: 'outros', status: 'manutencao',
                checkinDate: ticket.openedAt, checkoutDate: ticket.dueDate, adults: 0, children: 0,
                dailyRate: 0, discount: 0, fees: 0, totalAmount: 0, arrivalTime: '',
                internalNotes: `#mt:${ticket.id}`, guestNotes: '', externalRef: '', companions: [],
                checkinDoneAt: null, checkoutDoneAt: null, expiresAt: null, createdAt: new Date().toISOString(),
              });
            }
            notifyIn(d, 'manutencao', `${room.name} bloqueado para manutenção: ${ticket.title}`);
          }
        }
        audit(d, 'salvou', 'Manutenção', ticket.title);
        return d;
      });
    },

    saveHousekeeping(t) {
      mutate(d => {
        if (t.id && d.housekeepingTasks.some(x => x.id === t.id)) {
          const idx = d.housekeepingTasks.findIndex(x => x.id === t.id);
          d.housekeepingTasks[idx] = { ...d.housekeepingTasks[idx], ...t } as HousekeepingTask;
        } else {
          d.housekeepingTasks.unshift({ id: uid(), propertyId, roomId: '', status: 'pendente', assignedTo: '', notes: '', createdAt: new Date().toISOString(), finishedAt: null, ...t } as HousekeepingTask);
        }
        return d;
      });
    },

    saveIcalFeed(f) {
      mutate(d => {
        if (f.id && d.icalFeeds.some(x => x.id === f.id)) {
          const idx = d.icalFeeds.findIndex(x => x.id === f.id);
          d.icalFeeds[idx] = { ...d.icalFeeds[idx], ...f } as IcalFeed;
        } else {
          d.icalFeeds.push({ id: uid(), propertyId, roomId: '', channel: 'booking', direction: 'import', feedUrl: '', status: 'ativo', lastSyncAt: null, lastMessage: 'Aguardando primeira sincronização', ...f } as IcalFeed);
        }
        return d;
      });
    },
    deleteIcalFeed(id) { mutate(d => { d.icalFeeds = d.icalFeeds.filter(f => f.id !== id); return d; }); },

    // Simula um ciclo de sincronização iCal (MVP — sem chamadas externas)
    syncIcalNow() {
      mutate(d => {
        const now = new Date().toISOString();
        d.icalFeeds.forEach(f => {
          if (f.status === 'pausado') return;
          if (f.feedUrl.includes('demo-chale-samauma')) {
            f.status = 'erro';
            f.lastMessage = 'Erro 404 — verifique se o link do calendário ainda é válido';
            d.integrationLogs.unshift({ id: uid(), propertyId, channel: f.channel, action: 'ical_import', status: 'erro', message: `${f.feedUrl}: 404`, createdAt: now });
          } else {
            f.status = 'ativo';
            f.lastSyncAt = now;
            f.lastMessage = f.direction === 'import' ? 'Sincronizado — nenhum evento novo' : 'Feed publicado';
            d.integrationLogs.unshift({ id: uid(), propertyId, channel: f.channel, action: f.direction === 'import' ? 'ical_import' : 'ical_export', status: 'ok', message: 'Sincronização concluída sem conflitos', createdAt: now });
          }
        });
        notifyIn(d, 'sync', 'Sincronização iCal executada manualmente.');
        return d;
      });
    },

    notify(kind, message) { mutate(d => { notifyIn(d, kind, message); return d; }); },
    markNotificationsRead() { mutate(d => { d.notifications.forEach(n => { n.read = true; }); return d; }); },

    saveUser(u) {
      mutate(d => {
        if (u.id && d.users.some(x => x.id === u.id)) {
          const idx = d.users.findIndex(x => x.id === u.id);
          d.users[idx] = { ...d.users[idx], ...u } as AppUser;
        } else {
          d.users.push({ id: uid(), organizationId: d.properties[0].organizationId, propertyId, name: '', email: '', role: 'reception', status: 'ativo', ...u } as AppUser);
        }
        audit(d, 'salvou', 'Usuário', u.name ?? '');
        return d;
      });
    },

    saveProperty(p) {
      mutate(d => {
        const idx = d.properties.findIndex(x => x.id === (p.id ?? propertyId));
        if (idx >= 0) d.properties[idx] = { ...d.properties[idx], ...p };
        audit(d, 'atualizou', 'Configurações', 'Dados da hospedagem');
        return d;
      });
    },

    setOrgStatus(orgId, status) {
      mutate(d => {
        const o = d.organizations.find(x => x.id === orgId);
        if (o) o.status = status;
        return d;
      });
    },
    setOrgPlan(orgId, plan) {
      mutate(d => {
        const o = d.organizations.find(x => x.id === orgId);
        if (o) o.plan = plan;
        return d;
      });
    },
  };

  return <Ctx.Provider value={useMemo(() => value, [db, currentUserId])}>{children}</Ctx.Provider>;
}

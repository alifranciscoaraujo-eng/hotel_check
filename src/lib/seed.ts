import { addDays, format, startOfMonth, subDays } from 'date-fns';
import type { DB, Guest, Reservation, Payment, Channel, ReservationStatus, PaymentMethod } from './types';
import { nightsBetween, uid } from './utils';

const iso = (d: Date) => format(d, 'yyyy-MM-dd');
const today = new Date();
const D = (n: number) => iso(addDays(today, n)); // hoje + n dias

const ORG = 'org-demo';
const PROP = 'prop-solrio';

const firstNames = ['Ana', 'Bruno', 'Carla', 'Diego', 'Elisa', 'Fábio', 'Gabriela', 'Heitor', 'Isabela', 'João', 'Karina', 'Lucas', 'Mariana', 'Nelson', 'Olívia', 'Paulo', 'Quésia', 'Rafael', 'Sofia', 'Tiago', 'Úrsula', 'Vinícius', 'Wanda', 'Xavier', 'Yara', 'Zeca', 'Amanda', 'Bernardo', 'Cecília', 'Daniel'];
const lastNames = ['Silva', 'Souza', 'Oliveira', 'Santos', 'Pereira', 'Costa', 'Rodrigues', 'Almeida', 'Nascimento', 'Lima', 'Araújo', 'Fernandes', 'Carvalho', 'Gomes', 'Martins', 'Rocha', 'Ribeiro', 'Alves', 'Monteiro', 'Barbosa', 'Cardoso', 'Teixeira', 'Correia', 'Dias', 'Vieira', 'Moreira', 'Nunes', 'Marques', 'Machado', 'Freitas'];
const cities = ['Belém/PA', 'São Paulo/SP', 'Rio de Janeiro/RJ', 'Brasília/DF', 'Fortaleza/CE', 'Manaus/AM', 'Curitiba/PR', 'Salvador/BA', 'Recife/PE', 'Goiânia/GO'];

function makeGuests(): Guest[] {
  return firstNames.map((fn, i) => {
    const [city, state] = cities[i % cities.length].split('/');
    return {
      id: `g-${i + 1}`,
      propertyId: PROP,
      name: `${fn} ${lastNames[i]}`,
      cpf: `${String(100 + i)}.${String(400 + i)}.${String(700 + i)}-${String(10 + i)}`,
      rg: '', passport: '',
      birthDate: iso(subDays(today, 9000 + i * 300)),
      nationality: 'Brasileira',
      phone: `(91) 9${8000 + i * 13}-${1000 + i * 27}`,
      whatsapp: `(91) 9${8000 + i * 13}-${1000 + i * 27}`,
      email: `${fn.toLowerCase().normalize('NFD').replace(/[^a-z]/g, '')}.${lastNames[i].toLowerCase()}@email.com`,
      address: `Rua ${lastNames[(i + 5) % 30]}, ${100 + i}`,
      city, state, country: 'Brasil',
      company: i % 9 === 0 ? 'Construtora Horizonte LTDA' : '',
      notes: i === 2 ? 'Prefere quartos no térreo.' : i === 7 ? 'Alérgico a camarão — avisar cozinha.' : '',
      preferences: i % 4 === 0 ? 'Café sem lactose' : '',
      vip: i === 0 || i === 11 || i === 18,
      createdAt: iso(subDays(today, 200 - i * 5)),
    };
  });
}

interface ResSpec {
  guest: number; room: string; type: string; inD: number; outD: number;
  ch: Channel; st: ReservationStatus; rate: number; adults?: number; children?: number;
  paidFrac?: number; method?: PaymentMethod; arrival?: string; notes?: string;
}

function makeReservations(): { reservations: Reservation[]; payments: Payment[] } {
  const specs: ResSpec[] = [
    // Hospedados agora
    { guest: 0, room: 'r-01', type: 'rt-suite', inD: -2, outD: 2, ch: 'booking', st: 'hospedado', rate: 320, paidFrac: 1, method: 'credito', notes: 'Hóspede VIP — cortesia de boas-vindas entregue.' },
    { guest: 3, room: 'r-04', type: 'rt-standard', inD: -1, outD: 3, ch: 'whatsapp', st: 'hospedado', rate: 220, paidFrac: 0.5, method: 'pix' },
    { guest: 5, room: 'r-07', type: 'rt-familia', inD: -3, outD: 1, ch: 'site', st: 'hospedado', rate: 450, adults: 2, children: 2, paidFrac: 1, method: 'pix' },
    { guest: 8, room: 'r-10', type: 'rt-chale', inD: -1, outD: 4, ch: 'airbnb', st: 'hospedado', rate: 520, paidFrac: 1, method: 'faturado' },
    // Check-in hoje
    { guest: 1, room: 'r-02', type: 'rt-suite', inD: 0, outD: 3, ch: 'booking', st: 'confirmada', rate: 320, paidFrac: 0, arrival: '14:00' },
    { guest: 10, room: 'r-05', type: 'rt-standard', inD: 0, outD: 2, ch: 'balcao', st: 'confirmada', rate: 220, paidFrac: 0.5, method: 'dinheiro', arrival: '15:30' },
    { guest: 14, room: 'r-11', type: 'rt-chale', inD: 0, outD: 5, ch: 'decolar', st: 'confirmada', rate: 520, paidFrac: 1, method: 'link', arrival: '16:00', notes: 'Lua de mel — decorar chalé.' },
    // Check-out hoje
    { guest: 6, room: 'r-06', type: 'rt-standard', inD: -3, outD: 0, ch: 'telefone', st: 'hospedado', rate: 220, paidFrac: 0.6, method: 'pix' },
    // Futuras confirmadas
    { guest: 2, room: 'r-03', type: 'rt-suite', inD: 2, outD: 6, ch: 'airbnb', st: 'confirmada', rate: 340, paidFrac: 1, method: 'faturado' },
    { guest: 4, room: 'r-08', type: 'rt-familia', inD: 3, outD: 7, ch: 'site', st: 'confirmada', rate: 450, adults: 2, children: 1, paidFrac: 0.3, method: 'pix' },
    { guest: 12, room: 'r-01', type: 'rt-suite', inD: 4, outD: 8, ch: 'booking', st: 'confirmada', rate: 330, paidFrac: 0 },
    { guest: 16, room: 'r-09', type: 'rt-familia', inD: 5, outD: 9, ch: 'whatsapp', st: 'confirmada', rate: 450, adults: 3, children: 1, paidFrac: 0.5, method: 'pix' },
    { guest: 19, room: 'r-12', type: 'rt-dorm', inD: 1, outD: 4, ch: 'site', st: 'confirmada', rate: 90, paidFrac: 1, method: 'pix' },
    { guest: 21, room: 'r-04', type: 'rt-standard', inD: 6, outD: 10, ch: 'expedia', st: 'confirmada', rate: 230, paidFrac: 1, method: 'faturado' },
    { guest: 23, room: 'r-10', type: 'rt-chale', inD: 7, outD: 12, ch: 'booking', st: 'confirmada', rate: 540, paidFrac: 0 },
    { guest: 25, room: 'r-02', type: 'rt-suite', inD: 9, outD: 12, ch: 'decolar', st: 'confirmada', rate: 335, paidFrac: 1, method: 'link' },
    // Pré-reservas
    { guest: 9, room: 'r-05', type: 'rt-standard', inD: 4, outD: 6, ch: 'whatsapp', st: 'pre_reserva', rate: 220, paidFrac: 0 },
    { guest: 13, room: 'r-07', type: 'rt-familia', inD: 8, outD: 11, ch: 'telefone', st: 'pre_reserva', rate: 460, adults: 2, children: 2, paidFrac: 0 },
    { guest: 27, room: 'r-12', type: 'rt-dorm', inD: 6, outD: 8, ch: 'site', st: 'pre_reserva', rate: 90, paidFrac: 0 },
    // Passadas finalizadas (mês atual)
    { guest: 7, room: 'r-01', type: 'rt-suite', inD: -9, outD: -5, ch: 'booking', st: 'finalizada', rate: 320, paidFrac: 1, method: 'credito' },
    { guest: 11, room: 'r-03', type: 'rt-suite', inD: -12, outD: -8, ch: 'site', st: 'finalizada', rate: 320, paidFrac: 1, method: 'pix' },
    { guest: 15, room: 'r-06', type: 'rt-standard', inD: -8, outD: -4, ch: 'airbnb', st: 'finalizada', rate: 215, paidFrac: 1, method: 'faturado' },
    { guest: 17, room: 'r-08', type: 'rt-familia', inD: -15, outD: -10, ch: 'decolar', st: 'finalizada', rate: 440, adults: 2, children: 2, paidFrac: 1, method: 'link' },
    { guest: 20, room: 'r-11', type: 'rt-chale', inD: -10, outD: -6, ch: 'booking', st: 'finalizada', rate: 510, paidFrac: 1, method: 'credito' },
    { guest: 22, room: 'r-12', type: 'rt-dorm', inD: -6, outD: -2, ch: 'site', st: 'finalizada', rate: 85, paidFrac: 1, method: 'pix' },
    { guest: 24, room: 'r-09', type: 'rt-familia', inD: -20, outD: -16, ch: 'whatsapp', st: 'finalizada', rate: 430, paidFrac: 1, method: 'dinheiro' },
    { guest: 28, room: 'r-05', type: 'rt-standard', inD: -18, outD: -14, ch: 'balcao', st: 'finalizada', rate: 210, paidFrac: 1, method: 'debito' },
    // Canceladas e no-show
    { guest: 18, room: 'r-02', type: 'rt-suite', inD: -4, outD: -1, ch: 'booking', st: 'cancelada', rate: 320, paidFrac: 0 },
    { guest: 26, room: 'r-08', type: 'rt-familia', inD: 1, outD: 3, ch: 'decolar', st: 'cancelada', rate: 450, paidFrac: 0 },
    { guest: 29, room: 'r-06', type: 'rt-standard', inD: -5, outD: -3, ch: 'airbnb', st: 'no_show', rate: 220, paidFrac: 0 },
  ];

  const reservations: Reservation[] = [];
  const payments: Payment[] = [];
  let seq = 1000;

  for (const s of specs) {
    const id = uid();
    seq += 7;
    const inDate = D(s.inD);
    const outDate = D(s.outD);
    const nights = nightsBetween(inDate, outDate);
    const total = s.rate * nights;
    reservations.push({
      id, propertyId: PROP, code: `RF-${seq}`, guestId: `g-${s.guest + 1}`,
      roomId: s.room, roomTypeId: s.type, channel: s.ch, status: s.st,
      checkinDate: inDate, checkoutDate: outDate,
      adults: s.adults ?? 2, children: s.children ?? 0,
      dailyRate: s.rate, discount: 0, fees: 0, totalAmount: total,
      arrivalTime: s.arrival ?? '', internalNotes: s.notes ?? '', guestNotes: '',
      externalRef: ['booking', 'airbnb', 'expedia', 'decolar', 'agoda'].includes(s.ch) ? `${s.ch.toUpperCase()}-${seq * 31}` : '',
      companions: [],
      checkinDoneAt: s.st === 'hospedado' || s.st === 'finalizada' ? new Date(inDate + 'T14:30:00').toISOString() : null,
      checkoutDoneAt: s.st === 'finalizada' ? new Date(outDate + 'T11:00:00').toISOString() : null,
      expiresAt: s.st === 'pre_reserva' ? D(2) : null,
      createdAt: new Date(D(s.inD - 12) + 'T10:00:00').toISOString(),
    });
    const frac = s.paidFrac ?? 0;
    if (frac > 0) {
      payments.push({
        id: uid(), propertyId: PROP, reservationId: id,
        amount: Math.round(total * frac * 100) / 100,
        method: s.method ?? 'pix', status: 'pago',
        paidAt: new Date(D(Math.min(s.inD, 0) - 2) + 'T10:00:00').toISOString(),
        notes: frac < 1 ? 'Sinal de reserva' : 'Pagamento integral',
      });
    }
  }

  // Bloqueio manual de quarto
  reservations.push({
    id: uid(), propertyId: PROP, code: 'RF-BLQ1', guestId: null, roomId: 'r-03', roomTypeId: 'rt-suite',
    channel: 'outros', status: 'bloqueada', checkinDate: D(8), checkoutDate: D(11),
    adults: 0, children: 0, dailyRate: 0, discount: 0, fees: 0, totalAmount: 0,
    arrivalTime: '', internalNotes: 'Bloqueado para pintura da varanda.', guestNotes: '', externalRef: '',
    companions: [], checkinDoneAt: null, checkoutDoneAt: null, expiresAt: null,
    createdAt: new Date().toISOString(),
  });
  // Bloqueio de manutenção (vinculado ao chamado do ar-condicionado)
  reservations.push({
    id: 'res-maint-1', propertyId: PROP, code: 'RF-MNT1', guestId: null, roomId: 'r-09', roomTypeId: 'rt-familia',
    channel: 'outros', status: 'manutencao', checkinDate: D(0), checkoutDate: D(3),
    adults: 0, children: 0, dailyRate: 0, discount: 0, fees: 0, totalAmount: 0,
    arrivalTime: '', internalNotes: 'Ar-condicionado em conserto.', guestNotes: '', externalRef: '',
    companions: [], checkinDoneAt: null, checkoutDoneAt: null, expiresAt: null,
    createdAt: new Date().toISOString(),
  });

  return { reservations, payments };
}

export function buildSeed(): DB {
  const guests = makeGuests();
  const { reservations, payments } = makeReservations();
  const monthStart = iso(startOfMonth(today));

  return {
    organizations: [
      { id: ORG, name: 'Pousada Sol do Rio', plan: 'profissional', status: 'ativo', createdAt: iso(subDays(today, 120)) },
      { id: 'org-2', name: 'Hostel Maré Alta', plan: 'basico', status: 'trial', createdAt: iso(subDays(today, 12)) },
      { id: 'org-3', name: 'Chalés da Serra Verde', plan: 'premium', status: 'ativo', createdAt: iso(subDays(today, 300)) },
      { id: 'org-4', name: 'Flat Executivo Central', plan: 'basico', status: 'bloqueado', createdAt: iso(subDays(today, 90)) },
    ],
    properties: [{
      id: PROP, organizationId: ORG, name: 'Pousada Sol do Rio', slug: 'pousada-sol-do-rio',
      document: '12.345.678/0001-90', email: 'contato@pousadasoldorio.com.br',
      phone: '(91) 3222-4455', whatsapp: '(91) 98877-6655',
      address: 'Av. Beira Rio, 450 — Centro', city: 'Moju', state: 'PA', country: 'Brasil',
      checkinTime: '14:00', checkoutTime: '12:00',
      cancellationPolicy: 'Cancelamento gratuito até 7 dias antes do check-in. Após esse prazo, será cobrada 1 diária.',
      childrenPolicy: 'Crianças até 6 anos não pagam quando acompanhadas dos pais (máx. 1 por quarto).',
      petsPolicy: 'Aceitamos animais de pequeno porte mediante taxa de limpeza.',
      houseRules: 'Silêncio após as 22h. Café da manhã servido das 6h30 às 9h30. Piscina aberta das 8h às 20h.',
      bookingEngineEnabled: true, bookingConfirmMode: 'pre_reserva',
      bookingWelcomeMessage: 'Obrigado pela sua reserva! Em breve nossa equipe confirmará a disponibilidade pelo WhatsApp.',
    }],
    users: [
      { id: 'u-admin', organizationId: 'platform', propertyId: null, name: 'Admin ReservaFlow', email: 'admin@reservaflow.app', role: 'platform_admin', status: 'ativo' },
      { id: 'u-owner', organizationId: ORG, propertyId: PROP, name: 'Marina Sol', email: 'marina@pousadasoldorio.com.br', role: 'owner', status: 'ativo' },
      { id: 'u-manager', organizationId: ORG, propertyId: PROP, name: 'Carlos Andrade', email: 'carlos@pousadasoldorio.com.br', role: 'manager', status: 'ativo' },
      { id: 'u-recep', organizationId: ORG, propertyId: PROP, name: 'Juliana Reis', email: 'recepcao@pousadasoldorio.com.br', role: 'reception', status: 'ativo' },
      { id: 'u-fin', organizationId: ORG, propertyId: PROP, name: 'Roberto Paes', email: 'financeiro@pousadasoldorio.com.br', role: 'finance', status: 'ativo' },
      { id: 'u-gov', organizationId: ORG, propertyId: PROP, name: 'Dona Célia', email: 'governanca@pousadasoldorio.com.br', role: 'housekeeping', status: 'ativo' },
    ],
    roomTypes: [
      { id: 'rt-suite', propertyId: PROP, name: 'Suíte Casal Vista Rio', description: 'Suíte ampla com varanda e vista para o rio, cama queen e ar-condicionado.', capacityAdults: 2, capacityChildren: 1, basePrice: 320, weekendPrice: 380, extraGuestFee: 60, amenities: ['Ar-condicionado', 'Varanda', 'Vista para o rio', 'Wi-Fi', 'Frigobar', 'TV Smart'], photoEmoji: '🌅', status: 'ativo' },
      { id: 'rt-standard', propertyId: PROP, name: 'Quarto Standard', description: 'Quarto confortável com cama de casal ou duas de solteiro.', capacityAdults: 2, capacityChildren: 1, basePrice: 220, weekendPrice: 260, extraGuestFee: 50, amenities: ['Ar-condicionado', 'Wi-Fi', 'TV', 'Frigobar'], photoEmoji: '🛏️', status: 'ativo' },
      { id: 'rt-familia', propertyId: PROP, name: 'Quarto Família', description: 'Espaço para até 5 pessoas, com cama de casal e beliches.', capacityAdults: 3, capacityChildren: 2, basePrice: 450, weekendPrice: 520, extraGuestFee: 70, amenities: ['Ar-condicionado', 'Wi-Fi', 'TV', 'Frigobar', 'Berço disponível'], photoEmoji: '👨‍👩‍👧‍👦', status: 'ativo' },
      { id: 'rt-chale', propertyId: PROP, name: 'Chalé Premium', description: 'Chalé independente com deck privativo, rede e cozinha compacta.', capacityAdults: 2, capacityChildren: 2, basePrice: 520, weekendPrice: 610, extraGuestFee: 80, amenities: ['Deck privativo', 'Cozinha compacta', 'Ar-condicionado', 'Wi-Fi', 'Rede na varanda'], photoEmoji: '🏡', status: 'ativo' },
      { id: 'rt-dorm', propertyId: PROP, name: 'Cama em Dormitório', description: 'Cama em dormitório compartilhado com 6 camas, armário individual.', capacityAdults: 1, capacityChildren: 0, basePrice: 90, weekendPrice: 110, extraGuestFee: 0, amenities: ['Ar-condicionado', 'Wi-Fi', 'Armário com cadeado'], photoEmoji: '🎒', status: 'ativo' },
    ],
    rooms: [
      { id: 'r-01', propertyId: PROP, roomTypeId: 'rt-suite', name: 'Suíte 101', floor: 'Térreo', status: 'ocupado', notes: '', lastCleanedAt: D(-2) },
      { id: 'r-02', propertyId: PROP, roomTypeId: 'rt-suite', name: 'Suíte 102', floor: 'Térreo', status: 'limpo', notes: '', lastCleanedAt: D(0) },
      { id: 'r-03', propertyId: PROP, roomTypeId: 'rt-suite', name: 'Suíte 201', floor: '1º andar', status: 'disponivel', notes: '', lastCleanedAt: D(-1) },
      { id: 'r-04', propertyId: PROP, roomTypeId: 'rt-standard', name: 'Quarto 103', floor: 'Térreo', status: 'ocupado', notes: '', lastCleanedAt: D(-1) },
      { id: 'r-05', propertyId: PROP, roomTypeId: 'rt-standard', name: 'Quarto 104', floor: 'Térreo', status: 'sujo', notes: '', lastCleanedAt: D(-3) },
      { id: 'r-06', propertyId: PROP, roomTypeId: 'rt-standard', name: 'Quarto 202', floor: '1º andar', status: 'ocupado', notes: '', lastCleanedAt: D(-3) },
      { id: 'r-07', propertyId: PROP, roomTypeId: 'rt-familia', name: 'Família 105', floor: 'Térreo', status: 'ocupado', notes: '', lastCleanedAt: D(-3) },
      { id: 'r-08', propertyId: PROP, roomTypeId: 'rt-familia', name: 'Família 203', floor: '1º andar', status: 'em_limpeza', notes: '', lastCleanedAt: D(-4) },
      { id: 'r-09', propertyId: PROP, roomTypeId: 'rt-familia', name: 'Família 204', floor: '1º andar', status: 'manutencao', notes: 'Ar-condicionado com defeito', lastCleanedAt: D(-5) },
      { id: 'r-10', propertyId: PROP, roomTypeId: 'rt-chale', name: 'Chalé Ipê', floor: 'Jardim', status: 'ocupado', notes: '', lastCleanedAt: D(-1) },
      { id: 'r-11', propertyId: PROP, roomTypeId: 'rt-chale', name: 'Chalé Samaúma', floor: 'Jardim', status: 'limpo', notes: '', lastCleanedAt: D(0) },
      { id: 'r-12', propertyId: PROP, roomTypeId: 'rt-dorm', name: 'Dormitório A', floor: 'Térreo', status: 'disponivel', notes: '', lastCleanedAt: D(-1) },
    ],
    guests,
    reservations,
    payments,
    expenses: [
      { id: uid(), propertyId: PROP, category: 'Insumos', description: 'Compras café da manhã — semana', amount: 850, dueDate: D(-3), paidAt: D(-3), status: 'pago' },
      { id: uid(), propertyId: PROP, category: 'Energia', description: 'Conta de energia elétrica', amount: 2340, dueDate: D(5), paidAt: null, status: 'pendente' },
      { id: uid(), propertyId: PROP, category: 'Lavanderia', description: 'Lavanderia terceirizada', amount: 620, dueDate: D(2), paidAt: null, status: 'pendente' },
      { id: uid(), propertyId: PROP, category: 'Manutenção', description: 'Peça ar-condicionado Família 204', amount: 480, dueDate: D(1), paidAt: null, status: 'pendente' },
      { id: uid(), propertyId: PROP, category: 'Pessoal', description: 'Diarista extra — alta ocupação', amount: 300, dueDate: D(-6), paidAt: D(-6), status: 'pago' },
      { id: uid(), propertyId: PROP, category: 'Marketing', description: 'Impulsionamento redes sociais', amount: 250, dueDate: monthStart, paidAt: monthStart, status: 'pago' },
    ],
    rateRules: [
      { id: uid(), propertyId: PROP, roomTypeId: 'rt-suite', name: 'Alta temporada — férias de julho', kind: 'alta_temporada', startDate: D(10), endDate: D(40), price: 420, minNights: 2, active: true },
      { id: uid(), propertyId: PROP, roomTypeId: 'rt-chale', name: 'Alta temporada — férias de julho', kind: 'alta_temporada', startDate: D(10), endDate: D(40), price: 680, minNights: 2, active: true },
      { id: uid(), propertyId: PROP, roomTypeId: 'rt-standard', name: 'Promo meio de semana', kind: 'promocional', startDate: D(0), endDate: D(9), price: 195, minNights: 1, active: true },
    ],
    housekeepingTasks: [
      { id: uid(), propertyId: PROP, roomId: 'r-05', status: 'pendente', assignedTo: 'Dona Célia', notes: 'Saída de hóspede ontem', createdAt: new Date().toISOString(), finishedAt: null },
      { id: uid(), propertyId: PROP, roomId: 'r-08', status: 'em_andamento', assignedTo: 'Dona Célia', notes: 'Limpeza completa + troca de enxoval', createdAt: new Date().toISOString(), finishedAt: null },
    ],
    maintenanceTickets: [
      { id: 'mt-1', propertyId: PROP, roomId: 'r-09', title: 'Ar-condicionado não gela', description: 'Compressor com ruído e sem refrigerar. Técnico agendado.', priority: 'alta', status: 'em_andamento', assignedTo: 'Refrigeração Moju', estimatedCost: 480, finalCost: 0, openedAt: D(-1), dueDate: D(3), closedAt: null },
      { id: 'mt-2', propertyId: PROP, roomId: 'r-06', title: 'Chuveiro pingando', description: 'Trocar reparo do registro.', priority: 'baixa', status: 'aberto', assignedTo: 'Seu Zé (manutenção)', estimatedCost: 40, finalCost: 0, openedAt: D(0), dueDate: D(4), closedAt: null },
      { id: 'mt-3', propertyId: PROP, roomId: 'r-02', title: 'Lâmpada da varanda queimada', description: 'Substituída por LED nova.', priority: 'baixa', status: 'concluido', assignedTo: 'Seu Zé (manutenção)', estimatedCost: 15, finalCost: 12, openedAt: D(-4), dueDate: D(-3), closedAt: D(-3) },
    ],
    icalFeeds: [
      { id: uid(), propertyId: PROP, roomId: 'r-01', channel: 'booking', direction: 'import', feedUrl: 'https://ical.booking.com/v1/export?t=demo-suite-101', status: 'ativo', lastSyncAt: new Date(Date.now() - 22 * 60000).toISOString(), lastMessage: '2 eventos importados, nenhum conflito' },
      { id: uid(), propertyId: PROP, roomId: 'r-10', channel: 'airbnb', direction: 'import', feedUrl: 'https://www.airbnb.com/calendar/ical/demo-chale-ipe.ics', status: 'ativo', lastSyncAt: new Date(Date.now() - 22 * 60000).toISOString(), lastMessage: '1 evento importado' },
      { id: uid(), propertyId: PROP, roomId: 'r-11', channel: 'airbnb', direction: 'import', feedUrl: 'https://www.airbnb.com/calendar/ical/demo-chale-samauma.ics', status: 'erro', lastSyncAt: new Date(Date.now() - 3 * 3600000).toISOString(), lastMessage: 'Erro 404 — verifique se o link do calendário ainda é válido' },
      { id: uid(), propertyId: PROP, roomId: 'r-01', channel: 'site', direction: 'export', feedUrl: 'https://app.reservaflow.com.br/ical/pousada-sol-do-rio/suite-101.ics', status: 'ativo', lastSyncAt: new Date(Date.now() - 10 * 60000).toISOString(), lastMessage: 'Feed publicado' },
    ],
    integrationLogs: [
      { id: uid(), propertyId: PROP, channel: 'booking', action: 'ical_import', status: 'ok', message: 'Sincronização concluída: 2 eventos, 0 conflitos', createdAt: new Date(Date.now() - 22 * 60000).toISOString() },
      { id: uid(), propertyId: PROP, channel: 'airbnb', action: 'ical_import', status: 'erro', message: 'Chalé Samaúma: feed retornou 404', createdAt: new Date(Date.now() - 3 * 3600000).toISOString() },
      { id: uid(), propertyId: PROP, channel: 'airbnb', action: 'ical_import', status: 'ok', message: 'Chalé Ipê: 1 evento importado', createdAt: new Date(Date.now() - 22 * 60000).toISOString() },
    ],
    notifications: [
      { id: uid(), propertyId: PROP, kind: 'sync_erro', message: 'Falha na sincronização iCal do Airbnb (Chalé Samaúma).', read: false, createdAt: new Date(Date.now() - 3 * 3600000).toISOString() },
      { id: uid(), propertyId: PROP, kind: 'motor', message: 'Nova pré-reserva pelo motor de reservas: Dormitório A.', read: false, createdAt: new Date(Date.now() - 5 * 3600000).toISOString() },
    ],
    auditLogs: [
      { id: uid(), propertyId: PROP, userName: 'Marina Sol', action: 'atualizou', entity: 'Tarifa', detail: 'Alta temporada — férias de julho (Suíte)', createdAt: new Date(Date.now() - 26 * 3600000).toISOString() },
      { id: uid(), propertyId: PROP, userName: 'Juliana Reis', action: 'criou', entity: 'Reserva', detail: 'RF-1049 — via balcão', createdAt: new Date(Date.now() - 20 * 3600000).toISOString() },
    ],
  };
}

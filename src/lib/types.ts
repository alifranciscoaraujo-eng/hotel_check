// Modelo de dados do ReservaFlow — espelha o schema SQL em supabase/schema.sql

export type Role = 'platform_admin' | 'owner' | 'manager' | 'reception' | 'finance' | 'housekeeping';

export type ReservationStatus =
  | 'pre_reserva' | 'confirmada' | 'hospedado' | 'finalizada'
  | 'cancelada' | 'no_show' | 'bloqueada' | 'manutencao';

export type RoomStatus = 'disponivel' | 'ocupado' | 'sujo' | 'em_limpeza' | 'limpo' | 'bloqueado' | 'manutencao' | 'vistoriado';

export type Channel =
  | 'balcao' | 'telefone' | 'whatsapp' | 'site' | 'booking' | 'airbnb'
  | 'expedia' | 'decolar' | 'agoda' | 'vrbo' | 'indicacao' | 'agencia' | 'corporativo' | 'outros';

export type PaymentMethod =
  | 'dinheiro' | 'pix' | 'credito' | 'debito' | 'transferencia' | 'boleto'
  | 'link' | 'cortesia' | 'faturado' | 'outros';

export type MaintenancePriority = 'baixa' | 'media' | 'alta' | 'urgente';
export type MaintenanceStatus = 'aberto' | 'em_andamento' | 'aguardando_peca' | 'concluido' | 'cancelado';

export interface Organization {
  id: string;
  name: string;
  plan: 'basico' | 'profissional' | 'premium';
  status: 'ativo' | 'bloqueado' | 'trial';
  createdAt: string;
}

export interface Property {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  document: string;
  email: string;
  phone: string;
  whatsapp: string;
  address: string;
  city: string;
  state: string;
  country: string;
  checkinTime: string;
  checkoutTime: string;
  cancellationPolicy: string;
  childrenPolicy: string;
  petsPolicy: string;
  houseRules: string;
  bookingEngineEnabled: boolean;
  bookingConfirmMode: 'imediata' | 'pre_reserva' | 'pagamento' | 'sinal';
  bookingWelcomeMessage: string;
}

export interface AppUser {
  id: string;
  organizationId: string;
  propertyId: string | null;
  name: string;
  email: string;
  role: Role;
  status: 'ativo' | 'inativo';
}

export interface RoomType {
  id: string;
  propertyId: string;
  name: string;
  description: string;
  capacityAdults: number;
  capacityChildren: number;
  basePrice: number;
  weekendPrice: number;
  extraGuestFee: number;
  amenities: string[];
  photoEmoji: string;
  status: 'ativo' | 'inativo';
}

export interface Room {
  id: string;
  propertyId: string;
  roomTypeId: string;
  name: string;
  floor: string;
  status: RoomStatus;
  notes: string;
  lastCleanedAt: string | null;
}

export interface Guest {
  id: string;
  propertyId: string;
  name: string;
  cpf: string;
  rg: string;
  passport: string;
  birthDate: string;
  nationality: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  city: string;
  state: string;
  country: string;
  company: string;
  notes: string;
  preferences: string;
  vip: boolean;
  createdAt: string;
}

export interface Reservation {
  id: string;
  propertyId: string;
  code: string;
  guestId: string | null; // null para bloqueios
  roomId: string;
  roomTypeId: string;
  channel: Channel;
  status: ReservationStatus;
  checkinDate: string;   // yyyy-MM-dd
  checkoutDate: string;  // yyyy-MM-dd
  adults: number;
  children: number;
  dailyRate: number;
  discount: number;
  fees: number;
  totalAmount: number;
  arrivalTime: string;
  internalNotes: string;
  guestNotes: string;
  externalRef: string;
  companions: string[];
  checkinDoneAt: string | null;
  checkoutDoneAt: string | null;
  expiresAt: string | null; // prazo da pré-reserva
  createdAt: string;
}

export interface Payment {
  id: string;
  propertyId: string;
  reservationId: string;
  amount: number; // negativo = estorno
  method: PaymentMethod;
  status: 'pago' | 'pendente' | 'estornado';
  paidAt: string;
  notes: string;
}

export interface Expense {
  id: string;
  propertyId: string;
  category: string;
  description: string;
  amount: number;
  dueDate: string;
  paidAt: string | null;
  status: 'pago' | 'pendente';
}

export interface RateRule {
  id: string;
  propertyId: string;
  roomTypeId: string;
  name: string;
  kind: 'periodo' | 'fim_de_semana' | 'feriado' | 'alta_temporada' | 'promocional';
  startDate: string;
  endDate: string;
  price: number;
  minNights: number;
  active: boolean;
}

export interface HousekeepingTask {
  id: string;
  propertyId: string;
  roomId: string;
  status: 'pendente' | 'em_andamento' | 'concluida';
  assignedTo: string;
  notes: string;
  createdAt: string;
  finishedAt: string | null;
}

export interface MaintenanceTicket {
  id: string;
  propertyId: string;
  roomId: string;
  title: string;
  description: string;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  assignedTo: string;
  estimatedCost: number;
  finalCost: number;
  openedAt: string;
  dueDate: string;
  closedAt: string | null;
}

export interface IcalFeed {
  id: string;
  propertyId: string;
  roomId: string;
  channel: Channel;
  direction: 'import' | 'export';
  feedUrl: string;
  status: 'ativo' | 'erro' | 'pausado';
  lastSyncAt: string | null;
  lastMessage: string;
}

export interface IntegrationLog {
  id: string;
  propertyId: string;
  channel: Channel;
  action: string;
  status: 'ok' | 'erro' | 'aviso';
  message: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  propertyId: string;
  kind: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  propertyId: string;
  userName: string;
  action: string;
  entity: string;
  detail: string;
  createdAt: string;
}

export interface DB {
  organizations: Organization[];
  properties: Property[];
  users: AppUser[];
  roomTypes: RoomType[];
  rooms: Room[];
  guests: Guest[];
  reservations: Reservation[];
  payments: Payment[];
  expenses: Expense[];
  rateRules: RateRule[];
  housekeepingTasks: HousekeepingTask[];
  maintenanceTickets: MaintenanceTicket[];
  icalFeeds: IcalFeed[];
  integrationLogs: IntegrationLog[];
  notifications: Notification[];
  auditLogs: AuditLog[];
}

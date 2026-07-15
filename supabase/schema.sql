-- ============================================================
-- ReservaFlow — Schema PostgreSQL/Supabase (fase de produção)
-- Multi-tenant com Row Level Security por organização.
-- O MVP local usa este mesmo modelo em src/lib/types.ts.
-- Sugestão de prefixo caso o projeto Supabase seja compartilhado: rf_
-- ============================================================

create extension if not exists "uuid-ossp";

-- Organizações (contas do SaaS)
create table organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  plan text not null default 'basico' check (plan in ('basico','profissional','premium')),
  status text not null default 'trial' check (status in ('ativo','bloqueado','trial')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Propriedades/hospedagens (uma organização pode ter várias)
create table properties (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  slug text unique not null,
  document text, email text, phone text, whatsapp text,
  address text, city text, state text, country text default 'Brasil',
  checkin_time time default '14:00',
  checkout_time time default '12:00',
  cancellation_policy text, children_policy text, pets_policy text, house_rules text,
  booking_engine_enabled boolean default true,
  booking_confirm_mode text default 'pre_reserva' check (booking_confirm_mode in ('imediata','pre_reserva','pagamento','sinal')),
  booking_welcome_message text,
  logo_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Perfil do usuário (vincula auth.users à organização)
create table app_users (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  property_id uuid references properties(id) on delete set null,
  name text not null,
  email text not null,
  role text not null default 'reception' check (role in ('platform_admin','owner','manager','reception','finance','housekeeping')),
  status text not null default 'ativo' check (status in ('ativo','inativo')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table room_types (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid not null references properties(id) on delete cascade,
  name text not null,
  description text,
  capacity_adults int default 2,
  capacity_children int default 0,
  base_price numeric(10,2) default 0,
  weekend_price numeric(10,2) default 0,
  extra_guest_fee numeric(10,2) default 0,
  amenities jsonb default '[]',
  photos jsonb default '[]',
  status text default 'ativo' check (status in ('ativo','inativo')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table rooms (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid not null references properties(id) on delete cascade,
  room_type_id uuid not null references room_types(id) on delete restrict,
  name text not null,
  floor text,
  status text default 'disponivel' check (status in ('disponivel','ocupado','sujo','em_limpeza','limpo','bloqueado','manutencao','vistoriado')),
  notes text,
  last_cleaned_at date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table guests (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid not null references properties(id) on delete cascade,
  name text not null,
  cpf text, rg text, passport text,
  birth_date date, nationality text default 'Brasileira',
  phone text, whatsapp text, email text,
  address text, city text, state text, country text default 'Brasil',
  company text, notes text, preferences text,
  vip boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table reservations (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid not null references properties(id) on delete cascade,
  code text not null,
  guest_id uuid references guests(id) on delete set null,
  room_id uuid not null references rooms(id) on delete restrict,
  room_type_id uuid references room_types(id),
  channel text not null default 'balcao',
  status text not null default 'confirmada' check (status in ('pre_reserva','confirmada','hospedado','finalizada','cancelada','no_show','bloqueada','manutencao')),
  checkin_date date not null,
  checkout_date date not null,
  adults int default 2,
  children int default 0,
  daily_rate numeric(10,2) default 0,
  discount numeric(10,2) default 0,
  fees numeric(10,2) default 0,
  total_amount numeric(10,2) default 0,
  arrival_time text,
  internal_notes text, guest_notes text,
  external_reference text,
  companions jsonb default '[]',
  checkin_done_at timestamptz,
  checkout_done_at timestamptz,
  expires_at date,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  check (checkout_date > checkin_date)
);
create index idx_reservations_room_period on reservations (room_id, checkin_date, checkout_date);
create index idx_reservations_property on reservations (property_id, status);

-- Regra anti-overbooking no banco (além da validação da aplicação):
-- impede dois períodos ativos sobrepostos no mesmo quarto.
create extension if not exists btree_gist;
alter table reservations add constraint no_overbooking
  exclude using gist (
    room_id with =,
    daterange(checkin_date, checkout_date) with &&
  ) where (status in ('pre_reserva','confirmada','hospedado','bloqueada','manutencao'));

create table payments (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid not null references properties(id) on delete cascade,
  reservation_id uuid not null references reservations(id) on delete cascade,
  amount numeric(10,2) not null,
  method text not null default 'pix',
  status text not null default 'pago' check (status in ('pago','pendente','estornado')),
  paid_at timestamptz default now(),
  notes text,
  created_at timestamptz default now()
);

create table expenses (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid not null references properties(id) on delete cascade,
  category text not null default 'Outros',
  description text not null,
  amount numeric(10,2) not null,
  due_date date not null,
  paid_at date,
  status text not null default 'pendente' check (status in ('pago','pendente')),
  created_at timestamptz default now()
);

create table rate_rules (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid not null references properties(id) on delete cascade,
  room_type_id uuid not null references room_types(id) on delete cascade,
  name text not null,
  kind text not null default 'periodo' check (kind in ('periodo','fim_de_semana','feriado','alta_temporada','promocional')),
  start_date date not null,
  end_date date not null,
  price numeric(10,2) not null,
  minimum_nights int default 1,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table housekeeping_tasks (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid not null references properties(id) on delete cascade,
  room_id uuid not null references rooms(id) on delete cascade,
  status text not null default 'pendente' check (status in ('pendente','em_andamento','concluida')),
  assigned_to text, notes text, photos jsonb default '[]',
  created_at timestamptz default now(),
  finished_at timestamptz
);

create table maintenance_tickets (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid not null references properties(id) on delete cascade,
  room_id uuid not null references rooms(id) on delete cascade,
  title text not null,
  description text,
  priority text not null default 'media' check (priority in ('baixa','media','alta','urgente')),
  status text not null default 'aberto' check (status in ('aberto','em_andamento','aguardando_peca','concluido','cancelado')),
  assigned_to text,
  estimated_cost numeric(10,2) default 0,
  final_cost numeric(10,2) default 0,
  photos jsonb default '[]',
  opened_at date default current_date,
  due_date date,
  closed_at date,
  created_at timestamptz default now()
);

create table integrations (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid not null references properties(id) on delete cascade,
  channel text not null,
  integration_type text not null default 'ical' check (integration_type in ('ical','channel_manager','api')),
  status text not null default 'ativo',
  credentials_encrypted text, -- criptografar via pgsodium/vault antes de gravar
  settings jsonb default '{}',
  last_sync_at timestamptz,
  created_at timestamptz default now()
);

create table ical_feeds (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid not null references properties(id) on delete cascade,
  room_id uuid references rooms(id) on delete cascade,
  room_type_id uuid references room_types(id) on delete cascade,
  channel text not null,
  direction text not null check (direction in ('import','export')),
  feed_url text not null,
  status text not null default 'ativo' check (status in ('ativo','erro','pausado')),
  last_sync_at timestamptz,
  last_message text,
  created_at timestamptz default now()
);

create table integration_logs (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid not null references properties(id) on delete cascade,
  integration_id uuid references integrations(id) on delete set null,
  channel text,
  action text not null,
  status text not null check (status in ('ok','erro','aviso')),
  message text,
  payload jsonb,
  created_at timestamptz default now()
);

create table notifications (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid not null references properties(id) on delete cascade,
  kind text not null,
  message text not null,
  read boolean default false,
  created_at timestamptz default now()
);

create table audit_logs (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references organizations(id) on delete cascade,
  property_id uuid references properties(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  user_name text,
  action text not null,
  entity text not null,
  entity_id text,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz default now()
);

-- ============================================================
-- Row Level Security — isolamento total por organização
-- ============================================================
create or replace function current_org() returns uuid language sql stable as $$
  select organization_id from app_users where id = auth.uid()
$$;

create or replace function current_role_rf() returns text language sql stable as $$
  select role from app_users where id = auth.uid()
$$;

alter table organizations enable row level security;
alter table properties enable row level security;
alter table app_users enable row level security;
alter table room_types enable row level security;
alter table rooms enable row level security;
alter table guests enable row level security;
alter table reservations enable row level security;
alter table payments enable row level security;
alter table expenses enable row level security;
alter table rate_rules enable row level security;
alter table housekeeping_tasks enable row level security;
alter table maintenance_tickets enable row level security;
alter table integrations enable row level security;
alter table ical_feeds enable row level security;
alter table integration_logs enable row level security;
alter table notifications enable row level security;
alter table audit_logs enable row level security;

create policy org_select on organizations for select using (id = current_org() or current_role_rf() = 'platform_admin');

create policy prop_all on properties for all
  using (organization_id = current_org() or current_role_rf() = 'platform_admin');

create policy users_same_org on app_users for select using (organization_id = current_org() or current_role_rf() = 'platform_admin');
create policy users_manage on app_users for all using (
  organization_id = current_org() and current_role_rf() in ('owner')
);

-- Padrão para tabelas operacionais: acesso pela propriedade da organização
create policy rt_all on room_types for all using (property_id in (select id from properties where organization_id = current_org()));
create policy rooms_all on rooms for all using (property_id in (select id from properties where organization_id = current_org()));
create policy guests_all on guests for all using (property_id in (select id from properties where organization_id = current_org()));
create policy res_all on reservations for all using (property_id in (select id from properties where organization_id = current_org()));
create policy rate_all on rate_rules for all using (property_id in (select id from properties where organization_id = current_org()));
create policy hk_all on housekeeping_tasks for all using (property_id in (select id from properties where organization_id = current_org()));
create policy mt_all on maintenance_tickets for all using (property_id in (select id from properties where organization_id = current_org()));
create policy ical_all on ical_feeds for all using (property_id in (select id from properties where organization_id = current_org()));
create policy ilog_all on integration_logs for select using (property_id in (select id from properties where organization_id = current_org()));
create policy notif_all on notifications for all using (property_id in (select id from properties where organization_id = current_org()));
create policy audit_read on audit_logs for select using (organization_id = current_org() and current_role_rf() in ('owner','manager'));

-- Financeiro: governança não acessa; somente perfis financeiros
create policy pay_all on payments for all using (
  property_id in (select id from properties where organization_id = current_org())
  and current_role_rf() in ('owner','manager','reception','finance')
);
create policy exp_all on expenses for all using (
  property_id in (select id from properties where organization_id = current_org())
  and current_role_rf() in ('owner','finance')
);

-- Integrações: apenas owner configura
create policy integ_all on integrations for all using (
  property_id in (select id from properties where organization_id = current_org())
  and current_role_rf() = 'owner'
);

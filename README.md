# ReservaFlow — Gestão inteligente para hospedagens

PMS (sistema de gestão hoteleira) para pousadas, hotéis, hostels, chalés e flats, com motor de reservas direto e arquitetura preparada para sincronização com canais externos (Booking, Airbnb, Expedia, Decolar, Agoda, Vrbo).

## Como rodar

```bash
npm install
npm run dev   # http://localhost:5500
```

## Acessos de demonstração

Todos com a hospedagem fictícia **Pousada Sol do Rio** (senha: qualquer valor):

| Perfil | E-mail | O que vê |
|---|---|---|
| Proprietária | marina@pousadasoldorio.com.br | tudo |
| Gerente | carlos@pousadasoldorio.com.br | operação + relatórios (sem financeiro/configurações) |
| Recepção | recepcao@pousadasoldorio.com.br | reservas, check-in/out, hóspedes, mapa |
| Financeiro | financeiro@pousadasoldorio.com.br | contas, pagamentos, comissões |
| Governança | governanca@pousadasoldorio.com.br | somente limpeza e manutenção |
| Admin SaaS | admin@reservaflow.app | administração da plataforma |

Página pública do motor de reservas: `/reservar/pousada-sol-do-rio`

## Módulos

- **Dashboard executivo** — ocupação, ADR, RevPAR, lead time, receita prevista/realizada, gráficos por canal e mês;
- **Mapa de reservas** — grade quarto × dia (7/14/30 dias), criação por clique, blocos coloridos por status, anti-overbooking;
- **Reservas** — CRUD completo, pré-reserva com expiração, pagamentos/estornos, desconto/taxas, voucher PDF, mensagem pronta para WhatsApp;
- **Recepção** — filas de check-in e check-out do dia com alertas de quarto sujo e saldo pendente;
- **Hóspedes** — ficha completa, VIP, recorrência, histórico, exportação;
- **Quartos e tipos de acomodação** — CRUD com tarifas base, capacidade e comodidades;
- **Governança** — fluxo sujo → em limpeza → limpo → vistoriado → disponível, com alerta de check-in chegando;
- **Manutenção** — chamados com prioridade; alta/urgente bloqueia o quarto no mapa automaticamente;
- **Tarifas** — regras por período/temporada/promoção + calendário tarifário visual (tarifas novas não alteram reservas existentes);
- **Financeiro** — contas a receber, pagamentos, despesas, comissões estimadas por canal;
- **Relatórios** — 8 relatórios com filtro de período, exportação PDF (layout com cabeçalho da pousada) e CSV;
- **Motor de reservas** — página pública com disponibilidade real, preço pelo calendário tarifário e 4 modos de confirmação;
- **Integrações** — feeds iCal import/export por quarto, logs de sincronização, adapters preparados para Channel Manager (Fase 2);
- **Usuários e permissões** — 6 perfis com menus e rotas filtrados por papel;
- **Admin da plataforma** — organizações, planos, bloqueio de clientes, erros de integração;
- **Landing page comercial** — em `/`.

## Regras de negócio implementadas

1. Overbooking bloqueado na aplicação (e por `exclude constraint` no schema SQL);
2. Check-in → reserva "hospedado" + quarto "ocupado";
3. Check-out → reserva "finalizada" + quarto "sujo" + tarefa de governança criada;
4. Manutenção alta/urgente bloqueia a disponibilidade do período;
5. Alterar tarifa não recalcula reservas já criadas;
6. Governança não vê financeiro; financeiro não altera configurações;
7. Auditoria de ações sensíveis (visível em Configurações).

## Arquitetura

- **Stack:** Vite + React 18 + TypeScript + Tailwind CSS + React Router + Recharts + jsPDF (mesmo padrão dos demais SaaS do workspace);
- **Dados (MVP):** camada local em `src/lib/store.tsx` com persistência em `localStorage` e seed de demonstração (`src/lib/seed.ts`). Botão ↺ no topo restaura o seed;
- **Produção:** schema completo PostgreSQL/Supabase com RLS multi-tenant em `supabase/schema.sql` — mesmas entidades de `src/lib/types.ts`, pronto para trocar a camada de dados;
- **Integrações:** iCal é sincronização de disponibilidade (MVP, simulada). A conexão completa com OTAs exige credenciais oficiais/Channel Manager — a UI já expõe a Fase 2 como "em breve".

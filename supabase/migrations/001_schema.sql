-- =====================================================================
-- JUNTOS · Acompáñame RD — Esquema Supabase (Gate 1 + estructura V2)
-- Ejecutar en Supabase > SQL Editor, de arriba hacia abajo, una sola vez.
-- Seguridad: RLS activo en todas las tablas. Los pagos, la cola de
-- WhatsApp y las finanzas se escriben solo con service_role (Edge Functions).
-- =====================================================================

-- ---------- Tipos ----------
create type rol_tipo        as enum ('familia','diaspora','acompanante','admin','b2b');
create type tipo_servicio   as enum ('4h','8h','noche_12h');
create type estado_servicio as enum ('pendiente','pagado','asignado','en_curso','completado','cancelado');
create type checkin_tipo    as enum ('in','out');
create type pago_metodo     as enum ('azul','stripe','wallet');
create type pago_estado     as enum ('pendiente','pagado','fallido','reembolsado');

-- ---------- Configuración y catálogo ----------
create table config (clave text primary key, valor numeric not null);
insert into config values ('margen_pct',0.32),('tasa_usd_dop',60),('wallet_comision_recarga',0.025),('radio_checkin_m',300);

create table catalogo_servicios (tipo tipo_servicio primary key, nombre text not null, horas int not null, precio_rd numeric(10,2) not null);
insert into catalogo_servicios values ('4h','4 horas',4,2200),('8h','8 horas',8,4000),('noche_12h','Noche Respiro 12h',12,3500);
create table catalogo_addons (codigo text primary key, nombre text not null, precio_rd numeric(10,2) not null);
insert into catalogo_addons values ('video','Video-Abrazo',300),('med','Chequeo de medicación',250);

-- ---------- Usuarios y roles ----------
create table roles (rol rol_tipo primary key, descripcion text not null);
insert into roles values ('familia','Familia en RD que solicita'),('diaspora','Paga desde el exterior y recibe reportes'),
 ('acompanante','Acompañante verificada'),('admin','Mesa operacional'),('b2b','Hospital/ARS (futuro)');

create table users (
  id uuid primary key references auth.users on delete cascade,
  nombre text, whatsapp text unique, pais text default 'DO', creado timestamptz not null default now());
create table user_roles (user_id uuid references users on delete cascade, rol rol_tipo references roles, primary key (user_id, rol));

create function has_role(r rol_tipo) returns boolean language sql stable security definer set search_path=public as
$$ select exists(select 1 from user_roles where user_id = auth.uid() and rol = r) $$;

-- Al registrarse por OTP de WhatsApp: crea perfil. Solo se acepta rol familia/diaspora desde el cliente.
create function on_auth_user() returns trigger language plpgsql security definer set search_path=public as $$
declare r text := coalesce(new.raw_user_meta_data->>'rol','familia');
begin
  insert into users(id, nombre, whatsapp) values (new.id, new.raw_user_meta_data->>'nombre', new.phone);
  insert into user_roles values (new.id, case when r='diaspora' then 'diaspora'::rol_tipo else 'familia'::rol_tipo end);
  return new;
end $$;
create trigger t_auth_user after insert on auth.users for each row execute function on_auth_user();

-- ---------- Acompañantes ----------
create table acompanantes (
  user_id uuid primary key references users on delete cascade,
  cedula text unique not null,
  fecha_nacimiento date not null,
  provincia text,
  antecedentes_path text,               -- bucket 'antecedentes' (PDF)
  verificado boolean not null default false,
  verificado_en timestamptz,
  chaleco_entregado boolean not null default false,
  activo boolean not null default true,
  rating numeric(3,2) not null default 5.0);

-- Solo se verifica con antecedentes cargados y edad entre 35 y 60
create function validar_verificacion() returns trigger language plpgsql as $$
begin
  if new.verificado and not old.verificado then
    if new.antecedentes_path is null then raise exception 'Falta el PDF de antecedentes'; end if;
    if extract(year from age(new.fecha_nacimiento)) not between 35 and 60 then raise exception 'Edad fuera del rango 35-60'; end if;
    new.verificado_en := now();
  end if; return new;
end $$;
create trigger t_verif before update on acompanantes for each row execute function validar_verificacion();

-- ---------- Servicios ----------
create table servicios (
  id uuid primary key default gen_random_uuid(),
  solicitante_id uuid not null references users,
  pagador_id uuid references users,              -- diáspora (recibe reportes)
  acompanante_id uuid references acompanantes(user_id),
  beneficiario text not null,
  tipo tipo_servicio not null,
  inicio timestamptz not null,
  provincia text not null, direccion text not null,
  lat double precision, lng double precision,
  notas text,
  addons text[] not null default '{}',
  precio_base numeric(10,2), total numeric(10,2),
  estado estado_servicio not null default 'pendiente',
  creado timestamptz not null default now());
create index on servicios (estado, inicio);
create index on servicios (acompanante_id);

-- Margen visible solo para admin (tabla aparte: RLS es por fila, no por columna)
create table servicio_finanzas (
  servicio_id uuid primary key references servicios on delete cascade,
  margen_pct numeric(4,3) not null, margen_rd numeric(10,2) not null, pago_acompanante_rd numeric(10,2) not null);

-- El precio SIEMPRE lo calcula el servidor con el catálogo
create function calcular_total() returns trigger language plpgsql as $$
declare b numeric; a numeric;
begin
  select precio_rd into b from catalogo_servicios where tipo = new.tipo;
  select coalesce(sum(precio_rd),0) into a from catalogo_addons where codigo = any(new.addons);
  new.precio_base := b; new.total := b + a; return new;
end $$;
create trigger t_total before insert or update of tipo, addons on servicios for each row execute function calcular_total();

create function calcular_finanzas() returns trigger language plpgsql security definer set search_path=public as $$
declare m numeric; begin select valor into m from config where clave='margen_pct';
  insert into servicio_finanzas values (new.id, m, round(new.total*m,2), round(new.total*(1-m),2))
  on conflict (servicio_id) do update set margen_pct=excluded.margen_pct, margen_rd=excluded.margen_rd, pago_acompanante_rd=excluded.pago_acompanante_rd;
  return new; end $$;
create trigger t_fin after insert or update of total on servicios for each row execute function calcular_finanzas();

-- Asignación: solo acompañantes verificadas y activas, sobre servicios pagados
create function validar_asignacion() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.acompanante_id is distinct from old.acompanante_id and new.acompanante_id is not null then
    if old.estado not in ('pagado','asignado') then raise exception 'El servicio debe estar pagado'; end if;
    if not exists (select 1 from acompanantes where user_id=new.acompanante_id and verificado and activo) then
      raise exception 'Acompañante no verificada'; end if;
    new.estado := 'asignado';
    insert into cola_whatsapp(user_id, plantilla, datos)
      select u, 'servicio_asignado', jsonb_build_object('servicio_id', new.id, 'beneficiario', new.beneficiario, 'inicio', new.inicio)
      from unnest(array[new.acompanante_id, new.solicitante_id, new.pagador_id]) u where u is not null;
  end if; return new;
end $$;

-- Helper de visibilidad
create function puede_ver_servicio(sid uuid) returns boolean language sql stable security definer set search_path=public as $$
  select has_role('admin') or exists (select 1 from servicios s where s.id = sid
    and auth.uid() in (s.solicitante_id, s.pagador_id, s.acompanante_id)) $$;

-- ---------- Check-in / Check-out ----------
create table checkins (
  id uuid primary key default gen_random_uuid(),
  servicio_id uuid not null references servicios on delete cascade,
  tipo checkin_tipo not null,
  lat double precision not null, lng double precision not null, precision_m int,
  foto_path text not null,                        -- bucket 'checkin-fotos': {servicio_id}/{in|out}.jpg
  ts timestamptz not null default now(),
  distancia_m int, fuera_de_rango boolean not null default false,
  unique (servicio_id, tipo));

create function distancia_m(la1 float8, lo1 float8, la2 float8, lo2 float8) returns int language sql immutable as $$
  select (2*6371000*asin(sqrt(sin(radians(la2-la1)/2)^2 + cos(radians(la1))*cos(radians(la2))*sin(radians(lo2-lo1)/2)^2)))::int $$;

create function pre_checkin() returns trigger language plpgsql as $$
declare s servicios; radio numeric;
begin
  select * into s from servicios where id = new.servicio_id;
  new.ts := now();                                 -- hora del servidor, no del celular
  if s.lat is not null then
    select valor into radio from config where clave='radio_checkin_m';
    new.distancia_m := distancia_m(new.lat,new.lng,s.lat,s.lng);
    new.fuera_de_rango := new.distancia_m > radio;
  end if;
  if new.tipo='out' and not exists (select 1 from reportes where servicio_id=new.servicio_id) then
    raise exception 'Envía el mini-reporte antes del check-out'; end if;
  return new;
end $$;
create trigger t_pre_ci before insert on checkins for each row execute function pre_checkin();

create function post_checkin() returns trigger language plpgsql security definer set search_path=public as $$
declare s servicios;
begin
  update servicios set estado = case when new.tipo='in' then 'en_curso' else 'completado' end::estado_servicio
    where id = new.servicio_id returning * into s;
  insert into cola_whatsapp(user_id, plantilla, datos)
    select u, 'checkin_'||new.tipo, jsonb_build_object('servicio_id',s.id,'beneficiario',s.beneficiario,'ts',new.ts,'foto',new.foto_path)
    from unnest(array[s.solicitante_id, s.pagador_id]) u where u is not null;
  return new;
end $$;
create trigger t_post_ci after insert on checkins for each row execute function post_checkin();

-- ---------- Reportes, calificaciones, SOS ----------
create table reportes (
  servicio_id uuid primary key references servicios on delete cascade,
  comio text not null check (comio in ('bien','poco','nada')),
  pastilla boolean not null,
  animo smallint not null check (animo between 1 and 5),
  nota text,
  video_path text,                                 -- bucket 'reportes-videos' (Video-Abrazo 30s)
  creado timestamptz not null default now());

create table calificaciones (
  servicio_id uuid primary key references servicios on delete cascade,
  estrellas smallint not null check (estrellas between 1 and 5),
  comentario text, creado timestamptz not null default now());
create function actualizar_rating() returns trigger language plpgsql security definer set search_path=public as $$
begin
  update acompanantes a set rating = (select round(avg(c.estrellas),2) from calificaciones c join servicios s on s.id=c.servicio_id where s.acompanante_id=a.user_id)
  where a.user_id = (select acompanante_id from servicios where id=new.servicio_id); return new; end $$;
create trigger t_rating after insert or update on calificaciones for each row execute function actualizar_rating();

create table alertas_sos (
  id uuid primary key default gen_random_uuid(),
  acompanante_id uuid not null references acompanantes(user_id),
  servicio_id uuid references servicios, lat double precision, lng double precision,
  creado timestamptz not null default now(), atendida boolean not null default false, atendida_por uuid references users);

-- ---------- Pagos (los escribe el webhook de Azul/Stripe con service_role) ----------
create table pagos (
  id uuid primary key default gen_random_uuid(),
  servicio_id uuid not null references servicios,
  metodo pago_metodo not null,
  moneda char(3) not null check (moneda in ('DOP','USD')),
  monto numeric(10,2) not null, tasa_cambio numeric(8,4),
  estado pago_estado not null default 'pendiente',
  ref_externa text unique,                        -- id de Azul o Stripe
  creado timestamptz not null default now(), pagado_en timestamptz);
create function pago_confirmado() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.estado='pagado' then
    new.pagado_en := coalesce(new.pagado_en, now());
    update servicios set estado='pagado' where id=new.servicio_id and estado='pendiente';
  end if; return new; end $$;
create trigger t_pago before insert or update of estado on pagos for each row execute function pago_confirmado();

-- ---------- Cola de WhatsApp (una Edge Function con Twilio la procesa) ----------
create table cola_whatsapp (
  id bigserial primary key, user_id uuid references users, plantilla text not null, datos jsonb,
  estado text not null default 'pendiente', creado timestamptz not null default now(), enviado_en timestamptz);
create trigger t_asig before update on servicios for each row execute function validar_asignacion();

-- ---------- V2 (estructura lista, sin lógica en el MVP) ----------
create table wallets (user_id uuid primary key references users, saldo_rd numeric(12,2) not null default 0 check (saldo_rd >= 0));
create table wallet_transacciones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references wallets(user_id),
  tipo text not null check (tipo in ('recarga','pago_servicio','pago_farmacia','pago_colmado','ajuste')),
  monto_usd numeric(10,2), comision_usd numeric(10,2) default 0,   -- 2.5% en recargas
  tasa_cambio numeric(8,4), monto_rd numeric(12,2) not null,       -- + crédito / - débito
  ref_stripe text unique, servicio_id uuid references servicios, comercio text, creado timestamptz not null default now());
create table academia_inscripciones (
  id uuid primary key default gen_random_uuid(), user_id uuid references users,
  nombre text not null, cedula text not null, whatsapp text not null, provincia text, talla_chaleco text,
  matricula_rd numeric(10,2) not null default 8500,
  estado text not null default 'pendiente' check (estado in ('pendiente','pagada','en_curso','graduada')),
  certificado_path text, creado timestamptz not null default now());

-- =====================================================================
-- RLS
-- =====================================================================
alter table users enable row level security;            alter table user_roles enable row level security;
alter table acompanantes enable row level security;     alter table servicios enable row level security;
alter table servicio_finanzas enable row level security; alter table checkins enable row level security;
alter table reportes enable row level security;         alter table calificaciones enable row level security;
alter table alertas_sos enable row level security;      alter table pagos enable row level security;
alter table cola_whatsapp enable row level security;    alter table wallets enable row level security;
alter table wallet_transacciones enable row level security; alter table academia_inscripciones enable row level security;
alter table config enable row level security;           alter table catalogo_servicios enable row level security;
alter table catalogo_addons enable row level security;  alter table roles enable row level security;

create policy cat_s  on catalogo_servicios for select using (true);
create policy cat_a  on catalogo_addons    for select using (true);
create policy roles_r on roles             for select using (true);
create policy cfg_a  on config             for all using (has_role('admin'));

create policy u_sel  on users for select using (id = auth.uid() or has_role('admin'));
create policy u_upd  on users for update using (id = auth.uid());
create policy ur_sel on user_roles for select using (user_id = auth.uid() or has_role('admin'));
create policy ur_adm on user_roles for all using (has_role('admin'));

create policy ac_sel on acompanantes for select using (user_id = auth.uid() or has_role('admin'));
create policy ac_adm on acompanantes for all using (has_role('admin'));

create policy sv_sel on servicios for select using (puede_ver_servicio(id));
create policy sv_ins on servicios for insert with check (solicitante_id = auth.uid() and estado='pendiente' and acompanante_id is null);
create policy sv_adm on servicios for update using (has_role('admin'));
create policy fin_adm on servicio_finanzas for select using (has_role('admin'));

create policy ci_sel on checkins for select using (puede_ver_servicio(servicio_id));
create policy ci_ins on checkins for insert with check (exists (select 1 from servicios s where s.id = checkins.servicio_id and s.acompanante_id = auth.uid()
  and ((checkins.tipo='in' and s.estado='asignado') or (checkins.tipo='out' and s.estado='en_curso'))));

create policy rp_sel on reportes for select using (puede_ver_servicio(servicio_id));
create policy rp_ins on reportes for insert with check (exists (select 1 from servicios s where s.id = reportes.servicio_id and s.acompanante_id = auth.uid() and s.estado='en_curso'));

create policy cal_sel on calificaciones for select using (puede_ver_servicio(servicio_id));
create policy cal_ins on calificaciones for insert with check (exists (select 1 from servicios s where s.id = calificaciones.servicio_id
  and auth.uid() in (s.solicitante_id, s.pagador_id) and s.estado='completado'));

create policy sos_ins on alertas_sos for insert with check (acompanante_id = auth.uid());
create policy sos_sel on alertas_sos for select using (acompanante_id = auth.uid() or has_role('admin'));
create policy sos_upd on alertas_sos for update using (has_role('admin'));

create policy pg_sel on pagos for select using (puede_ver_servicio(servicio_id));
create policy wa_adm on cola_whatsapp for select using (has_role('admin'));
create policy wl_sel on wallets for select using (user_id = auth.uid() or has_role('admin'));
create policy wt_sel on wallet_transacciones for select using (user_id = auth.uid() or has_role('admin'));
create policy ai_ins on academia_inscripciones for insert to anon, authenticated with check (estado='pendiente');
create policy ai_sel on academia_inscripciones for select using (user_id = auth.uid() or has_role('admin'));

-- Datos públicos de la acompañante para la familia (sin cédula ni antecedentes)
create view acompanante_publica as
  select distinct s.id as servicio_id, a.user_id, u.nombre, a.rating, a.verificado
  from servicios s join acompanantes a on a.user_id = s.acompanante_id join users u on u.id = a.user_id
  where puede_ver_servicio(s.id);
revoke all on acompanante_publica from anon;

-- =====================================================================
-- STORAGE (buckets privados; el frontend usa URLs firmadas)
-- =====================================================================
insert into storage.buckets (id, name, public) values
 ('checkin-fotos','checkin-fotos',false),('reportes-videos','reportes-videos',false),('antecedentes','antecedentes',false)
on conflict do nothing;

-- Ruta: {servicio_id}/{archivo}. Sube solo la acompañante asignada; ve quien participa del servicio.
create policy st_ins on storage.objects for insert to authenticated with check (
  bucket_id in ('checkin-fotos','reportes-videos') and exists (select 1 from servicios s
    where s.id::text = (storage.foldername(name))[1] and s.acompanante_id = auth.uid()));
create policy st_sel on storage.objects for select to authenticated using (
  bucket_id in ('checkin-fotos','reportes-videos') and puede_ver_servicio(((storage.foldername(name))[1])::uuid));
-- Antecedentes: ruta {user_id}/{archivo}; solo la dueña y el admin
create policy an_ins on storage.objects for insert to authenticated with check (
  bucket_id='antecedentes' and ((storage.foldername(name))[1] = auth.uid()::text or has_role('admin')));
create policy an_sel on storage.objects for select to authenticated using (
  bucket_id='antecedentes' and ((storage.foldername(name))[1] = auth.uid()::text or has_role('admin')));

-- Primer admin (después de crear tu usuario): 
-- insert into user_roles values ('<tu-uuid>','admin');

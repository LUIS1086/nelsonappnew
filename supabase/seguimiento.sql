-- ════════════════════════════════════════════════════════════════════════════
-- Nelson App Pro · Seguimiento del cliente (Supabase)
-- Pega TODO este archivo en Supabase → SQL Editor → Run. Se puede ejecutar más de una vez.
--
-- Seguridad:
--  · Las tablas tienen RLS activado y SIN políticas: nadie puede leerlas ni escribirlas directamente.
--  · La página pública solo puede llamar a seg_obtener(token): devuelve UNA orden si el token existe
--    (token aleatorio de 144 bits, imposible de adivinar) y nunca expone teléfono ni cédula.
--  · La app escribe con seg_upsert / seg_eliminar, que exigen tu CLAVE secreta (se guarda cifrada con SHA-256).
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.seguimiento_config (
  id         int primary key default 1 check (id = 1),
  clave_hash text not null
);

create table if not exists public.seguimiento (
  token          text primary key check (token ~ '^[A-Za-z0-9_-]{24,64}$'),
  order_id       bigint not null,
  numero         text,
  cliente        text,                       -- solo el primer nombre
  equipo         text,
  falla          text,
  estado         text not null default 'recibido'
                 check (estado in ('recibido','revisión','reparado','entregado','no-reparable')),
  valor          numeric,
  adelanto       numeric,
  saldo          numeric,
  fecha_ingreso  timestamptz,
  fecha_estado   timestamptz,
  fecha_estimada text,
  garantia_dias  int,
  foto_ingreso   text,                       -- miniatura JPEG en base64 (~20-40 KB)
  foto_final     text,
  negocio        text,
  wa_negocio     text,
  updated_at     timestamptz not null default now()
);
create index if not exists seguimiento_order_idx on public.seguimiento (order_id);

alter table public.seguimiento        enable row level security;
alter table public.seguimiento_config enable row level security;
revoke all on public.seguimiento        from anon, authenticated;
revoke all on public.seguimiento_config from anon, authenticated;

-- Verifica la clave (función interna: no se puede llamar desde fuera)
create or replace function public.seg_clave_ok(p_clave text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.seguimiento_config c
    where c.id = 1
      and c.clave_hash = encode(sha256(convert_to(coalesce(p_clave, ''), 'utf8')), 'hex')
  );
$$;
revoke all on function public.seg_clave_ok(text) from public, anon, authenticated;

-- La app comprueba aquí que la clave coincide
create or replace function public.seg_probar(p_clave text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.seg_clave_ok(p_clave);
$$;

-- Crear o actualizar el seguimiento de una orden (solo con la clave)
create or replace function public.seg_upsert(p_clave text, p jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.seg_clave_ok(p_clave) then
    raise exception 'clave_invalida' using errcode = '28000';
  end if;
  if coalesce(p->>'token', '') !~ '^[A-Za-z0-9_-]{24,64}$' then
    raise exception 'token_invalido';
  end if;
  if length(coalesce(p->>'foto_ingreso', '')) > 300000 or length(coalesce(p->>'foto_final', '')) > 300000 then
    raise exception 'foto_muy_grande';
  end if;

  insert into public.seguimiento as s (
    token, order_id, numero, cliente, equipo, falla, estado, valor, adelanto, saldo,
    fecha_ingreso, fecha_estado, fecha_estimada, garantia_dias, foto_ingreso, foto_final,
    negocio, wa_negocio, updated_at
  ) values (
    p->>'token', (p->>'order_id')::bigint, left(p->>'numero', 20), left(p->>'cliente', 60),
    left(p->>'equipo', 120), left(p->>'falla', 240), coalesce(p->>'estado', 'recibido'),
    nullif(p->>'valor', '')::numeric, nullif(p->>'adelanto', '')::numeric, nullif(p->>'saldo', '')::numeric,
    nullif(p->>'fecha_ingreso', '')::timestamptz, nullif(p->>'fecha_estado', '')::timestamptz,
    left(p->>'fecha_estimada', 20), nullif(p->>'garantia_dias', '')::int,
    p->>'foto_ingreso', p->>'foto_final', left(p->>'negocio', 80), left(p->>'wa_negocio', 20), now()
  )
  on conflict (token) do update set
    numero         = excluded.numero,
    cliente        = excluded.cliente,
    equipo         = excluded.equipo,
    falla          = excluded.falla,
    estado         = excluded.estado,
    valor          = excluded.valor,
    adelanto       = excluded.adelanto,
    saldo          = excluded.saldo,
    fecha_ingreso  = excluded.fecha_ingreso,
    fecha_estado   = excluded.fecha_estado,
    fecha_estimada = excluded.fecha_estimada,
    garantia_dias  = excluded.garantia_dias,
    foto_ingreso   = coalesce(excluded.foto_ingreso, s.foto_ingreso),  -- null = conservar; '' = quitar
    foto_final     = coalesce(excluded.foto_final,   s.foto_final),
    negocio        = excluded.negocio,
    wa_negocio     = excluded.wa_negocio,
    updated_at     = now();

  -- Limpieza automática: entregadas / sin reparación con más de 90 días
  delete from public.seguimiento
   where estado in ('entregado', 'no-reparable') and updated_at < now() - interval '90 days';
end;
$$;

-- Borrar el seguimiento de una orden eliminada en la app
create or replace function public.seg_eliminar(p_clave text, p_order_id bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.seg_clave_ok(p_clave) then
    raise exception 'clave_invalida' using errcode = '28000';
  end if;
  delete from public.seguimiento where order_id = p_order_id;
end;
$$;

-- Lo que ve el cliente (página pública): una orden por token, sin datos personales
create or replace function public.seg_obtener(p_token text) returns jsonb
language sql stable security definer set search_path = public as $$
  select to_jsonb(r) from (
    select numero, cliente, equipo, falla, estado, valor, adelanto, saldo,
           fecha_ingreso, fecha_estado, fecha_estimada, garantia_dias,
           foto_ingreso, foto_final, negocio, wa_negocio, updated_at
    from public.seguimiento
    where token = p_token
  ) r;
$$;

grant execute on function public.seg_probar(text)            to anon;
grant execute on function public.seg_upsert(text, jsonb)     to anon;
grant execute on function public.seg_eliminar(text, bigint)  to anon;
grant execute on function public.seg_obtener(text)           to anon;

-- ── Siguiente paso ──────────────────────────────────────────────────────────
-- En la app: Configuración → Seguimiento del cliente → «Generar clave» → «Copiar SQL de la clave»,
-- y ejecuta ese SQL aquí una vez. Con eso queda todo conectado.

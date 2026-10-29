-- ════════════════════════════════════════════════════════════════════════════
-- Nelson App Pro · Seguimiento del cliente (Supabase)         v2 · con aprobación de presupuesto
-- Pega TODO este archivo en Supabase → SQL Editor → Run. Se puede ejecutar más de una vez
-- (también sirve para actualizar desde la v1 sin perder datos).
--
-- Seguridad:
--  · Las tablas tienen RLS activado y SIN políticas: nadie puede leerlas ni escribirlas directamente.
--  · La página pública solo puede llamar a seg_obtener(token) y seg_responder(token, respuesta):
--    una orden por token (aleatorio de 144 bits, imposible de adivinar); nunca expone teléfono ni cédula.
--  · La app escribe/lee respuestas con seg_upsert / seg_eliminar / seg_respuestas / seg_marcar_visto,
--    que exigen tu CLAVE secreta (se guarda cifrada con SHA-256).
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

-- v3: contacto del cliente para avisos automáticos (n8n). NUNCA lo devuelve seg_obtener.
alter table public.seguimiento add column if not exists telefono text;
alter table public.seguimiento add column if not exists correo   text;

-- v2: aprobación de presupuesto por el cliente
alter table public.seguimiento add column if not exists presupuesto_estado text
  check (presupuesto_estado in ('pendiente','enviado','aprobado','rechazado'));
alter table public.seguimiento add column if not exists presupuesto_valor numeric;  -- valor que el cliente ve al aprobar
alter table public.seguimiento add column if not exists respuesta_at      timestamptz;
alter table public.seguimiento add column if not exists respuesta_visto   boolean not null default true; -- false = respuesta nueva que la app aún no ha leído

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
declare
  v_cur text; v_visto boolean; v_in text; v_final text; v_valor numeric; v_pv numeric;
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

  v_valor := nullif(p->>'valor', '')::numeric;
  -- Valor del presupuesto: siempre visible para quien debe aprobarlo, aunque el taller oculte el valor general.
  v_pv := coalesce(nullif(p->>'presu_valor', '')::numeric, v_valor);
  v_in := nullif(p->>'presupuesto', '');
  if v_in is not null and v_in not in ('pendiente','enviado','aprobado','rechazado') then v_in := null; end if;

  select s.presupuesto_estado, s.respuesta_visto into v_cur, v_visto
    from public.seguimiento s where s.token = p->>'token';
  -- Una respuesta del cliente que la app todavía no ha leído NO se pisa con datos viejos de la app.
  if v_cur in ('aprobado','rechazado') and v_visto is false then
    v_final := v_cur;
  else
    v_final := coalesce(v_in, v_cur, 'pendiente');
  end if;

  insert into public.seguimiento as s (
    token, order_id, numero, cliente, equipo, falla, estado, valor, adelanto, saldo,
    fecha_ingreso, fecha_estado, fecha_estimada, garantia_dias, foto_ingreso, foto_final,
    negocio, wa_negocio, telefono, presupuesto_estado, presupuesto_valor, updated_at
  ) values (
    p->>'token', (p->>'order_id')::bigint, left(p->>'numero', 20), left(p->>'cliente', 60),
    left(p->>'equipo', 120), left(p->>'falla', 240), coalesce(p->>'estado', 'recibido'),
    v_valor, nullif(p->>'adelanto', '')::numeric, nullif(p->>'saldo', '')::numeric,
    nullif(p->>'fecha_ingreso', '')::timestamptz, nullif(p->>'fecha_estado', '')::timestamptz,
    left(p->>'fecha_estimada', 20), nullif(p->>'garantia_dias', '')::int,
    p->>'foto_ingreso', p->>'foto_final', left(p->>'negocio', 80), left(p->>'wa_negocio', 20),
    left(nullif(p->>'telefono', ''), 20),
    v_final, case when v_final = 'enviado' then v_pv else null end, now()
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
    telefono       = coalesce(excluded.telefono, s.telefono),
    presupuesto_estado = v_final,
    presupuesto_valor  = case when v_final = 'enviado' then v_pv
                              when v_final in ('aprobado','rechazado') then coalesce(s.presupuesto_valor, v_pv)
                              else null end,
    respuesta_at   = case when v_final = 'enviado' then null else s.respuesta_at end,
    updated_at     = now();

  -- Limpieza automática: entregadas / sin reparación, tras 90 días o (garantía + 30 días) si la garantía es más larga,
  -- para que los avisos de garantía por vencer (n8n) no pierdan la orden antes de tiempo.
  delete from public.seguimiento
   where estado in ('entregado', 'no-reparable')
     and updated_at < now() - greatest(interval '90 days', make_interval(days => greatest(coalesce(garantia_dias, 0), 0) + 30));
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
           foto_ingreso, foto_final, negocio, wa_negocio, updated_at,
           presupuesto_estado, presupuesto_valor, respuesta_at
    from public.seguimiento
    where token = p_token
  ) r;
$$;

-- El cliente aprueba o rechaza el presupuesto desde su enlace.
-- Solo aplica si el taller lo marcó «enviado», hay valor y el equipo aún no está reparado/entregado. No se puede cambiar después.
create or replace function public.seg_responder(p_token text, p_respuesta text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if p_respuesta not in ('aprobado','rechazado') or coalesce(p_token, '') !~ '^[A-Za-z0-9_-]{24,64}$' then
    return null;
  end if;
  update public.seguimiento
     set presupuesto_estado = p_respuesta, respuesta_at = now(), respuesta_visto = false, updated_at = now()
   where token = p_token
     and presupuesto_estado = 'enviado'
     and estado in ('recibido','revisión')
     and coalesce(presupuesto_valor, 0) > 0;
  return public.seg_obtener(p_token);
end;
$$;

-- La app consulta las respuestas nuevas de los clientes (solo con la clave)
create or replace function public.seg_respuestas(p_clave text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.seg_clave_ok(p_clave) then
    raise exception 'clave_invalida' using errcode = '28000';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'order_id', order_id, 'presupuesto_estado', presupuesto_estado,
             'presupuesto_valor', presupuesto_valor, 'respuesta_at', respuesta_at) order by respuesta_at)
      from public.seguimiento
     where respuesta_visto = false and presupuesto_estado in ('aprobado','rechazado')
  ), '[]'::jsonb);
end;
$$;

-- La app confirma que ya leyó esas respuestas
create or replace function public.seg_marcar_visto(p_clave text, p_order_ids bigint[]) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.seg_clave_ok(p_clave) then
    raise exception 'clave_invalida' using errcode = '28000';
  end if;
  update public.seguimiento set respuesta_visto = true
   where order_id = any(p_order_ids) and respuesta_visto = false;
end;
$$;

grant execute on function public.seg_probar(text)               to anon;
grant execute on function public.seg_upsert(text, jsonb)        to anon;
grant execute on function public.seg_eliminar(text, bigint)     to anon;
grant execute on function public.seg_obtener(text)              to anon;
grant execute on function public.seg_responder(text, text)      to anon;
grant execute on function public.seg_respuestas(text)           to anon;
grant execute on function public.seg_marcar_visto(text, bigint[]) to anon;

-- ── Siguiente paso ──────────────────────────────────────────────────────────
-- En la app: Configuración → Seguimiento del cliente → «Generar clave» → «Copiar SQL de la clave»,
-- y ejecuta ese SQL aquí una vez. Con eso queda todo conectado.

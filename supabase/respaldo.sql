-- ════════════════════════════════════════════════════════════════════════════
-- Nelson App Pro · Respaldo en la nube (Supabase)
-- Requiere haber ejecutado antes supabase/seguimiento.sql (usa la misma clave secreta).
-- Pega TODO este archivo en Supabase → SQL Editor → Run. Se puede ejecutar más de una vez.
--
-- Cómo guarda:
--  · respaldos       → los DATOS completos (órdenes, ventas, inventario, clientes, pagos…) sin fotos, ~0,3 MB cada uno.
--                      Se conservan los últimos 30.
--  · respaldo_fotos  → cada FOTO una sola vez (por huella SHA-256). Los respaldos siguientes solo suben las fotos nuevas.
-- Seguridad: RLS sin políticas (nadie lee ni escribe directo); todo pasa por funciones que exigen tu clave secreta.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.respaldos (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  etiqueta    text,
  resumen     jsonb not null default '{}'::jsonb,
  bytes_datos int not null default 0,
  datos       text not null,
  fotos_refs  text[] not null default '{}'
);

create table if not exists public.respaldo_fotos (
  hash       text primary key check (hash ~ '^[0-9a-f]{64}$'),
  data       text not null check (length(data) between 100 and 1200000),
  created_at timestamptz not null default now()
);

alter table public.respaldos      enable row level security;
alter table public.respaldo_fotos enable row level security;
revoke all on public.respaldos      from anon, authenticated;
revoke all on public.respaldo_fotos from anon, authenticated;

-- ¿Qué fotos aún no están en la nube?
create or replace function public.resp_fotos_faltantes(p_clave text, p_hashes text[]) returns text[]
language plpgsql security definer set search_path = public as $$
begin
  if not public.seg_clave_ok(p_clave) then raise exception 'clave_invalida' using errcode = '28000'; end if;
  if coalesce(array_length(p_hashes, 1), 0) > 3000 then raise exception 'demasiados_hashes'; end if;
  return coalesce((
    select array_agg(h) from (
      select distinct h from unnest(p_hashes) as h
       where h ~ '^[0-9a-f]{64}$'
         and not exists (select 1 from public.respaldo_fotos f where f.hash = h)
    ) x
  ), '{}');
end;
$$;

-- Subir un lote de fotos: {"<sha256>": "data:image/jpeg;base64,..."}
create or replace function public.resp_fotos_subir(p_clave text, p_fotos jsonb) returns int
language plpgsql security definer set search_path = public as $$
declare k text; v text; n int := 0; c int;
begin
  if not public.seg_clave_ok(p_clave) then raise exception 'clave_invalida' using errcode = '28000'; end if;
  if jsonb_typeof(p_fotos) <> 'object' then raise exception 'formato_invalido'; end if;
  if length(p_fotos::text) > 4000000 then raise exception 'lote_muy_grande'; end if;
  for k, v in select e.key, e.value #>> '{}' from jsonb_each(p_fotos) e loop
    if k !~ '^[0-9a-f]{64}$' or v is null or v not like 'data:image/%' then raise exception 'foto_invalida'; end if;
    insert into public.respaldo_fotos (hash, data) values (k, v) on conflict (hash) do nothing;
    get diagnostics c = row_count; n := n + c;
  end loop;
  return n;
end;
$$;

-- Guardar un respaldo de datos (las fotos que referencia ya deben estar subidas)
create or replace function public.resp_guardar(p_clave text, p_etiqueta text, p_resumen jsonb, p_datos text, p_refs text[]) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_id bigint; v_at timestamptz;
begin
  if not public.seg_clave_ok(p_clave) then raise exception 'clave_invalida' using errcode = '28000'; end if;
  if p_datos is null or length(p_datos) < 2 or left(p_datos, 1) <> '{' or length(p_datos) > 20000000 then raise exception 'datos_invalidos'; end if;
  if exists (select 1 from unnest(coalesce(p_refs, '{}')) h where not exists (select 1 from public.respaldo_fotos f where f.hash = h)) then
    raise exception 'faltan_fotos';
  end if;
  insert into public.respaldos (etiqueta, resumen, bytes_datos, datos, fotos_refs)
  values (left(p_etiqueta, 80), coalesce(p_resumen, '{}'::jsonb), length(p_datos), p_datos, coalesce(p_refs, '{}'))
  returning id, created_at into v_id, v_at;
  -- conservar solo los últimos 30 respaldos y borrar fotos que ya nadie usa
  delete from public.respaldos where id not in (select id from public.respaldos order by id desc limit 30);
  delete from public.respaldo_fotos where hash not in (select distinct unnest(fotos_refs) from public.respaldos);
  return jsonb_build_object('id', v_id, 'created_at', v_at, 'bytes', length(p_datos));
end;
$$;

create or replace function public.resp_listar(p_clave text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.seg_clave_ok(p_clave) then raise exception 'clave_invalida' using errcode = '28000'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', id, 'created_at', created_at, 'etiqueta', etiqueta, 'resumen', resumen, 'bytes_datos', bytes_datos) order by id desc)
      from public.respaldos
  ), '[]'::jsonb);
end;
$$;

create or replace function public.resp_obtener(p_clave text, p_id bigint) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r jsonb;
begin
  if not public.seg_clave_ok(p_clave) then raise exception 'clave_invalida' using errcode = '28000'; end if;
  select jsonb_build_object('id', id, 'created_at', created_at, 'datos', datos, 'fotos_refs', to_jsonb(fotos_refs))
    into r from public.respaldos where id = p_id;
  return r;
end;
$$;

create or replace function public.resp_fotos_obtener(p_clave text, p_hashes text[]) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.seg_clave_ok(p_clave) then raise exception 'clave_invalida' using errcode = '28000'; end if;
  if coalesce(array_length(p_hashes, 1), 0) > 20 then raise exception 'demasiadas_fotos'; end if;
  return coalesce((select jsonb_object_agg(hash, data) from public.respaldo_fotos where hash = any(p_hashes)), '{}'::jsonb);
end;
$$;

grant execute on function public.resp_fotos_faltantes(text, text[])                  to anon;
grant execute on function public.resp_fotos_subir(text, jsonb)                       to anon;
grant execute on function public.resp_guardar(text, text, jsonb, text, text[])       to anon;
grant execute on function public.resp_listar(text)                                   to anon;
grant execute on function public.resp_obtener(text, bigint)                          to anon;
grant execute on function public.resp_fotos_obtener(text, text[])                    to anon;

-- Nelson App Pro · Avisos de garantías por vencer (BORRADOR — revisa antes de ejecutar)
-- Idea: la app sube a esta tabla SOLO las garantías por vencer (sin cédula), y n8n las lee cada día para avisar.
create table if not exists public.garantias_aviso (
  id            bigint generated always as identity primary key,
  order_id      bigint not null,
  negocio       text,
  cliente       text,                    -- solo primer nombre
  telefono      text,
  equipo        text,
  vence         date not null,           -- fecha de vencimiento de la garantía
  avisado_en    timestamptz,             -- lo marca n8n después de enviar
  creado_en     timestamptz not null default now(),
  unique (order_id)
);
alter table public.garantias_aviso enable row level security;   -- sin políticas: solo n8n con la service key

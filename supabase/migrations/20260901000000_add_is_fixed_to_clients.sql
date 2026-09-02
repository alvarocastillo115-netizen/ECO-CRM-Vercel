-- Marca un cliente como "Cliente Fijo" (recurrente). La UI ya enviaba is_fixed
-- en el payload de clients, pero la columna nunca se creó: PostgREST rechazaba
-- el UPDATE completo con "Could not find the 'is_fixed' column of 'clients'",
-- lo que impedía editar cualquier campo del cliente.
--
-- Aditiva y sin reescritura de tabla (default constante, Postgres 11+).
-- Los clientes existentes quedan en false, que es el estado actual.
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS is_fixed BOOLEAN NOT NULL DEFAULT false;

-- Refresca el cache de esquema de PostgREST para que la columna esté
-- disponible de inmediato sin esperar el reload automático.
NOTIFY pgrst, 'reload schema';

-- Almacena un teléfono de contacto por usuario/perfil para que el Generador de
-- Cotizaciones ("Generador de Coti.") pueda autocompletar el teléfono del asesor
-- comercial al seleccionarlo. Es opcional (nullable): los perfiles existentes
-- quedan sin teléfono hasta que un admin lo capture en Configuración → Usuarios.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT;

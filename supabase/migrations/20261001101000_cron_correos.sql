-- Cada 10 minutos le pide a la Edge Function `enviar-correos` que mande los avisos por correo.
-- Requiere en Vault los secretos `clave_cron` (aleatoria) y `anon_jwt` (anon key en formato JWT).
-- Se crean a mano, no van al repo:
--   select vault.create_secret(encode(extensions.gen_random_bytes(24), 'hex'), 'clave_cron');
--   select vault.create_secret('<anon key JWT>', 'anon_jwt');
select cron.schedule(
  'enviar-correos',
  '5-59/10 * * * *',
  $$
  select net.http_post(
    url := 'https://ynolirfzjcjsvesnfpes.supabase.co/functions/v1/enviar-correos',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'anon_jwt'),
      'x-clave-cron', (select decrypted_secret from vault.decrypted_secrets where name = 'clave_cron')
    ),
    body := '{}'::jsonb
  )
  $$
);

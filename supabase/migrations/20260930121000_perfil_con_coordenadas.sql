-- El registro manda el id de la localidad: el perfil guarda nombre y coordenadas para buscar "cerca de mi casa".
create or replace function public.crear_perfil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_loc public.localidades;
begin
  select * into v_loc from public.localidades where id = nullif(new.raw_user_meta_data ->> 'localidad_id', '')::smallint;

  insert into public.profiles (id, nombre, apellido, documento, fecha_nacimiento, localidad, lat, lng)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nombre', ''),
    coalesce(new.raw_user_meta_data ->> 'apellido', ''),
    coalesce(new.raw_user_meta_data ->> 'documento', ''),
    nullif(new.raw_user_meta_data ->> 'fecha_nacimiento', '')::date,
    coalesce(v_loc.nombre, new.raw_user_meta_data ->> 'localidad'),
    v_loc.lat,
    v_loc.lng
  );
  return new;
end;
$$;

update public.profiles p set lat = l.lat, lng = l.lng
from public.localidades l
where p.lat is null and l.nombre = p.localidad;

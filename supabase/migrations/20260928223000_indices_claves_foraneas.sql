create index agendas_especialidad_idx on public.agendas (especialidad_id);
create index turnos_agenda_idx on public.turnos_disponibles (agenda_id);

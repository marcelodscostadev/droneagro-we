-- Cria automaticamente um profile quando um novo usuário é criado no Supabase Auth.
-- Substitui o "self-healing" que existia no client (useAuth.ts), que concedia role 'admin'
-- a qualquer usuário sem profile. Novos usuários nascem como 'client' e devem ser
-- promovidos por um admin na página de Usuários.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    'client'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

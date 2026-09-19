-- Local-only dev fixtures. Never reaches production.

insert into auth.users (
  instance_id, 
  id, 
  aud, 
  role, 
  email, 
  encrypted_password,
  email_confirmed_at, 
  raw_app_meta_data, 
  raw_user_meta_data,
  created_at, 
  updated_at, 
  confirmation_token, 
  email_change,
  email_change_token_new, 
  recovery_token
) values
  (
    '00000000-0000-0000-0000-000000000000',
    'a0000000-0000-0000-0000-000000000001',
    'authenticated', 
    'authenticated',
    'dev-admin-one@lectern.test',
    crypt('devpassword123', gen_salt('bf')),
    now(), 
    '{"provider":"email","providers":["email"]}', 
    '{}',
    now(), 
    now(), 
    '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'a0000000-0000-0000-0000-000000000002',
    'authenticated', 
    'authenticated',
    'dev-admin-two@lectern.test',
    crypt('devpassword123', gen_salt('bf')),
    now(), 
    '{"provider":"email","providers":["email"]}', 
    '{}',
    now(), 
    now(), 
    '', '', '', ''
  )
on conflict (id) do nothing;

insert into public.organizations (id, name, plan, created_by)
values
  ('b0000000-0000-0000-0000-000000000001', 'Dev Organization One', 'free', 'a0000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000002', 'Dev Organization Two', 'free', 'a0000000-0000-0000-0000-000000000002')
on conflict (id) do nothing;

insert into public.memberships (user_id, organization_id, role)
values
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'admin'),
  ('a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'admin')
on conflict (user_id, organization_id) do nothing;



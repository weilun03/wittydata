insert into rbac_permission (code, label)
values
    ('clients.read', 'Read clients'),
    ('clients.create', 'Add clients'),
    ('clients.update', 'Edit clients'),
    ('clients.delete', 'Delete clients'),
    ('providers.read', 'Read providers'),
    ('providers.create', 'Add providers'),
    ('providers.update', 'Edit providers'),
    ('providers.delete', 'Delete providers'),
    ('rate_sets.read', 'Read rate sets'),
    ('rate_sets.create', 'Add rate sets'),
    ('rate_sets.update', 'Edit rate sets'),
    ('rate_sets.delete', 'Delete rate sets'),
    ('rate_sets.import', 'Import rate sets'),
    ('invoices.read', 'Read invoices'),
    ('invoices.create', 'Add invoices'),
    ('invoices.update', 'Edit invoices'),
    ('invoices.delete', 'Delete invoices'),
    ('invoices.uploads.manage', 'Manage all invoice uploads'),
    ('users.read', 'Read users'),
    ('users.create', 'Add users'),
    ('users.update', 'Edit users'),
    ('users.delete', 'Delete users'),
    ('user_roles.read', 'Read user roles'),
    ('user_roles.create', 'Add user roles'),
    ('user_roles.update', 'Edit user roles'),
    ('user_roles.delete', 'Delete user roles'),
    ('genders.read', 'Read genders'),
    ('genders.create', 'Add genders'),
    ('genders.update', 'Edit genders'),
    ('genders.delete', 'Delete genders'),
    ('auth_sessions.read', 'Read auth sessions'),
    ('auth_sessions.revoke', 'Revoke auth sessions'),
    ('auth_sessions.delete', 'Delete auth sessions'),
    ('audit_logs.read', 'Read audit logs')
on conflict (code) do nothing;

-- created_at is staggered a minute apart per row (rather than left at the
-- statement's single shared now()) so the seeded roles don't all appear to
-- have been created at the exact same instant in the admin UI.
insert into rbac_role (code, label, is_default, created_at)
values
    ('SUPER_ADMIN', 'Super Admin', true, now() - interval '3 minutes'),
    ('BILLING_OFFICER', 'Billing Officer', false, now() - interval '2 minutes'),
    ('DATA_ENTRY', 'Data Entry', false, now() - interval '1 minute'),
    ('AUDITOR', 'Auditor', false, now())
on conflict (code) do nothing;

insert into rbac_user_role_permission (role_id, permission_id)
select r.id, p.id
from rbac_role r
cross join rbac_permission p
where r.code = 'SUPER_ADMIN'
on conflict do nothing;

insert into rbac_user_role_permission (role_id, permission_id)
select r.id, p.id
from rbac_role r
join rbac_permission p on p.code = any (array[
    'clients.read',
    'clients.create',
    'clients.update',
    'providers.read',
    'providers.create',
    'providers.update',
    'rate_sets.read',
    'invoices.read',
    'invoices.create',
    'invoices.update',
    'invoices.uploads.manage',
    'genders.read',
    'genders.create',
    'genders.update'
])
where r.code = 'BILLING_OFFICER'
on conflict do nothing;

insert into rbac_user_role_permission (role_id, permission_id)
select r.id, p.id
from rbac_role r
join rbac_permission p on p.code = any (array[
    'clients.read',
    'providers.read',
    'invoices.read',
    'invoices.create',
    'invoices.update',
    'invoices.uploads.manage'
])
where r.code = 'DATA_ENTRY'
on conflict do nothing;

insert into rbac_user_role_permission (role_id, permission_id)
select r.id, p.id
from rbac_role r
join rbac_permission p on p.code = any (array[
    'clients.read',
    'providers.read',
    'rate_sets.read',
    'invoices.read'
    'audit_logs.read'
])
where r.code = 'AUDITOR'
on conflict do nothing;

insert into app_user (email, full_name, is_default)
select
    'superadmin@wittydata.com',
    'Super Admin',
    true
where not exists (
    select 1
    from app_user
    where email = 'superadmin@wittydata.com'
      and deleted_at is null
);

insert into auth_password (user_id, password_hash, password_updated_at)
select
    u.id,
    '$argon2id$v=19$m=65536,t=3,p=4$93zb0KyYYYYOkN+Fijdvmg$SLefhByzVk8dXBK5iLE/putiwppWaiLOexzULOHayi4',
    now()
from app_user u
where u.email = 'superadmin@wittydata.com'
  and u.deleted_at is null
  and not exists (
      select 1
      from auth_password ap
      where ap.user_id = u.id
  );

insert into rbac_user_role (user_id, role_id)
select
    u.id,
    r.id
from app_user u
cross join rbac_role r
where u.email = 'superadmin@wittydata.com'
  and u.deleted_at is null
  and r.code = 'SUPER_ADMIN'
on conflict (user_id, role_id) do nothing;

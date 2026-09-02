-- Keep Row Level Security enabled; these grants only allow authenticated users
-- to reach the tables. The existing owner_id policies decide which rows they can use.
grant select, insert, update, delete on table public.secretary_items to authenticated;
grant select, insert, update, delete on table public.contacts to authenticated;

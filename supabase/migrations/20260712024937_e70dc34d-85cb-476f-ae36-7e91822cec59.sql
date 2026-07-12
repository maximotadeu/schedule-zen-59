
REVOKE ALL ON FUNCTION public.is_grupo_membro(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_user_grupo_ids(uuid) FROM PUBLIC, anon, authenticated;

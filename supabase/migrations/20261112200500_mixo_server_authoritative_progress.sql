-- Keep game progression server-authoritative. Direct client writes would allow
-- authenticated users to grant themselves XP, credits, score, or completion.
drop policy if exists ghost_progress_own_all on public.ghost_progress;

create policy ghost_progress_read_own
on public.ghost_progress
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists world_players_update_own on public.world_players;

-- Updates to world_players are performed only by trusted SECURITY DEFINER
-- gameplay functions in the private schema. No client-side UPDATE policy is
-- required by the application.

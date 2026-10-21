-- HOMePLUS Assets - A4.3 Period Correction single signature
--
-- The 20261013010000 fix created a second overload
-- correct_asset_record_period(uuid,uuid,uuid,text,date,date) alongside the
-- original (uuid,uuid,uuid,timestamptz,date,date). PostgREST cannot
-- disambiguate overloaded RPCs called with a JSON string argument, so every
-- period correction failed with an unhandled 500 instead of the typed
-- outcome. Canonical signature is the text variant: the backend sends the
-- exact updated_at string observed via the API, and the function casts it
-- to timestamptz internally (tolerant to both native and ISO formats).

drop function if exists public.correct_asset_record_period(uuid, uuid, uuid, timestamptz, date, date);

revoke execute on function public.correct_asset_record_period(uuid, uuid, uuid, text, date, date) from public, anon, authenticated;
grant execute on function public.correct_asset_record_period(uuid, uuid, uuid, text, date, date) to service_role;

notify pgrst, 'reload schema';

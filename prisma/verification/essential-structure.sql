DO $$
DECLARE
  present_count integer;
BEGIN
  SELECT count(*)::integer
    INTO present_count
    FROM information_schema.tables
   WHERE table_schema = 'public'
     AND table_name IN (
       'Tenant',
       'Membership',
       'AuditLog',
       'SecurityRateLimitBucket',
       'Subscription'
     );

  IF present_count <> 5 THEN
    RAISE EXCEPTION 'ESSENTIAL_STRUCTURE_MISSING: expected 5 tables, found %', present_count;
  END IF;
END
$$;

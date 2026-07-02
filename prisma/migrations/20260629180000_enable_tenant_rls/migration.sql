-- Defense-in-depth tenant isolation at the database layer.
-- Effective when DATABASE_URL uses a non-superuser role without BYPASSRLS.
-- App sets per-request context via set_config('app.store_ids' / 'app.bypass_rls', ..., true).

CREATE OR REPLACE FUNCTION fineset_rls_store_allowed(target_store_id text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  IF coalesce(current_setting('app.bypass_rls', true), '') = 'true' THEN
    RETURN true;
  END IF;

  IF target_store_id IS NULL OR target_store_id = '' THEN
    RETURN false;
  END IF;

  RETURN target_store_id = ANY(
    string_to_array(nullif(current_setting('app.store_ids', true), ''), ',')
  );
END;
$$;

DO $$
DECLARE
  tenant_table text;
BEGIN
  FOREACH tenant_table IN ARRAY ARRAY[
    'Staff',
    'Customer',
    'Visit',
    'FieldSale',
    'ImportHistory',
    'CorrectionRequest'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tenant_table);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tenant_table);
    EXECUTE format('DROP POLICY IF EXISTS fineset_tenant_isolation ON %I', tenant_table);
    EXECUTE format(
      'CREATE POLICY fineset_tenant_isolation ON %I FOR ALL USING (fineset_rls_store_allowed(%I)) WITH CHECK (fineset_rls_store_allowed(%I))',
      tenant_table,
      'storeId',
      'storeId'
    );
  END LOOP;
END;
$$;

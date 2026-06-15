/**
 * Prints Supabase Auth URL configuration for staging (jewelry-analytics).
 * Apply manually in Supabase dashboard — Management API needs a personal access token.
 */
const STAGING_APP_URL = "https://fineset.staging.tribly.ai";
const PROJECT_REF = "qkfldqzowkcucfdulozc";

console.log(`
Supabase Auth configuration — jewelry-analytics (${PROJECT_REF})

Dashboard:
  https://supabase.com/dashboard/project/${PROJECT_REF}/auth/url-configuration

Set:
  Site URL: ${STAGING_APP_URL}

Add Redirect URLs:
  ${STAGING_APP_URL}/**
  http://localhost:3000/**

Keep production URLs on the production Supabase project only.
`);

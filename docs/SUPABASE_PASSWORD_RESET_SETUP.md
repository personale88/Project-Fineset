# Supabase password reset (production)

Apply these settings in the Supabase dashboard for project `mfqpccrzfrptpiclafzu` after deploying the token-based recovery code.

## 1. Custom SMTP (removes ~3–4 emails/hour built-in limit)

**Authentication → SMTP Settings**

1. Enable custom SMTP.
2. Recommended: [Resend](https://resend.com) (free tier is usually enough for auth mail).
3. Set sender, e.g. `noreply@tribly.ai` (domain must be verified with the provider).
4. Save and send a test email from the dashboard.

No app code change is required for SMTP.

## 2. Redirect URLs

**Authentication → URL Configuration → Redirect URLs**

Add (keep existing `/auth/callback` entries for old emails):

- `https://mystore.tribly.ai/reset-password`
- `https://mystore.tribly.ai/reset-password/**`
- `http://localhost:3000/reset-password`
- `http://localhost:3000/reset-password/**`

Site URL should remain: `https://mystore.tribly.ai`

## 3. Reset password email template

**Authentication → Email Templates → Reset password**

Copy the full HTML from [`emails/reset-password.html`](../emails/reset-password.html) into the Supabase template editor.

**Local preview:** open [`http://localhost:3000/emails/reset-password/preview`](http://localhost:3000/emails/reset-password/preview) while the dev server is running. The file under `emails/` is not served as a static URL (`/emails/reset-password.html` will 404).

The template uses `TokenHash` (works in any browser, including incognito) and is mobile-responsive with MyStore branding. Key link format:

```html
{{ .SiteURL }}/reset-password?token_hash={{ .TokenHash }}&type=recovery
```

## 4. Verify after deploy

1. Request **one** reset from the sign-in page (wait 60s between requests).
2. Open the **newest** email link once.
3. Confirm `/reset-password` shows the password form (no red verification error).
4. Set a new password and sign in.

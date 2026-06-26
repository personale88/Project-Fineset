"""Generate EC-AUTO QA Excel with Auto/Manual/Both classification."""
from __future__ import annotations

from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

OUTPUT = Path(__file__).resolve().parent.parent / "docs" / "EC-AUTO-QA-Test-Matrix.xlsx"

HEADERS = [
    "Edge Case ID",
    "Module/Feature",
    "Scenario Description",
    "Preconditions",
    "Test Steps",
    "Expected Result",
    "Code Review",
    "Actual Result",
    "Priority",
    "Severity",
    "Status",
    "Test Type",
    "Automation Tool",
    "Automation Notes",
    "Remarks",
]

# Test Type: Auto | Manual | Both
ROWS: list[dict[str, str]] = [
    {"id": "EC-AUTO-001", "module": "Authentication & Access (Full-stack)", "scenario": "Open page without login", "pre": "No active admin session; staging URL accessible", "steps": "1. Open /admin/dashboard/automation in incognito\n2. Observe redirect", "expected": "Redirect to sign-in", "review": "Pass", "actual": "Code review: PASS", "priority": "P1", "severity": "Critical", "status": "Not Tested", "type": "Auto", "tool": "Playwright", "auto_notes": "e2e/smoke — unauthenticated redirect", "remarks": ""},
    {"id": "EC-AUTO-002", "module": "Authentication & Access (Full-stack)", "scenario": "Store owner/staff opens page", "pre": "Valid store owner/staff account exists", "steps": "1. Log in as store owner\n2. Navigate to /admin/dashboard/automation", "expected": "Redirected away from admin", "review": "Pass", "actual": "Code review: PASS", "priority": "P1", "severity": "Critical", "status": "Not Tested", "type": "Auto", "tool": "Playwright", "auto_notes": "e2e RBAC route guard", "remarks": ""},
    {"id": "EC-AUTO-003", "module": "Authentication & Access (Backend)", "scenario": "API call without session", "pre": "No session cookie", "steps": "1. Call GET /api/admin/automation/config without auth\n2. Check response code", "expected": "401 Unauthorized", "review": "Pass", "actual": "Code review: PASS", "priority": "P1", "severity": "Critical", "status": "Not Tested", "type": "Auto", "tool": "Vitest integration", "auto_notes": "API auth middleware test", "remarks": ""},
    {"id": "EC-AUTO-004", "module": "Authentication & Access (Full-stack)", "scenario": "Platform admin without billing permission opens page", "pre": "PLATFORM_ADMIN account without billing permission", "steps": "1. Log in as platform admin (no billing)\n2. Open automation page\n3. Observe UI vs API response", "expected": "Page loads read-only or blocked consistently", "review": "Fail", "actual": "Page loads but API returns 403", "priority": "P2", "severity": "High", "status": "Open", "type": "Both", "tool": "Playwright + Vitest", "auto_notes": "Auto: API 403; Manual: page/UI consistency", "remarks": "Known gap: page loads but API 403"},
    {"id": "EC-AUTO-005", "module": "Authentication & Access (Full-stack)", "scenario": "Platform admin with billing views config", "pre": "PLATFORM_ADMIN with billing permission", "steps": "1. Log in\n2. Open automation page\n3. Verify read-only controls", "expected": "Read-only view of all settings", "review": "Pass", "actual": "Code review: PASS", "priority": "P2", "severity": "Medium", "status": "Not Tested", "type": "Both", "tool": "Playwright + Vitest", "auto_notes": "Auto: API read-only; Manual: disabled controls UI", "remarks": ""},
    {"id": "EC-AUTO-006", "module": "Authentication & Access (Backend)", "scenario": "Platform admin tries to save config", "pre": "PLATFORM_ADMIN session", "steps": "1. PATCH /api/admin/automation/config with valid body\n2. Check response", "expected": "403 Forbidden", "review": "Pass", "actual": "Code review: PASS", "priority": "P1", "severity": "Critical", "status": "Not Tested", "type": "Auto", "tool": "Vitest integration", "auto_notes": "RBAC PATCH test", "remarks": ""},
    {"id": "EC-AUTO-007", "module": "Authentication & Access (Backend)", "scenario": "Platform admin tries Run Now", "pre": "PLATFORM_ADMIN session", "steps": "1. POST /api/admin/automation/run\n2. Check response", "expected": "403 Forbidden", "review": "Pass", "actual": "Code review: PASS", "priority": "P1", "severity": "Critical", "status": "Not Tested", "type": "Auto", "tool": "Vitest integration", "auto_notes": "RBAC POST run test", "remarks": ""},
    {"id": "EC-AUTO-008", "module": "Authentication & Access (Full-stack)", "scenario": "Master admin saves config", "pre": "MASTER_ADMIN logged in; valid config section edited", "steps": "1. Change a setting\n2. Click Save on section\n3. Refresh page", "expected": "Config saved successfully", "review": "Pass", "actual": "Code review: PASS", "priority": "P1", "severity": "High", "status": "Not Tested", "type": "Auto", "tool": "Playwright", "auto_notes": "e2e save + reload assert", "remarks": ""},
    {"id": "EC-AUTO-009", "module": "Authentication & Access (Full-stack)", "scenario": "Master admin runs automation", "pre": "MASTER_ADMIN; global automations enabled; SMTP configured", "steps": "1. Click Run Now\n2. Check toast and History tab", "expected": "Run executes and appears in history", "review": "Pass", "actual": "Code review: PASS", "priority": "P1", "severity": "High", "status": "Not Tested", "type": "Both", "tool": "Playwright + Vitest", "auto_notes": "Auto: run API + history row; Manual: toast content", "remarks": ""},
    {"id": "EC-AUTO-010", "module": "Authentication & Access (Backend)", "scenario": "Cron without CRON_SECRET env", "pre": "CRON_SECRET env var unset on server", "steps": "1. GET /api/cron/billing-automation with Bearer token", "expected": "503 Service Unavailable", "review": "Pass", "actual": "Code review: PASS", "priority": "P1", "severity": "Critical", "status": "Not Tested", "type": "Auto", "tool": "Vitest integration", "auto_notes": "Cron env guard test", "remarks": ""},
    {"id": "EC-AUTO-011", "module": "Authentication & Access (Backend)", "scenario": "Cron with wrong Bearer token", "pre": "CRON_SECRET configured", "steps": "1. Call cron endpoint with invalid Bearer token", "expected": "401 Unauthorized", "review": "Pass", "actual": "Code review: PASS", "priority": "P1", "severity": "Critical", "status": "Not Tested", "type": "Auto", "tool": "Vitest integration", "auto_notes": "Cron auth negative test", "remarks": ""},
    {"id": "EC-AUTO-012", "module": "Authentication & Access (Backend)", "scenario": "Cron with valid Bearer token", "pre": "CRON_SECRET configured; automations enabled", "steps": "1. Call cron with valid Bearer token\n2. Check run log", "expected": "Automation runs as CRON trigger", "review": "Pass", "actual": "Code review: PASS", "priority": "P1", "severity": "High", "status": "Not Tested", "type": "Auto", "tool": "Vitest integration", "auto_notes": "Cron happy path + run log", "remarks": ""},
    {"id": "EC-AUTO-013", "module": "Authentication & Access (Full-stack)", "scenario": "Manual run when global automations disabled", "pre": "MASTER_ADMIN; global.enabled = false", "steps": "1. Verify Run Now disabled in UI\n2. POST /api/admin/automation/run directly", "expected": "Run blocked on UI and API", "review": "Fail", "actual": "UI blocks but API still executes", "priority": "P1", "severity": "High", "status": "Open", "type": "Auto", "tool": "Vitest + Playwright", "auto_notes": "Fix API guard; auto both UI disabled + API 4xx", "remarks": "Known gap: API bypasses disabled switch"},
    {"id": "EC-AUTO-014", "module": "Authentication & Access (Full-stack)", "scenario": "Expired or invalid session cookie", "pre": "Expired or deleted session cookie", "steps": "1. Clear/invalidate session\n2. Open page or call API", "expected": "Redirect to login or 401", "review": "Pass", "actual": "Code review: PASS", "priority": "P1", "severity": "Critical", "status": "Not Tested", "type": "Auto", "tool": "Playwright + Vitest", "auto_notes": "Session expiry e2e + API", "remarks": ""},
    {"id": "EC-AUTO-015", "module": "Page Load & UI (Frontend)", "scenario": "Page shows loading state on first load", "pre": "Valid master admin session", "steps": "1. Navigate to automation page\n2. Observe initial load state", "expected": "Loading message displayed", "review": "Pass", "actual": "Code review: PASS", "priority": "P3", "severity": "Low", "status": "Not Tested", "type": "Manual", "tool": "—", "auto_notes": "Visual loading state — QA eyes", "remarks": ""},
    {"id": "EC-AUTO-016", "module": "Page Load & UI (Frontend)", "scenario": "Config API fails on load", "pre": "Simulate config API failure (network throttle/block)", "steps": "1. Block /api/admin/automation/config\n2. Load page\n3. Click retry", "expected": "Error banner with retry option", "review": "Pass", "actual": "Code review: PASS", "priority": "P2", "severity": "Medium", "status": "Not Tested", "type": "Both", "tool": "Playwright", "auto_notes": "Auto: route abort + retry click; Manual: banner UX", "remarks": ""},
    {"id": "EC-AUTO-017", "module": "Page Load & UI (Frontend)", "scenario": "Non-master-admin sees read-only UI", "pre": "PLATFORM_ADMIN with billing permission", "steps": "1. Open page\n2. Verify all inputs disabled and hint shown", "expected": "All controls disabled; hint shown", "review": "Pass", "actual": "Code review: PASS", "priority": "P2", "severity": "Medium", "status": "Not Tested", "type": "Manual", "tool": "—", "auto_notes": "Read-only hint and disabled state — visual QA", "remarks": ""},
    {"id": "EC-AUTO-018", "module": "Page Load & UI (Frontend)", "scenario": "Mobile scope navigation", "pre": "Mobile viewport (<768px)", "steps": "1. Open page on mobile\n2. Swipe scope pills horizontally", "expected": "Horizontal scroll pills work", "review": "Pass", "actual": "Code review: PASS", "priority": "P3", "severity": "Low", "status": "Not Tested", "type": "Manual", "tool": "—", "auto_notes": "Mobile swipe/scroll UX", "remarks": ""},
    {"id": "EC-AUTO-019", "module": "Page Load & UI (Frontend)", "scenario": "Refresh page keeps same tab/scope", "pre": "Logged in; on non-overview scope (e.g. Invoices)", "steps": "1. Select Invoices tab\n2. Refresh browser", "expected": "Same scope restored after refresh", "review": "Fail", "actual": "Always resets to Overview", "priority": "P2", "severity": "Medium", "status": "Open", "type": "Both", "tool": "Playwright", "auto_notes": "Fix URL state; auto assert ?scope= after reload", "remarks": "Known gap: resets to Overview"},
    {"id": "EC-AUTO-020", "module": "Page Load & UI (Frontend)", "scenario": "Edit settings then config refetches", "pre": "MASTER_ADMIN editing unsaved draft", "steps": "1. Change a field\n2. Trigger config refetch (wait/reload data)", "expected": "Unsaved edits preserved", "review": "Fail", "actual": "Draft overwritten on refetch", "priority": "P2", "severity": "High", "status": "Open", "type": "Both", "tool": "Playwright", "auto_notes": "Fix draft merge; auto edit + refetch assert", "remarks": "Known gap: draft overwritten"},
    {"id": "EC-AUTO-021", "module": "Page Load & UI (Full-stack)", "scenario": "Save one section only", "pre": "MASTER_ADMIN; multiple sections edited", "steps": "1. Edit Invoices section only\n2. Save Invoices\n3. Verify other sections unchanged on server", "expected": "Only that section updated on server", "review": "Pass", "actual": "Code review: PASS", "priority": "P2", "severity": "Medium", "status": "Not Tested", "type": "Auto", "tool": "Vitest integration", "auto_notes": "Partial PATCH merge test", "remarks": ""},
    {"id": "EC-AUTO-022", "module": "Page Load & UI (Full-stack)", "scenario": "Save with invalid data", "pre": "MASTER_ADMIN; invalid field value (e.g. bad hours)", "steps": "1. Enter invalid value\n2. Save\n3. Observe error feedback", "expected": "Clear field-level error message", "review": "Fail", "actual": "Generic error toast only", "priority": "P2", "severity": "Medium", "status": "Open", "type": "Both", "tool": "Vitest + Manual", "auto_notes": "Auto: API 400 + field errors; Manual: inline UI errors", "remarks": "Known gap: generic toast only"},
    {"id": "EC-AUTO-023", "module": "Page Load & UI (Frontend)", "scenario": "Run success toast shows full summary", "pre": "Successful run with WhatsApp/renewals/report actions", "steps": "1. Run automation\n2. Read success toast counts", "expected": "All action counts shown", "review": "Fail", "actual": "Missing WhatsApp renewals expiry reports", "priority": "P3", "severity": "Low", "status": "Open", "type": "Manual", "tool": "—", "auto_notes": "Toast copy completeness — QA review", "remarks": "Known gap: partial summary in toast"},
    {"id": "EC-AUTO-024", "module": "Page Load & UI (Frontend)", "scenario": "Run fails", "pre": "Run that fails (e.g. SMTP down + force run)", "steps": "1. Trigger failing run\n2. Observe error message", "expected": "Detailed error message shown", "review": "Fail", "actual": "Generic error toast only", "priority": "P2", "severity": "Medium", "status": "Open", "type": "Both", "tool": "Vitest + Manual", "auto_notes": "Auto: API error body; Manual: toast detail", "remarks": "Known gap: generic error toast"},
    {"id": "EC-AUTO-025", "module": "Page Load & UI (Frontend)", "scenario": "Run Now disabled when global automations off", "pre": "global.enabled = false", "steps": "1. Open Overview\n2. Check Run Now button state", "expected": "Button disabled", "review": "Pass", "actual": "Code review: PASS (UI only)", "priority": "P2", "severity": "Medium", "status": "Not Tested", "type": "Auto", "tool": "Playwright", "auto_notes": "Button disabled assert", "remarks": "UI only; API not blocked — see EC-AUTO-013"},
    {"id": "EC-AUTO-026", "module": "Page Load & UI (Full-stack)", "scenario": "Dry run works when global automations off", "pre": "global.enabled = false", "steps": "1. Click Dry Run Preview\n2. Verify run completes without sends", "expected": "Dry run executes successfully", "review": "Pass", "actual": "Code review: PASS", "priority": "P2", "severity": "Medium", "status": "Not Tested", "type": "Auto", "tool": "Vitest integration", "auto_notes": "Dry run allowed when global off", "remarks": ""},
    {"id": "EC-AUTO-027", "module": "Page Load & UI (Frontend)", "scenario": "Read-only user cannot see Run buttons", "pre": "Read-only user (platform admin with billing)", "steps": "1. Open page\n2. Confirm Run/Save buttons absent or disabled", "expected": "Run buttons hidden", "review": "Pass", "actual": "Code review: PASS", "priority": "P2", "severity": "Medium", "status": "Not Tested", "type": "Manual", "tool": "—", "auto_notes": "Button visibility for read-only role", "remarks": ""},
    {"id": "EC-AUTO-028", "module": "Page Load & UI (Frontend)", "scenario": "History tab loading state", "pre": "History tab selected; runs loading", "steps": "1. Open History scope\n2. Observe loading indicator", "expected": "Loading indicator shown", "review": "Pass", "actual": "Code review: PASS", "priority": "P3", "severity": "Low", "status": "Not Tested", "type": "Manual", "tool": "—", "auto_notes": "Spinner/skeleton visual", "remarks": ""},
    {"id": "EC-AUTO-029", "module": "Page Load & UI (Frontend)", "scenario": "Empty run history", "pre": "No prior automation runs in DB", "steps": "1. Open History tab\n2. Read empty state message", "expected": "Empty state message shown", "review": "Pass", "actual": "Code review: PASS", "priority": "P3", "severity": "Low", "status": "Not Tested", "type": "Manual", "tool": "—", "auto_notes": "Empty state copy", "remarks": ""},
    {"id": "EC-AUTO-030", "module": "Page Load & UI (Full-stack)", "scenario": "More than 20 runs in history", "pre": ">20 automation runs exist", "steps": "1. Open History\n2. Count visible runs\n3. Look for pagination", "expected": "Pagination or load more available", "review": "Fail", "actual": "Only first 20 shown", "priority": "P2", "severity": "Medium", "status": "Open", "type": "Both", "tool": "Vitest + Playwright", "auto_notes": "Fix pagination API; auto page 2; Manual load-more UX", "remarks": "Known gap: max 20, no pagination"},
    {"id": "EC-AUTO-031", "module": "Page Load & UI (Frontend)", "scenario": "History API fails", "pre": "Simulate /api/admin/automation/runs failure", "steps": "1. Block runs API\n2. Open History tab", "expected": "Error message shown", "review": "Fail", "actual": "No error UI", "priority": "P2", "severity": "High", "status": "Open", "type": "Both", "tool": "Playwright", "auto_notes": "Fix error state; auto route abort assert", "remarks": "Known gap: no error UI"},
    {"id": "EC-AUTO-032", "module": "Page Load & UI (Frontend)", "scenario": "Running job shows clear status", "pre": "At least one run in RUNNING state", "steps": "1. Start long run\n2. Check status badge in history", "expected": "Distinct RUNNING badge/styling", "review": "Fail", "actual": "Falls through to generic outline badge", "priority": "P3", "severity": "Low", "status": "Open", "type": "Manual", "tool": "—", "auto_notes": "Badge color/style visual QA", "remarks": "Known gap: no distinct RUNNING style"},
    {"id": "EC-AUTO-033", "module": "Page Load & UI (Frontend)", "scenario": "Timestamps match configured timezone", "pre": "Timezone set to non-India value", "steps": "1. Set timezone in config\n2. Compare history timestamps", "expected": "Times shown in configured TZ", "review": "Fail", "actual": "Hardcoded en-IN locale", "priority": "P3", "severity": "Low", "status": "Open", "type": "Both", "tool": "Playwright + Manual", "auto_notes": "Fix locale from config; Manual verify display", "remarks": "Known gap: hardcoded en-IN locale"},
    {"id": "EC-AUTO-034", "module": "Page Load & UI (Frontend)", "scenario": "All config options visible in UI", "pre": "Compare UI fields vs API schema", "steps": "1. GET config\n2. List fields not shown in UI", "expected": "Every schema field editable", "review": "Fail", "actual": "5 fields hidden from UI", "priority": "P2", "severity": "High", "status": "Open", "type": "Both", "tool": "Script + Manual", "auto_notes": "Auto schema-vs-UI diff script; Manual field layout", "remarks": "5 hidden schema fields"},
    {"id": "EC-AUTO-035", "module": "Page Load & UI (Frontend)", "scenario": "Toggle renewal invoice on/off", "pre": "Invoices section open", "steps": "1. Look for sendOnRenewalDue toggle", "expected": "sendOnRenewalDue toggle available", "review": "Fail", "actual": "Field not in UI", "priority": "P2", "severity": "Medium", "status": "Open", "type": "Both", "tool": "Playwright", "auto_notes": "Add toggle; auto assert visible + PATCH", "remarks": "Field not exposed in UI"},
    {"id": "EC-AUTO-036", "module": "Page Load & UI (Full-stack)", "scenario": "Default country code affects WhatsApp", "pre": "WhatsApp enabled; defaultCountryCode set", "steps": "1. Save country code\n2. Trigger WhatsApp reminder\n3. Verify number formatting", "expected": "Country code used in WhatsApp sends", "review": "Fail", "actual": "Stored but never used by runner", "priority": "P2", "severity": "Medium", "status": "Open", "type": "Both", "tool": "Vitest + Manual", "auto_notes": "Auto: runner unit test; Manual: real WhatsApp format", "remarks": "Field stored but unused by runner"},
    {"id": "EC-AUTO-037", "module": "Form Validation (Frontend)", "scenario": "Clear number field", "pre": "Number input field visible (e.g. grace period)", "steps": "1. Clear field\n2. Tab out or blur", "expected": "Resets to minimum value", "review": "Pass", "actual": "Code review: PASS", "priority": "P3", "severity": "Medium", "status": "Not Tested", "type": "Auto", "tool": "Playwright", "auto_notes": "Blur min-reset behavior", "remarks": ""},
    {"id": "EC-AUTO-038", "module": "Form Validation (Full-stack)", "scenario": "Enter number above max", "pre": "Number field with max attribute", "steps": "1. Enter value above max\n2. Save section", "expected": "Client blocks or clear validation error", "review": "Fail", "actual": "Client allows; save fails silently", "priority": "P2", "severity": "Medium", "status": "Open", "type": "Both", "tool": "Vitest + Playwright", "auto_notes": "Fix client max + server 400; auto both layers", "remarks": "Client allows; server rejects silently"},
    {"id": "EC-AUTO-039", "module": "Form Validation (Frontend)", "scenario": "Invalid reminder days (3 x 1)", "pre": "Reminder days text input", "steps": "1. Enter '3, x, 1'\n2. Save and inspect payload", "expected": "Invalid values filtered out", "review": "Pass", "actual": "Code review: PASS", "priority": "P3", "severity": "Low", "status": "Not Tested", "type": "Auto", "tool": "Vitest unit", "auto_notes": "Parse/filter unit test", "remarks": ""},
    {"id": "EC-AUTO-040", "module": "Form Validation (Full-stack)", "scenario": "Duplicate reminder days (3 3 1)", "pre": "Reminder days input", "steps": "1. Enter '3, 3, 1'\n2. Save and verify stored array", "expected": "Duplicates removed or warned", "review": "Fail", "actual": "Duplicates kept", "priority": "P3", "severity": "Low", "status": "Open", "type": "Auto", "tool": "Vitest", "auto_notes": "Dedupe on save", "remarks": "Duplicates not deduped"},
    {"id": "EC-AUTO-041", "module": "Form Validation (Full-stack)", "scenario": "Clear all reminder days", "pre": "Payment reminders enabled", "steps": "1. Clear all reminder days\n2. Save\n3. Run automation on due date", "expected": "Warning or validation error", "review": "Fail", "actual": "Empty array saved; reminders never fire", "priority": "P2", "severity": "High", "status": "Open", "type": "Auto", "tool": "Vitest", "auto_notes": "Reject empty reminder days array", "remarks": "Empty array disables all reminders"},
    {"id": "EC-AUTO-042", "module": "Form Validation (Full-stack)", "scenario": "Invalid timezone (e.g. ABC)", "pre": "Global timezone field", "steps": "1. Enter invalid timezone 'ABC'\n2. Save\n3. Run automation", "expected": "Validation error on save", "review": "Fail", "actual": "Saved; can crash automation runs", "priority": "P1", "severity": "Critical", "status": "Open", "type": "Auto", "tool": "Vitest", "auto_notes": "Zod IANA timezone validation", "remarks": "Can crash entire run"},
    {"id": "EC-AUTO-043", "module": "Form Validation (Full-stack)", "scenario": "Invalid business hours (e.g. 9:00)", "pre": "WhatsApp business hours fields", "steps": "1. Enter '9:00' instead of '09:00'\n2. Save", "expected": "Validation error on save", "review": "Fail", "actual": "Client allows; server rejects on save", "priority": "P2", "severity": "Medium", "status": "Open", "type": "Both", "tool": "Vitest + Playwright", "auto_notes": "Client HH:mm mask + server schema", "remarks": ""},
    {"id": "EC-AUTO-044", "module": "Form Validation (Full-stack)", "scenario": "Invalid country code", "pre": "WhatsApp default country code", "steps": "1. Enter invalid code (letters)\n2. Save", "expected": "Validation error on save", "review": "Fail", "actual": "Client allows; server rejects on save", "priority": "P2", "severity": "Medium", "status": "Open", "type": "Both", "tool": "Vitest + Playwright", "auto_notes": "Client + server country code validation", "remarks": ""},
    {"id": "EC-AUTO-045", "module": "Form Validation (Backend)", "scenario": "Empty PATCH body", "pre": "MASTER_ADMIN session", "steps": "1. PATCH /api/admin/automation/config with {}\n2. Verify response", "expected": "No-op; current config returned", "review": "Pass", "actual": "Code review: PASS", "priority": "P3", "severity": "Low", "status": "Not Tested", "type": "Auto", "tool": "Vitest integration", "auto_notes": "Empty PATCH no-op", "remarks": ""},
    {"id": "EC-AUTO-046", "module": "Form Validation (Backend)", "scenario": "Malformed JSON on save", "pre": "MASTER_ADMIN session", "steps": "1. PATCH with malformed JSON body\n2. Check status code", "expected": "400 Bad Request with message", "review": "Fail", "actual": "Likely 500 error", "priority": "P2", "severity": "Medium", "status": "Open", "type": "Auto", "tool": "Vitest integration", "auto_notes": "Malformed body → 400", "remarks": "Likely 500 instead of 400"},
    {"id": "EC-AUTO-047", "module": "Form Validation (Backend)", "scenario": "Extra unknown fields in PATCH", "pre": "MASTER_ADMIN session", "steps": "1. PATCH with extra unknown keys\n2. Verify they are ignored", "expected": "Unknown fields stripped", "review": "Pass", "actual": "Code review: PASS", "priority": "P3", "severity": "Low", "status": "Not Tested", "type": "Auto", "tool": "Vitest integration", "auto_notes": "Zod strip unknown keys", "remarks": ""},
    {"id": "EC-AUTO-048", "module": "Form Validation (Backend)", "scenario": "Invalid dryRun value in run API", "pre": "MASTER_ADMIN session", "steps": "1. POST /api/admin/automation/run with invalid dryRun type\n2. Check 400", "expected": "400 Bad Request", "review": "Pass", "actual": "Code review: PASS", "priority": "P3", "severity": "Low", "status": "Not Tested", "type": "Auto", "tool": "Vitest integration", "auto_notes": "Invalid dryRun → 400", "remarks": ""},
    {"id": "EC-AUTO-049", "module": "API & Network (Frontend)", "scenario": "Config GET network error", "pre": "Network offline or throttled", "steps": "1. Load page with network error\n2. Click retry", "expected": "Retry option works", "review": "Pass", "actual": "Code review: PASS", "priority": "P2", "severity": "Medium", "status": "Not Tested", "type": "Both", "tool": "Playwright", "auto_notes": "Auto retry click; Manual offline UX", "remarks": ""},
    {"id": "EC-AUTO-050", "module": "API & Network (Full-stack)", "scenario": "Config PATCH validation error", "pre": "Invalid config payload", "steps": "1. Send PATCH that fails Zod validation\n2. Check UI error detail", "expected": "Field-level error returned to UI", "review": "Fail", "actual": "Generic saveFailed toast", "priority": "P2", "severity": "Medium", "status": "Open", "type": "Both", "tool": "Vitest + Manual", "auto_notes": "Auto: API field errors; Manual: inline UI", "remarks": "No field-level errors in UI"},
    {"id": "EC-AUTO-051", "module": "API & Network (Backend)", "scenario": "Invalid page/pageSize in runs API", "pre": "Valid session", "steps": "1. GET /api/admin/automation/runs?page=0&pageSize=100", "expected": "Values clamped to valid range", "review": "Pass", "actual": "Code review: PASS", "priority": "P3", "severity": "Low", "status": "Not Tested", "type": "Auto", "tool": "Vitest integration", "auto_notes": "Pagination clamp test", "remarks": ""},
    {"id": "EC-AUTO-052", "module": "API & Network (Backend)", "scenario": "Non-numeric page param", "pre": "Valid session", "steps": "1. GET runs?page=abc", "expected": "Defaults to page 1", "review": "Pass", "actual": "Code review: PASS", "priority": "P3", "severity": "Low", "status": "Not Tested", "type": "Auto", "tool": "Vitest integration", "auto_notes": "Invalid page default", "remarks": ""},
    {"id": "EC-AUTO-053", "module": "API & Network (Full-stack)", "scenario": "Run returns errors with HTTP 200", "pre": "Run produces partial errors (some sends fail)", "steps": "1. Execute run\n2. Check HTTP body errors[] vs UI toast", "expected": "UI shows partial failure warning", "review": "Fail", "actual": "Success toast shown anyway", "priority": "P1", "severity": "High", "status": "Open", "type": "Both", "tool": "Vitest + Manual", "auto_notes": "Auto: PARTIAL status; Manual: warning toast", "remarks": "Success toast despite errors"},
    {"id": "EC-AUTO-054", "module": "API & Network (Frontend)", "scenario": "Cache updates after save", "pre": "MASTER_ADMIN saves config", "steps": "1. Save section\n2. Verify UI shows new values without full reload", "expected": "UI reflects saved values", "review": "Pass", "actual": "Code review: PASS", "priority": "P3", "severity": "Low", "status": "Not Tested", "type": "Auto", "tool": "Playwright", "auto_notes": "React Query cache update assert", "remarks": ""},
    {"id": "EC-AUTO-055", "module": "API & Network (Frontend)", "scenario": "History refreshes after run", "pre": "Manual run completed", "steps": "1. Run automation\n2. Open History immediately", "expected": "New run appears in history", "review": "Pass", "actual": "Code review: PASS", "priority": "P2", "severity": "Medium", "status": "Not Tested", "type": "Auto", "tool": "Playwright", "auto_notes": "Run then history list contains new id", "remarks": ""},
    {"id": "EC-AUTO-056", "module": "API & Network (Backend)", "scenario": "Billing-restricted 402 response", "pre": "Account with billing restriction", "steps": "1. Trigger 402 on unrelated billing API\n2. Confirm automation unaffected", "expected": "Handled gracefully N/A", "review": "N/A", "actual": "Not used by automation hooks", "priority": "P3", "severity": "Low", "status": "N/A", "type": "Manual", "tool": "—", "auto_notes": "Not applicable to automation module", "remarks": "N/A"},
    {"id": "EC-AUTO-057", "module": "API & Network (Backend)", "scenario": "Monthly report fires on correct day/hour", "pre": "Monthly reports enabled; specific day/hour set", "steps": "1. Set sendDayOfMonth and sendHourLocal\n2. Monitor cron over 24h", "expected": "Report sent once per month at set hour", "review": "Fail", "actual": "Hourly cron; easy to miss exact hour", "priority": "P2", "severity": "High", "status": "Open", "type": "Manual", "tool": "—", "auto_notes": "24h staging watch — timing dependent", "remarks": "Hourly cron may miss exact hour"},
    {"id": "EC-AUTO-058", "module": "Data & State (Backend)", "scenario": "First load with no saved config", "pre": "Fresh DB or no PlatformAutomationConfig row", "steps": "1. GET config\n2. Verify defaults returned", "expected": "Defaults applied", "review": "Pass", "actual": "Code review: PASS", "priority": "P2", "severity": "Medium", "status": "Not Tested", "type": "Auto", "tool": "Vitest integration", "auto_notes": "Default config merge", "remarks": ""},
    {"id": "EC-AUTO-059", "module": "Data & State (Backend)", "scenario": "Corrupt config in DB", "pre": "Partial/corrupt JSON in config row", "steps": "1. Seed corrupt config\n2. GET config API", "expected": "Merged with defaults safely", "review": "Pass", "actual": "Code review: PASS", "priority": "P2", "severity": "Medium", "status": "Not Tested", "type": "Auto", "tool": "Vitest integration", "auto_notes": "Corrupt JSON recovery", "remarks": ""},
    {"id": "EC-AUTO-060", "module": "Data & State (Backend)", "scenario": "Non-object config in DB", "pre": "Non-object value in config JSONB", "steps": "1. Seed invalid type\n2. GET config", "expected": "Falls back to defaults", "review": "Pass", "actual": "Code review: PASS", "priority": "P2", "severity": "Medium", "status": "Not Tested", "type": "Auto", "tool": "Vitest integration", "auto_notes": "Type guard fallback", "remarks": ""},
    {"id": "EC-AUTO-061", "module": "Data & State (Backend)", "scenario": "Config cache stale within 30s", "pre": "Config updated within 30s cache window", "steps": "1. Update config via API twice quickly\n2. Compare reads with/without fresh flag", "expected": "Fresh config on explicit refresh", "review": "Pass", "actual": "By design", "priority": "P3", "severity": "Medium", "status": "Not Tested", "type": "Auto", "tool": "Vitest integration", "auto_notes": "Cache TTL by design", "remarks": "By design"},
    {"id": "EC-AUTO-062", "module": "Data & State (Full-stack)", "scenario": "Platform timezone changed in Master Settings", "pre": "Platform timezone changed in Master Settings", "steps": "1. Change platform TZ\n2. Check automation config TZ", "expected": "Automation timezone updated or warned", "review": "Fail", "actual": "Automation TZ not auto-updated", "priority": "P2", "severity": "Medium", "status": "Open", "type": "Both", "tool": "Vitest + Manual", "auto_notes": "Auto sync or warn logic; Manual settings UX", "remarks": "Automation TZ not auto-synced"},
    {"id": "EC-AUTO-063", "module": "Data & State (Backend)", "scenario": "Corrupt run log JSON in DB", "pre": "Run log with malformed summary/errors JSON", "steps": "1. Seed bad run log\n2. GET runs API", "expected": "Safe fallback to empty summary", "review": "Pass", "actual": "Code review: PASS", "priority": "P3", "severity": "Low", "status": "Not Tested", "type": "Auto", "tool": "Vitest integration", "auto_notes": "Malformed run log parse", "remarks": ""},
    {"id": "EC-AUTO-064", "module": "Data & State (Backend)", "scenario": "Server crash mid-run", "pre": "Simulate process kill mid-run", "steps": "1. Start run\n2. Kill server process\n3. Check run status in DB", "expected": "Run marked FAILED or recovered", "review": "Fail", "actual": "Can stay stuck in RUNNING", "priority": "P1", "severity": "High", "status": "Open", "type": "Both", "tool": "Vitest + Manual", "auto_notes": "Auto: stale RUNNING cleanup job; Manual kill test", "remarks": "Can remain RUNNING forever"},
    {"id": "EC-AUTO-065", "module": "Data & State (Backend)", "scenario": "Duplicate delivery same billing cycle", "pre": "Same business + action already delivered this cycle", "steps": "1. Run automation twice same day\n2. Verify dedupe skip", "expected": "Dedupe prevents resend", "review": "Pass", "actual": "Code review: PASS", "priority": "P1", "severity": "High", "status": "Not Tested", "type": "Auto", "tool": "Vitest integration", "auto_notes": "Dedupe key integration test", "remarks": ""},
    {"id": "EC-AUTO-066", "module": "Data & State (Backend)", "scenario": "Dry run writes no delivery log", "pre": "Dry run mode", "steps": "1. Execute dry run\n2. Query AutomationDeliveryLog", "expected": "No delivery records created", "review": "Pass", "actual": "Code review: PASS", "priority": "P2", "severity": "Medium", "status": "Not Tested", "type": "Auto", "tool": "Vitest integration", "auto_notes": "Dry run no DB writes", "remarks": ""},
    {"id": "EC-AUTO-067", "module": "Data & State (Backend)", "scenario": "Dry run skips dedupe check", "pre": "Dry run with prior delivery", "steps": "1. Dry run after real delivery\n2. Verify dedupe bypassed", "expected": "Dedupe bypassed in dry run", "review": "Pass", "actual": "By design", "priority": "P3", "severity": "Low", "status": "Not Tested", "type": "Auto", "tool": "Vitest integration", "auto_notes": "Dry run dedupe bypass", "remarks": "By design"},
    {"id": "EC-AUTO-068", "module": "Data & State (Backend)", "scenario": "Config load error in billing cycle", "pre": "Automation config service throws", "steps": "1. Simulate config error\n2. Verify billing cycle fallback", "expected": "Falls back to default billing settings", "review": "Pass", "actual": "Code review: PASS", "priority": "P2", "severity": "Medium", "status": "Not Tested", "type": "Auto", "tool": "Vitest integration", "auto_notes": "Config error fallback", "remarks": ""},
    {"id": "EC-AUTO-069", "module": "Billing - Invoices (Backend)", "scenario": "Cron when global automations disabled", "pre": "global.enabled=false; cron trigger", "steps": "1. Hit cron endpoint\n2. Inspect run log status and details", "expected": "Skipped with SUCCESS log", "review": "Pass", "actual": "Code review: PASS", "priority": "P2", "severity": "High", "status": "Not Tested", "type": "Auto", "tool": "Vitest integration", "auto_notes": "Cron skip when disabled", "remarks": ""},
    {"id": "EC-AUTO-070", "module": "Billing - Invoices (Full-stack)", "scenario": "Dry run mode enabled + Run Now", "pre": "global.dryRunMode=true", "steps": "1. Click Run Now (not dry preview)\n2. Verify no real sends; check UI warning", "expected": "UI warns that run is dry-run only", "review": "Fail", "actual": "Always dry run; no warning", "priority": "P1", "severity": "Critical", "status": "Open", "type": "Both", "tool": "Vitest + Manual", "auto_notes": "Fix dry-run warning; Manual toast/banner", "remarks": "Silent dry-run override"},
    {"id": "EC-AUTO-071", "module": "Billing - Invoices (Full-stack)", "scenario": "Manual dry run", "pre": "MASTER_ADMIN", "steps": "1. Click Dry Run Preview\n2. Confirm no emails/WhatsApp sent", "expected": "No emails sent; summary returned", "review": "Pass", "actual": "Code review: PASS", "priority": "P2", "severity": "Medium", "status": "Not Tested", "type": "Auto", "tool": "Vitest integration", "auto_notes": "Dry run no sends assert", "remarks": ""},
    {"id": "EC-AUTO-072", "module": "Billing - Invoices (Backend)", "scenario": "SMTP not configured", "pre": "SMTP not configured", "steps": "1. Run invoice automation\n2. Check errors and skip behavior", "expected": "Invoice phase skipped; error logged", "review": "Pass", "actual": "Code review: PASS", "priority": "P1", "severity": "High", "status": "Not Tested", "type": "Both", "tool": "Vitest + Manual", "auto_notes": "Auto unit skip; Manual staging without SMTP", "remarks": ""},
    {"id": "EC-AUTO-073", "module": "Billing - Invoices (Backend)", "scenario": "Business has no email", "pre": "Business record without email", "steps": "1. Run on invoice day\n2. Check skip detail", "expected": "Invoice skipped with detail", "review": "Pass", "actual": "Code review: PASS", "priority": "P2", "severity": "Medium", "status": "Not Tested", "type": "Auto", "tool": "Vitest integration", "auto_notes": "No email skip detail", "remarks": ""},
    {"id": "EC-AUTO-074", "module": "Billing - Invoices (Backend)", "scenario": "Invoice skipped if already paid (skipIfPaid)", "pre": "Business billing status CURRENT/PAID; skipIfPaid=true", "steps": "1. Run invoice automation\n2. Verify skip", "expected": "Invoice not sent", "review": "Pass", "actual": "Code review: PASS", "priority": "P2", "severity": "Medium", "status": "Not Tested", "type": "Auto", "tool": "Vitest integration", "auto_notes": "skipIfPaid logic", "remarks": ""},
    {"id": "EC-AUTO-075", "module": "Billing - Invoices (Backend)", "scenario": "Invoice already sent this cycle", "pre": "Invoice already delivered this billing cycle", "steps": "1. Run twice in same cycle\n2. Second run skips", "expected": "Dedupe skip; no duplicate", "review": "Pass", "actual": "Code review: PASS", "priority": "P1", "severity": "High", "status": "Not Tested", "type": "Auto", "tool": "Vitest integration", "auto_notes": "Invoice dedupe", "remarks": ""},
    {"id": "EC-AUTO-076", "module": "Billing - Invoices (Backend)", "scenario": "Invoice on renewal day", "pre": "Today matches invoice/renewal schedule", "steps": "1. Set schedule to today\n2. Run automation", "expected": "Invoice sent per schedule", "review": "Pass", "actual": "Code review: PASS", "priority": "P2", "severity": "Medium", "status": "Not Tested", "type": "Auto", "tool": "Vitest integration", "auto_notes": "Renewal day invoice", "remarks": ""},
    {"id": "EC-AUTO-077", "module": "Billing - Invoices (Backend)", "scenario": "Not invoice day", "pre": "Today is not invoice day", "steps": "1. Run automation\n2. Verify no invoice attempts", "expected": "Businesses skipped silently", "review": "Pass", "actual": "Code review: PASS", "priority": "P3", "severity": "Low", "status": "Not Tested", "type": "Auto", "tool": "Vitest integration", "auto_notes": "Non-invoice day skip", "remarks": ""},
    {"id": "EC-AUTO-078", "module": "Billing - Reminders (Backend)", "scenario": "Payment reminders disabled", "pre": "paymentReminders.enabled=false", "steps": "1. Run automation\n2. Verify reminder phase skipped", "expected": "Reminder phase skipped", "review": "Pass", "actual": "Code review: PASS", "priority": "P2", "severity": "Medium", "status": "Not Tested", "type": "Auto", "tool": "Vitest integration", "auto_notes": "Reminders disabled skip", "remarks": ""},
    {"id": "EC-AUTO-079", "module": "Billing - Reminders (Backend)", "scenario": "Today not in reminder day list", "pre": "Today not in before/after due day lists", "steps": "1. Run on non-matching day\n2. Verify no reminders", "expected": "No reminders sent", "review": "Pass", "actual": "Code review: PASS", "priority": "P2", "severity": "Medium", "status": "Not Tested", "type": "Auto", "tool": "Vitest integration", "auto_notes": "Day list filter", "remarks": ""},
    {"id": "EC-AUTO-080", "module": "Billing - Reminders (Backend)", "scenario": "Payment due today (day 0)", "pre": "Payment due today (daysUntilDue=0); default reminder days [3,1]", "steps": "1. Run on due date\n2. Check if reminder sent", "expected": "Reminder sent if configured", "review": "Fail", "actual": "Default config excludes day 0", "priority": "P2", "severity": "Medium", "status": "Open", "type": "Auto", "tool": "Vitest", "auto_notes": "Include day 0 in default or config", "remarks": "Day 0 excluded by default"},
    {"id": "EC-AUTO-081", "module": "Billing - Reminders (Backend)", "scenario": "Reminders stop after payment (stopAfterPayment)", "pre": "Account PAID/WAIVED; stopAfterPayment=true (default)", "steps": "1. Run reminders\n2. Verify skip", "expected": "No reminders to paid accounts", "review": "Pass", "actual": "Code review: PASS", "priority": "P2", "severity": "Medium", "status": "Not Tested", "type": "Auto", "tool": "Vitest integration", "auto_notes": "stopAfterPayment", "remarks": ""},
    {"id": "EC-AUTO-082", "module": "Billing - Reminders (Backend)", "scenario": "Max reminders per cycle reached", "pre": "Max reminders already sent this cycle", "steps": "1. Exhaust reminder count\n2. Run again", "expected": "Skipped with detail message", "review": "Pass", "actual": "Code review: PASS", "priority": "P1", "severity": "High", "status": "Not Tested", "type": "Auto", "tool": "Vitest integration", "auto_notes": "Max reminders cap", "remarks": ""},
    {"id": "EC-AUTO-083", "module": "Billing - Reminders (Backend)", "scenario": "Email fails WhatsApp still tries", "pre": "Email send fails for business; WhatsApp enabled", "steps": "1. Force email failure\n2. Verify WhatsApp still attempted", "expected": "WhatsApp attempted independently", "review": "Pass", "actual": "Code review: PASS", "priority": "P2", "severity": "Medium", "status": "Not Tested", "type": "Both", "tool": "Vitest + Manual", "auto_notes": "Auto mock email fail; Manual real providers", "remarks": ""},
    {"id": "EC-AUTO-084", "module": "Billing - Reminders (Backend)", "scenario": "WhatsApp needs both toggles on", "pre": "Only one of whatsAppEnabled flags on", "steps": "1. Toggle one off\n2. Run reminders", "expected": "WhatsApp only when both enabled", "review": "Pass", "actual": "Code review: PASS", "priority": "P2", "severity": "Medium", "status": "Not Tested", "type": "Auto", "tool": "Vitest integration", "auto_notes": "Dual toggle gate", "remarks": ""},
    {"id": "EC-AUTO-085", "module": "Billing - Reminders (Backend)", "scenario": "WhatsApp outside business hours", "pre": "businessHoursOnly=true; run outside hours", "steps": "1. Run outside configured hours\n2. Verify WhatsApp skip", "expected": "Skipped when businessHoursOnly true", "review": "Pass", "actual": "Code review: PASS", "priority": "P2", "severity": "Medium", "status": "Not Tested", "type": "Auto", "tool": "Vitest integration", "auto_notes": "Business hours gate", "remarks": ""},
    {"id": "EC-AUTO-086", "module": "Billing - Reminders (Full-stack)", "scenario": "WhatsApp auto-sends message", "pre": "WhatsApp reminders enabled", "steps": "1. Run automation\n2. Check if message auto-sent vs follow-up queued", "expected": "Message sent automatically", "review": "Fail", "actual": "Only queues follow-up for manual send", "priority": "P2", "severity": "High", "status": "Open", "type": "Both", "tool": "Vitest + Manual", "auto_notes": "Fix auto-send; Manual WhatsApp delivery", "remarks": "Only queues manual follow-up"},
    {"id": "EC-AUTO-087", "module": "Billing - Follow-ups (Backend)", "scenario": "Auto-schedule follow-ups", "pre": "Follow-ups enabled; eligible unpaid accounts", "steps": "1. Run automation\n2. Verify follow-ups scheduled", "expected": "Follow-ups created for eligible accounts", "review": "Pass", "actual": "Code review: PASS", "priority": "P2", "severity": "Medium", "status": "Not Tested", "type": "Auto", "tool": "Vitest integration", "auto_notes": "Follow-up scheduling", "remarks": ""},
    {"id": "EC-AUTO-088", "module": "Billing - Follow-ups (Backend)", "scenario": "Max follow-ups reached + escalate", "pre": "Max follow-ups reached; escalateAfterMax=true", "steps": "1. Exhaust follow-ups\n2. Check detail message", "expected": "Logged for manual review", "review": "Pass", "actual": "Code review: PASS", "priority": "P2", "severity": "Medium", "status": "Not Tested", "type": "Auto", "tool": "Vitest integration", "auto_notes": "Escalation after max", "remarks": ""},
    {"id": "EC-AUTO-089", "module": "Billing - Follow-ups (Backend)", "scenario": "Spacing array shorter than follow-up count", "pre": "spacingDays shorter than follow-up count", "steps": "1. Configure short spacing array\n2. Run multiple follow-ups", "expected": "Uses last spacing value", "review": "Pass", "actual": "Code review: PASS", "priority": "P3", "severity": "Low", "status": "Not Tested", "type": "Auto", "tool": "Vitest unit", "auto_notes": "Spacing array fallback", "remarks": ""},
    {"id": "EC-AUTO-090", "module": "Billing - Renewals (Backend)", "scenario": "Renewal/expiry reminders", "pre": "Renewal/expiry reminders enabled; matching offset day", "steps": "1. Set offset to today\n2. Run automation", "expected": "Sent on matching day offsets", "review": "Pass", "actual": "Code review: PASS", "priority": "P2", "severity": "Medium", "status": "Not Tested", "type": "Auto", "tool": "Vitest integration", "auto_notes": "Renewal offset day", "remarks": ""},
    {"id": "EC-AUTO-091", "module": "Billing - Reports (Backend)", "scenario": "Monthly report wrong day/hour", "pre": "Monthly reports enabled; wrong day/hour", "steps": "1. Run at non-configured time\n2. Verify skip", "expected": "Phase skipped", "review": "Pass", "actual": "Code review: PASS", "priority": "P2", "severity": "Medium", "status": "Not Tested", "type": "Auto", "tool": "Vitest integration", "auto_notes": "Wrong day/hour skip", "remarks": ""},
    {"id": "EC-AUTO-092", "module": "Billing - Reports (Backend)", "scenario": "Monthly report with >50 businesses", "pre": ">50 businesses; includePerStoreMetrics=true", "steps": "1. Run monthly report\n2. Check truncation message", "expected": "Truncated with and N more", "review": "Pass", "actual": "Code review: PASS", "priority": "P3", "severity": "Low", "status": "Not Tested", "type": "Auto", "tool": "Vitest integration", "auto_notes": "Report truncation", "remarks": ""},
    {"id": "EC-AUTO-093", "module": "Billing - Reports (Backend)", "scenario": "Admin-only report with no MASTER_ADMIN_EMAIL", "pre": "recipients=admin_only; MASTER_ADMIN_EMAIL unset", "steps": "1. Run monthly report phase\n2. Verify no send + logging", "expected": "Error or fallback recipient", "review": "Fail", "actual": "Nothing sent silently", "priority": "P2", "severity": "High", "status": "Open", "type": "Both", "tool": "Vitest + Manual", "auto_notes": "Auto error log; Manual verify no silent fail", "remarks": "Silent failure"},
    {"id": "EC-AUTO-094", "module": "Billing - Reports (Backend)", "scenario": "SMTP fails mid monthly report batch", "pre": "Multiple report recipients; SMTP fails mid-batch", "steps": "1. Configure multiple recipients\n2. Fail SMTP on 2nd recipient", "expected": "Remaining recipients still attempted", "review": "Fail", "actual": "Loop breaks; rest skipped", "priority": "P2", "severity": "High", "status": "Open", "type": "Auto", "tool": "Vitest integration", "auto_notes": "Continue batch on per-recipient fail", "remarks": "Loop breaks; rest skipped"},
    {"id": "EC-AUTO-095", "module": "Billing - General (Backend)", "scenario": "Run status SUCCESS/PARTIAL/FAILED", "pre": "Mix of successful and failed actions", "steps": "1. Run automation\n2. Verify SUCCESS/PARTIAL/FAILED logic", "expected": "Correct status assigned", "review": "Pass", "actual": "Code review: PASS", "priority": "P2", "severity": "Medium", "status": "Not Tested", "type": "Auto", "tool": "Vitest integration", "auto_notes": "Run status logic", "remarks": ""},
    {"id": "EC-AUTO-096", "module": "Billing - General (Backend)", "scenario": "Uncaught error during run", "pre": "Force uncaught exception in runner", "steps": "1. Trigger fatal error\n2. Check run marked FAILED", "expected": "Run marked FAILED", "review": "Pass", "actual": "Code review: PASS", "priority": "P1", "severity": "High", "status": "Not Tested", "type": "Auto", "tool": "Vitest integration", "auto_notes": "Fatal error → FAILED", "remarks": ""},
    {"id": "EC-AUTO-097", "module": "Billing - General (Backend)", "scenario": "Payment marked PAID triggers confirmation", "pre": "paymentConfirmationEnabled=true; SMTP configured", "steps": "1. Mark billing account PAID\n2. Verify confirmation email", "expected": "Confirmation email sent", "review": "Pass", "actual": "Code review: PASS", "priority": "P2", "severity": "Medium", "status": "Not Tested", "type": "Both", "tool": "Vitest + Manual", "auto_notes": "Auto mock SMTP; Manual inbox check", "remarks": ""},
    {"id": "EC-AUTO-098", "module": "Billing - General (Backend)", "scenario": "Payment confirmation disabled", "pre": "paymentConfirmationEnabled=false", "steps": "1. Mark account PAID\n2. Verify no email", "expected": "No confirmation sent", "review": "Pass", "actual": "Code review: PASS", "priority": "P3", "severity": "Low", "status": "Not Tested", "type": "Auto", "tool": "Vitest integration", "auto_notes": "Confirmation disabled", "remarks": ""},
    {"id": "EC-AUTO-099", "module": "Billing - General (Backend)", "scenario": "Duplicate payment confirmation", "pre": "Confirmation already sent this cycle", "steps": "1. Mark PAID twice\n2. Verify dedupe", "expected": "Dedupe prevents resend", "review": "Pass", "actual": "Code review: PASS", "priority": "P2", "severity": "Medium", "status": "Not Tested", "type": "Auto", "tool": "Vitest integration", "auto_notes": "Confirmation dedupe", "remarks": ""},
    {"id": "EC-AUTO-100", "module": "Billing - General (Backend)", "scenario": "autoExtendOnPayment off", "pre": "autoExtendOnPayment=false", "steps": "1. Record payment\n2. Verify renewal dates unchanged", "expected": "Renewal dates not extended on payment", "review": "Pass", "actual": "Code review: PASS", "priority": "P2", "severity": "Medium", "status": "Not Tested", "type": "Auto", "tool": "Vitest integration", "auto_notes": "autoExtendOnPayment=false", "remarks": ""},
    {"id": "EC-AUTO-101", "module": "Billing - General (Backend)", "scenario": "Invalid timezone during run", "pre": "Invalid timezone saved in config", "steps": "1. Run automation\n2. Observe run failure vs graceful handling", "expected": "Graceful error; run not fully crashed", "review": "Fail", "actual": "Can crash entire run", "priority": "P1", "severity": "Critical", "status": "Open", "type": "Auto", "tool": "Vitest", "auto_notes": "Timezone guard in runner", "remarks": "Can crash entire run"},
    {"id": "EC-AUTO-102", "module": "Email & Notifications (Backend)", "scenario": "All emails check SMTP first", "pre": "SMTP env vars missing", "steps": "1. Run any email phase\n2. Verify graceful skip", "expected": "Skip gracefully if SMTP missing", "review": "Pass", "actual": "Code review: PASS", "priority": "P1", "severity": "High", "status": "Not Tested", "type": "Auto", "tool": "Vitest integration", "auto_notes": "SMTP missing skip", "remarks": ""},
    {"id": "EC-AUTO-103", "module": "Email & Notifications (Backend)", "scenario": "Reminder urgency text (overdue/today/upcoming)", "pre": "Accounts overdue, due today, and upcoming", "steps": "1. Run reminders for each\n2. Compare email copy", "expected": "Correct text per scenario", "review": "Pass", "actual": "Code review: PASS", "priority": "P3", "severity": "Low", "status": "Not Tested", "type": "Auto", "tool": "Vitest unit", "auto_notes": "Email template copy snapshots", "remarks": ""},
    {"id": "EC-AUTO-104", "module": "Email & Notifications (Backend)", "scenario": "Payment confirmation without invoice number", "pre": "Payment confirmation without invoice number", "steps": "1. Trigger confirmation\n2. Read email body", "expected": "Invoice line omitted", "review": "Pass", "actual": "Code review: PASS", "priority": "P3", "severity": "Low", "status": "Not Tested", "type": "Auto", "tool": "Vitest unit", "auto_notes": "Template conditional line", "remarks": ""},
    {"id": "EC-AUTO-105", "module": "Email & Notifications (Backend)", "scenario": "Monthly report HTML escaping", "pre": "Monthly report with special chars in metrics", "steps": "1. Send report with <script> in data\n2. Inspect HTML", "expected": "Dynamic content escaped", "review": "Fail", "actual": "No HTML escaping", "priority": "P2", "severity": "Medium", "status": "Open", "type": "Both", "tool": "Vitest + Manual", "auto_notes": "Auto escape unit test; Manual inspect HTML", "remarks": "No HTML escaping"},
    {"id": "EC-AUTO-106", "module": "Email & Notifications (Backend)", "scenario": "Business name with HTML in email", "pre": "Business name contains HTML tags", "steps": "1. Create business name '<b>Test</b>'\n2. Send reminder email", "expected": "Name escaped in template", "review": "Fail", "actual": "Injection risk in email clients", "priority": "P2", "severity": "Medium", "status": "Open", "type": "Both", "tool": "Vitest + Manual", "auto_notes": "Auto escape assert; Manual email client view", "remarks": "Injection risk in email"},
    {"id": "EC-AUTO-107", "module": "Email & Notifications (Backend)", "scenario": "Invoice sender address", "pre": "Invoice automation send", "steps": "1. Send invoice\n2. Verify From address", "expected": "Consistent automation sender", "review": "Pass", "actual": "Code review: PASS", "priority": "P3", "severity": "Low", "status": "Not Tested", "type": "Auto", "tool": "Vitest integration", "auto_notes": "From header assert", "remarks": ""},
    {"id": "EC-AUTO-108", "module": "Email & Notifications (Backend)", "scenario": "Support email optional in templates", "pre": "Branding support email unset", "steps": "1. Send automated email\n2. Verify support line omitted", "expected": "Omitted when unset", "review": "Pass", "actual": "Code review: PASS", "priority": "P3", "severity": "Low", "status": "Not Tested", "type": "Auto", "tool": "Vitest unit", "auto_notes": "Optional support line", "remarks": ""},
    {"id": "EC-AUTO-109", "module": "Email & Notifications (Backend)", "scenario": "SMTP up but individual send fails", "pre": "SMTP valid but recipient rejects", "steps": "1. Send to invalid address\n2. Check run status PARTIAL", "expected": "Run marked PARTIAL", "review": "Pass", "actual": "Code review: PASS", "priority": "P2", "severity": "Medium", "status": "Not Tested", "type": "Auto", "tool": "Vitest integration", "auto_notes": "Per-send fail → PARTIAL", "remarks": ""},
    {"id": "EC-AUTO-110", "module": "Concurrency & Security (Backend)", "scenario": "Two manual runs at same time", "pre": "MASTER_ADMIN session", "steps": "1. POST run twice simultaneously\n2. Check for lock/queue", "expected": "Second run blocked or queued", "review": "Fail", "actual": "No distributed lock", "priority": "P1", "severity": "Critical", "status": "Open", "type": "Auto", "tool": "Vitest integration", "auto_notes": "Add run mutex; parallel POST test", "remarks": "No distributed lock"},
    {"id": "EC-AUTO-111", "module": "Concurrency & Security (Backend)", "scenario": "Cron + manual run overlap", "pre": "Cron and manual run at same time", "steps": "1. Trigger cron during manual run\n2. Check duplicate sends", "expected": "Runs serialized or deduped", "review": "Fail", "actual": "No mutex; partial dedupe only", "priority": "P1", "severity": "High", "status": "Open", "type": "Auto", "tool": "Vitest integration", "auto_notes": "Cron + manual mutex test", "remarks": "No mutex"},
    {"id": "EC-AUTO-112", "module": "Concurrency & Security (Backend)", "scenario": "Config changed during active run", "pre": "Active run in progress", "steps": "1. Change config mid-run\n2. Verify run uses start config", "expected": "Run uses config from start", "review": "Pass", "actual": "Code review: PASS", "priority": "P2", "severity": "Medium", "status": "Not Tested", "type": "Auto", "tool": "Vitest integration", "auto_notes": "Config snapshot at run start", "remarks": ""},
    {"id": "EC-AUTO-113", "module": "Concurrency & Security (Frontend)", "scenario": "Double-click Save or Run", "pre": "MASTER_ADMIN on page", "steps": "1. Double-click Save or Run quickly\n2. Verify single request", "expected": "Button disabled during mutation", "review": "Pass", "actual": "Code review: PASS", "priority": "P3", "severity": "Low", "status": "Not Tested", "type": "Auto", "tool": "Playwright", "auto_notes": "Double-click single request", "remarks": ""},
    {"id": "EC-AUTO-114", "module": "Concurrency & Security (Backend)", "scenario": "Two admins save different sections concurrently", "pre": "Two master admins editing different sections", "steps": "1. Simultaneous PATCH different sections\n2. Verify merge behavior", "expected": "Conflict handled safely", "review": "Fail", "actual": "Last write wins", "priority": "P2", "severity": "Medium", "status": "Open", "type": "Auto", "tool": "Vitest integration", "auto_notes": "Section merge / optimistic locking", "remarks": "Last write wins"},
    {"id": "EC-AUTO-115", "module": "Concurrency & Security (Backend)", "scenario": "Payment confirmation + invoice same cycle", "pre": "Same cycle invoice + payment confirmation", "steps": "1. Trigger both\n2. Verify separate dedupe keys", "expected": "Separate dedupe keys work", "review": "Pass", "actual": "Code review: PASS", "priority": "P3", "severity": "Low", "status": "Not Tested", "type": "Auto", "tool": "Vitest integration", "auto_notes": "Separate dedupe keys", "remarks": ""},
    {"id": "EC-AUTO-116", "module": "Concurrency & Security (Backend)", "scenario": "Delivery log race condition", "pre": "Concurrent delivery log writes same dedupeKey", "steps": "1. Parallel upserts\n2. Verify no duplicate rows", "expected": "Upsert handles conflict", "review": "Pass", "actual": "Code review: PASS", "priority": "P2", "severity": "Medium", "status": "Not Tested", "type": "Auto", "tool": "Vitest integration", "auto_notes": "Concurrent upsert test", "remarks": ""},
    {"id": "EC-AUTO-117", "module": "Concurrency & Security (Backend)", "scenario": "Cron secret timing-safe compare", "pre": "Cron endpoint", "steps": "1. Compare secrets with timing analysis\n2. Review implementation", "expected": "Timing-safe comparison used", "review": "Fail", "actual": "Plain !== compare", "priority": "P3", "severity": "Medium", "status": "Open", "type": "Auto", "tool": "Vitest + code review", "auto_notes": "Use timingSafeEqual", "remarks": "Plain !== compare"},
    {"id": "EC-AUTO-118", "module": "Concurrency & Security (Full-stack)", "scenario": "Master admin mass email via Run Now", "pre": "MASTER_ADMIN; many businesses eligible", "steps": "1. Click Run Now\n2. Verify audit/confirmation before mass email", "expected": "Requires confirmation or audit log", "review": "Pass", "actual": "By design — high risk", "priority": "P2", "severity": "High", "status": "Not Tested", "type": "Manual", "tool": "—", "auto_notes": "Risk/audit UX review on staging", "remarks": "By design — high risk"},
    {"id": "EC-AUTO-119", "module": "Concurrency & Security (Backend)", "scenario": "Monthly report to all business owners", "pre": "monthlyReports.recipients=business_owners", "steps": "1. Run report\n2. Verify only configured recipients", "expected": "Only when explicitly configured", "review": "Pass", "actual": "By design — high risk", "priority": "P2", "severity": "High", "status": "Not Tested", "type": "Manual", "tool": "—", "auto_notes": "Recipient scope risk review", "remarks": "By design — high risk"},
    {"id": "EC-AUTO-120", "module": "Concurrency & Security (Backend)", "scenario": "CSRF protection on PATCH/POST", "pre": "Cross-origin POST without CSRF token", "steps": "1. Attempt forged PATCH from external origin\n2. Verify blocked by cookie policy", "expected": "Protected via session cookie", "review": "Pass", "actual": "Code review: PASS", "priority": "P2", "severity": "Medium", "status": "Not Tested", "type": "Auto", "tool": "Vitest integration", "auto_notes": "SameSite cookie / no CORS", "remarks": ""},
    {"id": "EC-AUTO-121", "module": "Concurrency & Security (Full-stack)", "scenario": "Run errors show business names in history", "pre": "Run with per-business errors", "steps": "1. Execute run with multiple failures\n2. Inspect history layout", "expected": "Visible to authorized admins only", "review": "Pass", "actual": "Code review: PASS", "priority": "P2", "severity": "Medium", "status": "Not Tested", "type": "Manual", "tool": "—", "auto_notes": "Privacy/PII visibility review", "remarks": ""},
    {"id": "EC-AUTO-122", "module": "Empty States & Browser (Backend)", "scenario": "Zero businesses in portfolio", "pre": "Zero businesses in portfolio", "steps": "1. Run automation\n2. Verify SUCCESS with zero counts", "expected": "SUCCESS run with zero counts", "review": "Pass", "actual": "Code review: PASS", "priority": "P2", "severity": "Medium", "status": "Not Tested", "type": "Auto", "tool": "Vitest integration", "auto_notes": "Empty portfolio run", "remarks": ""},
    {"id": "EC-AUTO-123", "module": "Empty States & Browser (Backend)", "scenario": "Run with errors only", "pre": "Run where all actions fail", "steps": "1. Force all phases to error\n2. Verify FAILED status", "expected": "Status FAILED", "review": "Pass", "actual": "Code review: PASS", "priority": "P2", "severity": "Medium", "status": "Not Tested", "type": "Auto", "tool": "Vitest integration", "auto_notes": "All-fail → FAILED", "remarks": ""},
    {"id": "EC-AUTO-124", "module": "Empty States & Browser (Full-stack)", "scenario": "Run with mixed success and errors", "pre": "Run with mixed success and failure", "steps": "1. Partial failure run\n2. Verify PARTIAL in history + error list", "expected": "Status PARTIAL; errors in history", "review": "Pass", "actual": "Code review: PASS", "priority": "P2", "severity": "Medium", "status": "Not Tested", "type": "Auto", "tool": "Vitest integration", "auto_notes": "PARTIAL status + errors[]", "remarks": ""},
    {"id": "EC-AUTO-125", "module": "Empty States & Browser (Backend)", "scenario": "Disabled cron run logged correctly", "pre": "global.enabled=false; cron fires", "steps": "1. Trigger cron\n2. Verify SUCCESS skipped log", "expected": "SUCCESS with skipped detail", "review": "Pass", "actual": "Code review: PASS", "priority": "P2", "severity": "Medium", "status": "Not Tested", "type": "Auto", "tool": "Vitest integration", "auto_notes": "Cron disabled skip log", "remarks": ""},
    {"id": "EC-AUTO-126", "module": "Empty States & Browser (Frontend)", "scenario": "Config error on non-overview tab", "pre": "Config load error; user on Invoices tab", "steps": "1. Fail config API\n2. Switch to Invoices\n3. Verify error banner", "expected": "Error banner still visible", "review": "Pass", "actual": "Code review: PASS", "priority": "P2", "severity": "Medium", "status": "Not Tested", "type": "Both", "tool": "Playwright", "auto_notes": "Auto tab switch; Manual banner persist", "remarks": ""},
    {"id": "EC-AUTO-127", "module": "Empty States & Browser (Backend)", "scenario": "Payment confirmation fails on PAID", "pre": "Payment confirmation send fails on PAID", "steps": "1. Force SMTP error on confirmation\n2. Check admin-visible feedback", "expected": "Error surfaced to admin", "review": "Fail", "actual": "Console log only", "priority": "P2", "severity": "Medium", "status": "Open", "type": "Both", "tool": "Vitest + Manual", "auto_notes": "Auto log event; Manual admin UI feedback", "remarks": "Console only"},
    {"id": "EC-AUTO-128", "module": "Empty States & Browser (Frontend)", "scenario": "Mobile layout", "pre": "Mobile viewport 375px", "steps": "1. Navigate all scopes\n2. Verify layout usability", "expected": "Usable on small screens", "review": "Pass", "actual": "Code review: PASS", "priority": "P3", "severity": "Low", "status": "Not Tested", "type": "Manual", "tool": "—", "auto_notes": "375px layout QA", "remarks": ""},
    {"id": "EC-AUTO-129", "module": "Empty States & Browser (Frontend)", "scenario": "Offline during save/run", "pre": "Browser offline", "steps": "1. Go offline\n2. Save or Run\n3. Read error message", "expected": "Clear offline error message", "review": "Fail", "actual": "Generic error only", "priority": "P2", "severity": "Medium", "status": "Open", "type": "Manual", "tool": "—", "auto_notes": "DevTools offline UX", "remarks": "Generic error only"},
    {"id": "EC-AUTO-130", "module": "Empty States & Browser (Frontend)", "scenario": "Browser back/forward keeps tab", "pre": "User on History tab", "steps": "1. Browser back then forward\n2. Check active scope", "expected": "Scope state preserved", "review": "Fail", "actual": "Scope lost", "priority": "P3", "severity": "Low", "status": "Open", "type": "Both", "tool": "Playwright", "auto_notes": "Fix URL state; auto back/forward assert", "remarks": "Scope state lost"},
    {"id": "EC-AUTO-131", "module": "Empty States & Browser (Frontend)", "scenario": "Long error list in history", "pre": "Run with many long error messages", "steps": "1. Execute run with multiple failures\n2. Inspect history layout", "expected": "Readable layout without overflow", "review": "Fail", "actual": "May overflow/wrap poorly", "priority": "P3", "severity": "Low", "status": "Open", "type": "Manual", "tool": "—", "auto_notes": "Long error list layout QA", "remarks": "Overflow/wrap issues"},
    {"id": "EC-AUTO-132", "module": "Empty States & Browser (Frontend)", "scenario": "Keyboard/screen reader tab navigation", "pre": "Keyboard-only navigation", "steps": "1. Tab through scope sidebar\n2. Verify ARIA tab semantics", "expected": "Full ARIA tab support", "review": "Fail", "actual": "Incomplete ARIA wiring", "priority": "P3", "severity": "Low", "status": "Open", "type": "Manual", "tool": "—", "auto_notes": "a11y audit — keyboard + screen reader", "remarks": "Incomplete ARIA"},
]

TYPE_FILLS = {
    "Auto": PatternFill("solid", fgColor="C6EFCE"),      # green
    "Manual": PatternFill("solid", fgColor="FFEB9C"),   # yellow
    "Both": PatternFill("solid", fgColor="BDD7EE"),      # blue
}

REVIEW_FILLS = {
    "Pass": PatternFill("solid", fgColor="C6EFCE"),
    "Fail": PatternFill("solid", fgColor="FFC7CE"),
    "N/A": PatternFill("solid", fgColor="D9D9D9"),
}

# Overrides applied after ROWS load — reflects fixes landed in code/tests.
FIXED_CASES: dict[str, dict[str, str]] = {
    "EC-AUTO-004": {
        "review": "Pass",
        "actual": "Page redirects to /admin/dashboard when billing permission missing",
        "status": "Closed",
        "remarks": "requireAdminBillingPageAccess server guard",
    },
    "EC-AUTO-013": {
        "review": "Pass",
        "actual": "API returns 409 AutomationDisabledError; dry run still allowed",
        "status": "Closed",
        "remarks": "Vitest EC-AUTO-013",
    },
    "EC-AUTO-019": {
        "review": "Pass",
        "actual": "?scope= query param restores tab on refresh/back",
        "status": "Closed",
        "remarks": "URL scope state in AdminAutomationCenter",
    },
    "EC-AUTO-020": {
        "review": "Pass",
        "actual": "Unsaved draft preserved across config refetch",
        "status": "Closed",
        "remarks": "hydratedFromServer + isDraftDirty guard",
    },
    "EC-AUTO-022": {
        "review": "Pass",
        "actual": "API returns field errors; toast shows combined validation messages",
        "status": "Closed",
        "remarks": "formatSaveError surfaces Zod fieldErrors",
    },
    "EC-AUTO-023": {
        "review": "Pass",
        "actual": "Run toast includes renewals, expiry, reports counts",
        "status": "Closed",
        "remarks": "runSummary template + formatRunSummary",
    },
    "EC-AUTO-024": {
        "review": "Pass",
        "actual": "Failed/partial runs show API error text in toast",
        "status": "Closed",
        "remarks": "formatRunToastDescription",
    },
    "EC-AUTO-030": {
        "review": "Pass",
        "actual": "Load more increases runs page size",
        "status": "Closed",
        "remarks": "runsPageSize pagination",
    },
    "EC-AUTO-031": {
        "review": "Pass",
        "actual": "History tab shows AdminLoadErrorBanner with retry",
        "status": "Closed",
        "remarks": "runsError UI",
    },
    "EC-AUTO-032": {
        "review": "Pass",
        "actual": "RUNNING badge uses distinct gold styling",
        "status": "Closed",
        "remarks": "statusBadgeVariant + RUNNING class",
    },
    "EC-AUTO-033": {
        "review": "Pass",
        "actual": "History timestamps use configured automation timezone",
        "status": "Closed",
        "remarks": "toLocaleString timeZone from draft.global.timezone",
    },
    "EC-AUTO-034": {
        "review": "Pass",
        "actual": "All schema fields exposed in UI",
        "status": "Closed",
        "remarks": "stopAfterPayment, escalateAfterMax, autoExtendOnPayment, includeBillingSummary",
    },
    "EC-AUTO-035": {
        "review": "Pass",
        "actual": "sendOnRenewalDue toggle in Invoices section",
        "status": "Closed",
        "remarks": "",
    },
    "EC-AUTO-036": {
        "review": "Pass",
        "actual": "defaultCountryCode passed to sendWhatsAppTextMessage",
        "status": "Closed",
        "remarks": "run-billing-automation WhatsApp path",
    },
    "EC-AUTO-038": {
        "review": "Pass",
        "actual": "Number inputs clamp to min/max on change",
        "status": "Closed",
        "remarks": "NumberField client clamp",
    },
    "EC-AUTO-040": {
        "review": "Pass",
        "actual": "Duplicate reminder days deduped on save",
        "status": "Closed",
        "remarks": "Vitest EC-AUTO-040",
    },
    "EC-AUTO-041": {
        "review": "Pass",
        "actual": "Empty reminder arrays rejected when reminders enabled",
        "status": "Closed",
        "remarks": "Vitest EC-AUTO-041",
    },
    "EC-AUTO-042": {
        "review": "Pass",
        "actual": "Invalid IANA timezone rejected on PATCH",
        "status": "Closed",
        "remarks": "Vitest EC-AUTO-042",
    },
    "EC-AUTO-043": {
        "review": "Pass",
        "actual": "Business hours fields validate HH:MM on blur",
        "status": "Closed",
        "remarks": "TextField format=time",
    },
    "EC-AUTO-044": {
        "review": "Pass",
        "actual": "Country code field validates 1–4 digits on blur",
        "status": "Closed",
        "remarks": "TextField format=countryCode",
    },
    "EC-AUTO-046": {
        "review": "Pass",
        "actual": "Malformed JSON returns 400 Invalid JSON",
        "status": "Closed",
        "remarks": "Vitest EC-AUTO-046",
    },
    "EC-AUTO-050": {
        "review": "Pass",
        "actual": "Validation field errors shown in save toast description",
        "status": "Closed",
        "remarks": "formatSaveError",
    },
    "EC-AUTO-053": {
        "review": "Pass",
        "actual": "PARTIAL runs show warning toast with errors[]",
        "status": "Closed",
        "remarks": "Vitest + runPartialSuccess toast",
    },
    "EC-AUTO-057": {
        "review": "Pass",
        "actual": "shouldRunMonthlyReportWindow allows configured hour + next hour",
        "status": "Closed",
        "remarks": "lib/automation/timezone.test.ts",
    },
    "EC-AUTO-062": {
        "review": "Pass",
        "actual": "syncAutomationConfigTimezone on platform TZ change",
        "status": "Closed",
        "remarks": "Vitest EC-AUTO-062",
    },
    "EC-AUTO-064": {
        "review": "Pass",
        "actual": "recoverStaleAutomationRuns marks RUNNING >30m as FAILED",
        "status": "Closed",
        "remarks": "Vitest EC-AUTO-064; cron calls recovery each hit",
    },
    "EC-AUTO-070": {
        "review": "Pass",
        "actual": "dryRunForced flag surfaces warning in run toast",
        "status": "Closed",
        "remarks": "dryRunForcedWarning copy",
    },
    "EC-AUTO-080": {
        "review": "Pass",
        "actual": "Default reminderDaysBeforeDue includes day 0",
        "status": "Closed",
        "remarks": "default-config [3, 1, 0]",
    },
    "EC-AUTO-086": {
        "review": "Pass",
        "actual": "Auto-sends when WhatsApp API configured; queues follow-up otherwise",
        "status": "Closed",
        "remarks": "By design without WHATSAPP_ACCESS_TOKEN",
    },
    "EC-AUTO-093": {
        "review": "Pass",
        "actual": "Missing MASTER_ADMIN_EMAIL adds error to run errors[]",
        "status": "Closed",
        "remarks": "runMonthlyReports admin recipient guard",
    },
    "EC-AUTO-094": {
        "review": "Pass",
        "actual": "Per-recipient SMTP failure logged; loop continues",
        "status": "Closed",
        "remarks": "try/catch per recipient, no break",
    },
    "EC-AUTO-101": {
        "review": "Pass",
        "actual": "Invalid timezone marks run FAILED with clear error",
        "status": "Closed",
        "remarks": "Vitest EC-AUTO-101",
    },
    "EC-AUTO-105": {
        "review": "Pass",
        "actual": "Monthly report HTML escapes dynamic lines",
        "status": "Closed",
        "remarks": "escapeHtml in buildMonthlyReportHtml",
    },
    "EC-AUTO-106": {
        "review": "Pass",
        "actual": "Business names and template fields escaped in emails",
        "status": "Closed",
        "remarks": "lib/emails/automation-emails.ts",
    },
    "EC-AUTO-110": {
        "review": "Pass",
        "actual": "assertNoActiveAutomationRun blocks overlapping runs (409)",
        "status": "Closed",
        "remarks": "Vitest EC-AUTO-110",
    },
    "EC-AUTO-111": {
        "review": "Pass",
        "actual": "Cron + manual serialized via DB RUNNING check",
        "status": "Closed",
        "remarks": "Same mutex as EC-AUTO-110",
    },
    "EC-AUTO-114": {
        "review": "Pass",
        "actual": "expectedUpdatedAt compare-and-swap returns 409 on stale save",
        "status": "Closed",
        "remarks": "Vitest EC-AUTO-114",
    },
    "EC-AUTO-117": {
        "review": "Pass",
        "actual": "timingSafeEqual used for cron bearer compare",
        "status": "Closed",
        "remarks": "billing-automation/route.ts",
    },
    "EC-AUTO-127": {
        "review": "Pass",
        "actual": "Payment confirmation failure returns warnings[] to admin UI",
        "status": "Closed",
        "remarks": "BillingFollowUpPane warning toast",
    },
    "EC-AUTO-130": {
        "review": "Pass",
        "actual": "Browser back/forward preserves ?scope= tab",
        "status": "Closed",
        "remarks": "Same as EC-AUTO-019",
    },
    "EC-AUTO-131": {
        "review": "Pass",
        "actual": "History error list uses break-words wrapping",
        "status": "Closed",
        "remarks": "break-words on error paragraph",
    },
}

BACKEND_PENDING_VITEST_CASES = [
    "EC-AUTO-003",
    "EC-AUTO-006",
    "EC-AUTO-007",
    "EC-AUTO-010",
    "EC-AUTO-011",
    "EC-AUTO-012",
    "EC-AUTO-045",
    "EC-AUTO-047",
    "EC-AUTO-048",
    "EC-AUTO-051",
    "EC-AUTO-052",
    "EC-AUTO-058",
    "EC-AUTO-059",
    "EC-AUTO-060",
    "EC-AUTO-061",
    "EC-AUTO-063",
    "EC-AUTO-065",
    "EC-AUTO-066",
    "EC-AUTO-067",
    "EC-AUTO-068",
    "EC-AUTO-069",
    "EC-AUTO-072",
    "EC-AUTO-073",
    "EC-AUTO-074",
    "EC-AUTO-075",
    "EC-AUTO-076",
    "EC-AUTO-077",
    "EC-AUTO-078",
    "EC-AUTO-079",
    "EC-AUTO-081",
    "EC-AUTO-082",
    "EC-AUTO-083",
    "EC-AUTO-084",
    "EC-AUTO-085",
    "EC-AUTO-087",
    "EC-AUTO-088",
    "EC-AUTO-089",
    "EC-AUTO-090",
    "EC-AUTO-091",
    "EC-AUTO-092",
    "EC-AUTO-095",
    "EC-AUTO-096",
    "EC-AUTO-097",
    "EC-AUTO-098",
    "EC-AUTO-099",
    "EC-AUTO-100",
    "EC-AUTO-102",
    "EC-AUTO-103",
    "EC-AUTO-104",
    "EC-AUTO-107",
    "EC-AUTO-108",
    "EC-AUTO-109",
    "EC-AUTO-112",
    "EC-AUTO-115",
    "EC-AUTO-116",
    "EC-AUTO-119",
    "EC-AUTO-120",
    "EC-AUTO-122",
    "EC-AUTO-123",
    "EC-AUTO-125",
]

for _case_id in BACKEND_PENDING_VITEST_CASES:
    FIXED_CASES[_case_id] = {
        "review": "Pass",
        "actual": "Vitest integration test in automation-backend-pending.test.ts",
        "status": "Closed",
        "remarks": f"Vitest {_case_id} (local Postgres only; do not run against staging)",
    }


def apply_fixed_cases() -> None:
    for row in ROWS:
        patch = FIXED_CASES.get(row["id"])
        if patch:
            row.update(patch)


apply_fixed_cases()


def main() -> None:
    wb = Workbook()
    ws = wb.active
    ws.title = "EC-AUTO Matrix"

    header_fill = PatternFill("solid", fgColor="1F4E79")
    header_font = Font(bold=True, color="FFFFFF", size=11)

    for col, header in enumerate(HEADERS, 1):
        cell = ws.cell(row=1, column=col, value=header)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

    for row_idx, row in enumerate(ROWS, 2):
        values = [
            row["id"], row["module"], row["scenario"], row["pre"], row["steps"],
            row["expected"], row["review"], row["actual"], row["priority"],
            row["severity"], row["status"], row["type"], row["tool"],
            row["auto_notes"], row["remarks"],
        ]
        for col_idx, value in enumerate(values, 1):
            cell = ws.cell(row=row_idx, column=col_idx, value=value)
            cell.alignment = Alignment(vertical="top", wrap_text=True)
            if col_idx == 12:
                cell.fill = TYPE_FILLS.get(row["type"], PatternFill())
            if col_idx == 7:
                cell.fill = REVIEW_FILLS.get(row["review"], PatternFill())

    ws.freeze_panes = "A2"
    ws.auto_filter.ref = f"A1:{get_column_letter(len(HEADERS))}{len(ROWS) + 1}"

    widths = [14, 28, 32, 28, 40, 28, 12, 28, 8, 10, 12, 10, 18, 36, 28]
    for i, w in enumerate(widths, 1):
        ws.column_dimensions[get_column_letter(i)].width = w

    # Summary sheet
    summary = wb.create_sheet("Summary")
    summary["A1"] = "EC-AUTO QA Test Matrix Summary"
    summary["A1"].font = Font(bold=True, size=14)

    counts: dict[str, int] = {"Auto": 0, "Manual": 0, "Both": 0}
    fail_open = 0
    for row in ROWS:
        counts[row["type"]] = counts.get(row["type"], 0) + 1
        if row["review"] == "Fail" and row["status"] == "Open":
            fail_open += 1

    summary_rows = [
        ("Total cases", len(ROWS)),
        ("Automated (Auto)", counts["Auto"]),
        ("Manual QA", counts["Manual"]),
        ("Both (Auto + Manual)", counts["Both"]),
        ("Code review FAIL + Open", fail_open),
        ("", ""),
        ("Legend", ""),
        ("Auto", "Vitest integration/unit + Playwright e2e"),
        ("Manual", "Visual UX, mobile, email/WhatsApp, a11y, staging timing"),
        ("Both", "Backend auto-tested; UI sign-off manual"),
    ]
    for i, (label, value) in enumerate(summary_rows, 3):
        summary.cell(row=i, column=1, value=label).font = Font(bold=label in ("Legend",))
        summary.cell(row=i, column=2, value=value)

    summary.column_dimensions["A"].width = 28
    summary.column_dimensions["B"].width = 50

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    wb.save(OUTPUT)
    print(f"Wrote {OUTPUT} ({len(ROWS)} cases)")


if __name__ == "__main__":
    main()

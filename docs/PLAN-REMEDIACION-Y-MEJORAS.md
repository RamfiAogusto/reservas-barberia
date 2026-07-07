# ReservasBarberia — Remediation & Improvement Master Plan

> **Generated:** 2026-07-05 by a multi-agent audit (3 Sonnet reviewers: backend, frontend, integration; 1 Fable 5 design reviewer with `ui-ux-pro-max`, `web-design-guidelines`, `emil-design-eng` skills).
> **Purpose:** This document is written to be executed by AI models (Claude Sonnet for implementation phases; one Fable/Opus-tier pass for the design-system phase). Each task is self-contained: files, problem, fix, acceptance criteria, and dependencies.
> **Stack:** `backend/` = Node.js + Express + Prisma (PostgreSQL) + Socket.IO + BullMQ/Redis + Resend (email) + Cloudinary. `frontend/` = Next.js App Router (JS) + Tailwind + shadcn-style components. No automated test runner exists (`backend/package.json` test script is a stub) — every task includes manual verification steps instead.
> **Engram:** project is registered as `reservas-barberia` (topic `sdd-init/reservasbarberia`). Audit findings are saved under `frontend/audit-findings` and related discovery observations.

---

## How to execute this plan (rules for the executing model)

1. **Work one phase at a time, in order.** Phases are ordered by risk. Within a phase, tasks marked with the same dependency group must be done together in one PR/commit.
2. **Read the cited files before editing.** Line numbers were accurate at audit time (commit `738770e`); re-locate code by the quoted snippets/identifiers if lines drifted.
3. **One commit per task** (or per dependency group), message format: `fix(P0-2): authenticate Socket.IO rooms`. Do not mix phases in one commit.
4. **Verification:** there is no test runner. For each task, run the manual verification steps listed. Backend can be started with `npm run dev` in `backend/` (requires PostgreSQL via `docker-compose.yml` and a `.env`); frontend with `npm run dev` in `frontend/`.
5. **Do not** introduce TypeScript, change the database provider, or restructure folders beyond what a task explicitly says.
6. **Model assignment:** tasks tagged `[SONNET]` are mechanical/scoped; the single task tagged `[FABLE/OPUS + design skills]` (P2-1) needs design judgment and should load the skills `ui-ux-pro-max`, `web-design-guidelines`, and `emil-design-eng` before starting.
7. **Conflicting audit note:** two reviewers disagreed on whether `POST /appointments/:id/confirm-payment` is reachable without a JWT (see P0-3). The executor MUST verify this empirically before choosing the fix branch.

### Phase dependency graph

```
P0 (security emergencies)
 └─> P1 (critical correctness bugs)
      ├─> P2 (booking-flow UX + design system)
      ├─> P3 (security hardening)
      └─> P4 (architecture & code health)
           └─> P5 (config/deploy/docs coherence)
                └─> P6 (missing features & real payment gateway)
```

---

## PHASE 0 — Security emergencies (do first, same day)

### P0-1. Rotate and scrub the leaked Resend API key `[HUMAN + SONNET]`
- **Severity:** CRITICAL (live secret in git history).
- **Files:** `backend/README-EMAILS.md:100`, `backend/CONFIGURAR-EMAILS.md:16`, `backend/setup-cloudinary.js:197`, `backend/PRODUCTION-SETUP.md:33`.
- **Problem:** A real Resend API key (`re_BM7CX92n_...`) is hardcoded in tracked files and full git history.
- **Fix:**
  1. **HUMAN:** rotate the key in the Resend dashboard and update the deployment env (Render) + local `.env`.
  2. Replace every occurrence in the 4 files with the placeholder `re_XXXXXXXXXXXXXXXX`.
  3. Optionally purge history with `git filter-repo` (only if the repo was ever public/shared; coordinate with the owner first — destructive).
- **Acceptance:** `grep -r "re_BM7CX92n" .` (excluding node_modules) returns nothing; emails still send with the new key.

### P0-2. Authenticate Socket.IO connections and rooms `[SONNET]`
- **Severity:** CRITICAL (any client can join any salon's room and receive bookings with client PII).
- **Files:** `backend/services/socketService.js:40-53`, `frontend/src/contexts/SocketContext.jsx:36-48`, `frontend/src/app/dashboard/layout.js:50-66`.
- **Problem:** `socket.on('join:salon', ownerId => socket.join('salon:'+ownerId))` trusts a client-supplied ID; no JWT verification exists on the socket path (HTTP routes all use `backend/middleware/auth.js`).
- **Fix:**
  1. Backend: add `io.use()` middleware verifying `socket.handshake.auth.token` with the same JWT secret/logic as `middleware/auth.js`; attach `socket.userId`.
  2. On connection, auto-join `salon:${socket.userId}` derived from the **verified** token. Delete the `join:salon` and `join:user` listeners (and the unused `emitToUser` at `socketService.js:75-78` — confirmed dead code).
  3. Frontend: pass the token in the socket constructor: `io(url, { auth: { token } })` in `SocketContext.jsx`; remove the `join:salon` emits in both call sites.
- **Acceptance:** connecting a raw socket.io-client without a token gets disconnected; with a valid token, the dashboard still receives `appointment:new` in real time (create a booking from the public page to verify). A token for salon A never receives salon B's events.

### P0-3. Fix the payment-confirmation endpoint (broken AND insecure) `[SONNET]`
- **Severity:** CRITICAL.
- **Files:** `backend/routes/appointments.js:75` (`router.use(authenticateToken)`), `backend/routes/appointments.js:1417-1555` (`POST /:id/confirm-payment`), `backend/routes/payments.js` (public section above line 184), `backend/services/paymentGatewayService.js:94-98` (`isConfigured()` hardcoded `false`, all methods mocked), `frontend/src/app/pay/[token]/page.js:118-159`.
- **Problem (two audits, conflicting on one detail — VERIFY FIRST):**
  - Audit A (backend): the router-wide `authenticateToken` makes `confirm-payment` return 401 for anonymous clients → the entire PREPAGO / PAGO_POST_APROBACION deposit flow is dead in production (holds always expire).
  - Audit B (integration): the endpoint is reachable and confirms payment with **no** payment verification — anyone with the `paymentToken` (travels in plaintext URLs/emails) marks the appointment paid without paying.
  - **Verification step:** start the backend, create an `ESPERANDO_PAGO` booking, and call `confirm-payment` without an Authorization header. Whichever behavior you observe, BOTH problems must end up fixed.
- **Fix (design decided; implement regardless of which branch was live):**
  1. Move payment confirmation into `backend/routes/payments.js` **public** section (above its `router.use(authenticateToken)`), keyed by `paymentToken` (lookup only, not authorization).
  2. Since the gateway is mocked, "confirm" must NOT flip `paymentStatus` to `COMPLETO` on an anonymous request. Interim behavior until a real gateway (P6-1) exists: the public endpoint may only **report** status; actual confirmation becomes an authenticated salon-owner action (`PUT /appointments/:id/respond` with an explicit "mark deposit received" action) OR is deferred entirely to the gateway webhook.
  3. Wrap the state transition in `prisma.$transaction` with a conditional update: `updateMany({ where: { id, status: 'ESPERANDO_PAGO', holdExpiresAt: { gt: new Date() } } })` and treat `count === 0` as a conflict (race vs `holdCleanupService` — audit found the current code can resurrect an `EXPIRADA` hold or revert a paid booking).
  4. Update `frontend/src/app/pay/[token]/page.js` to match the new contract (show "pending owner confirmation / gateway" instead of the self-serve success path).
- **Acceptance:** an anonymous request can never set `paymentStatus: 'COMPLETO'`; the pay page renders coherent states; a hold expired by the cleanup service can never return to `CONFIRMADA` via this endpoint (test by setting `holdExpiresAt` in the past manually).

### P0-4. Fix `holdCleanupService` crash (missing import) `[SONNET]`
- **Severity:** CRITICAL (1-line fix; crashes on every expired hold, killing expiry emails + socket events, 100% of the time).
- **File:** `backend/services/holdCleanupService.js` (line ~95 uses `emitToSalon`; imports at lines 8-11 lack it).
- **Fix:** add `const { emitToSalon } = require('./socketService')` at the top.
- **Acceptance:** create a booking with a hold, set `holdExpiresAt` to the past in the DB, wait for the 30s cycle: appointment becomes `EXPIRADA`, the dashboard receives `appointment:holdExpired` live, and the "hold expired" email fires (check console/Resend dashboard). No `ReferenceError` in logs.

---

## PHASE 1 — Critical correctness bugs (small, high-impact fixes)

> All `[SONNET]`. Independent unless noted; can be one PR of small commits.

### P1-1. `status=all` filter sends a literal invalid value
- **Files:** `frontend/src/app/dashboard/appointments/page.js:88` and `:405-418`.
- **Problem:** Radix Select uses `value="all"` for "Todos los estados"; `if (filters.status)` is truthy for `'all'`, so `?status=all` is sent and the owner sees an empty list.
- **Fix:** `if (filters.status && filters.status !== 'all') params.append('status', filters.status)`.
- **Acceptance:** selecting "Todos los estados" shows all appointments.

### P1-2. Socket event field mismatch: `appointment:responded`
- **Files:** backend emits `action` (`backend/routes/appointments.js:1283-1287, 1341-1348, 1391-1396`); frontend reads `paymentMode` (`frontend/src/utils/useRealtimeNotifications.js:88-100`).
- **Problem:** `data.paymentMode` is always `undefined` → other open dashboard tabs always show the wrong toast ("Esperando Pago" even for direct confirmations).
- **Fix:** in `useRealtimeNotifications.js`, destructure `action` and branch on `'CONFIRMAR'/'APROBAR'` vs `'RECHAZAR'`; show the payment-wait toast only when the backend actually enters `ESPERANDO_PAGO` (include that in the payload if needed).
- **Acceptance:** with two dashboard tabs open, confirming a booking in tab 1 shows "Cita Confirmada" (not "Esperando Pago") in tab 2.

### P1-3. Remove the broken `paymentMode` legacy shim on `/respond`
- **Files:** `backend/routes/appointments.js:1176-1191` (both branches of the shim resolve to `'CONFIRMAR'`), `frontend/src/app/dashboard/appointments/page.js:311` (sends `{ paymentMode }`), `frontend/src/app/dashboard/page.js:135` (sends `{ action }`).
- **Fix:** delete the shim; make `appointments/page.js` send `{ action: 'CONFIRMAR' | 'RECHAZAR' }` like the dashboard home does. If per-booking "in person vs online" owner choice is desired, that is new product behavior — defer to P6, do not fake it here.
- **Acceptance:** both surfaces confirm/reject correctly; grep shows no `paymentMode` left in the respond flow.

### P1-4. Transactional overlap check for dashboard appointment create/update
- **Files:** `backend/routes/appointments.js:347-390` (POST `/`) and `:583-621` (PUT `/:id`); reuse helpers in `backend/utils/availabilityUtils.js:96-126` (`createAppointmentWithOverlapCheck`, already transactional and already used by the public flow).
- **Problem:** check-then-write without `$transaction` → double-booking race from the dashboard.
- **Fix:** route both paths through the transactional helpers. Then add a Prisma migration with a partial unique index, e.g. `CREATE UNIQUE INDEX appointment_slot_unique ON appointments ("userId","barberId","date","time") WHERE status NOT IN ('CANCELADA','EXPIRADA');` as DB-level backstop (verify exact table/column names in `prisma/schema.prisma` first).
- **Acceptance:** two concurrent identical POSTs (script with `Promise.all` of 2 fetches) produce exactly one appointment + one 409.

### P1-5. Group deposit misrecording inflates revenue
- **Files:** `backend/routes/appointments.js:1473-1489`.
- **Problem:** on payment confirmation, `paidAmount = depositAmount` is written to **every** appointment in a `groupId` and all get `paymentStatus: 'COMPLETO'`, overstating revenue in `/stats/summary` (`:934-944`) and losing the outstanding balance.
- **Fix:** persist the deposit once (proportional split across group rows, or a single group-level record); use `PARCIAL` (already in the Prisma enum, currently unused) for deposit-only; only mark `COMPLETO` when the full amount is collected.
- **Acceptance:** a 2-service booking ($50+$30, $20 deposit) shows total paid $20 (not $40) and status `PARCIAL`; stats reflect $20.

### P1-6. Stale responses on schedule PUTs
- **Files:** `backend/routes/schedules.js:260-269` and `:475-484`.
- **Fix:** return `updatedBreak` / `updatedException` instead of the pre-fetch objects.
- **Acceptance:** PUT response body shows the new values.

### P1-7. Align status/paymentMethod validators with the Prisma enums
- **Files:** `backend/routes/appointments.js:509-512` (missing `ESPERANDO_PAGO`, `EXPIRADA`), `:529-532` (lowercase values, missing `PASARELA`), vs `:967-970` (correct) and `prisma/schema.prisma:224-232`.
- **Fix:** create `backend/utils/constants.js` exporting `APPOINTMENT_STATUSES`, `PAYMENT_METHODS` (uppercase, matching Prisma); import in all validators. Also normalize the lowercase-only `recurrenceType`/`exceptionType` validators in `backend/routes/schedules.js:177,225,368,431` (accept both cases, normalize once).
- **Acceptance:** editing an appointment (multiple fields + status `ESPERANDO_PAGO`) no longer 400s; validators reference the shared constants (no literal arrays left).

### P1-8. Settings "Negocio" tab has no save button
- **File:** `frontend/src/app/dashboard/settings/page.js:241-289`.
- **Fix:** wrap the tab in a `<form onSubmit={...}>` with its own "Guardar" button (mirror the "Reservas" tab at `:452`), or a single sticky save bar for the page.
- **Acceptance:** editing salon name/phone/address persists after reload.

### P1-9. Sidebar collapse leaves a dead gutter
- **Files:** `frontend/src/app/dashboard/layout.js:33` (`lg:pl-64` hardcoded) vs `frontend/src/components/Sidebar.jsx:195-198` (`lg:w-[72px]` when collapsed).
- **Fix:** lift `collapsed` state to the layout (or a small context) and toggle `lg:pl-64` ↔ `lg:pl-[72px]` with `transition-[padding]`.
- **Acceptance:** collapsing the sidebar reflows content with no gap.

### P1-10. Slot-taken recovery in the booking flow
- **Files:** `frontend/src/app/[usuario]/book/page.js:129-152` (`handleSelectTime`), `:162-222` (`handleConfirmBooking`), `frontend/src/utils/useSalonData.js:188-210`.
- **Problem:** when the real-time check or the final submit fails because the slot was taken, the stale grid still shows the slot as available and the user is left on the form with a generic error (TOCTOU dead end — directly loses bookings).
- **Fix:** on slot-conflict failure: mark that slot `available: false` locally, invalidate the availability cache (`utils/cache.js`), re-fetch slots, navigate back to the time step with the message "Ese horario acaba de ocuparse — elige otro".
- **Acceptance:** simulate by booking the same slot from a second browser between selection and submit; the first user is returned to a refreshed slot grid with a clear message.

---

## PHASE 2 — Booking-flow UX & design system

### P2-1. Design-token unification + brand identity `[FABLE/OPUS + design skills: ui-ux-pro-max, web-design-guidelines, emil-design-eng]`
- **Severity:** highest-leverage design investment (audit verdict).
- **Problem set:**
  - The money path crosses **three brand colors**: salon profile amber (`[usuario]/page.js`), booking flow emerald (`book/page.js:568` etc.), payment page blue (`pay/[token]/page.js:276,344`); landing is blue-indigo. Trust erosion right before paying a deposit.
  - `frontend/src/app/globals.css` is 13 lines — no CSS variables/tokens; `tailwind.config.js` `primary` is stock Tailwind blue.
  - Broken classes: `dark:bg-primary-950/*` used in `PersistentBanners.jsx:23` and `NotificationBell.jsx:113` but no `950` in the palette; `focus:ring-ring` in `ui/badge.jsx:6` with no `ring` token.
  - ~20 emoji-as-icons in `book/page.js`, setup wizard, settings, landing (lucide-react is already a dependency).
  - Calendar micro-text `text-[8px]`..`text-[10px]` (`AppointmentCalendar.jsx:359-378,504-517,665`).
  - Currency hardcoded to MXN (`book/page.js:310`, `[usuario]/page.js:17`) while dashboard prints raw `$`; placeholders suggest Dominican formats.
- **Fix (in order):**
  1. Decide the brand accent (recommendation from audit: amber + stone neutrals, matching the barbershop identity) and define CSS variables / Tailwind tokens (`primary`, `ring`, full 50–950 scale) in `tailwind.config.js` + `globals.css`.
  2. Apply the single accent across profile → book → pay → landing CTAs; replace all `emerald-*` in `book/page.js` and `blue-*` CTAs in `pay/[token]/page.js`.
  3. Replace emoji icons with lucide equivalents (`Ban`, `Palmtree`, `PartyPopper`, `CalendarOff`, `Clock`, `Scissors`…), wrapping any remaining decorative emoji in `aria-hidden`.
  4. Micro-interaction pass per emil-design-eng: replace `transition-all` with property-specific transitions; add `active:scale-[0.98]` to primary CTAs; remove `hover:scale/translate` on touch (`@media (hover:hover)`); single toast system (sonner, already mounted — delete the hand-rolled fixed div in `book/page.js:367`); wire sonner `theme` to the app theme and `top-center` on mobile; use `ui/skeleton.jsx` (currently dead code) for slot-grid and stats loading.
  5. Bump calendar text to ≥11px; add a salon-level currency setting consumed by one shared `formatPrice` util.
- **Acceptance:** one accent color across all public pages; `grep -r "emerald-" frontend/src/app/[usuario]` empty; no `text-[8px]`/`text-[9px]`; no emoji in interactive elements; tokens exist for every class used (no silent no-op classes).

### P2-2. Booking confirmation screen (replace the 4-second toast) `[SONNET]`
- **Files:** `frontend/src/app/[usuario]/book/page.js:205-212, 367-376`.
- **Fix:** add a final wizard step showing full summary (date/time/services/barber/address/price, reuse the summary pattern from `pay/[token]/page.js:372`), deposit/cancellation policy reminder, and "Volver al perfil". No auto-redirect.
- **Acceptance:** after booking, a persistent confirmation screen renders; refresh-safe if feasible.

### P2-3. Mobile booking ergonomics: sticky CTA + per-field step jumping `[SONNET]`
- **Files:** `frontend/src/app/[usuario]/book/page.js:465-472, 565-575, 653-662, 703, 1101-1112`.
- **Fix:** sticky bottom bar on mobile (`fixed bottom-0 inset-x-0 p-3 bg-white/95 backdrop-blur border-t`) with running total + "Continuar"; make each summary chip (servicio/barbero/fecha/hora) clickable to jump to that single step instead of "Cambiar reserva" restarting at step 1; add month boundary markers to the 30-day date grid.
- **Acceptance:** on a 375px viewport, the primary CTA is always visible; changing only the hour does not re-walk service/barber steps.

### P2-4. Calendar fixes: dynamic hours + detail card on tap `[SONNET]`
- **Files:** `frontend/src/components/AppointmentCalendar.jsx:56` (`HOUR_SLOTS` hardcoded 8–21, pre-8AM appointments render clipped at negative offset, `:474`), `frontend/src/app/dashboard/appointments/page.js:446-449` (`onSelectAppointment={handleEdit}` opens the raw 10-field edit dialog).
- **Fix:** derive first/last hour from the salon's `businessHours` ∪ visible appointments (±1h padding). Extract the read-only `AppointmentDetailCard` from `dashboard/page.js:234` into `frontend/src/components/` and use it as the calendar click target with Confirmar/Rechazar/Editar actions; default to day view below `sm` (week view forces `min-w-[700px]` panning, `:411`).
- **Acceptance:** a 7:00 AM appointment is visible; tapping an event shows the detail card, not the edit form; mobile defaults to day view.

### P2-5. Theme architecture: no-flash global dark mode `[SONNET]`
- **Files:** `frontend/src/contexts/ThemeContext.jsx:33-47` (provider only mounts in `/dashboard`, cleanup removes the `dark` class), `frontend/src/app/layout.js`, `frontend/src/app/dashboard/layout.js:75`.
- **Problem:** public pages carry hundreds of unreachable `dark:` classes; dashboard flashes light theme on load.
- **Fix:** inline `<script>` in the root layout head setting the `dark` class pre-hydration from localStorage/`prefers-color-scheme`; mount the provider globally; remove the unmount cleanup. (Alternative if the owner prefers light-only public pages: strip their `dark:` classes instead — ask before choosing this branch.)
- **Acceptance:** no FOUC on dashboard reload in dark mode; public pages honor the theme (or have zero dark: classes if the alternative was chosen).

### P2-6. Accessibility pass (WCAG 2.1 AA) `[SONNET]`
- **Items (all from the design audit):**
  1. Calendar month/week day cells are click-only `<div>`s → `<button>` or `role="button"` + keyboard handlers (`AppointmentCalendar.jsx:338, 419`). WCAG 2.1.1.
  2. Rebuild `NotificationBell.jsx:76-139` dropdown on Radix `Popover` (aria-expanded, Escape, focus management). WCAG 4.1.2.
  3. Fix `role="radio"` without radiogroup/arrow keys in `setup/page.js:193` and `settings/page.js:304,316` → use `aria-pressed` toggle buttons (pattern already correct in `book/page.js:501`).
  4. Slot-disabled reasons only in `title` (`book/page.js:840`) → visible text or tooltip component.
  5. Contrast: replace informational `text-slate-400`/`text-gray-400` (≈3.0:1) with slate-500/600 (`book:733,789`, calendar `:448`, `pay:325`, `NotificationBell:131`). WCAG 1.4.3.
  6. Status color-only dots in calendar events → add label text on blocks ≥45min (day view already does it at `:664`). WCAG 1.4.1.
  7. Wrap emoji in accessible names with `aria-hidden` (landing/login headings).
  8. Fix or remove dead `<a href="#">¿Olvidaste tu contraseña?</a>` and inert "Recordarme" (`login/page.js:137,144`) — link to P6-4 (password reset) or remove until built.
  9. Move focus to the new step's heading on booking-wizard transitions.
- **Acceptance:** keyboard-only run-through of dashboard calendar + booking flow succeeds; axe-devtools scan shows no criticals on book/, dashboard/, [usuario]/.

### P2-7. Responsive fixes `[SONNET]`
- **Items:** appointments table → card list below `md` (`appointments/page.js:477-582`); filter row `w-[180px]`×4 → responsive grid (`:406-431`); floating public CTA overlaps footer (`[usuario]/page.js:412-419` — add `pb-24 md:pb-0` or IntersectionObserver); hamburger inside the sticky topbar instead of floating `fixed top-4 left-4 z-50` (`Sidebar.jsx:174-182`); `min-w-0` + `truncate` on stats cards (`dashboard/page.js:183`).
- **Acceptance:** 320px/375px/768px viewports render without horizontal overflow or overlapped controls.

### P2-8. UX copy pass (Spanish, neutral/professional) `[SONNET]`
- **Items:** technical errors shown to clients ("Error interno del servidor" `book:218`, "Error al verificar disponibilidad" `book:148`) → human copy + retry action; "¿Qué servicio(s) deseas?" → "¿Qué servicios deseas?"; "Guardar reservas" (`settings:455`) → "Guardar configuración de reservas"; dashboard greeting uses the @handle (`dashboard/page.js:171`) → salon/owner display name; "Dashboard" nav item (`Sidebar.jsx:17`) → "Inicio"/"Panel"; "Estilista (opcional)" (`appointments:643`) → "Barbero"; brand the pay-page footer (`pay:363`); replicate the good empty-state pattern from `appointments:463` in services/barbers pages.
- **Acceptance:** no mixed English/Spanish in nav; no raw technical errors client-facing.

---

## PHASE 3 — Security hardening

### P3-1. Login brute-force protection `[SONNET]`
- **Files:** `backend/routes/auth.js:127`, `backend/server.js:38-47` (global limiter is 1000 req/15min only).
- **Fix:** dedicated `express-rate-limit` on `/api/auth/login` (e.g. 8 attempts / 15 min per IP+email); generic error on limit.
- Also (same commit): raise password minimum to 8+ (`auth.js:24`), and return one generic "email o usuario ya está en uso" for both duplicate cases (`auth.js:68-75`, currently enumerable).

### P3-2. Booking-endpoint rate limit `[SONNET]`
- **Files:** `backend/routes/public.js` `POST /salon/:username/book`, `backend/server.js:129` (`publicLimiter` 2000/15min shared).
- **Fix:** endpoint-specific limiter (e.g. 15 bookings / 15 min per IP) to prevent calendar-flooding of a salon.

### P3-3. Real file-type validation on uploads `[SONNET]`
- **File:** `backend/middleware/uploadMiddleware.js:8-19` (trusts client MIME).
- **Fix:** validate magic bytes with the `file-type` package before Cloudinary upload, keep the MIME whitelist as first pass.

### P3-4. Auth storage migration: localStorage → httpOnly cookies `[SONNET, larger task]`
- **Files:** `frontend/src/utils/api.js:16,106-118`, `frontend/src/components/ProtectedRoute.js`, `backend/routes/auth.js` (login/register responses), `backend/middleware/auth.js`, CORS config `backend/server.js:63-68`.
- **Problem:** JWT + user object in `localStorage`; any XSS (unvalidated `avatar`/`imageUrl` rendered at `book/page.js:633`, `[usuario]/page.js:159,283,316`) exfiltrates the owner session.
- **Fix:** backend sets `httpOnly; Secure; SameSite=Lax` cookie on login; `credentials: 'include'` on fetches + `cors({ credentials: true })`; replace `ProtectedRoute`'s localStorage check with a `/users/profile` cookie-auth check (add `AbortController` and a 60s verification TTL — it currently refires on every route change, `ProtectedRoute.js:12-56`); socket auth (P0-2) reads the cookie or an exchanged short-lived token.
- **Interim mitigations if deferred:** sanitize/validate external URLs before rendering, add CSP headers in `next.config.js`.
- **Acceptance:** no `authToken` in localStorage; session survives reload; logout clears the cookie; XSS payload in a salon avatar URL cannot read the credential.

### P3-5. Socket join payload validation & dead infra removal `[SONNET]`
- Covered by P0-2 steps 2 (remove `join:user`/`emitToUser`); verify nothing else emits to `user:*` rooms.

---

## PHASE 4 — Architecture & code health

### P4-1. Single salon-data store on the frontend `[SONNET]`
- **Files:** `frontend/src/utils/useSalonData.js` (module-level Maps cache; the `useSalonData` hook itself appears unused) vs `frontend/src/utils/SalonContext.js` (`useSalonDataOptimized`, the one actually imported by `[usuario]/page.js:6` and `book/page.js:6`).
- **Fix:** grep for remaining `useSalonData` imports; delete the dead hook; keep `useDaysStatus`/`useAvailableSlots` (used by booking) and colocate them with the context. Add `AbortController` to both hooks (currently debounced but not abortable → out-of-order responses can stomp fresh state).

### P4-2. Split `AppointmentCalendar.jsx` (681 lines) `[SONNET]`
- **Fix:** `components/AppointmentCalendar/` → `index.jsx` (controller), `MonthView.jsx`, `WeekView.jsx`, `DayView.jsx`, `overlapLayout.js` (pure `computeOverlapColumns`, currently `:64-116`), `statusConfig.js`, `barberColors.js`. Write a small node-run test file for `overlapLayout.js` covering: overlapping ranges, back-to-back, zero-duration, 3+ column packing (there is no test runner — a plain `node tests/overlapLayout.test.js` with asserts is acceptable).

### P4-3. Centralize API base URL + kill debug logging `[SONNET]`
- **Files:** the `process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'` pattern is duplicated in ≥6 files (`api.js`, `cache.js:100`, `SocketContext.jsx:19`, `pay/[token]/page.js:14`, `ProtectedRoute.js:22`, `useSalonData.js`); `frontend/env.example:2` lacks the `/api` suffix every code default has (copying it verbatim 404s every call).
- **Fix:** create `frontend/src/utils/config.js` exporting `API_URL` and `SOCKET_URL`; fix `env.example`; gate all `console.log` in `utils/cache.js:91-165` behind `NODE_ENV !== 'production'`.
- Use plain `api.post` for the booking mutation instead of `cachedRequest` with POST (`book/page.js:181-187`).

### P4-4. Shared enums/constants backend-side `[SONNET]`
- Extends P1-7: single `backend/utils/constants.js` consumed by every express-validator chain; delete the `_id` compatibility shims in `backend/routes/services.js:25-28,63-66,178-182,326-330` and the frontend `.id || ._id` fallbacks (verify with grep) — Mongo migration leftovers per `MONGODB-REFERENCES.md`.

### P4-5. Remove the raw-SQL schema fallback in `lib/prisma.js` `[SONNET]`
- **File:** `backend/lib/prisma.js:20-388` — a 400-line hand-duplicated `CREATE TABLE IF NOT EXISTS` bootstrap, **out of sync** with the real schema (missing `groupId`, `barberId`, `holdExpiresAt`, `Barber`, booking modes…). If it ever fires on a fresh prod DB it creates a broken schema.
- **Fix:** reduce to the standard ~10-line Prisma singleton; deployment relies on `prisma migrate deploy` (document in `PRODUCTION-SETUP.md`).

### P4-6. Dead code sweep `[SONNET]`
- Delete: `frontend/src/app/page.js.bak`, `frontend/src/components/AppointmentCalendar.jsx.bak`, `NOTIFICATION_SOUND_URL` + unused `audioRef` (`NotificationContext.jsx:7,13-18`), duplicate dark-bg class (`book/page.js:517`), `queueService.js:14` dead `maxRetriesPerRequest: 1`, legacy SMTP env vars in `backend/envexample.md:34-37`, redundant service re-fetch (`appointments.js:393-400`), redundant `process.env.TZ` reassignments (`utils/timeUtils.js:16,85,106` — set once in `server.js:8`).
- Normalize `.js`/`.jsx` extensions for JSX components (pure rename).

### P4-7. Observability: health endpoint + fire-and-forget telemetry `[SONNET]`
- **Fix:** extend `/api/health` (`server.js:132-138`) to report DB connectivity, Redis/queue status (`queueService.getStatus()` exists, uncalled), gateway configured, email reachability. Create `sendAndLog(promise, label)` helper replacing the dozens of bare `.then().catch()` email calls (`appointments.js:422-433,1334-1338`, `public.js`, `holdCleanupService.js`); log failures with context (structured logger — pino — replacing emoji `console.log`).
- **Related copy bug:** reminder email hardcodes "mañana" but fires 2h before (`emailService.js:191` vs `queueService.js:192`) — parametrize the wording.

### P4-8. Shared appointment merge logic + socket-cache bridge `[SONNET]`
- **Problem:** the socket-driven appointment merge (incl. `groupId` handling) is duplicated in `dashboard/appointments/page.js:105-158` and `dashboard/page.js:114-119`, and they already drift (dashboard home's `handleUpdateStatus` ignores groups).
- **Fix:** one `useAppointmentsStore(filters)` hook owning fetch + socket mutations; both pages consume it.

---

## PHASE 5 — Config, deploy & docs coherence

### P5-1. Deployment topology cleanup `[SONNET + HUMAN decision]`
- **Facts found:** CORS allowlist (`backend/server.js:63-68`) has `frontreservas.netlify.app` + `reservas-barberia-ruddy.vercel.app`; root `netlify.toml:9` points to a third domain (`cosmic-maamoul-8661f7.netlify.app`); the live demo is the Vercel URL (`PORTAFOLIO-PROYECTO.md:349-350`); `frontend/netlify.toml:19-23` has a CRA-style `/index.html` SPA redirect that is wrong for Next.js App Router.
- **Fix:** confirm with the owner that Vercel (front) + Render (back) is canonical; delete both `netlify.toml` files and Netlify CORS entries; make `FRONTEND_URL` the single source for CORS + email links + payment redirects.

### P5-2. Env & setup scripts `[SONNET]`
- `setup.bat:13` copies a nonexistent `backend/env.example` (only `envexample.md` exists) with Unix `cp` on Windows and still prints success → create a real `backend/env.example`, fix the script (or convert to PowerShell), fail loudly.
- Document `PGUSER/PGPASSWORD/PGHOST/PGPORT` (used by `backend/scripts/setup-local-db.js`, absent from env examples); remove documented-but-dead `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_APP_URL`.
- `check-production-readiness.js`: stop reporting "Stripe ready" on key presence alone (gateway is mocked — see P6-1); flag `DATABASE_URL` pointing at localhost when `NODE_ENV=production`.

### P5-3. Docs truth pass `[SONNET]`
- Sync `README-EMAILS.md` with the 8 real email types in `emailService.js` (5 undocumented); resolve the contradiction with `README-RECORDATORIOS.md` (reminders ARE implemented via BullMQ); update `PRODUCTION-SETUP.md` hosting advice (Railway → Render, the real host).

---

## PHASE 6 — Missing features (product backlog, needs owner prioritization)

| # | Feature | Notes / anchors |
|---|---------|-----------------|
| P6-1 | **Real payment gateway (webhook-first)** | `paymentGatewayService.js` is 100% mock; `handleWebhook` returns null with no HMAC verification (`payments.js:97-120`). Design: webhook is the ONLY writer of payment transitions; verify signature before any DB write; store processed event IDs (idempotency); depends on P0-3's contract. |
| P6-2 | Idempotency keys on booking | `crypto.randomUUID()` in a `useRef` on the confirm step, sent as header; backend dedupes. Closes the double-tap window (`book/page.js:162-222`). |
| P6-3 | Server clock sync on the pay countdown | `pay/[token]/page.js:93-107` trusts the device clock; return `serverNow` and re-fetch at zero. Also fix status mapping: `PENDIENTE` inferred as paid, `CANCELADA` shown as "expired", `NO_ASISTIO` shows a live pay button (`page.js:52-68`). |
| P6-4 | Password reset + change password | Absent entirely; `PUT /users/profile` can't change password; login page has a dead "¿Olvidaste tu contraseña?" link. |
| P6-5 | No-show automation | Schema-ready (`NO_ASISTIO`, `noShowWaitMinutes` on User) but no job transitions CONFIRMADA→NO_ASISTIO. Add to the 30s/1min cleanup cycle. |
| P6-6 | Cancellation-policy enforcement | `cancellationMinutesBefore` exists on User but is never checked on cancel routes. |
| P6-7 | Partial group cancellation | Cancel/delete cascades to ALL `groupId` siblings with no opt-out (`appointments.js:637-651,847-860,1032-1042`). Add `affectGroup` param (default true). Confirm product intent first. |
| P6-8 | Pagination | `GET /appointments` and `GET /payments` (`take: 50`) silently truncate at scale; no UI pagination anywhere. |
| P6-9 | Audit log | No record of who changed/cancelled an appointment; matters for salon-client disputes. |
| P6-10 | Session-expired UX | `api.js:138-145` hard-redirects to /login discarding form state; add a toast + state preservation. |
| P6-11 | Landing page rewrite | `app/page.js` sells "Next.js 14, PostgreSQL, JWT" to barbers; demo link hardcoded to `/ramfi_aog` (`:60,93`). Rewrite for the barber audience with real screenshots. |
| P6-12 | Test foundation | Adopt vitest (or node:test) minimally: `overlapLayout` (P4-2), `availabilityUtils` overlap/transactions, validator constants. Update `sdd-init/reservasbarberia` in Engram (`strict_tdd`) when a real runner lands. |

---

## Execution order summary (suggested PR slices, ≤400 lines each)

1. **PR-1 (P0):** key scrub + socket auth + holdCleanup import + confirm-payment redesign. *(P0-1 rotation is a human step first.)*
2. **PR-2 (P1 backend):** P1-2..P1-7 (contract fixes, transactions, validators, group amounts).
3. **PR-3 (P1 frontend):** P1-1, P1-8, P1-9, P1-10.
4. **PR-4 (P2-1):** design tokens + brand unification. *(Fable/Opus with design skills.)*
5. **PR-5 (P2-2..P2-4):** confirmation screen, sticky CTA, calendar fixes.
6. **PR-6 (P2-5..P2-8):** theme, a11y, responsive, copy.
7. **PR-7 (P3):** rate limits, upload validation, password policy; **PR-8:** cookie auth migration (alone — it touches everything).
8. **PR-9..12 (P4):** one per task group. **PR-13 (P5):** config/docs. **P6:** individually scoped per feature after owner prioritization.

## Verification checklist after each phase

- `cd backend && npm run dev` boots without errors; `/api/health` returns OK.
- `cd frontend && npm run build` passes (build is the de-facto type check).
- Manual smoke: register → setup wizard → create service/barber/schedule → public booking (LIBRE mode) → dashboard shows it live via socket → confirm → status flows.
- For payment-mode changes: repeat with PREPAGO and PAGO_POST_APROBACION, including hold expiry (set `holdExpiresAt` in the past).
- Save progress to Engram: `mem_save` with `topic_key: sdd/remediation-plan/apply-progress`, project `reservas-barberia` (merge, don't overwrite).

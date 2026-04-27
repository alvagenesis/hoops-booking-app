# HoopsBookingApp Current Test Plan

## Purpose

This checklist reflects the current codebase and the product direction captured in the docs. It is intended to validate the real app behavior for:

- Guest users
- Logged-in members
- Admin/operators
- Supabase-backed flows
- Demo mode fallbacks where relevant

It also notes which areas already have automated test coverage and which still need manual testing.

## Test Preconditions

Before testing live functionality, confirm:

1. `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set.
2. `supabase-schema.sql` has been applied to the target Supabase project.
3. Storage buckets used by the app exist:
   - `payment-proofs`
   - `avatars`
4. `venueConfig.js` has realistic branding and payment details if you want to validate production-like UX.
5. At least two user accounts exist:
   - one admin
   - one normal member

Recommended seed/test data:

- 2 active courts
- default time slot configs for all days
- at least 1 active amenity
- one future reservation
- one unpaid or partial reservation
- one reservation with payment proof uploaded

## Automated Coverage Already Present

These are covered by existing Vitest files in `src/__tests__`:

- App routing
- Auth page
- Booking page
- Calendar page
- Dashboard page
- My Bookings page
- Payment modal
- AI booking modal
- Booking modal
- Button/Input primitives
- Time slot selection
- `useTimeSlots`
- date utility helpers

Manual verification is still strongly needed for:

- Supabase auth integration
- RLS behavior
- guest booking lookup and guest payment continuation
- admin pages: courts, amenities, schedule, members, transactions
- profile updates and avatar upload
- storage uploads
- CSV export
- add-on persistence
- payment verification workflow end to end

## Test Personas

Use these three personas consistently:

1. Guest
   - not logged in
2. Member
   - authenticated, non-admin
3. Admin
   - authenticated, `profiles.role = 'admin'`

## Test Areas

### 1. Routing and Access Control

#### Guest

- Open `/` while logged out.
  - Expected: redirect to `/book`.
- Open `/login`.
  - Expected: auth screen loads.
- Open `/dashboard`.
  - Expected: redirect to `/login`.
- Open `/book`.
  - Expected: public booking flow loads without login.
- Open `/calendar`.
  - Expected: guest banner appears and calendar loads without private booking data.
- Open `/my-booking`.
  - Expected: guest lookup page loads.
- Open `/transactions`, `/members`, `/courts`, `/schedule`, `/amenities`, `/profile`.
  - Expected: redirect to `/login`.

#### Member

- Log in as normal member and open `/`.
  - Expected: redirect to `/dashboard`.
- Open `/members`, `/courts`, `/schedule`, `/transactions`, `/amenities`.
  - Expected: redirect to `/dashboard`.
- Open `/book`, `/calendar`, `/my-bookings`, `/profile`.
  - Expected: access allowed.

#### Admin

- Log in as admin and open all routes above.
  - Expected: admin routes are accessible.

### 2. Authentication

#### Login

- Try valid email/password login.
  - Expected: session starts and app routes to authenticated area.
- Try invalid password.
  - Expected: visible error message.
- Submit empty form.
  - Expected: field validation errors appear.

#### Register

- Register with valid inputs.
  - Expected: account is created or confirmation message appears depending on Supabase email confirmation settings.
- Submit mismatched passwords.
  - Expected: validation error.
- Submit invalid email or weak password.
  - Expected: validation error from schema.

#### Forgot Password

- Use valid email.
  - Expected: success message shown.
- Use invalid email format.
  - Expected: validation error.

#### OAuth

- Click Google and Facebook sign-in buttons.
  - Expected: redirect flow starts or clean provider error appears.

### 3. Guest Booking Flow

- Start on `/book` while logged out.
  - Expected: guest header and "Sign In" CTA visible.
- Step 1: select a court.
  - Expected: next button enables.
- Step 2: select one date.
  - Expected: next button enables.
- Step 2: select a date range.
  - Expected: review later reflects multiple dates.
- Step 3: select contiguous time slots.
  - Expected: slot selection works and blocked/booked slots cannot be selected.
- Step 4: review booking.
  - Expected:
    - guest-specific copy visible
    - total is correct
    - add-ons section appears when amenities exist
    - selected add-ons affect total
- Submit with required customer details and payment choice.
  - Expected: booking succeeds and routes to `/booking-success`.

Database checks:

- `reservations.user_id` is `NULL`
- `booking_source = 'guest'`
- `is_guest_booking = true`
- `reservation_days` rows exist
- `reservation_addons` rows exist when add-ons were selected

### 4. Member Booking Flow

- Start on `/book` while logged in as member.
  - Expected: member booking flow copy shown.
- Complete booking with no add-ons.
  - Expected: success routes to `/my-bookings`.
- Complete booking with add-ons.
  - Expected:
    - total includes add-ons
    - booking appears in My Bookings
    - add-ons visible in reservation details

Database checks:

- `reservations.user_id` equals member user id
- `booking_source = 'member'`
- `is_guest_booking = false`

### 5. Booking Review and Pricing

- Test 30-minute booking.
  - Expected: price is half the hourly rate.
- Test 60-minute booking.
  - Expected: price equals hourly rate.
- Test 90-minute booking.
  - Expected: price is 1.5x hourly rate.
- Test multi-day date range.
  - Expected: total reflects all selected days.
- Test add-ons plus multi-day booking.
  - Expected: court subtotal scales by time and days, add-ons remain flat per booking.

### 6. Slot Availability and Conflict Prevention

- Create a reservation for Court A on a future date/time.
- Attempt to book the same court, overlapping time, same day.
  - Expected: slot appears unavailable or save fails with conflict error.
- Attempt same time on a different court.
  - Expected: allowed.
- Add a schedule block on a court/date/time.
  - Expected: matching slot appears unavailable in booking flow.
- Cancel a reservation.
  - Expected: slot becomes available again.

### 7. Guest Lookup and Guest Payment Continuation

- Use `/my-booking` with correct booking reference and phone.
  - Expected: guest booking loads.
- Use wrong phone or wrong reference.
  - Expected: "No booking found" style error.
- For unpaid guest booking:
  - open payment modal
  - make partial payment
  - verify status updates
- For partially paid guest booking:
  - attempt another partial payment smaller than remaining balance
  - Expected: blocked
- For partially paid guest booking:
  - pay full remaining balance
  - Expected: accepted

Database checks:

- `paid_amount` increments correctly
- `payment_status` transitions correctly
- `status` moves from `awaiting_payment` to `pending` when applicable

### 8. Payment Modal and Payment States

For both member and guest flows, test:

- `gcash`
  - Expected: instruction block visible
- `maya`
  - Expected: instruction block visible
- `bank_transfer`
  - Expected: bank instruction block visible
- `cash`
  - Expected: no digital instruction block

Payment state scenarios:

- unpaid -> partial
- unpaid -> paid
- unpaid -> for_verification with proof upload
- partial -> paid
- partial -> for_verification only when remaining balance is fully covered

Upload checks:

- upload image proof
  - Expected: file upload succeeds and URL stored in reservation

### 9. Booking Success Page

- Reach `/booking-success` after guest booking.
  - Expected:
    - court name visible
    - date range visible
    - time range visible
    - total and paid amount visible
    - contact details visible
    - booking reference visible
- Open `/booking-success` directly without navigation state.
  - Expected: redirect to `/book`.

### 10. Dashboard

#### Member

- Open dashboard as member.
  - Expected:
    - "My Total Bookings"
    - "Pending Payments"
    - "Amount Paid"
    - recent bookings limited to that member

#### Admin

- Open dashboard as admin.
  - Expected:
    - court count
    - bookings this month
    - pending bookings
    - revenue MTD
    - recent activity across reservations

### 11. Calendar

#### Guest

- Open calendar while logged out.
  - Expected:
    - guest banner visible
    - CTA to `/book`
    - no private authenticated workflows

#### Member/Admin

- Open calendar while logged in.
  - Expected:
    - month navigation works
    - reservations render on correct dates
    - overflow popup works on busy days
- Open reservation details from a calendar item.
  - Expected: modal opens with reservation data.
- As member, use "Pay Balance" when available.
  - Expected: payment modal opens.
- As member, cancel own reservation.
  - Expected: status changes to cancelled.
- As admin, use admin actions:
  - confirm booking
  - mark fully paid
  - reject payment
  - mark completed
  - mark no-show

### 12. My Bookings

- Open as member.
  - Expected: bookings categorized into `upcoming`, `past`, `cancelled`.
- Open reservation details.
  - Expected: modal data correct.
- Cancel eligible booking.
  - Expected: moved to cancelled tab.
- Pay outstanding balance.
  - Expected: payment updates reflected in list and modal.

### 13. Transactions Page

Admin only.

- Open `/transactions`.
  - Expected:
    - total revenue stat
    - pending collection stat
    - needs review stat
- Verify only bookings with payment activity appear.
- Confirm guest and member transactions show booking source and customer info.
- Confirm add-on summary appears when reservation has add-ons.
- Click "View proof" for a proof-backed payment.
  - Expected: file opens.
- Approve `for_verification` payment.
  - Expected: `payment_status = paid`, `status = confirmed`.
- Reject `for_verification` payment.
  - Expected: `payment_status = rejected`.
- Click export CSV.
  - Expected: file downloads and includes add-on columns.

### 14. Courts Page

Admin only.

- View list of courts.
  - Expected: existing courts render.
- Add a new court.
  - Expected: new court appears.
- Edit court name/rate/color/order.
  - Expected: updates persist.
- Delete court.
  - Expected: removed if no FK conflict prevents it.
- Return to booking flow.
  - Expected: active courts and rates reflect the update.

### 15. Amenities Page

Admin only.

- View amenities list.
  - Expected: active and inactive amenities display.
- Add amenity.
  - Expected: new amenity appears.
- Edit amenity.
  - Expected: updates persist.
- Deactivate amenity.
  - Expected: inactive badge appears and amenity no longer appears in booking flow.
- Reactivate amenity.
  - Expected: appears in booking flow again.

### 16. Schedule Page

Admin only.

- Switch courts in dropdown.
  - Expected: weekly schedule updates per court.
- Toggle a day inactive.
  - Expected: inputs disable for that day.
- Change open/close times and slot size.
  - Expected: save succeeds.
- Use "Apply Monday to all days".
  - Expected: Monday config copies to all rows.
- Add schedule block.
  - Expected: block appears in upcoming list.
- Delete schedule block.
  - Expected: block disappears.
- Return to booking flow for same court/date.
  - Expected: blocked time is unavailable.

### 17. Members Page

Admin only.

- Open members page.
  - Expected: member list loads.
- Verify admin/user role display is correct.
- If role editing exists in UI:
  - change a user role
  - verify updated access after re-login

### 18. Profile Page

- Open profile as member or admin.
  - Expected: current profile info loads.
- Update name, phone, address.
  - Expected: values persist after reload.
- Upload avatar.
  - Expected: avatar appears in profile and sidebar.

### 19. AI Booking Modal

Requires valid `VITE_GEMINI_API_KEY`.

- Open smart booking modal.
  - Expected: modal loads.
- Submit empty prompt.
  - Expected: blocked.
- Submit a clear natural language request.
  - Expected: parsed result includes court and date range.
- Confirm parsed result.
  - Expected: booking flow prefill or continuation behaves correctly.
- Use invalid or vague prompt.
  - Expected: friendly error state.

### 20. Demo Mode / No Supabase

Unset Supabase env vars and reload.

- Auth actions
  - Expected: demo user fallback works.
- Courts, reservations, amenities
  - Expected: mock data appears.
- Booking flow
  - Expected: still works locally with mock state.

## High-Risk Regression Areas

Retest these after any major change:

1. guest booking creation
2. reservation day insertion and conflict prevention
3. payment proof uploads
4. guest lookup by reference + phone
5. admin payment approval/rejection
6. add-on pricing and persistence
7. schedule blocks affecting slot availability

## Suggested Execution Order

1. Auth and route access
2. Guest booking flow
3. Member booking flow
4. Payment flows
5. Admin operations pages
6. Guest lookup and follow-up payment
7. Demo mode regression

## Notes

- The existing `docs/phase2-test-checklist.html` is still useful, but it only covers a subset of Phase 2 work.
- This file is meant to reflect the broader current app, including amenities, guest lookup, transactions, and schedule management.
- In this environment, the automated Vitest suite could not be executed because the sandbox blocked `esbuild` from spawning its child process. Run `npm run test:run` locally in a normal terminal to validate the current unit/integration suite.

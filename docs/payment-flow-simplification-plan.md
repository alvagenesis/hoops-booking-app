# Payment Flow Simplification Plan

## Goal

Simplify booking and payment so both guest and signed-in users follow the same business rule:

- a booking is only created after the customer submits either:
  - a 50% deposit, or
  - a full payment
- every new booking starts in `pending_verification`
- there is no separate "create booking first, submit first payment later" target flow

This plan is the agreed target state for the next implementation pass. Cleanup of older fallback logic can happen during or after rollout as long as the new behavior is fully enforced in the active flow.

## Final Product Rules

### Booking creation

- Customer selects court, date, time, add-ons, and contact details.
- Customer must choose one payment option before booking is created:
  - `Deposit`
  - `Full payment`
- Deposit is always exactly `50%` of the total booking amount.
- Full payment is always exactly `100%` of the total booking amount.
- Booking submission without an initial payment attempt is not allowed.

### Verification model

- Initial payment is always submitted for admin verification.
- Payment proof remains optional, but still supported.
- A booking with a newly submitted payment is treated as holding the selected slot while it is in `pending_verification`.
- Admin can either approve or reject the submitted payment.

### After approval

- If deposit is approved:
  - booking becomes confirmed
  - payment becomes partially paid
  - remaining balance can be paid later
- If full payment is approved:
  - booking becomes confirmed
  - payment becomes fully paid

### After rejection

- Booking stays in `pending_verification` and is marked as payment rejected.
- Customer can resubmit payment for the same booking.
- Rejected submissions do not increase verified paid amount.

## Simplified State Model

Keep the data model understandable by separating these concerns clearly.

### Booking status

Recommended canonical values:

- `pending_verification`
- `confirmed`
- `completed`
- `cancelled`
- `no_show`

Notes:

- `pending_verification` replaces the current mixed use of `awaiting_payment` and `pending` for new bookings.
- A booking waiting on first-payment review should not look the same as an already-created booking that simply has internal admin work remaining.

### Payment status

Recommended canonical values:

- `partial`
- `paid`

Notes:

- For the active customer journey, every created booking starts with payment submitted, so `unpaid` should stop appearing for newly created bookings.
- Legacy `unpaid` rows may still exist during transition and should be handled until cleanup is complete.

### Payment review status

Recommended canonical values:

- `pending`
- `approved`
- `rejected`

Notes:

- `not_submitted` should no longer be used for new bookings in the simplified flow.
- It may remain temporarily for legacy records until migration/cleanup is complete.

## Target UX

### Shared booking flow for guest and member

1. Select court.
2. Select date or date range.
3. Select time slot(s).
4. Review booking summary and add-ons.
5. Enter contact details.
6. Choose payment type:
   - `Deposit (50%)`
   - `Full payment`
7. Choose payment method.
8. Optionally attach payment proof and notes.
9. Submit booking.
10. Booking is created immediately in `pending_verification`.

### Guest flow

- Guest still uses booking reference plus phone number to look up the booking later.
- Guest can resubmit payment from the guest status page if the initial submission was rejected or if a confirmed booking still has remaining balance after an approved deposit.

### Signed-in member flow

- Member sees the booking in `My Bookings`.
- Member can resubmit payment there if the initial submission was rejected or if a confirmed booking still has remaining balance after an approved deposit.

## UI Labels

Use simpler customer-facing language and avoid exposing raw internal state combinations where possible.

Recommended labels:

- `Deposit in verification`
- `Full payment in verification`
- `Deposit verified`
- `Fully paid`
- `Payment rejected`
- `Cancelled`

Recommended supporting copy:

- "Your booking is reserved while it is in payment verification."
- "Your deposit was verified. Please settle the remaining balance before play."
- "Your payment was rejected. Please submit a new payment."

## Database Changes

## Reservation row behavior

For new bookings:

- `paid_amount` stays `0` until approval
- `pending_payment_amount` stores the submitted deposit/full amount
- `pending_payment_method` stores the current submission method
- `pending_payment_proof_url` stores any uploaded proof
- `pending_payment_notes` stores any current submission notes
- `payment_review_status` starts as `pending`

Recommended new-booking values:

- Deposit submission:
  - `status = 'pending_verification'`
  - `payment_status = 'partial'`
  - `payment_review_status = 'pending'`
  - `paid_amount = 0`
  - `pending_payment_amount = total_amount * 0.5`
- Full submission:
  - `status = 'pending_verification'`
  - `payment_status = 'paid'`
  - `payment_review_status = 'pending'`
  - `paid_amount = 0`
  - `pending_payment_amount = total_amount`

Important note:

- `payment_status` in this plan represents the intended payment coverage after approval, not already-verified money.
- If that dual meaning feels too confusing during implementation, we should introduce a separate field like `payment_plan` with values `deposit` and `full`. That would be cleaner long term.

### Recommended schema decisions

Minimum-change path:

- keep existing columns
- repurpose active flow to stop creating `awaiting_payment` and `not_submitted` records
- add `pending_verification` to the reservation status check constraint
- keep legacy values supported temporarily in app logic

Cleaner long-term path:

- add `payment_plan text check (payment_plan in ('deposit', 'full'))`
- add `pending_verification` to `status`
- stop using `awaiting_payment` for newly created rows
- stop using `not_submitted` for newly created rows

Recommended choice:

- use the cleaner long-term path if we are already editing `supabase-schema.sql`
- otherwise use the minimum-change path first and schedule a follow-up migration

## Frontend Changes

### 1. Payment modal

Files:

- [`src/modals/PaymentModal.jsx`](C:/Users/pao/source/repos/HoopsBookingApp/hoops-booking-app/src/modals/PaymentModal.jsx:29)

Changes:

- Rename the payment-plan choices in UI to:
  - `Deposit (50%)`
  - `Full payment`
- Make it explicit that one of these must be submitted before the booking enters `pending_verification`.
- Keep proof upload optional.
- Keep digital instructions for `gcash`, `maya`, and `bank_transfer`.
- Keep follow-up balance behavior:
  - if a booking already has an approved deposit, next payment must settle the remaining balance

### 2. Booking review

Files:

- [`src/components/booking/BookingReview.jsx`](C:/Users/pao/source/repos/HoopsBookingApp/hoops-booking-app/src/components/booking/BookingReview.jsx:44)

Changes:

- Update helper text to explain:
  - booking is only submitted after deposit or full payment is entered
  - staff will review the payment after submission while the booking remains in `pending_verification`
- Make the CTA language clearer:
  - current: `Proceed to Payment`
  - recommended: `Submit Booking Payment`

### 3. Booking page creation logic

Files:

- [`src/pages/BookingPage.jsx`](C:/Users/pao/source/repos/HoopsBookingApp/hoops-booking-app/src/pages/BookingPage.jsx:100)

Changes:

- Remove new-booking fallback logic that assumes no payment submission in the active flow.
- New bookings should always be created with:
  - `status = 'pending_verification'` or transitional equivalent
  - `payment_review_status = 'pending'`
  - non-zero `pending_payment_amount`
- Keep guest/member branching only for ownership and lookup behavior, not for payment rules.

### 4. Guest booking lookup

Files:

- [`src/pages/MyBookingPage.jsx`](C:/Users/pao/source/repos/HoopsBookingApp/hoops-booking-app/src/pages/MyBookingPage.jsx:72)

Changes:

- Keep lookup by reference and phone.
- Update guest payment button logic so it only appears when:
  - a payment was rejected, or
  - a confirmed booking has remaining balance after approved deposit
- Remove or de-emphasize any UI wording that implies an unpaid initial booking should exist in the normal flow.

### 5. Member booking management

Files:

- [`src/pages/MyBookingsPage.jsx`](C:/Users/pao/source/repos/HoopsBookingApp/hoops-booking-app/src/pages/MyBookingsPage.jsx:155)

Changes:

- Match guest follow-up payment behavior.
- Only allow follow-up payment when:
  - initial payment was rejected, or
  - deposit was approved and balance remains
- Update balance labels and badges to match the simplified copy.

### 6. Admin transactions page

Files:

- [`src/pages/TransactionsPage.jsx`](C:/Users/pao/source/repos/HoopsBookingApp/hoops-booking-app/src/pages/TransactionsPage.jsx:72)

Changes:

- Approve flow:
  - move `pending_payment_amount` into `paid_amount`
  - move pending method/proof/notes into official payment fields
  - set `status = 'confirmed'`
  - set `payment_review_status = 'approved'`
- Reject flow:
  - clear pending payment submission fields
  - keep booking in `pending_verification` and available for resubmission
  - set `payment_review_status = 'rejected'`
- Update admin table labels so review actions read more clearly for operators.

## Admin Actions

The simplified flow should also simplify what admins are allowed to do.

Recommended final admin action set:

- `Approve Payment`
- `Reject Payment`
- `Cancel Booking`
- `Mark Completed`
- `Mark No Show`

This is the preferred operator-facing action set. The admin should not need different buttons for deposit, full payment, or remaining balance if the system can infer the result from the submitted amount and current booking state.

### How each admin action behaves

#### Approve Payment

Use when a booking in `pending_verification` or a confirmed partial booking has a submitted payment waiting for review.

Effects:

- move `pending_payment_amount` into `paid_amount`
- move pending payment method/proof/notes into official payment fields
- clear pending payment fields
- set `payment_review_status = 'approved'`
- set `confirmed_at`

Booking/payment result:

- if approved paid total is still below `total_amount`:
  - set booking to `confirmed`
  - set payment to `partial`
- if approved paid total reaches `total_amount`:
  - set booking to `confirmed`
  - set payment to `paid`

This one action should handle:

- initial deposit approval
- initial full-payment approval
- remaining-balance approval after a confirmed deposit

#### Reject Payment

Use when a booking has a submitted payment that cannot be verified.

Effects:

- clear current pending payment amount/method/proof/notes
- set `payment_review_status = 'rejected'`
- keep already approved `paid_amount` untouched

Booking/payment result:

- if no approved payment exists yet:
  - booking remains `pending_verification`
  - booking stays available for payment resubmission
- if a deposit was already approved:
  - booking remains `confirmed`
  - payment remains `partial`
  - customer can resubmit only the remaining balance

#### Cancel Booking

Use to cancel an active booking and release the slot.

Effects:

- set booking to `cancelled`
- block further payment submissions unless a future recovery flow is intentionally added

Recommended usage:

- allow for `pending_verification`
- allow for `confirmed`
- restrict to admin/manual override once a booking is already completed or no-show

#### Mark Completed

Use after the reservation has been successfully used.

Effects:

- set booking to `completed`

Recommended usage:

- allow only for `confirmed` bookings

#### Mark No Show

Use when the customer does not arrive for a confirmed booking.

Effects:

- set booking to `no_show`

Recommended usage:

- allow only for `confirmed` bookings

### Admin action availability by state

#### `pending_verification`

Show:

- `Approve Payment`
- `Reject Payment`
- `Cancel Booking`

#### `confirmed` with `partial`

Show:

- `Approve Payment`
- `Reject Payment`
- `Cancel Booking`
- `Mark Completed`
- `Mark No Show`

Notes:

- In this state, approve/reject applies only to a newly submitted remaining-balance payment if one is currently pending review.
- If no follow-up payment is currently under review, only lifecycle actions should be visible.

#### `confirmed` with `paid`

Show:

- `Mark Completed`
- `Mark No Show`
- `Cancel Booking` only if your business rules allow exceptional admin override

#### `cancelled`, `completed`, or `no_show`

Show:

- no payment review actions
- only read-only status display unless an explicit admin override flow is designed later

### Recommended admin UI wording

To keep the admin screen simple, use one generic payment action label and show the payment type as context.

Recommended action labels:

- `Approve Payment`
- `Reject Payment`

Recommended contextual badges:

- `Deposit submission`
- `Full payment submission`
- `Remaining balance submission`

This keeps the button set small while still telling the admin exactly what kind of payment they are reviewing.

## Compact State Transition Table

This table is meant to be the quickest reference for how customer and admin actions move a booking through the simplified flow.

| Current state | Actor | Action | Resulting state | Notes |
|---|---|---|---|---|
| No booking yet | Customer | Submit booking with deposit | `pending_verification` + `payment_status = partial` + `payment_review_status = pending` | Deposit is exactly 50% of `total_amount` |
| No booking yet | Customer | Submit booking with full payment | `pending_verification` + `payment_status = paid` + `payment_review_status = pending` | Full payment is exactly 100% of `total_amount` |
| `pending_verification` + deposit under review | Admin | Approve Payment | `confirmed` + `payment_status = partial` + `payment_review_status = approved` | Booking is confirmed with remaining balance still due |
| `pending_verification` + full payment under review | Admin | Approve Payment | `confirmed` + `payment_status = paid` + `payment_review_status = approved` | Booking is confirmed and fully paid |
| `pending_verification` + payment under review | Admin | Reject Payment | `pending_verification` + `payment_review_status = rejected` | Pending submission is cleared; customer may resubmit |
| `pending_verification` + payment rejected | Customer | Resubmit deposit | `pending_verification` + `payment_status = partial` + `payment_review_status = pending` | Replaces rejected submission |
| `pending_verification` + payment rejected | Customer | Resubmit full payment | `pending_verification` + `payment_status = paid` + `payment_review_status = pending` | Replaces rejected submission |
| `pending_verification` | Admin | Cancel Booking | `cancelled` | Slot is released |
| `confirmed` + `partial` + no payment under review | Customer | Submit remaining balance | `confirmed` + `payment_status = partial` + `payment_review_status = pending` | Customer must pay full remaining balance, not another partial |
| `confirmed` + `partial` + remaining balance under review | Admin | Approve Payment | `confirmed` + `payment_status = paid` + `payment_review_status = approved` | Booking becomes fully paid |
| `confirmed` + `partial` + remaining balance under review | Admin | Reject Payment | `confirmed` + `payment_status = partial` + `payment_review_status = rejected` | Approved deposit stays intact; customer may resubmit remaining balance |
| `confirmed` + `partial` | Admin | Cancel Booking | `cancelled` | Manual/admin rule dependent |
| `confirmed` + `paid` | Admin | Mark Completed | `completed` | Normal successful booking end state |
| `confirmed` + `partial` | Admin | Mark Completed | `completed` | Only allow if venue accepts play with remaining balance still unresolved |
| `confirmed` + `paid` | Admin | Mark No Show | `no_show` | Booking was confirmed but customer did not arrive |
| `confirmed` + `partial` | Admin | Mark No Show | `no_show` | Allowed only if venue policy supports it |

### Practical reading guide

To make the table easier to use during implementation:

- `pending_verification` means the booking exists and the slot is being held, but admin has not yet approved the latest submitted payment.
- `payment_review_status = pending` means there is an active payment submission waiting for action.
- `payment_review_status = rejected` means the latest submission failed review, but the booking may still remain active for resubmission.
- `payment_status = partial` means the booking is not yet fully settled.
- `payment_status = paid` means verified payments now cover the full booking amount.

### Key enforcement rules reflected in the table

- No booking is created without an initial deposit or full payment submission.
- Deposit is always 50% of the booking total.
- After an approved deposit, the next customer payment must settle the full remaining balance.
- Rejecting a payment never removes already approved money from `paid_amount`.
- Payment review actions only apply when a payment submission is actually pending review.

## Backend and Data Rules

### Guest payment RPC

Files:

- [`supabase-schema.sql`](C:/Users/pao/source/repos/HoopsBookingApp/hoops-booking-app/supabase-schema.sql:529)

Changes:

- Keep secure guest access by `reference + phone`.
- Keep validation against overpayment.
- Keep rule that second payment after approved partial must settle remaining balance.
- Update status transitions to use the simplified booking status model.
- Ensure rejected-booking resubmission path remains allowed.

### Reservation insert policy

Files:

- [`supabase-schema.sql`](C:/Users/pao/source/repos/HoopsBookingApp/hoops-booking-app/supabase-schema.sql:106)

Changes:

- Ensure inserts for new reservations require a positive `pending_payment_amount` in the active flow.
- Ensure new reservations are not inserted with `payment_review_status = 'not_submitted'`.
- If strict DB enforcement is desired, add a check constraint or trigger that blocks zero-initial-payment inserts for new rows.

Recommended enforcement order:

1. frontend enforcement
2. hook/service enforcement
3. database enforcement

That gives us defense in depth and prevents regressions.

## Implementation Phases

### Phase 1: Align active flow

Goal:

- make the visible guest/member booking flow match the simplified rule set without breaking old records

Work:

- update payment modal labels
- update booking review copy
- update booking creation logic to always create with `status = 'pending_verification'` and `payment_review_status = 'pending'`
- update badges and labels across guest/member/admin screens

Definition of done:

- a new booking cannot be created through the UI without an initial deposit or full payment submission
- guest and member flows show the same payment logic

### Phase 2: Normalize statuses

Goal:

- reduce internal state confusion

Work:

- add `pending_verification` status or equivalent canonical status
- stop creating `awaiting_payment` for new rows
- stop creating `not_submitted` for new rows
- optionally add `payment_plan`

Definition of done:

- all newly created rows use the simplified status model
- UI no longer depends on legacy labels for active bookings

### Phase 3: Lock down backend rules

Goal:

- make the simplified behavior enforceable even if future UI changes regress

Work:

- strengthen insert validation in hooks/services
- add DB-level safeguards for initial payment requirement
- refine guest RPC validation and follow-up payment behavior

Definition of done:

- invalid zero-payment booking creation is blocked even outside the main UI

### Phase 4: Legacy cleanup

Goal:

- remove old states once migration risk is low

Work:

- identify any leftover `awaiting_payment` / `not_submitted` dependencies
- update tests and demo data
- decide whether to migrate or leave old records as supported legacy values

Definition of done:

- simplified flow is the only supported behavior for new development

## Testing Impact

The current test plan in [`docs/current-test-plan.md`](C:/Users/pao/source/repos/HoopsBookingApp/hoops-booking-app/docs/current-test-plan.md) will need a follow-up update after implementation.

Key scenarios to cover:

- guest creates booking with deposit
- guest creates booking with full payment
- member creates booking with deposit
- member creates booking with full payment
- payment proof included
- payment proof omitted
- admin approves deposit
- admin approves full payment
- admin rejects initial submission
- guest resubmits after rejection
- member resubmits after rejection
- approved deposit followed by full remaining balance payment

Scenarios that should stop being valid in the active flow:

- new booking created with no payment submission
- new booking created with `payment_review_status = not_submitted`

## Open Follow-Up Decisions

These are not blockers for the simplified flow plan, but we should confirm them during implementation.

### 1. Should rejected bookings keep holding the slot?

Recommended answer:

- yes, but only temporarily

Recommended follow-up policy:

- keep the slot reserved while the booking remains in `pending_verification`
- after rejection, allow a grace period for resubmission
- auto-cancel if no valid replacement payment is submitted within that window

### 2. Should `cash` remain available for initial submission?

Current UI supports it in some member paths.

Recommended answer:

- yes, if staff wants to manually verify it
- no, if the venue wants only digitally traceable first payments

### 3. Do we want a dedicated `payment_plan` field?

Recommended answer:

- yes, if we want cleaner code and cleaner reporting
- not required for the first rollout if we prefer a smaller diff

## Final Recommendation

Implement the simplified flow using this rule:

> A reservation is created only after the customer submits either a 50% deposit or a full payment for verification.

For rollout, prioritize:

1. active flow alignment
2. status normalization
3. backend enforcement
4. legacy cleanup

That sequence gives us a simpler customer experience first, while keeping room to clean up older fallback logic safely afterward.

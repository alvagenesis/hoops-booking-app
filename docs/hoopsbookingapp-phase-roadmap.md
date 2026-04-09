# HoopsBookingApp Reconstructed Original Roadmap

## Phase 1 — Owner-First Operations Foundation

### Product positioning
- [x] Reframe the project from a narrow basketball booking app into a broader sports venue booking and operations product
- [x] Prioritize venue owners/operators as the primary first customer
- [x] Focus on practical monetization for local sports venues and facility operators

### Reservation workflow
- [x] Expand reservation lifecycle beyond a simplistic pending/confirmed model
- [x] Support more operationally useful statuses such as:
  - [x] awaiting_payment
  - [x] confirmed
  - [x] cancelled
  - [x] completed
  - [x] no_show
- [x] Improve reservation handling for real admin workflows

### Payment workflow
- [x] Expand payment lifecycle beyond basic states
- [x] Support statuses such as:
  - [x] unpaid
  - [x] partial
  - [x] for_verification
  - [x] paid
  - [x] rejected
- [x] Support payment proof upload flow
- [x] Support manual payment verification by admins/operators
- [x] Add payment notes / verification context where needed

### Customer/booking source flexibility
- [x] Support guest bookings in addition to member bookings
- [x] Allow reservations without requiring a signed-in user
- [x] Capture customer information for non-member bookings:
  - [x] name
  - [x] phone
  - [x] email
- [x] Track booking source and guest/member distinction

### Scheduling operations
- [x] Add schedule blocking capability
- [x] Support schedule block reasons such as:
  - [x] maintenance
  - [x] private_event
  - [x] manual_block
- [x] Allow admins to manage blocked schedules directly

### Admin/operator experience
- [x] Build or improve an owner-first dashboard
- [x] Surface reservations needing review
- [x] Surface payment verification workload
- [x] Provide admin reservation actions
- [x] Improve operator visibility into current booking state

### Data/security/infrastructure
- [x] Update database schema to match richer reservation and payment workflows
- [x] Add storage support for payment proofs
- [x] Configure or fix RLS and related access policies for guest bookings and uploads
- [x] Fix date-handling issues around local time vs UTC serialization

### Phase 1 outcome
- [x] Make the system operationally useful even before the public booking flow is fully polished
- [x] Ensure operators can actually run bookings reliably through the platform

---

## Phase 2 — Customer-Facing Booking Expansion

### Public booking experience
- [x] Introduce or improve public booking accessibility
- [x] Create a smoother guest-friendly booking flow
- [x] Reduce friction for customers who do not want to create accounts immediately
- [x] Make reservation entry more intuitive for first-time users

### UX improvements
- [x] Refine the booking flow for clarity and speed (multi-slot selection, time range display)
- [x] Improve customer-facing status visibility (BookingSuccessPage, guest lookup /my-booking)
- [x] Make payment instructions and proof submission clearer for end users (PaymentModal instructions)
- [x] Improve booking confidence and reduce abandoned reservations (validation hints, success page, reference number)

### Growth and product broadening
- [x] Position the product beyond only basketball use cases (venueConfig, sport-agnostic copy)
- [x] Support broader sports venue/facility scenarios in the product narrative and UX
- [ ] Prepare the app for stronger commercial packaging as a local-business booking platform (future)

### Operator/customer balance
- [x] Build customer-facing improvements on top of already-stable admin and operations workflows
- [x] Avoid sacrificing operational control for public-facing convenience

### Phase 2 outcome
- [x] Turn the operationally solid platform into a more accessible and scalable booking experience for customers
- [x] Improve adoption potential without reintroducing operational chaos

---

## Summary Sequence

### Phase 1
- [x] Make the product reliable for operators
- [x] Solve booking, payment, and scheduling operations first

### Phase 2
- [x] Make the product smoother and more accessible for customers
- [x] Expand the public/guest booking experience after operations are stable

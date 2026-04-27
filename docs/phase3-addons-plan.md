# Add-ons / Amenity Rentals Feature

## Context
When renting a court, customers can optionally rent extras (scoreboard, electric fan, aircon, lights, projector, drinking water supply, etc.). Each add-on has a flat price added to the court booking total. The venue owner needs to manage the amenity catalog from the admin UI. Selected add-ons must persist to the database alongside the reservation.

## Design Decisions

| Question | Decision | Reason |
|---|---|---|
| Pricing model | Flat fee per booking | Amenities are set up once regardless of days booked |
| Catalog storage | Supabase `amenities` table | Admin needs live on/off control + price changes without a code deploy |
| Booking flow | Integrated inside Review step | Keeps 4-step flow; extras section sits above the cost breakdown |
| Persistence | New `reservation_addons` junction table | Enables reporting, FK integrity, price snapshots |
| Admin UI | New `/amenities` page | Mirrors `/courts` pattern; keeps CourtsPage focused |

## Updated Booking Flow (no step count change)

```
Step 1: Court → Step 2: Date → Step 3: Time → Step 4: Review
                                                  ├── Booking summary
                                                  ├── [Add-ons] ← NEW section
                                                  │    ☐ Scoreboard  ₱200
                                                  │    ☐ Elec. Fan   ₱150
                                                  │    ☐ Aircon      ₱500
                                                  │    ...
                                                  ├── Court subtotal ₱X,XXX
                                                  ├── Add-ons        ₱XXX
                                                  ├── TOTAL          ₱X,XXX
                                                  └── Customer info / Pay button
```

## Database Changes

Append to `hoops-booking-app/supabase-schema.sql` (and run as migration):

```sql
DROP TABLE IF EXISTS public.reservation_addons CASCADE;
DROP TABLE IF EXISTS public.amenities CASCADE;

CREATE TABLE public.amenities (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name        text NOT NULL,
  description text DEFAULT '',
  price       numeric NOT NULL DEFAULT 0 CHECK (price >= 0),
  icon        text DEFAULT 'star',        -- lucide icon name
  is_active   boolean DEFAULT true,
  sort_order  integer DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE public.reservation_addons (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  reservation_id   uuid REFERENCES public.reservations(id) ON DELETE CASCADE NOT NULL,
  amenity_id       uuid REFERENCES public.amenities(id) ON DELETE RESTRICT NOT NULL,
  price_at_booking numeric NOT NULL DEFAULT 0,   -- snapshot; immune to future price edits
  created_at       timestamptz DEFAULT now(),
  CONSTRAINT unique_addon_per_reservation UNIQUE (reservation_id, amenity_id)
);

CREATE INDEX IF NOT EXISTS idx_reservation_addons_reservation
  ON public.reservation_addons(reservation_id);

-- RLS: amenities
ALTER TABLE public.amenities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "amenities_select_all"   ON public.amenities FOR SELECT USING (true);
CREATE POLICY "amenities_admin_write"  ON public.amenities FOR ALL    USING (public.is_admin());

-- RLS: reservation_addons
ALTER TABLE public.reservation_addons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reservation_addons_select" ON public.reservation_addons FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.reservations r WHERE r.id = reservation_id AND (
      r.user_id = auth.uid() OR public.is_admin()
      OR (auth.uid() IS NULL AND r.user_id IS NULL AND COALESCE(r.is_guest_booking,false))
    )
  )
);
CREATE POLICY "reservation_addons_insert" ON public.reservation_addons FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.reservations r WHERE r.id = reservation_id AND (
      (auth.uid() IS NOT NULL AND r.user_id = auth.uid())
      OR (auth.uid() IS NULL AND r.user_id IS NULL AND COALESCE(r.is_guest_booking,false))
    )
  )
);
CREATE POLICY "reservation_addons_admin" ON public.reservation_addons FOR ALL USING (public.is_admin());

GRANT SELECT ON public.amenities TO anon;
GRANT INSERT, SELECT ON public.reservation_addons TO anon;

-- Seed data
INSERT INTO public.amenities (name, description, price, icon, sort_order) VALUES
  ('Scoreboard',            'Electronic scoreboard display',       200, 'monitor',     1),
  ('Electric Fan',          'Industrial-grade electric fan',       150, 'wind',        2),
  ('Aircon',                'Full air-conditioning for the court', 500, 'thermometer', 3),
  ('Lights',                'Professional court lighting',         100, 'lamp',        4),
  ('Projector',             'Overhead projector + screen',         400, 'projector',   5),
  ('Drinking Water Supply', 'Unlimited water dispenser station',   100, 'droplets',    6)
ON CONFLICT DO NOTHING;
```

## Files to Create

### `src/hooks/useAmenities.js`
Mirror of `useCourts` pattern. Exports `{ amenities, loading, addAmenity, updateAmenity, refetch }`. Fetches `amenities` ordered by `sort_order`. Falls back to `MOCK_AMENITIES` when no Supabase. `updateAmenity(id, { is_active: false })` is how you "deactivate" — no DELETE exposed.

### `src/components/booking/AddonsSelection.jsx`
Purely presentational. Props: `{ amenities, selectedAddons, onChange }`. Renders a grid of toggle cards. Each card: icon (lucide lookup table), name, description, price. Clicking toggles the item in `selectedAddons`. Shows "No add-ons selected" empty state.

### `src/pages/AmenitiesPage.jsx`
Admin-only. Same card+form pattern as `CourtsPage`. Fields: Name, Description, Price (₱), Icon (text), Sort Order. List shows active + inactive (inactive gets a grayed "Inactive" badge). Edit/deactivate actions only — no delete (FK constraint protects history). Uses `useAmenities`.

## Files to Modify

### `src/lib/constants.js`
Add `MOCK_AMENITIES` array (6 entries matching seed data shape) for no-Supabase dev mode.

### `src/components/booking/BookingReview.jsx`
- Call `useAmenities()` to fetch the catalog (active only)
- Add `selectedAddons` state (internal, `useState([])`)
- Render `<AddonsSelection>` between the summary card and customer info fields
- Update total calculation:
  ```js
  const addonsTotal = selectedAddons.reduce((sum, a) => sum + a.price, 0);
  const courtSubtotal = court.hourly_rate * hoursPerDay * totalDays;
  const totalAmount = courtSubtotal + addonsTotal;
  ```
- Show two-line breakdown: "Court" and "Add-ons" subtotals above the total
- Pass `addons` (mapped to `{ amenity_id, price_at_booking }`) through `onConfirm` callback alongside payment data

### `src/pages/BookingPage.jsx`
- In `handleConfirm`, destructure `addons` from the incoming payload
- Pass `addons` to `createReservation({ reservation, dates, paymentProofFile, addons })`

### `src/hooks/useReservations.js`
- `createReservation` accepts `addons` param
- After `reservation_days` insert succeeds, insert `reservation_addons` rows (non-fatal: log error, don't roll back the reservation)
- Update `.select()` string to include `reservation_addons(*)` in `fetchReservations`

### `src/App.jsx`
- Import `AmenitiesPage` and `Package` icon from lucide-react
- Add to `pageTitle()`: `if (location.pathname.startsWith('/amenities')) return 'Amenities';`
- Add route in the admin-protected block:
  ```jsx
  <Route path="/amenities" element={isAdmin ? <AmenitiesPage /> : <Navigate to="/dashboard" />} />
  ```
- Add to Management nav section:
  ```jsx
  <NavItem icon={Package} label="Amenities" to="/amenities" />
  ```

### `src/modals/ReservationDetailModal.jsx`
- If `reservation.reservation_addons?.length > 0`, render an "Add-ons" subsection in the financial card listing each add-on name + snapshotted price

## Verification

**Database**
1. Run the SQL migration. Confirm `amenities` and `reservation_addons` tables appear in Supabase Table Editor.
2. Verify 6 seed rows in `amenities`.

**Admin**
3. Log in as admin → "Amenities" appears in Management sidebar.
4. `/amenities` renders 6 cards. Add, edit, deactivate, reactivate each work.
5. Deactivated amenity disappears from the customer-facing booking flow.

**Booking (member)**
6. Start booking → complete steps 1–3 → Review step shows Add-ons section with active amenities.
7. Select 2 add-ons → total updates: shows court subtotal + add-ons subtotal + grand total.
8. Complete payment → confirm `reservation_addons` has 2 rows in Supabase with correct `price_at_booking`.

**Booking (guest)**
9. Repeat steps 6–8 as unauthenticated guest. Add-on rows insert via anon grant.

**No-add-ons path**
10. Complete booking selecting zero add-ons → `reservation_addons` has no rows → total equals court-only calculation.

**Price snapshot**
11. Change Scoreboard price to ₱999. Reopen an old booking's detail modal → still shows original price, not ₱999.

**Dev mode (no Supabase)**
12. Remove `VITE_SUPABASE_URL`. Booking flow shows `MOCK_AMENITIES`. Selecting them updates total correctly.

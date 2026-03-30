# Fluffy Rabbit Farm Maintenance App

## Current State
New project — no existing application files.

## Requested Changes (Diff)

### Add
- Home screen with farm header "Fluffy Rabbit Farm"
- 4 notification bucket cards at top of home screen showing relevant hatch numbers dynamically:
  1. Ready for Crossing
  2. Successful Crossing Check (14 days after crossing)
  3. Ready to Place Nest Box (24 days after crossing, only if crossing was successful)
  4. Ready for Separation (30 days after delivery)
- Grid of hatch cards (~30 hatches) on home screen
- Add / Delete hatch functionality
- Hatch detail screen with:
  - Crossing entry (date + note)
  - Delivery entry (date + note)
  - Separation entry (date + note)
  - General notes entry
  - Full history list with edit and delete per entry
  - Crossing check approve/fail action (when hatch is in crossing check state)
- Approve/Fail crossing check action also accessible from the notification card on home screen
- Workflow state machine per hatch:
  - `ready_for_crossing` → default state on creation and after separation
  - `crossing_recorded` → after crossing date entered (awaits 14-day check)
  - `crossing_check_due` → 14+ days after crossing (appears in bucket 2)
  - `nest_box_due` → crossing approved + 24+ days after crossing (appears in bucket 3)
  - `awaiting_delivery` → nest box placed, waiting for delivery entry
  - `separation_due` → 30+ days after delivery date (appears in bucket 4)
  - `crossing_failed` → immediately resets to `ready_for_crossing`

### Modify
- N/A

### Remove
- N/A

## Implementation Plan
1. Backend: Motoko actor storing hatches and their event history
   - Hatch data: id, name, current state, list of events (type, date, note)
   - CRUD for hatches
   - CRUD for events within a hatch
   - Query for notification buckets (computed from current state + event dates vs today)
2. Frontend:
   - Home screen: header, 4 notification buckets, hatch grid
   - Notification cards: show hatch numbers, approve/fail inline for crossing check bucket
   - Hatch detail: tabbed or scrollable sections for adding entries and viewing history
   - State transitions triggered by user actions (record crossing, approve/fail, confirm nest box, record delivery, record separation)
   - All date comparisons done on frontend using stored dates and today's date

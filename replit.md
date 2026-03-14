# Сувилал ERP (Nursing Home ERP)

## Overview
A nursing home ERP system built with Express + React (Vite) fullstack template. Manages rooms, bookings, guests, treatments, inventory, and billing. UI is in Mongolian.

## Tech Stack
- **Frontend**: React + Vite, Tailwind CSS, Shadcn UI, Wouter router, TanStack Query, Recharts
- **Backend**: Express.js, Drizzle ORM, PostgreSQL
- **Language**: TypeScript

## Architecture
- `shared/schema.ts` - Drizzle ORM schema definitions and Zod validation schemas
- `server/` - Express API routes, storage layer (DatabaseStorage), seed data
- `client/src/` - React frontend with pages and components
- `client/src/lib/room-status.ts` - **Single source of truth** for all 9 room status configs (label, icon, dotClass, bgClass, textClass, badgeClass, rowBg, tdBg, chartColor, nonSellable). ALL pages must import from here.
- Sidebar-based layout using Shadcn Sidebar component (collapsible icon mode)

## Database Models
- RoomCategory - Room types (Standard, Deluxe, VIP, Family)
- Room - Individual rooms with status tracking (FK to RoomCategory with cascade delete)
- Guest - Guest registration with unique idNumber, medical history (JSON), VIP flag, family linking via parentId
- Booking - Room reservations
- Service - Services and packages (type: SERVICE|PACKAGE) with name, description, price, isActive
- BookingService - Junction table linking bookings to services (quantity, unitPrice, totalPrice)
- Staff - Doctors/nurses (name, role: DOCTOR|NURSE, phone, isActive)
- TreatmentPlan - Medical treatment scheduling (serviceId, staffId, scheduleTime, status, completedAt, notes)
- Inventory - Medical supply tracking (itemName, stockQuantity, unit, minStockLevel)
- InventoryPurchase - Purchase/restock records (inventoryId, quantity, purchaseDate, note)
- PackageService - Junction table linking packages to their included services (packageId, serviceId)
- ServiceMaterial (BOM) - Materials needed per service (serviceId, inventoryId, quantityNeeded)
- MaterialUsage - Treatment material consumption (treatmentId, inventoryId, quantityUsed, usageDate)
- Transaction - Payment records
- Floor - Managed floor options (name, number) used in room assignment
- AuditLog - System activity log (userId, action, description, targetTable)
- Setting - Key-value system settings (key: varchar PK, value: text). Default checkout_time="12:00"

## Room Status System (9 statuses)
All statuses defined in `client/src/lib/room-status.ts` as `ROOM_STATUS_CONFIG`.  
Status flow:
- AVAILABLE → PENDING (booking created) → OCCUPIED (check-in) → CLEANING (check-out) → CLEANING_IN_PROGRESS → INSPECTED → AVAILABLE
- OCCUPIED → DUE_OUT (auto-job: checkout day AND time ≥ checkoutTime-1hr) → OCCUPIED (extend) or CLEANING (checkout)
- AVAILABLE ↔ OUT_OF_ORDER (OOO) — needs maintenance
- AVAILABLE ↔ OUT_OF_SERVICE (OOS) — temporarily closed
- nonSellable: CLEANING, CLEANING_IN_PROGRESS, INSPECTED, OUT_OF_ORDER, OUT_OF_SERVICE

## Pages & Routes
- `/` - Dashboard with stat cards (today's revenue, room counts, active bookings) and room status pie chart (all 9 statuses including DUE_OUT)
- `/room-grid` - Interactive Room Grid Dashboard (color-coded cards, floor tabs, quick booking, check-out, DUE_OUT badge, 9-status actions)
- `/timeline` - Weekly Occupancy Timeline (7-day calendar with booking bars, room-by-day grid, quick booking from empty cells, OOO/OOS overlays)
- `/guests` - Guest list with CRUD, search, family member linking
- `/guests/:id` - Guest detail with medical history viewer, family members, bookings, treatment creation (Doctor's Panel), My Schedule section
- `/daily-schedule` - Daily treatment schedule showing all treatments for a selected date with complete/mark done actions and low stock alerts
- `/bookings` - Bookings list with search, status filter, create booking dialog with service selection, treatment plan management per booking; "Одоогийн зочид" section for CHECKED_IN/EXTENDED with extend+checkout actions
- `/sales` - Sales page showing CHECKED_IN and CHECKED_OUT bookings with revenue summary cards, payment and checkout actions
- `/housekeeping` - Full housekeeping workflow: CLEANING → CLEANING_IN_PROGRESS → INSPECTED → AVAILABLE; separate sections per stage + OOO + OOS; 6-stat header cards
- `/services` - Services/Packages CRUD (tabs: All/Service/Package). Service creation is separate from Package creation.
- `/billing` - Family billing overview (aggregated by family groups)
- `/inventory` - Inventory management with CRUD, purchase history, low stock warnings
- `/settings` - Room Categories, Floors, Rooms CRUD (Tabs layout) + **Системийн тохиргоо** tab with checkout_time setting

## API Endpoints
- `GET/POST/PATCH/DELETE /api/room-categories` - Room category CRUD (audit log on price change)
- `GET/POST/PATCH/DELETE /api/floors` - Floor CRUD (conflict check on duplicate number, dependency check on delete)
- `GET/POST/PATCH/DELETE /api/rooms` - Room CRUD (DELETE: guards against active bookings)
- `GET/POST/PATCH/DELETE /api/guests` - Guest CRUD (DELETE: guards against active bookings; supports ?search= query param)
- `GET /api/weekly-timeline?start=YYYY-MM-DD` - Weekly timeline data with rooms, bookings, guests, family members
- `GET /api/guests/:id/family` - Family members
- `GET /api/guests/:id/bookings` - Guest bookings
- `GET /api/guests/:id/family-bookings` - All family bookings
- `GET /api/bookings` - All bookings
- `POST /api/bookings` - Create booking (overlap check, date validation, guest count validation, server-side total calc, sets room to PENDING)
- `PATCH /api/bookings/:id` - Update booking (auto-recalculates totalAmount when dates change)
- `PATCH /api/bookings/:id/status` - Update booking status (manages room status transitions)
- `GET /api/bookings/:id/transactions` - Booking transactions
- `POST /api/transactions` - Create payment (DEPOSIT auto-confirms booking)
- `DELETE /api/transactions/:id` - Delete payment (with audit log, updates booking depositPaid)
- `GET/POST/PATCH/DELETE /api/services` - Service/Package CRUD (audit log on price change)
- `GET /api/bookings/:id/services` - Services for a booking
- `POST /api/booking-services` - Add service to booking (auto-recalculates booking totalAmount)
- `DELETE /api/booking-services/:id` - Remove service from booking (auto-recalculates booking totalAmount)
- `GET /api/room-grid` - Enriched room data with active bookings and guest info
- `GET /api/family-bill/:parentId` - Family bill with all bookings, transactions, totals
- `GET/POST/PATCH/DELETE /api/inventory` - Inventory CRUD
- `GET/POST /api/inventory/:id/purchases` - Purchase history and restock
- `GET/POST /api/services/:id/materials` - BOM management (bulk replace)
- `GET /api/bookings/:id/treatment-plans` - Treatment plans for a booking
- `POST /api/treatment-plans` - Create treatment plan
- `PATCH /api/treatment-plans/:id/complete` - Complete treatment (auto-deducts inventory via DB transaction with stock validation, returns low stock warnings)
- `GET/POST/PATCH/DELETE /api/staff` - Staff (doctors/nurses) CRUD
- `POST /api/treatment-plans/bulk` - Create recurring treatment plans
- `GET /api/daily-schedule?date=YYYY-MM-DD` - Daily schedule with enriched guest/room/staff data
- `GET /api/guests/:id/treatment-plans` - All treatment plans for a guest across bookings
- `GET /api/audit-logs` - Audit log entries
- `GET /api/dashboard/stats` - Dashboard statistics (all 9 room status counts including dueOut, revenue, booking counts)
- `GET /api/settings` - All settings as key-value map
- `PUT /api/settings/:key` - Upsert a setting value
- `POST /api/bookings/:id/extend` - Extend booking checkout date (CHECKED_IN or EXTENDED → EXTENDED, recalculates total, reverts DUE_OUT→OCCUPIED)

## Treatment BOM & Auto-Deduction
- Each service can have a Bill of Materials (BOM) linking to inventory items with quantities needed
- When a treatment plan is marked complete, inventory is automatically deducted based on BOM
- Uses `db.transaction()` (drizzle-orm built-in) for atomicity — no manual pg.Pool creation
- **Stock validation**: if stock < required quantity, throws an error instead of silently truncating to 0
- Material usage records created with completion timestamp

## Booking Flow
- Create booking → PENDING (room=PENDING); date validation: checkIn must be < checkOut
- Pay DEPOSIT → CONFIRMED (room stays PENDING)
- CHECK_IN → room=OCCUPIED
- DUE_OUT auto-job: runs every minute; if checkout is today AND current time ≥ (checkout_time - 1 hour), room becomes DUE_OUT
- EXTEND booking (POST /api/bookings/:id/extend): booking=EXTENDED, room reverts OCCUPIED; booking total recalculated
- CHECK_OUT → room=CLEANING (visible on Housekeeping page)
- CANCEL (never checked in) → room=AVAILABLE
- CANCEL (was checked in) → room=CLEANING
- Cleaning done (Housekeeping or Room Grid) → room=AVAILABLE

## Automated Jobs
- **runNoShowJob** (hourly): marks PENDING/CONFIRMED bookings past checkIn as NO_SHOW
- **runDueOutJob** (every minute): sets OCCUPIED rooms to DUE_OUT when checkout day arrives and time ≥ checkoutTime-1hr; reverts DUE_OUT→OCCUPIED if booking extended
- Both jobs log to console with [noshow-job] and [dueout-job] prefixes
- checkout_time stored in `settings` table (key="checkout_time", value="HH:MM"), default "12:00"

## Booking totalAmount Recalculation
- On POST /api/bookings: server computes nights × basePrice + services total (client value ignored)
- On PATCH /api/bookings/:id with date changes: auto-recalculates (nights × basePrice + existing services)
- On POST /api/booking-services or DELETE /api/booking-services/:id: auto-recalculates booking total

## Data Guards
- DELETE /api/rooms/:id: checks for active bookings (non-CHECKED_OUT/CANCELLED) before allowing deletion
- DELETE /api/guests/:id: checks for active bookings (non-CHECKED_OUT/CANCELLED) before allowing deletion

## Audit Logging
- Price changes on room categories and services
- Payment deletions
- Logged with action type, description, and target table

## Key Design Decisions
- Server-authoritative pricing: POST /api/bookings calculates totalAmount server-side from room basePrice × nights + selected service prices
- drizzle-zod limitation: createInsertSchema does NOT pick up updated pgEnum values dynamically; always override status field explicitly with `.extend({ status: z.enum([...]) })`
- `staleTime: Infinity` in queryClient defaults
- Do NOT import `@radix-ui/react-collapsible` directly — causes duplicate React instance error; use plain `useState` toggle
- All UI labels in Mongolian

## Running
`npm run dev` starts both Express backend and Vite frontend dev server.

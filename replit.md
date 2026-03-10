# Сувилал ERP (Nursing Home ERP)

## Overview
A nursing home ERP system built with Express + React (Vite) fullstack template. Manages rooms, bookings, guests, treatments, inventory, and billing.

## Tech Stack
- **Frontend**: React + Vite, Tailwind CSS, Shadcn UI, Wouter router, TanStack Query, Recharts
- **Backend**: Express.js, Drizzle ORM, PostgreSQL
- **Language**: TypeScript

## Architecture
- `shared/schema.ts` - Drizzle ORM schema definitions and Zod validation schemas
- `server/` - Express API routes, storage layer (DatabaseStorage), seed data
- `client/src/` - React frontend with pages and components
- Sidebar-based layout using Shadcn Sidebar component

## Database Models
- RoomCategory - Room types (Standard, Deluxe, VIP, Family)
- Room - Individual rooms with status tracking (FK to RoomCategory with cascade delete)
- Guest - Guest registration with unique idNumber, medical history (JSON), VIP flag, family linking via parentId
- Booking - Room reservations
- Service - Services and packages (type: SERVICE|PACKAGE) with name, description, price, isActive
- BookingService - Junction table linking bookings to services (quantity, unitPrice, totalPrice)
- TreatmentPlan - Medical treatment scheduling (serviceId, scheduleTime, status, completedAt, notes)
- Inventory - Medical supply tracking (itemName, stockQuantity, unit, minStockLevel)
- InventoryPurchase - Purchase/restock records (inventoryId, quantity, purchaseDate, note)
- PackageService - Junction table linking packages to their included services (packageId, serviceId)
- ServiceMaterial (BOM) - Materials needed per service (serviceId, inventoryId, quantityNeeded)
- MaterialUsage - Treatment material consumption (treatmentId, inventoryId, quantityUsed, usageDate)
- Transaction - Payment records
- Floor - Managed floor options (name, number) used in room assignment
- AuditLog - System activity log (userId, action, description, targetTable)

## Pages & Routes
- `/` - Dashboard with stat cards (today's revenue, room counts, active bookings) and room status pie chart
- `/room-grid` - Interactive Room Grid Dashboard (color-coded cards, floor tabs, quick booking, check-out)
- `/timeline` - Weekly Occupancy Timeline (7-day calendar with booking bars, room-by-day grid, quick booking from empty cells, booking popovers with guest/family info, category filter)
- `/guests` - Guest list with CRUD, search, family member linking
- `/guests/:id` - Guest detail with medical history viewer, family members, bookings
- `/bookings` - Bookings list with search, status filter, create booking dialog with service selection, treatment plan management per booking
- `/sales` - Sales page showing CHECKED_IN and CHECKED_OUT bookings with revenue summary cards, payment and checkout actions
- `/housekeeping` - Housekeeping page showing rooms needing cleaning (CLEANING status) with "Mark as Clean" action
- `/services` - Services/Packages CRUD (tabs: All/Service/Package). Service creation is separate from Package creation: services have name/price/materials (BOM), packages have name/price and a searchable list of included services from existing SERVICE records. Edit routes to correct dialog by type.
- `/billing` - Family billing overview (aggregated by family groups)
- `/inventory` - Inventory management with CRUD, purchase history, low stock warnings
- `/settings` - Room Categories, Floors, and Rooms CRUD (Tabs layout with DB-managed floors)

## API Endpoints
- `GET/POST/PATCH/DELETE /api/room-categories` - Room category CRUD (audit log on price change)
- `GET/POST/PATCH/DELETE /api/floors` - Floor CRUD (conflict check on duplicate number, dependency check on delete)
- `GET/POST/PATCH/DELETE /api/rooms` - Room CRUD
- `GET/POST/PATCH/DELETE /api/guests` - Guest CRUD (supports ?search= query param for phone/ID/name filtering)
- `GET /api/weekly-timeline?start=YYYY-MM-DD` - Weekly timeline data with rooms, bookings, guests, family members
- `GET /api/guests/:id/family` - Family members
- `GET /api/guests/:id/bookings` - Guest bookings
- `GET /api/guests/:id/family-bookings` - All family bookings
- `GET /api/bookings` - All bookings
- `POST /api/bookings` - Create booking (with overlap check, sets room to PENDING)
- `PATCH /api/bookings/:id/status` - Update booking status (manages room status transitions)
- `GET /api/bookings/:id/transactions` - Booking transactions
- `POST /api/transactions` - Create payment (DEPOSIT auto-confirms booking)
- `DELETE /api/transactions/:id` - Delete payment (with audit log, updates booking depositPaid)
- `GET/POST/PATCH/DELETE /api/services` - Service/Package CRUD (audit log on price change)
- `GET /api/bookings/:id/services` - Services for a booking
- `POST /api/booking-services` - Add service to a booking
- `GET /api/room-grid` - Enriched room data with active bookings and guest info
- `GET /api/family-bill/:parentId` - Family bill with all bookings, transactions, totals
- `GET/POST/PATCH/DELETE /api/inventory` - Inventory CRUD
- `GET/POST /api/inventory/:id/purchases` - Purchase history and restock
- `GET/POST /api/services/:id/materials` - BOM management (bulk replace)
- `GET /api/bookings/:id/treatment-plans` - Treatment plans for a booking
- `POST /api/treatment-plans` - Create treatment plan
- `PATCH /api/treatment-plans/:id/complete` - Complete treatment (auto-deducts inventory via DB transaction)
- `GET /api/audit-logs` - Audit log entries
- `GET /api/dashboard/stats` - Dashboard statistics (room counts, today's revenue, booking counts)

## Treatment BOM & Auto-Deduction
- Each service can have a Bill of Materials (BOM) linking to inventory items with quantities needed
- When a treatment plan is marked complete, inventory is automatically deducted based on BOM
- Uses a DB transaction with atomic status transition (only completes if currently SCHEDULED)
- Material usage records created with completion timestamp

## Booking Flow
- Create booking → PENDING (room=PENDING)
- Pay DEPOSIT → CONFIRMED (room stays PENDING)
- CHECK_IN → room=OCCUPIED
- CHECK_OUT → room=CLEANING (visible on Housekeeping page)
- CANCEL (never checked in) → room=AVAILABLE
- CANCEL (was checked in) → room=CLEANING
- Cleaning done (Housekeeping or Room Grid) → room=AVAILABLE

## Room Status Colors (Room Grid)
- Green: AVAILABLE
- Red: OCCUPIED (Дүүрсэн)
- Yellow: PENDING
- Gray: CLEANING

## Audit Logging
- Price changes on room categories and services
- Payment deletions
- Logged with action type, description, and target table

## Seed Data
- 4 room categories, 9 rooms
- 5 guests (1 family group with parent + 2 children, 2 solo guests)
- 3 bookings (2 CHECKED_IN on rooms 102/302, 1 PENDING on room 402)
- 8 services (5 SERVICE type, 3 PACKAGE type) in Mongolian
- 7 inventory items (massage oil, towels, mud packs, needles, bath salts, disinfectant, disposable blankets)
- BOM links between services and inventory items
- Guests include medical history JSON data

## Key Design Decisions
- Server-authoritative pricing: POST /api/bookings calculates totalAmount server-side from room basePrice × nights + selected service prices (ignores client totalAmount)
- Service type enum: SERVICE | PACKAGE
- Treatment completion uses DB transaction for atomicity (prevents race conditions and partial deductions)
- staleTime: Infinity in queryClient defaults
- All UI labels in Mongolian

## Running
`npm run dev` starts both Express backend and Vite frontend dev server.

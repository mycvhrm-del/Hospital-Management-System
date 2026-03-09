# Сувилал ERP (Nursing Home ERP)

## Overview
A nursing home ERP system built with Express + React (Vite) fullstack template. Manages rooms, bookings, guests, treatments, inventory, and billing.

## Tech Stack
- **Frontend**: React + Vite, Tailwind CSS, Shadcn UI, Wouter router, TanStack Query
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
- TreatmentPlan - Medical treatment scheduling
- Inventory - Medical supply tracking
- MaterialUsage - Treatment material consumption
- Transaction - Payment records
- AuditLog - System activity log

## Pages & Routes
- `/` - Dashboard with stats overview
- `/room-grid` - Interactive Room Grid Dashboard (color-coded cards, floor tabs, quick booking, check-out)
- `/guests` - Guest list with CRUD, search, family member linking
- `/guests/:id` - Guest detail with medical history viewer, family members, bookings
- `/bookings` - Bookings list with search, status filter, create booking dialog with service selection
- `/services` - Services/Packages CRUD (tabs: All/Service/Package) with create/edit/delete
- `/billing` - Family billing overview (aggregated by family groups)
- `/settings` - Room Categories and Rooms CRUD (Tabs layout)

## API Endpoints
- `GET/POST/PATCH/DELETE /api/room-categories` - Room category CRUD
- `GET/POST/PATCH/DELETE /api/rooms` - Room CRUD
- `GET/POST/PATCH/DELETE /api/guests` - Guest CRUD
- `GET /api/guests/:id/family` - Family members
- `GET /api/guests/:id/bookings` - Guest bookings
- `GET /api/guests/:id/family-bookings` - All family bookings
- `GET /api/bookings` - All bookings
- `POST /api/bookings` - Create booking (with overlap check, sets room to PENDING)
- `PATCH /api/bookings/:id/status` - Update booking status (manages room status transitions)
- `GET /api/bookings/:id/transactions` - Booking transactions
- `POST /api/transactions` - Create payment (DEPOSIT auto-confirms booking)
- `GET/POST/PATCH/DELETE /api/services` - Service/Package CRUD
- `GET /api/bookings/:id/services` - Services for a booking
- `POST /api/booking-services` - Add service to a booking
- `POST /api/bookings` - Create booking (accepts optional serviceIds[], server-authoritative pricing)
- `GET /api/room-grid` - Enriched room data with active bookings and guest info
- `GET /api/family-bill/:parentId` - Family bill with all bookings, transactions, totals

## Booking Flow
- Create booking → PENDING (room=PENDING)
- Pay DEPOSIT → CONFIRMED (room stays PENDING)
- CHECK_IN → room=OCCUPIED
- CHECK_OUT → room=CLEANING
- Cleaning done → room=AVAILABLE

## Room Status Colors (Room Grid)
- Green: AVAILABLE
- Red: OCCUPIED (Дүүрсэн)
- Yellow: PENDING
- Gray: CLEANING

## Seed Data
- 4 room categories, 9 rooms
- 5 guests (1 family group with parent + 2 children, 2 solo guests)
- 3 bookings (2 CHECKED_IN on rooms 102/302, 1 PENDING on room 402)
- 8 services (5 SERVICE type, 3 PACKAGE type) in Mongolian
- Guests include medical history JSON data

## Key Design Decisions
- Server-authoritative pricing: POST /api/bookings calculates totalAmount server-side from room basePrice × nights + selected service prices (ignores client totalAmount)
- Service type enum: SERVICE | PACKAGE

## Running
`npm run dev` starts both Express backend and Vite frontend dev server.

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
- TreatmentPlan - Medical treatment scheduling
- Inventory - Medical supply tracking
- MaterialUsage - Treatment material consumption
- Transaction - Payment records
- AuditLog - System activity log

## Pages & Routes
- `/` - Dashboard with stats overview
- `/guests` - Guest list with CRUD, search, family member linking
- `/guests/:id` - Guest detail with medical history viewer, family members, bookings
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
- `GET /api/bookings/:id/transactions` - Booking transactions

## Seed Data
- 4 room categories, 9 rooms
- 5 guests (1 family group with parent + 2 children, 2 solo guests)
- Guests include medical history JSON data

## Running
`npm run dev` starts both Express backend and Vite frontend dev server.

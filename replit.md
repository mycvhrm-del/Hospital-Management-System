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
- Room - Individual rooms with status tracking
- Guest - Guest registration with medical history
- Booking - Room reservations
- TreatmentPlan - Medical treatment scheduling
- Inventory - Medical supply tracking
- MaterialUsage - Treatment material consumption
- Transaction - Payment records
- AuditLog - System activity log

## Current Features
- Admin Dashboard with stats
- Settings page with Room Categories and Rooms CRUD (Tabs layout)
- Sidebar navigation (Mongolian language)
- Seed data for initial categories and rooms

## Running
`npm run dev` starts both Express backend and Vite frontend dev server.

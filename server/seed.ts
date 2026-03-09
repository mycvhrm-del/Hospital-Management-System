import { drizzle } from "drizzle-orm/node-postgres";
import { roomCategories, rooms } from "@shared/schema";
import { sql } from "drizzle-orm";

const db = drizzle(process.env.DATABASE_URL!);

export async function seedDatabase() {
  const existing = await db.select().from(roomCategories);
  if (existing.length > 0) return;

  const [standard, deluxe, vip, family] = await db
    .insert(roomCategories)
    .values([
      { name: "Standard", basePrice: "80000", capacity: 1 },
      { name: "Deluxe", basePrice: "150000", capacity: 2 },
      { name: "VIP", basePrice: "250000", capacity: 2 },
      { name: "Family", basePrice: "200000", capacity: 4 },
    ])
    .returning();

  await db.insert(rooms).values([
    { roomNumber: "101", categoryId: standard.id, status: "AVAILABLE" as const },
    { roomNumber: "102", categoryId: standard.id, status: "OCCUPIED" as const },
    { roomNumber: "103", categoryId: standard.id, status: "AVAILABLE" as const },
    { roomNumber: "201", categoryId: deluxe.id, status: "AVAILABLE" as const },
    { roomNumber: "202", categoryId: deluxe.id, status: "CLEANING" as const },
    { roomNumber: "301", categoryId: vip.id, status: "AVAILABLE" as const },
    { roomNumber: "302", categoryId: vip.id, status: "OCCUPIED" as const },
    { roomNumber: "401", categoryId: family.id, status: "AVAILABLE" as const },
    { roomNumber: "402", categoryId: family.id, status: "PENDING" as const },
  ]);

  console.log("Database seeded successfully");
}

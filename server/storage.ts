import { eq, inArray, and, or, ne, lt, gt, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import {
  roomCategories, floors, rooms, guests, bookings, transactions, services, packageServices, bookingServices,
  inventory, inventoryPurchases, serviceMaterials, treatmentPlans, materialUsages, auditLogs,
  type RoomCategory, type InsertRoomCategory,
  type Floor, type InsertFloor,
  type Room, type InsertRoom,
  type Guest, type InsertGuest,
  type Booking,
  type Transaction,
  type Service, type InsertService,
  type BookingService, type InsertBookingService,
  type Inventory, type InsertInventory,
  type InventoryPurchase, type InsertInventoryPurchase,
  type ServiceMaterial, type InsertServiceMaterial,
  type TreatmentPlan, type InsertTreatmentPlan,
  type MaterialUsage,
  type PackageService,
  type AuditLog, type InsertAuditLog,
} from "@shared/schema";

const db = drizzle(process.env.DATABASE_URL!);

export interface IStorage {
  getRoomCategories(): Promise<RoomCategory[]>;
  getRoomCategory(id: string): Promise<RoomCategory | undefined>;
  createRoomCategory(data: InsertRoomCategory): Promise<RoomCategory>;
  updateRoomCategory(id: string, data: Partial<InsertRoomCategory>): Promise<RoomCategory | undefined>;
  deleteRoomCategory(id: string): Promise<boolean>;

  getFloors(): Promise<Floor[]>;
  getFloor(id: string): Promise<Floor | undefined>;
  createFloor(data: InsertFloor): Promise<Floor>;
  updateFloor(id: string, data: Partial<InsertFloor>): Promise<Floor | undefined>;
  deleteFloor(id: string): Promise<boolean>;

  getRooms(): Promise<Room[]>;
  getRoom(id: string): Promise<Room | undefined>;
  createRoom(data: InsertRoom): Promise<Room>;
  updateRoom(id: string, data: Partial<InsertRoom>): Promise<Room | undefined>;
  deleteRoom(id: string): Promise<boolean>;

  getGuests(): Promise<Guest[]>;
  getGuest(id: string): Promise<Guest | undefined>;
  createGuest(data: InsertGuest): Promise<Guest>;
  updateGuest(id: string, data: Partial<InsertGuest>): Promise<Guest | undefined>;
  deleteGuest(id: string): Promise<boolean>;
  getFamilyMembers(parentId: string): Promise<Guest[]>;
  getGuestBookings(guestId: string): Promise<Booking[]>;
  getFamilyBookings(parentId: string): Promise<Booking[]>;
  getAllBookings(): Promise<Booking[]>;
  getBookingTransactions(bookingId: string): Promise<Transaction[]>;
  getActiveBookingForRoom(roomId: string): Promise<Booking | undefined>;
  checkBookingOverlap(roomId: string, checkIn: Date, checkOut: Date, excludeBookingId?: string): Promise<Booking | undefined>;
  createBooking(data: any): Promise<Booking>;
  updateBooking(id: string, data: Partial<any>): Promise<Booking | undefined>;
  updateBookingStatus(id: string, status: string): Promise<Booking | undefined>;
  createTransaction(data: any): Promise<Transaction>;
  getTransactionsByBookingIds(bookingIds: string[]): Promise<Transaction[]>;

  getServices(): Promise<Service[]>;
  getService(id: string): Promise<Service | undefined>;
  createService(data: InsertService): Promise<Service>;
  updateService(id: string, data: Partial<InsertService>): Promise<Service | undefined>;
  deleteService(id: string): Promise<boolean>;

  getBookingServices(bookingId: string): Promise<BookingService[]>;
  addBookingService(data: InsertBookingService): Promise<BookingService>;
  deleteBookingService(id: string): Promise<boolean>;

  getInventoryItems(): Promise<Inventory[]>;
  getInventoryItem(id: string): Promise<Inventory | undefined>;
  createInventoryItem(data: InsertInventory): Promise<Inventory>;
  updateInventoryItem(id: string, data: Partial<InsertInventory>): Promise<Inventory | undefined>;
  deleteInventoryItem(id: string): Promise<boolean>;

  getInventoryPurchases(inventoryId: string): Promise<InventoryPurchase[]>;
  createInventoryPurchase(data: InsertInventoryPurchase): Promise<InventoryPurchase>;

  getServiceMaterials(serviceId: string): Promise<ServiceMaterial[]>;
  setServiceMaterials(serviceId: string, materials: { inventoryId: string; quantityNeeded: string }[]): Promise<ServiceMaterial[]>;

  getPackageServices(packageId: string): Promise<PackageService[]>;
  setPackageServices(packageId: string, serviceIds: string[]): Promise<PackageService[]>;

  getTreatmentPlans(bookingId: string): Promise<TreatmentPlan[]>;
  createTreatmentPlan(data: InsertTreatmentPlan): Promise<TreatmentPlan>;
  completeTreatmentPlan(id: string, completedAt: Date): Promise<TreatmentPlan | undefined>;

  createAuditLog(data: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(): Promise<AuditLog[]>;

  getTransaction(id: string): Promise<Transaction | undefined>;
  deleteTransaction(id: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getRoomCategories(): Promise<RoomCategory[]> {
    return db.select().from(roomCategories);
  }

  async getRoomCategory(id: string): Promise<RoomCategory | undefined> {
    const [category] = await db.select().from(roomCategories).where(eq(roomCategories.id, id));
    return category;
  }

  async createRoomCategory(data: InsertRoomCategory): Promise<RoomCategory> {
    const [category] = await db.insert(roomCategories).values(data).returning();
    return category;
  }

  async updateRoomCategory(id: string, data: Partial<InsertRoomCategory>): Promise<RoomCategory | undefined> {
    const [category] = await db.update(roomCategories).set(data).where(eq(roomCategories.id, id)).returning();
    return category;
  }

  async deleteRoomCategory(id: string): Promise<boolean> {
    const result = await db.delete(roomCategories).where(eq(roomCategories.id, id)).returning();
    return result.length > 0;
  }

  async getFloors(): Promise<Floor[]> {
    return db.select().from(floors).orderBy(floors.number);
  }

  async getFloor(id: string): Promise<Floor | undefined> {
    const result = await db.select().from(floors).where(eq(floors.id, id));
    return result[0];
  }

  async createFloor(data: InsertFloor): Promise<Floor> {
    const result = await db.insert(floors).values(data).returning();
    return result[0];
  }

  async updateFloor(id: string, data: Partial<InsertFloor>): Promise<Floor | undefined> {
    const result = await db.update(floors).set(data).where(eq(floors.id, id)).returning();
    return result[0];
  }

  async deleteFloor(id: string): Promise<boolean> {
    const result = await db.delete(floors).where(eq(floors.id, id)).returning();
    return result.length > 0;
  }

  async getRooms(): Promise<Room[]> {
    return db.select().from(rooms);
  }

  async getRoom(id: string): Promise<Room | undefined> {
    const [room] = await db.select().from(rooms).where(eq(rooms.id, id));
    return room;
  }

  async createRoom(data: InsertRoom): Promise<Room> {
    const [room] = await db.insert(rooms).values(data).returning();
    return room;
  }

  async updateRoom(id: string, data: Partial<InsertRoom>): Promise<Room | undefined> {
    const [room] = await db.update(rooms).set(data).where(eq(rooms.id, id)).returning();
    return room;
  }

  async deleteRoom(id: string): Promise<boolean> {
    const result = await db.delete(rooms).where(eq(rooms.id, id)).returning();
    return result.length > 0;
  }

  async getGuests(): Promise<Guest[]> {
    return db.select().from(guests);
  }

  async getGuest(id: string): Promise<Guest | undefined> {
    const [guest] = await db.select().from(guests).where(eq(guests.id, id));
    return guest;
  }

  async createGuest(data: InsertGuest): Promise<Guest> {
    const [guest] = await db.insert(guests).values(data).returning();
    return guest;
  }

  async updateGuest(id: string, data: Partial<InsertGuest>): Promise<Guest | undefined> {
    const [guest] = await db.update(guests).set(data).where(eq(guests.id, id)).returning();
    return guest;
  }

  async deleteGuest(id: string): Promise<boolean> {
    const result = await db.delete(guests).where(eq(guests.id, id)).returning();
    return result.length > 0;
  }

  async getFamilyMembers(parentId: string): Promise<Guest[]> {
    return db.select().from(guests).where(eq(guests.parentId, parentId));
  }

  async getGuestBookings(guestId: string): Promise<Booking[]> {
    return db.select().from(bookings).where(eq(bookings.guestId, guestId));
  }

  async getFamilyBookings(parentId: string): Promise<Booking[]> {
    const familyMembers = await this.getFamilyMembers(parentId);
    const familyIds = [parentId, ...familyMembers.map(m => m.id)];
    return db.select().from(bookings).where(inArray(bookings.guestId, familyIds));
  }

  async getAllBookings(): Promise<Booking[]> {
    return db.select().from(bookings);
  }

  async getBookingTransactions(bookingId: string): Promise<Transaction[]> {
    return db.select().from(transactions).where(eq(transactions.bookingId, bookingId));
  }

  async getActiveBookingForRoom(roomId: string): Promise<Booking | undefined> {
    const [booking] = await db.select().from(bookings).where(
      and(
        eq(bookings.roomId, roomId),
        or(
          eq(bookings.status, "CONFIRMED"),
          eq(bookings.status, "CHECKED_IN"),
          eq(bookings.status, "PENDING")
        )
      )
    );
    return booking;
  }

  async checkBookingOverlap(roomId: string, checkIn: Date, checkOut: Date, excludeBookingId?: string): Promise<Booking | undefined> {
    const conditions = [
      eq(bookings.roomId, roomId),
      lt(bookings.checkIn, checkOut),
      gt(bookings.checkOut, checkIn),
      or(
        eq(bookings.status, "PENDING"),
        eq(bookings.status, "CONFIRMED"),
        eq(bookings.status, "CHECKED_IN")
      ),
    ];
    if (excludeBookingId) {
      conditions.push(ne(bookings.id, excludeBookingId));
    }
    const [overlap] = await db.select().from(bookings).where(and(...conditions));
    return overlap;
  }

  async createBooking(data: any): Promise<Booking> {
    const [booking] = await db.insert(bookings).values(data).returning();
    return booking;
  }

  async updateBooking(id: string, data: Partial<any>): Promise<Booking | undefined> {
    const [booking] = await db.update(bookings).set(data).where(eq(bookings.id, id)).returning();
    return booking;
  }

  async updateBookingStatus(id: string, status: string): Promise<Booking | undefined> {
    const [booking] = await db.update(bookings).set({ status: status as any }).where(eq(bookings.id, id)).returning();
    return booking;
  }

  async createTransaction(data: any): Promise<Transaction> {
    const [txn] = await db.insert(transactions).values(data).returning();
    return txn;
  }

  async getTransactionsByBookingIds(bookingIds: string[]): Promise<Transaction[]> {
    if (bookingIds.length === 0) return [];
    return db.select().from(transactions).where(inArray(transactions.bookingId, bookingIds));
  }

  async getServices(): Promise<Service[]> {
    return db.select().from(services);
  }

  async getService(id: string): Promise<Service | undefined> {
    const [service] = await db.select().from(services).where(eq(services.id, id));
    return service;
  }

  async createService(data: InsertService): Promise<Service> {
    const [service] = await db.insert(services).values(data).returning();
    return service;
  }

  async updateService(id: string, data: Partial<InsertService>): Promise<Service | undefined> {
    const [service] = await db.update(services).set(data).where(eq(services.id, id)).returning();
    return service;
  }

  async deleteService(id: string): Promise<boolean> {
    const result = await db.delete(services).where(eq(services.id, id)).returning();
    return result.length > 0;
  }

  async getBookingServices(bookingId: string): Promise<BookingService[]> {
    return db.select().from(bookingServices).where(eq(bookingServices.bookingId, bookingId));
  }

  async addBookingService(data: InsertBookingService): Promise<BookingService> {
    const [bs] = await db.insert(bookingServices).values(data).returning();
    return bs;
  }

  async deleteBookingService(id: string): Promise<boolean> {
    const result = await db.delete(bookingServices).where(eq(bookingServices.id, id)).returning();
    return result.length > 0;
  }

  async getInventoryItems(): Promise<Inventory[]> {
    return db.select().from(inventory);
  }

  async getInventoryItem(id: string): Promise<Inventory | undefined> {
    const [item] = await db.select().from(inventory).where(eq(inventory.id, id));
    return item;
  }

  async createInventoryItem(data: InsertInventory): Promise<Inventory> {
    const [item] = await db.insert(inventory).values(data).returning();
    return item;
  }

  async updateInventoryItem(id: string, data: Partial<InsertInventory>): Promise<Inventory | undefined> {
    const [item] = await db.update(inventory).set(data).where(eq(inventory.id, id)).returning();
    return item;
  }

  async deleteInventoryItem(id: string): Promise<boolean> {
    const result = await db.delete(inventory).where(eq(inventory.id, id)).returning();
    return result.length > 0;
  }

  async getInventoryPurchases(inventoryId: string): Promise<InventoryPurchase[]> {
    return db.select().from(inventoryPurchases).where(eq(inventoryPurchases.inventoryId, inventoryId));
  }

  async createInventoryPurchase(data: InsertInventoryPurchase): Promise<InventoryPurchase> {
    const [purchase] = await db.insert(inventoryPurchases).values(data).returning();
    const item = await this.getInventoryItem(data.inventoryId);
    if (item) {
      const newStock = Number(item.stockQuantity) + Number(data.quantity);
      await this.updateInventoryItem(data.inventoryId, { stockQuantity: String(newStock) });
    }
    return purchase;
  }

  async getServiceMaterials(serviceId: string): Promise<ServiceMaterial[]> {
    return db.select().from(serviceMaterials).where(eq(serviceMaterials.serviceId, serviceId));
  }

  async setServiceMaterials(serviceId: string, materials: { inventoryId: string; quantityNeeded: string }[]): Promise<ServiceMaterial[]> {
    await db.delete(serviceMaterials).where(eq(serviceMaterials.serviceId, serviceId));
    if (materials.length === 0) return [];
    const rows = materials.map(m => ({ serviceId, inventoryId: m.inventoryId, quantityNeeded: m.quantityNeeded }));
    return db.insert(serviceMaterials).values(rows).returning();
  }

  async getPackageServices(packageId: string): Promise<PackageService[]> {
    return db.select().from(packageServices).where(eq(packageServices.packageId, packageId));
  }

  async setPackageServices(packageId: string, serviceIds: string[]): Promise<PackageService[]> {
    await db.delete(packageServices).where(eq(packageServices.packageId, packageId));
    if (serviceIds.length === 0) return [];
    const rows = serviceIds.map(sid => ({ packageId, serviceId: sid }));
    return db.insert(packageServices).values(rows).returning();
  }

  async getTreatmentPlans(bookingId: string): Promise<TreatmentPlan[]> {
    return db.select().from(treatmentPlans).where(eq(treatmentPlans.bookingId, bookingId));
  }

  async createTreatmentPlan(data: InsertTreatmentPlan): Promise<TreatmentPlan> {
    const [plan] = await db.insert(treatmentPlans).values(data).returning();
    return plan;
  }

  async completeTreatmentPlan(id: string, completedAt: Date): Promise<TreatmentPlan | undefined> {
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL! });
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const txDb = drizzle(client);

      const [plan] = await txDb.update(treatmentPlans)
        .set({ status: "COMPLETED", completedAt })
        .where(and(eq(treatmentPlans.id, id), ne(treatmentPlans.status, "COMPLETED")))
        .returning();

      if (!plan) {
        await client.query("ROLLBACK");
        const [existing] = await db.select().from(treatmentPlans).where(eq(treatmentPlans.id, id));
        return existing;
      }

      if (plan.serviceId) {
        const bom = await txDb.select().from(serviceMaterials)
          .where(eq(serviceMaterials.serviceId, plan.serviceId));

        for (const mat of bom) {
          await txDb.update(inventory)
            .set({
              stockQuantity: sql`GREATEST(0, ${inventory.stockQuantity} - ${Number(mat.quantityNeeded)})`,
            })
            .where(eq(inventory.id, mat.inventoryId));

          await txDb.insert(materialUsages).values({
            treatmentId: id,
            inventoryId: mat.inventoryId,
            quantityUsed: mat.quantityNeeded,
            usageDate: completedAt,
          });
        }
      }

      await client.query("COMMIT");
      return plan;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
      await pool.end();
    }
  }

  async createAuditLog(data: InsertAuditLog): Promise<AuditLog> {
    const [log] = await db.insert(auditLogs).values(data).returning();
    return log;
  }

  async getAuditLogs(): Promise<AuditLog[]> {
    return db.select().from(auditLogs);
  }

  async getTransaction(id: string): Promise<Transaction | undefined> {
    const [txn] = await db.select().from(transactions).where(eq(transactions.id, id));
    return txn;
  }

  async deleteTransaction(id: string): Promise<boolean> {
    const result = await db.delete(transactions).where(eq(transactions.id, id)).returning();
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();

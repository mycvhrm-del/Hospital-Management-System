import { eq, inArray, and, or, ne, lt, gt, gte, lte, sql, ilike, count, desc, isNull, asc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import {
  roomCategories, floors, rooms, guests, bookings, transactions, services, packageServices, bookingServices,
  inventory, inventoryPurchases, serviceMaterials, treatmentPlans, materialUsages, auditLogs, staff, settings,
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
  type Staff, type InsertStaff,
  type Setting,
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
  deleteRoom(id: string, deletedBy?: string): Promise<boolean>;
  restoreRoom(id: string): Promise<boolean>;

  getGuests(): Promise<Guest[]>;
  getGuest(id: string): Promise<Guest | undefined>;
  createGuest(data: InsertGuest): Promise<Guest>;
  updateGuest(id: string, data: Partial<InsertGuest>): Promise<Guest | undefined>;
  deleteGuest(id: string, deletedBy?: string): Promise<boolean>;
  restoreGuest(id: string): Promise<boolean>;
  getFamilyMembers(parentId: string): Promise<Guest[]>;
  getBooking(id: string): Promise<Booking | undefined>;
  getGuestBookings(guestId: string): Promise<Booking[]>;
  getFamilyBookings(parentId: string): Promise<Booking[]>;
  getAllBookings(): Promise<Booking[]>;
  getBookingTransactions(bookingId: string): Promise<Transaction[]>;
  getActiveBookingForRoom(roomId: string): Promise<Booking | undefined>;
  checkBookingOverlap(roomId: string, checkIn: Date, checkOut: Date, excludeBookingId?: string): Promise<Booking | undefined>;
  createBooking(data: any): Promise<Booking>;
  updateBooking(id: string, data: Partial<any>): Promise<Booking | undefined>;
  updateBookingStatus(id: string, status: string): Promise<Booking | undefined>;
  deleteBooking(id: string, deletedBy?: string): Promise<boolean>;
  restoreBooking(id: string): Promise<boolean>;
  createTransaction(data: any): Promise<Transaction>;
  getTransactionsByBookingIds(bookingIds: string[]): Promise<Transaction[]>;

  getServices(): Promise<Service[]>;
  getService(id: string): Promise<Service | undefined>;
  createService(data: InsertService): Promise<Service>;
  updateService(id: string, data: Partial<InsertService>): Promise<Service | undefined>;
  deleteService(id: string, deletedBy?: string): Promise<boolean>;
  restoreService(id: string): Promise<boolean>;

  getBookingServices(bookingId: string): Promise<BookingService[]>;
  getBookingServiceById(id: string): Promise<BookingService | undefined>;
  addBookingService(data: InsertBookingService): Promise<BookingService>;
  deleteBookingService(id: string): Promise<boolean>;

  getInventoryItems(): Promise<Inventory[]>;
  getInventoryItem(id: string): Promise<Inventory | undefined>;
  createInventoryItem(data: InsertInventory): Promise<Inventory>;
  updateInventoryItem(id: string, data: Partial<InsertInventory>): Promise<Inventory | undefined>;
  deleteInventoryItem(id: string, deletedBy?: string): Promise<boolean>;
  restoreInventoryItem(id: string): Promise<boolean>;

  getInventoryPurchases(inventoryId: string): Promise<InventoryPurchase[]>;
  createInventoryPurchase(data: InsertInventoryPurchase): Promise<InventoryPurchase>;

  getServiceMaterials(serviceId: string): Promise<ServiceMaterial[]>;
  setServiceMaterials(serviceId: string, materials: { inventoryId: string; quantityNeeded: string }[]): Promise<ServiceMaterial[]>;

  getPackageServices(packageId: string): Promise<PackageService[]>;
  setPackageServices(packageId: string, serviceIds: string[]): Promise<PackageService[]>;

  getTreatmentPlans(bookingId: string): Promise<TreatmentPlan[]>;
  getAllTreatmentPlans(): Promise<TreatmentPlan[]>;
  createTreatmentPlan(data: InsertTreatmentPlan): Promise<TreatmentPlan>;
  completeTreatmentPlan(id: string, completedAt: Date): Promise<TreatmentPlan | undefined>;
  deleteTreatmentPlan(id: string, deletedBy?: string): Promise<boolean>;

  getStaffMembers(): Promise<Staff[]>;
  getStaffMember(id: string): Promise<Staff | undefined>;
  createStaffMember(data: InsertStaff): Promise<Staff>;
  updateStaffMember(id: string, data: Partial<InsertStaff>): Promise<Staff | undefined>;
  deleteStaffMember(id: string, deletedBy?: string): Promise<boolean>;
  restoreStaffMember(id: string): Promise<boolean>;

  createAuditLog(data: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(): Promise<AuditLog[]>;

  getTransaction(id: string): Promise<Transaction | undefined>;
  deleteTransaction(id: string): Promise<boolean>;
  getNoShowCandidates(): Promise<Booking[]>;
  getDueOutCandidates(checkoutHour: number, checkoutMinute: number): Promise<Booking[]>;
  getExpiredDueOutRooms(): Promise<Room[]>;

  getSetting(key: string): Promise<Setting | undefined>;
  getAllSettings(): Promise<Setting[]>;
  upsertSetting(key: string, value: string): Promise<Setting>;

  getActiveBookingsForAllRooms(): Promise<Record<string, Booking>>;
  getDashboardStats(): Promise<{
    rooms: {
      total: number; available: number; occupied: number; pending: number;
      cleaning: number; cleaningInProgress: number; inspected: number;
      outOfOrder: number; outOfService: number; dueOut: number;
    };
    todayRevenue: number;
    totalBookings: number;
    activeBookings: number;
  }>;
  getBookingsByDateRange(start: Date, end: Date): Promise<Booking[]>;
  getTreatmentPlansByDate(date: Date): Promise<TreatmentPlan[]>;
  getActiveStayBookings(includeRecentCheckouts?: boolean): Promise<Booking[]>;
  getBookingsPaginated(page: number, limit: number, status?: string, guestIds?: string[], roomIds?: string[], notStatuses?: string[]): Promise<{ data: Booking[]; total: number; totalPages: number }>;
  getGuestsPaginated(page: number, limit: number, search?: string): Promise<{ data: Guest[]; total: number; totalPages: number }>;
  searchGuests(query: string, limit?: number): Promise<Guest[]>;
  searchRooms(query: string): Promise<Room[]>;
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
    return db.select().from(rooms).where(isNull(rooms.deletedAt));
  }

  async getRoom(id: string): Promise<Room | undefined> {
    const [room] = await db.select().from(rooms).where(and(eq(rooms.id, id), isNull(rooms.deletedAt)));
    return room;
  }

  async createRoom(data: InsertRoom): Promise<Room> {
    const [room] = await db.insert(rooms).values(data).returning();
    return room;
  }

  async updateRoom(id: string, data: Partial<InsertRoom>): Promise<Room | undefined> {
    const [room] = await db.update(rooms).set(data).where(and(eq(rooms.id, id), isNull(rooms.deletedAt))).returning();
    return room;
  }

  async deleteRoom(id: string, deletedBy = "system"): Promise<boolean> {
    const result = await db.update(rooms)
      .set({ deletedAt: new Date(), deletedBy })
      .where(and(eq(rooms.id, id), isNull(rooms.deletedAt)))
      .returning();
    return result.length > 0;
  }

  async restoreRoom(id: string): Promise<boolean> {
    const result = await db.update(rooms)
      .set({ deletedAt: null, deletedBy: null })
      .where(eq(rooms.id, id))
      .returning();
    return result.length > 0;
  }

  async getGuests(): Promise<Guest[]> {
    return db.select().from(guests).where(isNull(guests.deletedAt));
  }

  async getGuest(id: string): Promise<Guest | undefined> {
    const [guest] = await db.select().from(guests).where(and(eq(guests.id, id), isNull(guests.deletedAt)));
    return guest;
  }

  async createGuest(data: InsertGuest): Promise<Guest> {
    const [guest] = await db.insert(guests).values(data).returning();
    return guest;
  }

  async updateGuest(id: string, data: Partial<InsertGuest>): Promise<Guest | undefined> {
    const [guest] = await db.update(guests).set(data).where(and(eq(guests.id, id), isNull(guests.deletedAt))).returning();
    return guest;
  }

  async deleteGuest(id: string, deletedBy = "system"): Promise<boolean> {
    const result = await db.update(guests)
      .set({ deletedAt: new Date(), deletedBy })
      .where(and(eq(guests.id, id), isNull(guests.deletedAt)))
      .returning();
    return result.length > 0;
  }

  async restoreGuest(id: string): Promise<boolean> {
    const result = await db.update(guests)
      .set({ deletedAt: null, deletedBy: null })
      .where(eq(guests.id, id))
      .returning();
    return result.length > 0;
  }

  async getFamilyMembers(parentId: string): Promise<Guest[]> {
    return db.select().from(guests).where(and(eq(guests.parentId, parentId), isNull(guests.deletedAt)));
  }

  async getBooking(id: string): Promise<Booking | undefined> {
    const [booking] = await db.select().from(bookings).where(and(eq(bookings.id, id), isNull(bookings.deletedAt)));
    return booking;
  }

  async getGuestBookings(guestId: string): Promise<Booking[]> {
    return db.select().from(bookings).where(and(eq(bookings.guestId, guestId), isNull(bookings.deletedAt)));
  }

  async getFamilyBookings(parentId: string): Promise<Booking[]> {
    const familyMembers = await this.getFamilyMembers(parentId);
    const familyIds = [parentId, ...familyMembers.map(m => m.id)];
    return db.select().from(bookings).where(and(inArray(bookings.guestId, familyIds), isNull(bookings.deletedAt)));
  }

  async getAllBookings(): Promise<Booking[]> {
    return db.select().from(bookings).where(isNull(bookings.deletedAt));
  }

  async getBookingTransactions(bookingId: string): Promise<Transaction[]> {
    return db.select().from(transactions).where(eq(transactions.bookingId, bookingId));
  }

  async getActiveBookingForRoom(roomId: string): Promise<Booking | undefined> {
    const [booking] = await db.select().from(bookings).where(
      and(
        eq(bookings.roomId, roomId),
        isNull(bookings.deletedAt),
        or(
          eq(bookings.status, "CONFIRMED"),
          eq(bookings.status, "CHECKED_IN"),
          eq(bookings.status, "EXTENDED"),
          eq(bookings.status, "PENDING"),
          eq(bookings.status, "NO_SHOW")
        )
      )
    );
    return booking;
  }

  async checkBookingOverlap(roomId: string, checkIn: Date, checkOut: Date, excludeBookingId?: string): Promise<Booking | undefined> {
    const conditions: any[] = [
      eq(bookings.roomId, roomId),
      isNull(bookings.deletedAt),
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
    const [booking] = await db.update(bookings).set(data).where(and(eq(bookings.id, id), isNull(bookings.deletedAt))).returning();
    return booking;
  }

  async updateBookingStatus(id: string, status: string): Promise<Booking | undefined> {
    const [booking] = await db.update(bookings)
      .set({ status: status as any })
      .where(and(eq(bookings.id, id), isNull(bookings.deletedAt)))
      .returning();
    return booking;
  }

  async deleteBooking(id: string, deletedBy = "system"): Promise<boolean> {
    const now = new Date();
    await db.update(treatmentPlans)
      .set({ deletedAt: now, deletedBy })
      .where(and(eq(treatmentPlans.bookingId, id), isNull(treatmentPlans.deletedAt)));
    const result = await db.update(bookings)
      .set({ deletedAt: now, deletedBy })
      .where(and(eq(bookings.id, id), isNull(bookings.deletedAt)))
      .returning();
    return result.length > 0;
  }

  async restoreBooking(id: string): Promise<boolean> {
    const result = await db.update(bookings)
      .set({ deletedAt: null, deletedBy: null })
      .where(eq(bookings.id, id))
      .returning();
    return result.length > 0;
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
    return db.select().from(services).where(isNull(services.deletedAt));
  }

  async getService(id: string): Promise<Service | undefined> {
    const [service] = await db.select().from(services).where(and(eq(services.id, id), isNull(services.deletedAt)));
    return service;
  }

  async createService(data: InsertService): Promise<Service> {
    const [service] = await db.insert(services).values(data).returning();
    return service;
  }

  async updateService(id: string, data: Partial<InsertService>): Promise<Service | undefined> {
    const [service] = await db.update(services).set(data).where(and(eq(services.id, id), isNull(services.deletedAt))).returning();
    return service;
  }

  async deleteService(id: string, deletedBy = "system"): Promise<boolean> {
    const result = await db.update(services)
      .set({ deletedAt: new Date(), deletedBy })
      .where(and(eq(services.id, id), isNull(services.deletedAt)))
      .returning();
    return result.length > 0;
  }

  async restoreService(id: string): Promise<boolean> {
    const result = await db.update(services)
      .set({ deletedAt: null, deletedBy: null })
      .where(eq(services.id, id))
      .returning();
    return result.length > 0;
  }

  async getBookingServices(bookingId: string): Promise<BookingService[]> {
    return db.select().from(bookingServices).where(eq(bookingServices.bookingId, bookingId));
  }

  async getBookingServiceById(id: string): Promise<BookingService | undefined> {
    const [bs] = await db.select().from(bookingServices).where(eq(bookingServices.id, id));
    return bs;
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
    return db.select().from(inventory).where(isNull(inventory.deletedAt));
  }

  async getInventoryItem(id: string): Promise<Inventory | undefined> {
    const [item] = await db.select().from(inventory).where(and(eq(inventory.id, id), isNull(inventory.deletedAt)));
    return item;
  }

  async createInventoryItem(data: InsertInventory): Promise<Inventory> {
    const [item] = await db.insert(inventory).values(data).returning();
    return item;
  }

  async updateInventoryItem(id: string, data: Partial<InsertInventory>): Promise<Inventory | undefined> {
    const [item] = await db.update(inventory).set(data).where(and(eq(inventory.id, id), isNull(inventory.deletedAt))).returning();
    return item;
  }

  async deleteInventoryItem(id: string, deletedBy = "system"): Promise<boolean> {
    const result = await db.update(inventory)
      .set({ deletedAt: new Date(), deletedBy })
      .where(and(eq(inventory.id, id), isNull(inventory.deletedAt)))
      .returning();
    return result.length > 0;
  }

  async restoreInventoryItem(id: string): Promise<boolean> {
    const result = await db.update(inventory)
      .set({ deletedAt: null, deletedBy: null })
      .where(eq(inventory.id, id))
      .returning();
    return result.length > 0;
  }

  async getInventoryPurchases(inventoryId: string): Promise<InventoryPurchase[]> {
    return db.select().from(inventoryPurchases).where(eq(inventoryPurchases.inventoryId, inventoryId));
  }

  async createInventoryPurchase(data: InsertInventoryPurchase): Promise<InventoryPurchase> {
    const [purchase] = await db.insert(inventoryPurchases).values({
      ...data,
      remainingQuantity: data.quantity,
    }).returning();
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
    return db.select().from(treatmentPlans).where(and(eq(treatmentPlans.bookingId, bookingId), isNull(treatmentPlans.deletedAt)));
  }

  async createTreatmentPlan(data: InsertTreatmentPlan): Promise<TreatmentPlan> {
    const [plan] = await db.insert(treatmentPlans).values(data).returning();
    return plan;
  }

  async completeTreatmentPlan(id: string, completedAt: Date): Promise<TreatmentPlan | undefined> {
    return await db.transaction(async (tx) => {
      const [plan] = await tx.update(treatmentPlans)
        .set({ status: "COMPLETED", completedAt })
        .where(and(eq(treatmentPlans.id, id), ne(treatmentPlans.status, "COMPLETED"), isNull(treatmentPlans.deletedAt)))
        .returning();

      if (!plan) {
        const [existing] = await tx.select().from(treatmentPlans).where(eq(treatmentPlans.id, id));
        return existing;
      }

      if (plan.serviceId) {
        const bom = await tx.select().from(serviceMaterials)
          .where(eq(serviceMaterials.serviceId, plan.serviceId));

        for (const mat of bom) {
          const [invItem] = await tx.select().from(inventory).where(eq(inventory.id, mat.inventoryId));
          if (invItem && Number(invItem.stockQuantity) < Number(mat.quantityNeeded)) {
            throw new Error(`Нөөц хүрэлцэхгүй байна: ${invItem.itemName} (байгаа: ${invItem.stockQuantity}, шаардлагатай: ${mat.quantityNeeded})`);
          }

          // FIFO: oldest batches first
          const batches = await tx.select().from(inventoryPurchases)
            .where(and(
              eq(inventoryPurchases.inventoryId, mat.inventoryId),
              gt(inventoryPurchases.remainingQuantity, "0")
            ))
            .orderBy(asc(inventoryPurchases.purchaseDate));

          let needed = Number(mat.quantityNeeded);
          let totalCost = 0;
          for (const batch of batches) {
            if (needed <= 0) break;
            const avail = Number(batch.remainingQuantity);
            const price = Number(batch.purchasePrice ?? 0);
            const take = Math.min(needed, avail);
            totalCost += take * price;
            needed -= take;
            await tx.update(inventoryPurchases)
              .set({ remainingQuantity: String(avail - take) })
              .where(eq(inventoryPurchases.id, batch.id));
          }

          const qty = Number(mat.quantityNeeded);
          const unitCost = qty > 0 ? totalCost / qty : 0;

          await tx.update(inventory)
            .set({ stockQuantity: sql`${inventory.stockQuantity} - ${qty}` })
            .where(eq(inventory.id, mat.inventoryId));

          await tx.insert(materialUsages).values({
            treatmentId: id,
            inventoryId: mat.inventoryId,
            quantityUsed: mat.quantityNeeded,
            unitCost: unitCost > 0 ? String(unitCost) : null,
            totalCost: totalCost > 0 ? String(totalCost) : null,
            usageDate: completedAt,
          });
        }
      }

      return plan;
    });
  }

  async getAllTreatmentPlans(): Promise<TreatmentPlan[]> {
    return db.select().from(treatmentPlans).where(isNull(treatmentPlans.deletedAt));
  }

  async deleteTreatmentPlan(id: string, deletedBy = "system"): Promise<boolean> {
    const result = await db.update(treatmentPlans)
      .set({ deletedAt: new Date(), deletedBy })
      .where(and(eq(treatmentPlans.id, id), isNull(treatmentPlans.deletedAt)))
      .returning();
    return result.length > 0;
  }

  async getStaffMembers(): Promise<Staff[]> {
    return db.select().from(staff).where(isNull(staff.deletedAt));
  }

  async getStaffMember(id: string): Promise<Staff | undefined> {
    const [member] = await db.select().from(staff).where(and(eq(staff.id, id), isNull(staff.deletedAt)));
    return member;
  }

  async createStaffMember(data: InsertStaff): Promise<Staff> {
    const [member] = await db.insert(staff).values(data).returning();
    return member;
  }

  async updateStaffMember(id: string, data: Partial<InsertStaff>): Promise<Staff | undefined> {
    const [member] = await db.update(staff).set(data).where(and(eq(staff.id, id), isNull(staff.deletedAt))).returning();
    return member;
  }

  async deleteStaffMember(id: string, deletedBy = "system"): Promise<boolean> {
    const result = await db.update(staff)
      .set({ deletedAt: new Date(), deletedBy })
      .where(and(eq(staff.id, id), isNull(staff.deletedAt)))
      .returning();
    return result.length > 0;
  }

  async restoreStaffMember(id: string): Promise<boolean> {
    const result = await db.update(staff)
      .set({ deletedAt: null, deletedBy: null })
      .where(eq(staff.id, id))
      .returning();
    return result.length > 0;
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

  async getNoShowCandidates(): Promise<Booking[]> {
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return db.select().from(bookings).where(
      and(
        isNull(bookings.deletedAt),
        lt(bookings.checkIn, todayMidnight),
        or(
          eq(bookings.status, "PENDING"),
          eq(bookings.status, "CONFIRMED")
        )
      )
    );
  }

  async getDueOutCandidates(checkoutHour: number, checkoutMinute: number): Promise<Booking[]> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const triggerTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), checkoutHour, checkoutMinute - 60);
    if (now < triggerTime) return [];
    return db.select().from(bookings).where(
      and(
        isNull(bookings.deletedAt),
        gt(bookings.checkOut, todayStart),
        lt(bookings.checkOut, todayEnd),
        or(
          eq(bookings.status, "CHECKED_IN"),
          eq(bookings.status, "EXTENDED")
        )
      )
    );
  }

  async getExpiredDueOutRooms(): Promise<Room[]> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const dueOutRooms = await db.select().from(rooms).where(and(eq(rooms.status, "DUE_OUT"), isNull(rooms.deletedAt)));
    const result: Room[] = [];
    for (const room of dueOutRooms) {
      const [booking] = await db.select().from(bookings).where(
        and(
          eq(bookings.roomId, room.id),
          isNull(bookings.deletedAt),
          or(
            eq(bookings.status, "CHECKED_IN"),
            eq(bookings.status, "EXTENDED")
          )
        )
      );
      if (!booking) { result.push(room); continue; }
      const co = new Date(booking.checkOut);
      if (co < todayStart || co >= todayEnd) result.push(room);
    }
    return result;
  }

  async getSetting(key: string): Promise<Setting | undefined> {
    const [s] = await db.select().from(settings).where(eq(settings.key, key));
    return s;
  }

  async getAllSettings(): Promise<Setting[]> {
    return db.select().from(settings);
  }

  async upsertSetting(key: string, value: string): Promise<Setting> {
    const [s] = await db.insert(settings).values({ key, value })
      .onConflictDoUpdate({ target: settings.key, set: { value } })
      .returning();
    return s;
  }

  async getActiveBookingsForAllRooms(): Promise<Record<string, Booking>> {
    const activeBookings = await db.select().from(bookings).where(
      and(
        isNull(bookings.deletedAt),
        or(
          eq(bookings.status, "CONFIRMED"),
          eq(bookings.status, "CHECKED_IN"),
          eq(bookings.status, "EXTENDED"),
          eq(bookings.status, "PENDING"),
          eq(bookings.status, "NO_SHOW")
        )
      )
    );
    const map: Record<string, Booking> = {};
    for (const b of activeBookings) {
      if (!map[b.roomId]) map[b.roomId] = b;
    }
    return map;
  }

  async getDashboardStats() {
    const allRooms = await db.select().from(rooms).where(isNull(rooms.deletedAt));
    const roomCountsByStatus: Record<string, number> = {};
    for (const room of allRooms) {
      roomCountsByStatus[room.status] = (roomCountsByStatus[room.status] || 0) + 1;
    }

    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const [revenueRow] = await db.select({
      total: sql<string>`COALESCE(SUM(${transactions.amount}), 0)`
    }).from(transactions).where(
      and(gte(transactions.createdAt, todayStart), lt(transactions.createdAt, todayEnd))
    );

    const [totalRow] = await db.select({ total: count() }).from(bookings).where(isNull(bookings.deletedAt));

    const [activeRow] = await db.select({ total: count() }).from(bookings).where(
      and(
        isNull(bookings.deletedAt),
        or(eq(bookings.status, "CHECKED_IN"), eq(bookings.status, "EXTENDED"))
      )
    );

    return {
      rooms: {
        total: allRooms.length,
        available: roomCountsByStatus["AVAILABLE"] || 0,
        occupied: roomCountsByStatus["OCCUPIED"] || 0,
        pending: roomCountsByStatus["PENDING"] || 0,
        cleaning: roomCountsByStatus["CLEANING"] || 0,
        cleaningInProgress: roomCountsByStatus["CLEANING_IN_PROGRESS"] || 0,
        inspected: roomCountsByStatus["INSPECTED"] || 0,
        outOfOrder: roomCountsByStatus["OUT_OF_ORDER"] || 0,
        outOfService: roomCountsByStatus["OUT_OF_SERVICE"] || 0,
        dueOut: roomCountsByStatus["DUE_OUT"] || 0,
      },
      todayRevenue: Number(revenueRow.total),
      totalBookings: totalRow.total,
      activeBookings: activeRow.total,
    };
  }

  async getBookingsByDateRange(start: Date, end: Date): Promise<Booking[]> {
    return db.select().from(bookings).where(
      and(
        isNull(bookings.deletedAt),
        lt(bookings.checkIn, end),
        gt(bookings.checkOut, start),
        or(
          eq(bookings.status, "CONFIRMED"),
          eq(bookings.status, "CHECKED_IN"),
          eq(bookings.status, "EXTENDED"),
          eq(bookings.status, "PENDING"),
          eq(bookings.status, "NO_SHOW"),
          eq(bookings.status, "DUE_OUT")
        )
      )
    );
  }

  async getTreatmentPlansByDate(date: Date): Promise<TreatmentPlan[]> {
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    return db.select().from(treatmentPlans).where(
      and(
        isNull(treatmentPlans.deletedAt),
        gte(treatmentPlans.scheduleTime, dayStart),
        lt(treatmentPlans.scheduleTime, dayEnd)
      )
    );
  }

  async getActiveStayBookings(includeRecentCheckouts = false): Promise<Booking[]> {
    if (!includeRecentCheckouts) {
      return db.select().from(bookings).where(
        and(
          isNull(bookings.deletedAt),
          or(
            eq(bookings.status, "CHECKED_IN"),
            eq(bookings.status, "EXTENDED"),
            eq(bookings.status, "DUE_OUT")
          )
        )
      );
    }
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return db.select().from(bookings).where(
      and(
        isNull(bookings.deletedAt),
        or(
          eq(bookings.status, "CHECKED_IN"),
          eq(bookings.status, "EXTENDED"),
          eq(bookings.status, "DUE_OUT"),
          and(eq(bookings.status, "CHECKED_OUT"), gte(bookings.checkOut, thirtyDaysAgo))
        )
      )
    );
  }

  async getBookingsPaginated(page: number, limit: number, status?: string, guestIds?: string[], roomIds?: string[], notStatuses?: string[]): Promise<{ data: Booking[]; total: number; totalPages: number }> {
    const hasGuestFilter = guestIds !== undefined;
    const hasRoomFilter = roomIds !== undefined;
    const noSearchResults = (hasGuestFilter && guestIds!.length === 0) && (hasRoomFilter && roomIds!.length === 0);
    if (noSearchResults) {
      return { data: [], total: 0, totalPages: 0 };
    }

    const conditions: any[] = [isNull(bookings.deletedAt)];
    if (status && status !== "ALL") {
      conditions.push(eq(bookings.status, status as any));
    }
    if (notStatuses && notStatuses.length > 0) {
      for (const ns of notStatuses) {
        conditions.push(ne(bookings.status, ns as any));
      }
    }

    const searchParts = [];
    if (guestIds && guestIds.length > 0) searchParts.push(inArray(bookings.guestId, guestIds));
    if (roomIds && roomIds.length > 0) searchParts.push(inArray(bookings.roomId, roomIds));
    if (searchParts.length === 1) conditions.push(searchParts[0]);
    else if (searchParts.length > 1) conditions.push(or(...searchParts)!);

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const offset = (page - 1) * limit;

    const [{ total }] = await db.select({ total: count() }).from(bookings).where(whereClause);
    const data = await db.select().from(bookings)
      .where(whereClause)
      .orderBy(desc(bookings.checkIn))
      .limit(limit)
      .offset(offset);

    return { data, total, totalPages: Math.ceil(total / limit) };
  }

  async getGuestsPaginated(page: number, limit: number, search?: string): Promise<{ data: Guest[]; total: number; totalPages: number }> {
    const conditions: any[] = [isNull(guests.deletedAt)];
    if (search) {
      conditions.push(
        or(
          ilike(guests.firstName, `%${search}%`),
          ilike(guests.lastName, `%${search}%`),
          ilike(guests.phone, `%${search}%`),
          ilike(guests.idNumber, `%${search}%`)
        )
      );
    }
    const whereClause = and(...conditions);
    const offset = (page - 1) * limit;
    const [{ total }] = await db.select({ total: count() }).from(guests).where(whereClause);
    const data = await db.select().from(guests)
      .where(whereClause)
      .orderBy(desc(guests.createdAt))
      .limit(limit)
      .offset(offset);

    return { data, total, totalPages: Math.ceil(total / limit) };
  }

  async searchGuests(query: string, limit: number = 50): Promise<Guest[]> {
    const q = `%${query}%`;
    return db.select().from(guests).where(
      and(
        isNull(guests.deletedAt),
        or(
          ilike(guests.firstName, q),
          ilike(guests.lastName, q),
          ilike(guests.phone, q),
          ilike(guests.idNumber, q)
        )
      )
    ).limit(limit);
  }

  async searchRooms(query: string): Promise<Room[]> {
    return db.select().from(rooms).where(
      and(isNull(rooms.deletedAt), ilike(rooms.roomNumber, `%${query}%`))
    );
  }
}

export const storage = new DatabaseStorage();

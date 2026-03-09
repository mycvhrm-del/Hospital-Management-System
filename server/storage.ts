import { eq, inArray, and, or, ne, lt, gt, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import {
  roomCategories, rooms, guests, bookings, transactions, services, bookingServices,
  type RoomCategory, type InsertRoomCategory,
  type Room, type InsertRoom,
  type Guest, type InsertGuest,
  type Booking,
  type Transaction,
  type Service, type InsertService,
  type BookingService, type InsertBookingService,
} from "@shared/schema";

const db = drizzle(process.env.DATABASE_URL!);

export interface IStorage {
  getRoomCategories(): Promise<RoomCategory[]>;
  getRoomCategory(id: string): Promise<RoomCategory | undefined>;
  createRoomCategory(data: InsertRoomCategory): Promise<RoomCategory>;
  updateRoomCategory(id: string, data: Partial<InsertRoomCategory>): Promise<RoomCategory | undefined>;
  deleteRoomCategory(id: string): Promise<boolean>;

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
}

export const storage = new DatabaseStorage();

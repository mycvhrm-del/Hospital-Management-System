import { eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import {
  roomCategories, rooms, guests, bookings, transactions,
  type RoomCategory, type InsertRoomCategory,
  type Room, type InsertRoom,
  type Guest, type InsertGuest,
  type Booking,
  type Transaction,
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
}

export const storage = new DatabaseStorage();

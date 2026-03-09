import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import {
  roomCategories, rooms,
  type RoomCategory, type InsertRoomCategory,
  type Room, type InsertRoom,
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
}

export const storage = new DatabaseStorage();

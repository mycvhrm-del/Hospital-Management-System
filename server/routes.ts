import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertRoomCategorySchema, insertRoomSchema, insertGuestSchema } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/room-categories", async (_req, res) => {
    const categories = await storage.getRoomCategories();
    res.json(categories);
  });

  app.get("/api/room-categories/:id", async (req, res) => {
    const category = await storage.getRoomCategory(req.params.id);
    if (!category) return res.status(404).json({ message: "Category not found" });
    res.json(category);
  });

  app.post("/api/room-categories", async (req, res) => {
    const parsed = insertRoomCategorySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const category = await storage.createRoomCategory(parsed.data);
    res.status(201).json(category);
  });

  app.patch("/api/room-categories/:id", async (req, res) => {
    const parsed = insertRoomCategorySchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const category = await storage.updateRoomCategory(req.params.id, parsed.data);
    if (!category) return res.status(404).json({ message: "Category not found" });
    res.json(category);
  });

  app.delete("/api/room-categories/:id", async (req, res) => {
    const success = await storage.deleteRoomCategory(req.params.id);
    if (!success) return res.status(404).json({ message: "Category not found" });
    res.json({ message: "Deleted" });
  });

  app.get("/api/rooms", async (_req, res) => {
    const allRooms = await storage.getRooms();
    res.json(allRooms);
  });

  app.get("/api/rooms/:id", async (req, res) => {
    const room = await storage.getRoom(req.params.id);
    if (!room) return res.status(404).json({ message: "Room not found" });
    res.json(room);
  });

  app.post("/api/rooms", async (req, res) => {
    const parsed = insertRoomSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    try {
      const room = await storage.createRoom(parsed.data);
      res.status(201).json(room);
    } catch (err: any) {
      if (err.code === "23505") {
        return res.status(409).json({ message: "Room number already exists" });
      }
      throw err;
    }
  });

  app.patch("/api/rooms/:id", async (req, res) => {
    const parsed = insertRoomSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    try {
      const room = await storage.updateRoom(req.params.id, parsed.data);
      if (!room) return res.status(404).json({ message: "Room not found" });
      res.json(room);
    } catch (err: any) {
      if (err.code === "23505") {
        return res.status(409).json({ message: "Room number already exists" });
      }
      throw err;
    }
  });

  app.delete("/api/rooms/:id", async (req, res) => {
    const success = await storage.deleteRoom(req.params.id);
    if (!success) return res.status(404).json({ message: "Room not found" });
    res.json({ message: "Deleted" });
  });

  app.get("/api/guests", async (_req, res) => {
    const allGuests = await storage.getGuests();
    res.json(allGuests);
  });

  app.get("/api/guests/:id", async (req, res) => {
    const guest = await storage.getGuest(req.params.id);
    if (!guest) return res.status(404).json({ message: "Guest not found" });
    res.json(guest);
  });

  app.post("/api/guests", async (req, res) => {
    const parsed = insertGuestSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    try {
      const guest = await storage.createGuest(parsed.data);
      res.status(201).json(guest);
    } catch (err: any) {
      if (err.code === "23505") {
        return res.status(409).json({ message: "Регистрийн дугаар давхцаж байна" });
      }
      throw err;
    }
  });

  app.patch("/api/guests/:id", async (req, res) => {
    const parsed = insertGuestSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    try {
      const guest = await storage.updateGuest(req.params.id, parsed.data);
      if (!guest) return res.status(404).json({ message: "Guest not found" });
      res.json(guest);
    } catch (err: any) {
      if (err.code === "23505") {
        return res.status(409).json({ message: "Регистрийн дугаар давхцаж байна" });
      }
      throw err;
    }
  });

  app.delete("/api/guests/:id", async (req, res) => {
    const success = await storage.deleteGuest(req.params.id);
    if (!success) return res.status(404).json({ message: "Guest not found" });
    res.json({ message: "Deleted" });
  });

  app.get("/api/guests/:id/family", async (req, res) => {
    const members = await storage.getFamilyMembers(req.params.id);
    res.json(members);
  });

  app.get("/api/guests/:id/bookings", async (req, res) => {
    const guestBookings = await storage.getGuestBookings(req.params.id);
    res.json(guestBookings);
  });

  app.get("/api/guests/:id/family-bookings", async (req, res) => {
    const familyBookings = await storage.getFamilyBookings(req.params.id);
    res.json(familyBookings);
  });

  app.get("/api/bookings", async (_req, res) => {
    const allBookings = await storage.getAllBookings();
    res.json(allBookings);
  });

  app.get("/api/bookings/:id/transactions", async (req, res) => {
    const txns = await storage.getBookingTransactions(req.params.id);
    res.json(txns);
  });

  return httpServer;
}

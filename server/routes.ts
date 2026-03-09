import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertRoomCategorySchema, insertRoomSchema, insertGuestSchema, insertBookingSchema, insertTransactionSchema } from "@shared/schema";

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

  app.get("/api/room-grid", async (_req, res) => {
    const allRooms = await storage.getRooms();
    const categories = await storage.getRoomCategories();
    const allGuests = await storage.getGuests();
    const catMap = Object.fromEntries(categories.map(c => [c.id, c]));
    const guestMap = Object.fromEntries(allGuests.map(g => [g.id, g]));

    const enriched = await Promise.all(allRooms.map(async (room) => {
      const activeBooking = await storage.getActiveBookingForRoom(room.id);
      let guest = null;
      if (activeBooking) {
        guest = guestMap[activeBooking.guestId] || null;
      }
      return {
        ...room,
        category: catMap[room.categoryId] || null,
        activeBooking: activeBooking || null,
        guest: guest ? {
          id: guest.id,
          firstName: guest.firstName,
          lastName: guest.lastName,
          phone: guest.phone,
          isVip: guest.isVip,
          hasMedicalHistory: !!guest.medicalHistory,
        } : null,
      };
    }));

    res.json(enriched);
  });

  app.post("/api/bookings", async (req, res) => {
    const parsed = insertBookingSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

    const checkIn = new Date(parsed.data.checkIn);
    const checkOut = new Date(parsed.data.checkOut);

    const overlap = await storage.checkBookingOverlap(parsed.data.roomId, checkIn, checkOut);
    if (overlap) {
      return res.status(409).json({ message: "Энэ хугацаанд өрөөнд захиалга давхцаж байна" });
    }

    try {
      const booking = await storage.createBooking({
        ...parsed.data,
        status: "PENDING",
        depositPaid: "0",
      });
      await storage.updateRoom(parsed.data.roomId, { status: "PENDING" });
      res.status(201).json(booking);
    } catch (err: any) {
      throw err;
    }
  });

  const validBookingStatuses = ["PENDING", "CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED"];

  app.patch("/api/bookings/:id/status", async (req, res) => {
    const { status } = req.body;
    if (!status || !validBookingStatuses.includes(status)) {
      return res.status(400).json({ message: "Буруу төлөв" });
    }
    const booking = await storage.updateBookingStatus(req.params.id, status);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    if (status === "CHECKED_IN") {
      await storage.updateRoom(booking.roomId, { status: "OCCUPIED" });
    } else if (status === "CHECKED_OUT" || status === "CANCELLED") {
      await storage.updateRoom(booking.roomId, { status: "CLEANING" });
    } else if (status === "CONFIRMED") {
      await storage.updateRoom(booking.roomId, { status: "PENDING" });
    }
    res.json(booking);
  });

  app.post("/api/transactions", async (req, res) => {
    const parsed = insertTransactionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

    const txn = await storage.createTransaction(parsed.data);

    const allTxns = await storage.getBookingTransactions(parsed.data.bookingId);
    const totalPaid = allTxns.reduce((sum, t) => sum + Number(t.amount), 0);
    await storage.updateBooking(parsed.data.bookingId, { depositPaid: String(totalPaid) });

    if (parsed.data.type === "DEPOSIT") {
      const booking = await storage.updateBookingStatus(parsed.data.bookingId, "CONFIRMED");
      if (booking) {
        const activeBooking = await storage.getActiveBookingForRoom(booking.roomId);
        if (activeBooking && activeBooking.status === "CONFIRMED") {
          await storage.updateRoom(booking.roomId, { status: "PENDING" });
        }
      }
    }

    res.status(201).json(txn);
  });

  app.get("/api/family-bill/:parentId", async (req, res) => {
    const parentId = req.params.parentId;
    const parent = await storage.getGuest(parentId);
    if (!parent) return res.status(404).json({ message: "Зочин олдсонгүй" });

    const familyMembers = await storage.getFamilyMembers(parentId);
    const allMembers = [parent, ...familyMembers];
    const familyBookings = await storage.getFamilyBookings(parentId);
    const bookingIds = familyBookings.map(b => b.id);
    const allTransactions = await storage.getTransactionsByBookingIds(bookingIds);
    const rooms = await storage.getRooms();
    const categories = await storage.getRoomCategories();
    const roomMap = Object.fromEntries(rooms.map(r => [r.id, r]));
    const catMap = Object.fromEntries(categories.map(c => [c.id, c]));

    const billItems = familyBookings.map(b => {
      const guest = allMembers.find(m => m.id === b.guestId);
      const room = roomMap[b.roomId];
      const category = room ? catMap[room.categoryId] : null;
      const txns = allTransactions.filter(t => t.bookingId === b.id);
      const totalPaid = txns.reduce((sum, t) => sum + Number(t.amount), 0);

      return {
        bookingId: b.id,
        guestName: guest ? `${guest.lastName} ${guest.firstName}` : "—",
        roomNumber: room?.roomNumber || "—",
        categoryName: category?.name || "—",
        checkIn: b.checkIn,
        checkOut: b.checkOut,
        status: b.status,
        totalAmount: Number(b.totalAmount),
        totalPaid,
        balance: Number(b.totalAmount) - totalPaid,
        transactions: txns,
      };
    });

    const grandTotal = billItems.reduce((s, i) => s + i.totalAmount, 0);
    const grandPaid = billItems.reduce((s, i) => s + i.totalPaid, 0);

    res.json({
      family: {
        parent: { id: parent.id, name: `${parent.lastName} ${parent.firstName}`, phone: parent.phone },
        memberCount: allMembers.length,
      },
      items: billItems,
      summary: {
        grandTotal,
        grandPaid,
        grandBalance: grandTotal - grandPaid,
      },
      generatedAt: new Date().toISOString(),
    });
  });

  return httpServer;
}

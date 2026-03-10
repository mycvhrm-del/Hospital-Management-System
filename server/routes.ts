import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertRoomCategorySchema, insertFloorSchema, insertRoomSchema, insertGuestSchema, insertBookingSchema, insertTransactionSchema, insertServiceSchema, insertInventorySchema, insertInventoryPurchaseSchema } from "@shared/schema";

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
    const oldCategory = await storage.getRoomCategory(req.params.id);
    const category = await storage.updateRoomCategory(req.params.id, parsed.data);
    if (!category) return res.status(404).json({ message: "Category not found" });
    if (oldCategory && parsed.data.basePrice && oldCategory.basePrice !== parsed.data.basePrice) {
      await storage.createAuditLog({
        userId: "system",
        action: "PRICE_CHANGE",
        description: `Өрөөний ангилал "${category.name}" үнэ ${oldCategory.basePrice}₮ → ${category.basePrice}₮`,
        targetTable: "room_categories",
      });
    }
    res.json(category);
  });

  app.delete("/api/room-categories/:id", async (req, res) => {
    const success = await storage.deleteRoomCategory(req.params.id);
    if (!success) return res.status(404).json({ message: "Category not found" });
    res.json({ message: "Deleted" });
  });

  app.get("/api/floors", async (_req, res) => {
    const allFloors = await storage.getFloors();
    res.json(allFloors);
  });

  app.post("/api/floors", async (req, res) => {
    const parsed = insertFloorSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    try {
      const floor = await storage.createFloor(parsed.data);
      res.status(201).json(floor);
    } catch (err: any) {
      if (err.code === "23505") return res.status(409).json({ message: "Энэ дугаартай давхар аль хэдийн бүртгэгдсэн байна" });
      throw err;
    }
  });

  app.patch("/api/floors/:id", async (req, res) => {
    const parsed = insertFloorSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    try {
      const floor = await storage.updateFloor(req.params.id, parsed.data);
      if (!floor) return res.status(404).json({ message: "Floor not found" });
      res.json(floor);
    } catch (err: any) {
      if (err.code === "23505") return res.status(409).json({ message: "Энэ дугаартай давхар аль хэдийн бүртгэгдсэн байна" });
      throw err;
    }
  });

  app.delete("/api/floors/:id", async (req, res) => {
    const floor = await storage.getFloor(req.params.id);
    if (!floor) return res.status(404).json({ message: "Floor not found" });
    const allRooms = await storage.getRooms();
    const roomsOnFloor = allRooms.filter(r => r.floor === floor.number);
    if (roomsOnFloor.length > 0) {
      return res.status(409).json({ message: `Энэ давхарт ${roomsOnFloor.length} өрөө бүртгэлтэй байгаа тул устгах боломжгүй` });
    }
    const success = await storage.deleteFloor(req.params.id);
    if (!success) return res.status(404).json({ message: "Floor not found" });
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

  app.get("/api/guests", async (req, res) => {
    const allGuests = await storage.getGuests();
    const search = (req.query.search as string || "").toLowerCase().trim();
    if (search) {
      const filtered = allGuests.filter(g =>
        g.phone.toLowerCase().includes(search) ||
        g.idNumber.toLowerCase().includes(search) ||
        g.firstName.toLowerCase().includes(search) ||
        g.lastName.toLowerCase().includes(search)
      );
      return res.json(filtered);
    }
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
    const { serviceIds, depositAmount, ...bookingData } = req.body;
    if (bookingData.checkIn) bookingData.checkIn = new Date(bookingData.checkIn);
    if (bookingData.checkOut) bookingData.checkOut = new Date(bookingData.checkOut);
    const parsed = insertBookingSchema.safeParse(bookingData);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

    const checkIn = new Date(parsed.data.checkIn);
    const checkOut = new Date(parsed.data.checkOut);

    const overlap = await storage.checkBookingOverlap(parsed.data.roomId, checkIn, checkOut);
    if (overlap) {
      return res.status(409).json({ message: "Энэ хугацаанд өрөөнд захиалга давхцаж байна" });
    }

    try {
      const room = await storage.getRoom(parsed.data.roomId);
      const categories = await storage.getRoomCategories();
      const category = room ? categories.find(c => c.id === room.categoryId) : null;
      const nights = Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));
      const roomTotal = category ? Number(category.basePrice) * nights : 0;

      let servicesTotalAmount = 0;
      const servicesToAdd: { id: string; price: string }[] = [];
      if (serviceIds && Array.isArray(serviceIds) && serviceIds.length > 0) {
        for (const svcId of serviceIds) {
          const svc = await storage.getService(svcId);
          if (svc) {
            servicesToAdd.push({ id: svc.id, price: svc.price });
            servicesTotalAmount += Number(svc.price);
          }
        }
      }

      const serverTotal = roomTotal + servicesTotalAmount;
      const parsedDeposit = depositAmount ? Number(depositAmount) : 0;
      const validDeposit = !isNaN(parsedDeposit) && parsedDeposit > 0
        ? Math.min(parsedDeposit, serverTotal)
        : 0;

      const booking = await storage.createBooking({
        ...parsed.data,
        totalAmount: String(serverTotal),
        status: validDeposit > 0 ? "CONFIRMED" : "PENDING",
        depositPaid: String(validDeposit),
      });
      await storage.updateRoom(parsed.data.roomId, { status: "PENDING" });

      if (validDeposit > 0) {
        await storage.createTransaction({
          bookingId: booking.id,
          amount: String(validDeposit),
          type: "DEPOSIT",
          paymentMethod: "CASH",
        });
      }

      for (const svc of servicesToAdd) {
        await storage.addBookingService({
          bookingId: booking.id,
          serviceId: svc.id,
          quantity: 1,
          unitPrice: svc.price,
          totalPrice: svc.price,
        });
      }

      booking.totalAmount = String(serverTotal);
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

  app.get("/api/services", async (_req, res) => {
    const allServices = await storage.getServices();
    res.json(allServices);
  });

  app.get("/api/services/:id", async (req, res) => {
    const service = await storage.getService(req.params.id);
    if (!service) return res.status(404).json({ message: "Service not found" });
    res.json(service);
  });

  app.post("/api/services", async (req, res) => {
    const parsed = insertServiceSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const service = await storage.createService(parsed.data);
    res.status(201).json(service);
  });

  app.patch("/api/services/:id", async (req, res) => {
    const parsed = insertServiceSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const oldService = await storage.getService(req.params.id);
    const service = await storage.updateService(req.params.id, parsed.data);
    if (!service) return res.status(404).json({ message: "Service not found" });
    if (oldService && parsed.data.price && oldService.price !== parsed.data.price) {
      await storage.createAuditLog({
        userId: "system",
        action: "PRICE_CHANGE",
        description: `Эмчилгээ "${service.name}" үнэ ${oldService.price}₮ → ${service.price}₮`,
        targetTable: "services",
      });
    }
    res.json(service);
  });

  app.delete("/api/services/:id", async (req, res) => {
    const success = await storage.deleteService(req.params.id);
    if (!success) return res.status(404).json({ message: "Service not found" });
    res.json({ message: "Deleted" });
  });

  app.get("/api/bookings/:id/services", async (req, res) => {
    const bs = await storage.getBookingServices(req.params.id);
    res.json(bs);
  });

  app.post("/api/booking-services", async (req, res) => {
    const { bookingId, serviceId, quantity } = req.body;
    if (!bookingId || !serviceId) return res.status(400).json({ message: "bookingId and serviceId required" });
    const service = await storage.getService(serviceId);
    if (!service) return res.status(404).json({ message: "Service not found" });

    const qty = quantity || 1;
    const unitPrice = service.price;
    const totalPrice = String(Number(unitPrice) * qty);

    const bs = await storage.addBookingService({
      bookingId,
      serviceId,
      quantity: qty,
      unitPrice,
      totalPrice,
    });

    res.status(201).json(bs);
  });

  app.get("/api/inventory", async (_req, res) => {
    const items = await storage.getInventoryItems();
    res.json(items);
  });

  app.get("/api/inventory/:id", async (req, res) => {
    const item = await storage.getInventoryItem(req.params.id);
    if (!item) return res.status(404).json({ message: "Item not found" });
    res.json(item);
  });

  app.post("/api/inventory", async (req, res) => {
    const parsed = insertInventorySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    try {
      const item = await storage.createInventoryItem(parsed.data);
      res.status(201).json(item);
    } catch (err: any) {
      if (err.code === "23505") return res.status(409).json({ message: "Ижил нэртэй бараа бүртгэгдсэн байна" });
      throw err;
    }
  });

  app.patch("/api/inventory/:id", async (req, res) => {
    const parsed = insertInventorySchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const item = await storage.updateInventoryItem(req.params.id, parsed.data);
    if (!item) return res.status(404).json({ message: "Item not found" });
    res.json(item);
  });

  app.delete("/api/inventory/:id", async (req, res) => {
    const success = await storage.deleteInventoryItem(req.params.id);
    if (!success) return res.status(404).json({ message: "Item not found" });
    res.json({ message: "Deleted" });
  });

  app.get("/api/inventory/:id/purchases", async (req, res) => {
    const purchases = await storage.getInventoryPurchases(req.params.id);
    res.json(purchases);
  });

  app.post("/api/inventory/:id/purchases", async (req, res) => {
    const { quantity, purchaseDate, note } = req.body;
    const qty = Number(quantity);
    if (!qty || qty <= 0 || isNaN(qty)) return res.status(400).json({ message: "quantity must be a positive number" });
    if (!purchaseDate || isNaN(Date.parse(purchaseDate))) return res.status(400).json({ message: "valid purchaseDate required" });
    const item = await storage.getInventoryItem(req.params.id);
    if (!item) return res.status(404).json({ message: "Inventory item not found" });
    const purchase = await storage.createInventoryPurchase({
      inventoryId: req.params.id,
      quantity: String(qty),
      purchaseDate: new Date(purchaseDate),
      note: note || null,
    });
    res.status(201).json(purchase);
  });

  app.get("/api/services/:id/materials", async (req, res) => {
    const materials = await storage.getServiceMaterials(req.params.id);
    res.json(materials);
  });

  app.post("/api/services/:id/materials", async (req, res) => {
    const { materials } = req.body;
    if (!Array.isArray(materials)) return res.status(400).json({ message: "materials array required" });
    for (const mat of materials) {
      const qty = Number(mat.quantityNeeded);
      if (!mat.inventoryId || !qty || qty <= 0 || isNaN(qty)) {
        return res.status(400).json({ message: "Each material must have inventoryId and positive quantityNeeded" });
      }
    }
    const service = await storage.getService(req.params.id);
    if (!service) return res.status(404).json({ message: "Service not found" });
    const result = await storage.setServiceMaterials(req.params.id, materials);
    res.json(result);
  });

  app.get("/api/bookings/:id/treatment-plans", async (req, res) => {
    const plans = await storage.getTreatmentPlans(req.params.id);
    res.json(plans);
  });

  app.post("/api/treatment-plans", async (req, res) => {
    const { bookingId, serviceId, serviceName, scheduleTime, notes } = req.body;
    if (!bookingId || !serviceName || !scheduleTime) {
      return res.status(400).json({ message: "bookingId, serviceName, scheduleTime required" });
    }
    const plan = await storage.createTreatmentPlan({
      bookingId,
      serviceId: serviceId || null,
      serviceName,
      scheduleTime: new Date(scheduleTime),
      status: "SCHEDULED",
      notes: notes || null,
      completedAt: null,
    });
    res.status(201).json(plan);
  });

  app.patch("/api/treatment-plans/:id/complete", async (req, res) => {
    const completedAt = req.body.completedAt ? new Date(req.body.completedAt) : new Date();
    const plan = await storage.completeTreatmentPlan(req.params.id, completedAt);
    if (!plan) return res.status(404).json({ message: "Treatment plan not found" });
    res.json(plan);
  });

  app.delete("/api/transactions/:id", async (req, res) => {
    const txn = await storage.getTransaction(req.params.id);
    if (!txn) return res.status(404).json({ message: "Transaction not found" });

    await storage.createAuditLog({
      userId: "system",
      action: "PAYMENT_DELETE",
      description: `Төлбөр устгасан: ${Number(txn.amount).toLocaleString()}₮ (${txn.type}, ${txn.paymentMethod})`,
      targetTable: "transactions",
    });

    const success = await storage.deleteTransaction(req.params.id);
    if (!success) return res.status(404).json({ message: "Transaction not found" });

    const allTxns = await storage.getBookingTransactions(txn.bookingId);
    const totalPaid = allTxns.reduce((sum, t) => sum + Number(t.amount), 0);
    await storage.updateBooking(txn.bookingId, { depositPaid: String(totalPaid) });

    res.json({ message: "Deleted" });
  });

  app.get("/api/audit-logs", async (_req, res) => {
    const logs = await storage.getAuditLogs();
    res.json(logs);
  });

  app.get("/api/weekly-timeline", async (req, res) => {
    const startStr = req.query.start as string;
    const start = startStr ? new Date(startStr) : (() => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      return d;
    })();
    if (isNaN(start.getTime())) {
      return res.status(400).json({ message: "Invalid start date" });
    }
    const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);

    const allRooms = await storage.getRooms();
    const categories = await storage.getRoomCategories();
    const categoryMap = Object.fromEntries(categories.map(c => [c.id, c]));
    const allBookings = await storage.getAllBookings();

    const weekBookings = allBookings.filter(b => {
      if (b.status === "CANCELLED") return false;
      const ci = new Date(b.checkIn);
      const co = new Date(b.checkOut);
      return ci < end && co > start;
    });

    const guestIds = Array.from(new Set(weekBookings.map(b => b.guestId)));
    const allGuests = await storage.getGuests();
    const guestMap = Object.fromEntries(allGuests.filter(g => guestIds.includes(g.id)).map(g => [g.id, g]));

    const familyBookings: Record<string, typeof weekBookings> = {};
    for (const b of weekBookings) {
      if (!familyBookings[b.roomId]) familyBookings[b.roomId] = [];
      familyBookings[b.roomId].push(b);
    }

    const result = allRooms.map(room => {
      const cat = categoryMap[room.categoryId];
      const roomBookings = familyBookings[room.id] || [];

      const enriched = roomBookings.map(b => {
        const guest = guestMap[b.guestId];
        const familyMembers = guest?.parentId
          ? allGuests.filter(g => g.parentId === guest.parentId || g.id === guest.parentId).filter(g => g.id !== guest.id)
          : allGuests.filter(g => g.parentId === guest?.id);

        return {
          ...b,
          guest: guest ? { id: guest.id, firstName: guest.firstName, lastName: guest.lastName, phone: guest.phone, isVip: guest.isVip } : null,
          familyMembers: familyMembers.map(fm => ({ id: fm.id, firstName: fm.firstName, lastName: fm.lastName })),
        };
      });

      return {
        id: room.id,
        roomNumber: room.roomNumber,
        floor: room.floor,
        status: room.status,
        category: cat ? { id: cat.id, name: cat.name, basePrice: cat.basePrice, capacity: cat.capacity } : null,
        bookings: enriched,
      };
    }).sort((a, b) => a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true }));

    res.json({ start: start.toISOString(), end: end.toISOString(), rooms: result });
  });

  app.get("/api/dashboard/stats", async (_req, res) => {
    const allRooms = await storage.getRooms();
    const allBookings = await storage.getAllBookings();

    const availableCount = allRooms.filter(r => r.status === "AVAILABLE").length;
    const occupiedCount = allRooms.filter(r => r.status === "OCCUPIED").length;
    const pendingCount = allRooms.filter(r => r.status === "PENDING").length;
    const cleaningCount = allRooms.filter(r => r.status === "CLEANING").length;

    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    const bookingIds = allBookings.map(b => b.id);
    let todayRevenue = 0;
    if (bookingIds.length > 0) {
      const allTxns = await storage.getTransactionsByBookingIds(bookingIds);
      todayRevenue = allTxns
        .filter(t => new Date(t.createdAt) >= startOfDay && new Date(t.createdAt) < endOfDay)
        .reduce((sum, t) => sum + Number(t.amount), 0);
    }

    res.json({
      rooms: { total: allRooms.length, available: availableCount, occupied: occupiedCount, pending: pendingCount, cleaning: cleaningCount },
      todayRevenue,
      totalBookings: allBookings.length,
      activeBookings: allBookings.filter(b => b.status === "CHECKED_IN").length,
    });
  });

  return httpServer;
}

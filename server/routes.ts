import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertRoomCategorySchema, insertFloorSchema, insertRoomSchema, insertGuestSchema, insertBookingSchema, insertTransactionSchema, insertServiceSchema, insertInventorySchema, insertInventoryPurchaseSchema, insertStaffSchema } from "@shared/schema";
function logJob(message: string) {
  const t = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true });
  console.log(`${t} [noshow-job] ${message}`);
}

function logDueOut(message: string) {
  const t = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true });
  console.log(`${t} [dueout-job] ${message}`);
}

export async function runDueOutJob() {
  try {
    const checkoutTimeSetting = await storage.getSetting("checkout_time");
    const checkoutTime = checkoutTimeSetting?.value ?? "12:00";
    const [hourStr, minuteStr] = checkoutTime.split(":");
    const hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);

    const candidates = await storage.getDueOutCandidates(hour, minute);
    for (const booking of candidates) {
      const room = await storage.getRoom(booking.roomId);
      if (!room || room.status === "DUE_OUT") continue;
      await storage.updateRoom(booking.roomId, { status: "DUE_OUT" });
      logDueOut(`Өрөө ${room.roomNumber} — DUE_OUT болов (checkout: ${checkoutTime})`);
    }

    const expiredRooms = await storage.getExpiredDueOutRooms();
    for (const room of expiredRooms) {
      await storage.updateRoom(room.id, { status: "OCCUPIED" });
      logDueOut(`Өрөө ${room.roomNumber} — OCCUPIED буцав (extend хийгдсэн)`);
    }
  } catch (err) {
    logDueOut(`Алдаа: ${err}`);
  }
}

export async function runNoShowJob() {
  try {
    const candidates = await storage.getNoShowCandidates();
    if (candidates.length === 0) return;
    for (const booking of candidates) {
      await storage.updateBookingStatus(booking.id, "NO_SHOW");
      // Өрөөний статусыг шинэчлэх: өөр идэвхтэй захиалга байвал PENDING/OCCUPIED, эсвэл AVAILABLE
      const otherActive = await storage.getActiveBookingForRoom(booking.roomId);
      if (otherActive && otherActive.id !== booking.id) {
        await storage.updateRoom(booking.roomId, {
          status: otherActive.status === "CHECKED_IN" ? "OCCUPIED" : "PENDING",
        });
      } else {
        await storage.updateRoom(booking.roomId, { status: "AVAILABLE" });
      }
      await storage.createAuditLog({
        operation: "UPDATE",
        entity: "bookings",
        entityId: booking.id,
        beforeJson: { status: booking.status },
        afterJson: { status: "NO_SHOW" },
        source: "job",
      });
      logJob(`Захиалга ${booking.id.slice(0, 8)} → NO_SHOW (өрөө шинэчлэгдсэн)`);
    }
    logJob(`${candidates.length} захиалга NO_SHOW болов`);
  } catch (err) {
    logJob(`Алдаа: ${err}`);
  }
}

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
        operation: "UPDATE",
        entity: "room_categories",
        entityId: category.id,
        beforeJson: { basePrice: oldCategory.basePrice },
        afterJson: { basePrice: category.basePrice },
        source: "api",
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
    const roomsOnFloor = allRooms.filter(r => r.floorId === floor.id);
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
    const activeBooking = await storage.getActiveBookingForRoom(req.params.id);
    if (activeBooking) {
      return res.status(409).json({ message: "Энэ өрөөнд идэвхтэй захиалга байна. Устгахын өмнө захиалгыг дуусгана уу." });
    }
    const success = await storage.deleteRoom(req.params.id);
    if (!success) return res.status(404).json({ message: "Room not found" });
    res.json({ message: "Deleted" });
  });

  app.get("/api/guests", async (req, res) => {
    const search = (req.query.search as string || "").trim();
    const pageParam = req.query.page as string;

    if (pageParam) {
      const page = Math.max(1, parseInt(pageParam) || 1);
      const limit = Math.min(200, parseInt(req.query.limit as string) || 50);
      const result = await storage.getGuestsPaginated(page, limit, search || undefined);
      return res.json(result);
    }

    if (search) {
      const filtered = await storage.searchGuests(search, 100);
      return res.json(filtered);
    }

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
    const guestBookings = await storage.getGuestBookings(req.params.id);
    const active = guestBookings.find(b => !["CHECKED_OUT", "CANCELLED"].includes(b.status));
    if (active) {
      return res.status(409).json({ message: "Энэ зочинд идэвхтэй захиалга байна. Устгахын өмнө захиалгыг дуусгана уу." });
    }
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

  app.get("/api/bookings/active-stays", async (req, res) => {
    const includeCheckouts = req.query.includeCheckouts === "true";
    const activeBookings = await storage.getActiveStayBookings(includeCheckouts);
    res.json(activeBookings);
  });

  app.get("/api/bookings", async (req, res) => {
    const pageParam = req.query.page as string;

    if (pageParam) {
      const page = Math.max(1, parseInt(pageParam) || 1);
      const limit = Math.min(200, parseInt(req.query.limit as string) || 50);
      const status = req.query.status as string | undefined;
      const search = (req.query.search as string || "").trim();

      let guestIds: string[] | undefined;
      let roomIds: string[] | undefined;
      if (search) {
        const [matchingGuests, matchingRooms] = await Promise.all([
          storage.searchGuests(search, 200),
          storage.searchRooms(search),
        ]);
        guestIds = matchingGuests.map(g => g.id);
        roomIds = matchingRooms.map(r => r.id);
      }

      const notStatuses = (!status || status === "ALL")
        ? ["CHECKED_IN", "EXTENDED", "DUE_OUT", "CHECKED_OUT"]
        : [];
      const result = await storage.getBookingsPaginated(page, limit, status, guestIds, roomIds, notStatuses);
      return res.json(result);
    }

    const allBookings = await storage.getAllBookings();
    res.json(allBookings);
  });

  app.get("/api/bookings/:id/transactions", async (req, res) => {
    const txns = await storage.getBookingTransactions(req.params.id);
    res.json(txns);
  });

  app.post("/api/transactions/bulk", async (req, res) => {
    const { bookingIds } = req.body;
    if (!Array.isArray(bookingIds)) return res.status(400).json({ message: "bookingIds required" });
    const txns = await storage.getTransactionsByBookingIds(bookingIds);
    res.json(txns);
  });

  app.get("/api/room-grid", async (_req, res) => {
    const [allRooms, categories, activeBookingsMap, allGuests] = await Promise.all([
      storage.getRooms(),
      storage.getRoomCategories(),
      storage.getActiveBookingsForAllRooms(),
      storage.getGuests(),
    ]);
    const catMap = Object.fromEntries(categories.map(c => [c.id, c]));
    const guestMap = Object.fromEntries(allGuests.map(g => [g.id, g]));

    const enriched = allRooms.map((room) => {
      const activeBooking = activeBookingsMap[room.id] || null;
      const guest = activeBooking ? guestMap[activeBooking.guestId] || null : null;
      return {
        ...room,
        category: catMap[room.categoryId] || null,
        activeBooking,
        guest: guest ? {
          id: guest.id,
          firstName: guest.firstName,
          lastName: guest.lastName,
          phone: guest.phone,
          isVip: guest.isVip,
          hasMedicalHistory: !!guest.medicalHistory,
        } : null,
      };
    });

    res.json(enriched);
  });

  app.post("/api/bookings", async (req, res) => {
    const { serviceIds, depositAmount, ...bookingData } = req.body;
    if (bookingData.checkIn) bookingData.checkIn = new Date(bookingData.checkIn);
    if (bookingData.checkOut) bookingData.checkOut = new Date(bookingData.checkOut);
    if (!bookingData.totalAmount) bookingData.totalAmount = "0";
    const parsed = insertBookingSchema.safeParse(bookingData);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

    const checkIn = new Date(parsed.data.checkIn);
    const checkOut = new Date(parsed.data.checkOut);

    if (checkIn >= checkOut) {
      return res.status(400).json({ message: "Гарах огноо орох огнооноос хойш байх ёстой" });
    }

    const overlap = await storage.checkBookingOverlap(parsed.data.roomId, checkIn, checkOut);
    if (overlap) {
      return res.status(409).json({ message: "Энэ хугацаанд өрөөнд захиалга давхцаж байна" });
    }

    try {
      const room = await storage.getRoom(parsed.data.roomId);
      const categories = await storage.getRoomCategories();
      const category = room ? categories.find(c => c.id === room.categoryId) : null;

      const guestCount = parsed.data.guestCount || 1;
      if (category && guestCount > category.capacity) {
        return res.status(400).json({
          message: `Хүний тоо өрөөний багтаамжаас (${category.capacity}) хэтэрч байна`
        });
      }

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

  const validBookingStatuses = ["PENDING", "CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED", "NO_SHOW", "EXTENDED"];

  app.patch("/api/bookings/:id/status", async (req, res) => {
    const { status } = req.body;
    if (!status || !validBookingStatuses.includes(status)) {
      return res.status(400).json({ message: "Буруу төлөв" });
    }

    const existing = await storage.getBooking(req.params.id);
    if (!existing) return res.status(404).json({ message: "Booking not found" });
    const previousStatus = existing.status;

    // NO_SHOW статустай захиалгаас зөвхөн CHECKED_IN (оройтож ирсэн) эсвэл CANCELLED рүү шилжих боломжтой
    if (previousStatus === "NO_SHOW" && status !== "CHECKED_IN" && status !== "CANCELLED") {
      return res.status(400).json({ message: "Ирээгүй захиалгаас зөвхөн бүртгэх эсвэл цуцлах боломжтой" });
    }

    if (status === "CHECKED_OUT") {
      const totalAmount = Number(existing.totalAmount);
      const totalPaid = Number(existing.depositPaid);
      if (totalPaid < totalAmount) {
        const remaining = totalAmount - totalPaid;
        return res.status(400).json({
          message: `Төлбөр бүрэн төлөгдөөгүй байна. Үлдэгдэл: ${remaining.toLocaleString()}₮`
        });
      }
    }

    const booking = await storage.updateBookingStatus(req.params.id, status);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    if (status === "CHECKED_IN") {
      // NO_SHOW-с CHECKED_IN: оройтож ирсэн зочин — өрөө OCCUPIED болно
      await storage.updateRoom(booking.roomId, { status: "OCCUPIED" });
    } else if (status === "CHECKED_OUT") {
      const now = new Date();
      const plannedCheckOut = new Date(booking.checkOut);
      if (now < plannedCheckOut) {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const updated = await storage.updateBooking(booking.id, { checkOut: today });
        if (updated) Object.assign(booking, updated);
      }
      await storage.updateRoom(booking.roomId, { status: "CLEANING" });
    } else if (status === "CANCELLED") {
      const now = new Date();
      const plannedCheckOut = new Date(booking.checkOut);
      const plannedCheckIn = new Date(booking.checkIn);
      if (now < plannedCheckOut && now > plannedCheckIn) {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        await storage.updateBooking(booking.id, { checkOut: today });
      }
      if (previousStatus === "CHECKED_IN" || previousStatus === "EXTENDED") {
        // Байрлаж байсан (CHECKED_IN эсвэл EXTENDED) зочинг цуцлахад өрөө цэвэрлэгээнд орно
        await storage.updateRoom(booking.roomId, { status: "CLEANING" });
      } else {
        // NO_SHOW эсвэл PENDING/CONFIRMED-с цуцлахад өрөө AVAILABLE болно
        const otherActive = await storage.getActiveBookingForRoom(booking.roomId);
        if (otherActive && otherActive.id !== booking.id) {
          if (otherActive.status === "CHECKED_IN") {
            await storage.updateRoom(booking.roomId, { status: "OCCUPIED" });
          } else {
            await storage.updateRoom(booking.roomId, { status: "PENDING" });
          }
        } else {
          await storage.updateRoom(booking.roomId, { status: "AVAILABLE" });
        }
      }
    } else if (status === "CONFIRMED") {
      await storage.updateRoom(booking.roomId, { status: "PENDING" });
    } else if (status === "NO_SHOW") {
      // PENDING/CONFIRMED → NO_SHOW: өрөө AVAILABLE болно (өөр захиалга байвал PENDING/OCCUPIED)
      const otherActive = await storage.getActiveBookingForRoom(booking.roomId);
      if (otherActive && otherActive.id !== booking.id) {
        await storage.updateRoom(booking.roomId, {
          status: otherActive.status === "CHECKED_IN" ? "OCCUPIED" : "PENDING",
        });
      } else {
        await storage.updateRoom(booking.roomId, { status: "AVAILABLE" });
      }
    }
    res.json(booking);
  });

  app.patch("/api/bookings/:id", async (req, res) => {
    const booking = await storage.getBooking(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    if (booking.status === "CHECKED_OUT" || booking.status === "CANCELLED") {
      return res.status(400).json({ message: "Дууссан эсвэл цуцлагдсан захиалга засах боломжгүй" });
    }
    const updates: any = {};
    if (req.body.checkIn) updates.checkIn = new Date(req.body.checkIn);
    if (req.body.checkOut) updates.checkOut = new Date(req.body.checkOut);
    if (req.body.totalAmount !== undefined) updates.totalAmount = String(req.body.totalAmount);

    const datesChanged = (updates.checkIn || updates.checkOut) && req.body.totalAmount === undefined;
    if (datesChanged) {
      const newCheckIn = updates.checkIn ?? new Date(booking.checkIn);
      const newCheckOut = updates.checkOut ?? new Date(booking.checkOut);
      if (newCheckIn >= newCheckOut) {
        return res.status(400).json({ message: "Гарах огноо орох огнооноос хойш байх ёстой" });
      }
      const room = await storage.getRoom(booking.roomId);
      const categories = await storage.getRoomCategories();
      const category = room ? categories.find(c => c.id === room.categoryId) : null;
      const nights = Math.max(1, Math.ceil((newCheckOut.getTime() - newCheckIn.getTime()) / (1000 * 60 * 60 * 24)));
      const roomTotal = category ? Number(category.basePrice) * nights : 0;
      const existingServices = await storage.getBookingServices(booking.id);
      const servicesTotal = existingServices.reduce((s, bs) => s + Number(bs.totalPrice), 0);
      updates.totalAmount = String(roomTotal + servicesTotal);
    }

    const updated = await storage.updateBooking(req.params.id, updates);
    res.json(updated);
  });

  app.delete("/api/bookings/:id", async (req, res) => {
    const booking = await storage.getBooking(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    if (booking.status === "CHECKED_IN") {
      return res.status(400).json({ message: "Бүртгэлтэй захиалга устгах боломжгүй" });
    }
    if (booking.status !== "CHECKED_OUT" && booking.status !== "CANCELLED") {
      await storage.updateRoom(booking.roomId, { status: "AVAILABLE" });
    }
    await storage.deleteBooking(req.params.id);
    res.json({ success: true });
  });

  app.post("/api/transactions", async (req, res) => {
    const parsed = insertTransactionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

    const txn = await storage.createTransaction(parsed.data);

    const existingBooking = await storage.getBooking(parsed.data.bookingId);
    const newTotal = Number(existingBooking?.depositPaid || 0) + Number(txn.amount);
    const booking = await storage.updateBooking(parsed.data.bookingId, { depositPaid: String(newTotal) });

    if (booking && (booking.status === "PENDING")) {
      await storage.updateBookingStatus(parsed.data.bookingId, "CONFIRMED");
      await storage.updateRoom(booking.roomId, { status: "PENDING" });
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
        operation: "UPDATE",
        entity: "services",
        entityId: service.id,
        beforeJson: { price: oldService.price },
        afterJson: { price: service.price },
        source: "api",
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

  async function recalcBookingTotal(bookingId: string) {
    const booking = await storage.getBooking(bookingId);
    if (!booking) return;
    const room = await storage.getRoom(booking.roomId);
    const categories = await storage.getRoomCategories();
    const category = room ? categories.find(c => c.id === room.categoryId) : null;
    const ci = new Date(booking.checkIn);
    const co = new Date(booking.checkOut);
    const nights = Math.max(1, Math.ceil((co.getTime() - ci.getTime()) / (1000 * 60 * 60 * 24)));
    const roomTotal = category ? Number(category.basePrice) * nights : 0;
    const allServices = await storage.getBookingServices(bookingId);
    const servicesTotal = allServices.reduce((s, bs) => s + Number(bs.totalPrice), 0);
    await storage.updateBooking(bookingId, { totalAmount: String(roomTotal + servicesTotal) });
  }

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

    await recalcBookingTotal(bookingId);
    res.status(201).json(bs);
  });

  app.delete("/api/booking-services/:id", async (req, res) => {
    const bs = await storage.getBookingServiceById(req.params.id);
    const bookingId = bs?.bookingId ?? null;
    const success = await storage.deleteBookingService(req.params.id);
    if (!success) return res.status(404).json({ message: "Not found" });
    if (bookingId) await recalcBookingTotal(bookingId);
    res.json({ success: true });
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
    const { quantity, purchasePrice, purchaseDate, note } = req.body;
    const qty = Number(quantity);
    if (!qty || qty <= 0 || isNaN(qty)) return res.status(400).json({ message: "quantity must be a positive number" });
    if (!purchaseDate || isNaN(Date.parse(purchaseDate))) return res.status(400).json({ message: "valid purchaseDate required" });
    const item = await storage.getInventoryItem(req.params.id);
    if (!item) return res.status(404).json({ message: "Inventory item not found" });
    const parsedPrice = purchasePrice && Number(purchasePrice) > 0 ? String(Number(purchasePrice)) : null;
    const purchase = await storage.createInventoryPurchase({
      inventoryId: req.params.id,
      quantity: String(qty),
      purchasePrice: parsedPrice,
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

  app.get("/api/services/:id/package-services", async (req, res) => {
    const items = await storage.getPackageServices(req.params.id);
    res.json(items);
  });

  app.post("/api/services/:id/package-services", async (req, res) => {
    const { serviceIds } = req.body;
    if (!Array.isArray(serviceIds)) return res.status(400).json({ message: "serviceIds array required" });
    const service = await storage.getService(req.params.id);
    if (!service) return res.status(404).json({ message: "Service not found" });
    if (service.type !== "PACKAGE") return res.status(400).json({ message: "Service is not a PACKAGE" });
    const uniqueIds = [...new Set(serviceIds.filter((id: string) => id && id !== req.params.id))];
    if (uniqueIds.length > 0) {
      const allSvcs = await storage.getServices();
      const svcMap = new Map(allSvcs.map(s => [s.id, s]));
      for (const sid of uniqueIds) {
        const svc = svcMap.get(sid);
        if (!svc) return res.status(400).json({ message: `Service ${sid} not found` });
        if (svc.type !== "SERVICE") return res.status(400).json({ message: `${svc.name} is not a service` });
      }
    }
    const result = await storage.setPackageServices(req.params.id, uniqueIds);
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

    const lowStockWarnings: { itemName: string; stockQuantity: string; minStockLevel: string }[] = [];
    if (plan.serviceId) {
      const bom = await storage.getServiceMaterials(plan.serviceId);
      for (const mat of bom) {
        const item = await storage.getInventoryItem(mat.inventoryId);
        if (item && Number(item.stockQuantity) < Number(item.minStockLevel)) {
          lowStockWarnings.push({
            itemName: item.itemName,
            stockQuantity: item.stockQuantity,
            minStockLevel: item.minStockLevel,
          });
        }
      }
    }

    res.json({ ...plan, lowStockWarnings });
  });

  app.delete("/api/transactions/:id", async (req, res) => {
    const txn = await storage.getTransaction(req.params.id);
    if (!txn) return res.status(404).json({ message: "Transaction not found" });

    await storage.createAuditLog({
      operation: "DELETE",
      entity: "transactions",
      entityId: txn.id,
      beforeJson: { amount: txn.amount, type: txn.type, paymentMethod: txn.paymentMethod, bookingId: txn.bookingId },
      source: "api",
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

    const [allRooms, categories, weekBookings] = await Promise.all([
      storage.getRooms(),
      storage.getRoomCategories(),
      storage.getBookingsByDateRange(start, end),
    ]);
    const categoryMap = Object.fromEntries(categories.map(c => [c.id, c]));

    const guestIds = Array.from(new Set(weekBookings.map(b => b.guestId)));
    const allGuests = guestIds.length > 0 ? await storage.getGuests() : [];
    const weekGuestIds = new Set(guestIds);
    const guestMap = Object.fromEntries(allGuests.filter(g => weekGuestIds.has(g.id)).map(g => [g.id, g]));

    const familyBookingsByRoom: Record<string, typeof weekBookings> = {};
    for (const b of weekBookings) {
      if (!familyBookingsByRoom[b.roomId]) familyBookingsByRoom[b.roomId] = [];
      familyBookingsByRoom[b.roomId].push(b);
    }

    const result = allRooms.map(room => {
      const cat = categoryMap[room.categoryId];
      const roomBookings = familyBookingsByRoom[room.id] || [];

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
        floorId: room.floorId,
        status: room.status,
        category: cat ? { id: cat.id, name: cat.name, basePrice: cat.basePrice, capacity: cat.capacity } : null,
        bookings: enriched,
      };
    }).sort((a, b) => a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true }));

    res.json({ start: start.toISOString(), end: end.toISOString(), rooms: result });
  });

  app.get("/api/dashboard/stats", async (_req, res) => {
    const stats = await storage.getDashboardStats();
    res.json(stats);
  });

  app.get("/api/staff", async (_req, res) => {
    const members = await storage.getStaffMembers();
    res.json(members);
  });

  app.post("/api/staff", async (req, res) => {
    const parsed = insertStaffSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const member = await storage.createStaffMember(parsed.data);
    res.status(201).json(member);
  });

  app.patch("/api/staff/:id", async (req, res) => {
    const parsed = insertStaffSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const member = await storage.updateStaffMember(req.params.id, parsed.data);
    if (!member) return res.status(404).json({ message: "Staff not found" });
    res.json(member);
  });

  app.delete("/api/staff/:id", async (req, res) => {
    const success = await storage.deleteStaffMember(req.params.id);
    if (!success) return res.status(404).json({ message: "Staff not found" });
    res.json({ message: "Deleted" });
  });

  app.post("/api/treatment-plans/bulk", async (req, res) => {
    const { bookingId, serviceId, staffId, startDate, endDate, dailyTime, notes } = req.body;
    if (!bookingId || !serviceId || !startDate || !endDate || !dailyTime) {
      return res.status(400).json({ message: "bookingId, serviceId, startDate, endDate, dailyTime required" });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: "Invalid dates" });
    }
    if (end < start) {
      return res.status(400).json({ message: "Дуусах огноо эхлэх огнооноос хойно байх ёстой" });
    }
    if (!/^\d{1,2}:\d{2}$/.test(dailyTime)) {
      return res.status(400).json({ message: "Цагийн формат буруу (HH:MM)" });
    }

    const booking = await storage.getBooking(bookingId);
    if (!booking) return res.status(404).json({ message: "Захиалга олдсонгүй" });

    const svc = await storage.getService(serviceId);
    if (!svc) return res.status(404).json({ message: "Эмчилгээ олдсонгүй" });
    const serviceName = svc.name;

    if (staffId) {
      const staffMember = await storage.getStaffMember(staffId);
      if (!staffMember) return res.status(404).json({ message: "Ажилтан олдсонгүй" });
    }

    const plans = [];
    const current = new Date(start);
    while (current <= end) {
      const [hours, minutes] = dailyTime.split(":").map(Number);
      const scheduleTime = new Date(current);
      scheduleTime.setHours(hours, minutes, 0, 0);

      const plan = await storage.createTreatmentPlan({
        bookingId,
        serviceId: serviceId || null,
        serviceName,
        staffId: staffId || null,
        scheduleTime,
        status: "SCHEDULED",
        notes: notes || null,
        completedAt: null,
      });
      plans.push(plan);
      current.setDate(current.getDate() + 1);
    }

    res.status(201).json(plans);
  });

  app.get("/api/daily-schedule", async (req, res) => {
    const dateStr = req.query.date as string;
    const date = dateStr ? new Date(dateStr) : new Date();
    if (isNaN(date.getTime())) {
      return res.status(400).json({ message: "Invalid date" });
    }

    const dayPlans = await storage.getTreatmentPlansByDate(date);

    const bookingIds = Array.from(new Set(dayPlans.map(p => p.bookingId)));
    const planBookings = bookingIds.length > 0
      ? await Promise.all(bookingIds.map(id => storage.getBooking(id)))
      : [];
    const bookingMap = Object.fromEntries(
      planBookings.filter(Boolean).map(b => [b!.id, b!])
    );
    const allGuests = await storage.getGuests();
    const guestMap = Object.fromEntries(allGuests.map(g => [g.id, g]));
    const allRooms = await storage.getRooms();
    const roomMap = Object.fromEntries(allRooms.map(r => [r.id, r]));
    const allStaff = await storage.getStaffMembers();
    const staffMap = Object.fromEntries(allStaff.map(s => [s.id, s]));

    const enriched = dayPlans.map(plan => {
      const booking = bookingMap[plan.bookingId];
      const guest = booking ? guestMap[booking.guestId] : null;
      const room = booking ? roomMap[booking.roomId] : null;
      const staffMember = plan.staffId ? staffMap[plan.staffId] : null;
      return {
        ...plan,
        guest: guest ? { id: guest.id, firstName: guest.firstName, lastName: guest.lastName } : null,
        room: room ? { id: room.id, roomNumber: room.roomNumber } : null,
        staff: staffMember ? { id: staffMember.id, name: staffMember.name, role: staffMember.role } : null,
      };
    }).sort((a, b) => new Date(a.scheduleTime).getTime() - new Date(b.scheduleTime).getTime());

    res.json(enriched);
  });

  app.get("/api/guests/:id/treatment-plans", async (req, res) => {
    const guestId = req.params.id;
    const guestBookings = await storage.getGuestBookings(guestId);

    const allStaff = await storage.getStaffMembers();
    const staffMap = Object.fromEntries(allStaff.map(s => [s.id, s]));
    const allRooms = await storage.getRooms();
    const roomMap = Object.fromEntries(allRooms.map(r => [r.id, r]));

    const allPlans: any[] = [];
    for (const booking of guestBookings) {
      const plans = await storage.getTreatmentPlans(booking.id);
      for (const plan of plans) {
        const staffMember = plan.staffId ? staffMap[plan.staffId] : null;
        const room = roomMap[booking.roomId];
        allPlans.push({
          ...plan,
          room: room ? { id: room.id, roomNumber: room.roomNumber } : null,
          staff: staffMember ? { id: staffMember.id, name: staffMember.name, role: staffMember.role } : null,
        });
      }
    }

    allPlans.sort((a, b) => new Date(a.scheduleTime).getTime() - new Date(b.scheduleTime).getTime());
    res.json(allPlans);
  });

  app.get("/api/settings", async (_req, res) => {
    const all = await storage.getAllSettings();
    const obj: Record<string, string> = {};
    for (const s of all) obj[s.key] = s.value;
    res.json(obj);
  });

  app.put("/api/settings/:key", async (req, res) => {
    const { key } = req.params;
    const { value } = req.body;
    if (typeof value !== "string") {
      res.status(400).json({ error: "value мөр байх ёстой" });
      return;
    }
    const s = await storage.upsertSetting(key, value);
    res.json(s);
  });

  app.post("/api/bookings/:id/extend", async (req, res) => {
    const { id } = req.params;
    const { newCheckOut } = req.body;
    if (!newCheckOut) {
      res.status(400).json({ error: "newCheckOut шаардлагатай" });
      return;
    }
    const booking = await storage.getBooking(id);
    if (!booking) {
      res.status(404).json({ error: "Захиалга олдсонгүй" });
      return;
    }
    if (booking.status !== "CHECKED_IN" && booking.status !== "EXTENDED") {
      res.status(400).json({ error: "Зөвхөн CHECKED_IN эсвэл EXTENDED захиалгыг сунгах боломжтой" });
      return;
    }
    const newDate = new Date(newCheckOut);
    if (isNaN(newDate.getTime()) || newDate <= new Date(booking.checkIn)) {
      res.status(400).json({ error: "Хугацаа буруу байна" });
      return;
    }
    const updated = await storage.updateBooking(id, { checkOut: newDate, status: "EXTENDED" });
    if (!updated) { res.status(500).json({ error: "Шинэчлэх амжилтгүй" }); return; }
    await recalcBookingTotal(id);
    const room = await storage.getRoom(booking.roomId);
    if (room && room.status === "DUE_OUT") {
      await storage.updateRoom(booking.roomId, { status: "OCCUPIED" });
    }
    await storage.createAuditLog({
      operation: "UPDATE",
      entity: "bookings",
      entityId: id,
      beforeJson: { checkOut: booking.checkOut, status: booking.status },
      afterJson: { checkOut: newDate, status: "EXTENDED" },
      source: "api",
    });
    const refreshed = await storage.getBooking(id);
    res.json(refreshed);
  });

  return httpServer;
}

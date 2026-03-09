import { drizzle } from "drizzle-orm/node-postgres";
import { roomCategories, rooms, guests, bookings, services, inventory, serviceMaterials } from "@shared/schema";

const db = drizzle(process.env.DATABASE_URL!);

export async function seedDatabase() {
  const existingCats = await db.select().from(roomCategories);
  if (existingCats.length === 0) {
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
      { roomNumber: "101", floor: 1, categoryId: standard.id, status: "AVAILABLE" as const },
      { roomNumber: "102", floor: 1, categoryId: standard.id, status: "OCCUPIED" as const },
      { roomNumber: "103", floor: 1, categoryId: standard.id, status: "AVAILABLE" as const },
      { roomNumber: "201", floor: 2, categoryId: deluxe.id, status: "AVAILABLE" as const },
      { roomNumber: "202", floor: 2, categoryId: deluxe.id, status: "CLEANING" as const },
      { roomNumber: "301", floor: 3, categoryId: vip.id, status: "AVAILABLE" as const },
      { roomNumber: "302", floor: 3, categoryId: vip.id, status: "OCCUPIED" as const },
      { roomNumber: "401", floor: 4, categoryId: family.id, status: "AVAILABLE" as const },
      { roomNumber: "402", floor: 4, categoryId: family.id, status: "PENDING" as const },
    ]);

    console.log("Room categories and rooms seeded");
  }

  const existingGuests = await db.select().from(guests);
  if (existingGuests.length === 0) {
    const [bat] = await db.insert(guests).values([
      {
        idNumber: "УБ90112233",
        firstName: "Бат-Эрдэнэ",
        lastName: "Дорж",
        phone: "99112233",
        isVip: true,
        medicalHistory: {
          diagnoses: ["Нурууны өвчин", "Цусны даралт ихсэлт"],
          allergies: ["Пенициллин"],
          bloodType: "A+",
          notes: "2024 оны 3-р сард анх ирсэн. Нурууны эмчилгээ хийлгэсэн.",
          medications: ["Амлодипин 5мг", "Ибупрофен"],
        },
      },
    ]).returning();

    await db.insert(guests).values([
      {
        idNumber: "УБ90112234",
        firstName: "Сарантуяа",
        lastName: "Дорж",
        phone: "99112234",
        isVip: false,
        parentId: bat.id,
        medicalHistory: {
          diagnoses: ["Үе мөчний өвчин"],
          allergies: [],
          bloodType: "B+",
          notes: "Гэр бүлээрээ амарч байгаа.",
        },
      },
      {
        idNumber: "УБ90112235",
        firstName: "Тэмүүлэн",
        lastName: "Дорж",
        phone: "99112235",
        isVip: false,
        parentId: bat.id,
        medicalHistory: null,
      },
    ]);

    await db.insert(guests).values([
      {
        idNumber: "ДА85042211",
        firstName: "Мөнхбат",
        lastName: "Ганбат",
        phone: "88001122",
        isVip: false,
        medicalHistory: {
          diagnoses: ["Ходоодны шарх"],
          allergies: ["Аспирин"],
          bloodType: "O-",
          notes: "Жил бүр ирдэг тогтмол зочин.",
          medications: ["Омепразол 20мг"],
        },
      },
      {
        idNumber: "ХН78091100",
        firstName: "Оюунчимэг",
        lastName: "Баяр",
        phone: "95553344",
        isVip: true,
        medicalHistory: {
          diagnoses: ["Чихрийн шижин (Type 2)"],
          allergies: [],
          bloodType: "AB+",
          medications: ["Метформин 500мг"],
        },
      },
    ]);

    console.log("Guests seeded");
  }

  const existingBookings = await db.select().from(bookings);
  if (existingBookings.length === 0) {
    const allRooms = await db.select().from(rooms);
    const allGuests = await db.select().from(guests);

    const room102 = allRooms.find(r => r.roomNumber === "102");
    const room302 = allRooms.find(r => r.roomNumber === "302");
    const room402 = allRooms.find(r => r.roomNumber === "402");

    const guestBat = allGuests.find(g => g.idNumber === "УБ90112233");
    const guestOyun = allGuests.find(g => g.idNumber === "ХН78091100");
    const guestMonkhbat = allGuests.find(g => g.idNumber === "ДА85042211");

    if (room102 && room302 && room402 && guestBat && guestOyun && guestMonkhbat) {
      const now = new Date();
      const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const twoWeeksLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

      await db.insert(bookings).values([
        {
          guestId: guestBat.id,
          roomId: room102.id,
          checkIn: now,
          checkOut: weekLater,
          status: "CHECKED_IN" as const,
          totalAmount: "560000",
          depositPaid: "200000",
        },
        {
          guestId: guestOyun.id,
          roomId: room302.id,
          checkIn: now,
          checkOut: twoWeeksLater,
          status: "CHECKED_IN" as const,
          totalAmount: "3500000",
          depositPaid: "1000000",
        },
        {
          guestId: guestMonkhbat.id,
          roomId: room402.id,
          checkIn: weekLater,
          checkOut: twoWeeksLater,
          status: "PENDING" as const,
          totalAmount: "1400000",
          depositPaid: "0",
        },
      ]);

      console.log("Bookings seeded");
    }
  }

  const existingServices = await db.select().from(services);
  if (existingServices.length === 0) {
    await db.insert(services).values([
      { name: "Нурууны эмчилгээ", description: "Нурууны мэдрэлийн эмчилгээ, массаж", price: "85000", type: "SERVICE" as const },
      { name: "Бүх биеийн массаж", description: "60 минутын бүх биеийн массаж", price: "65000", type: "SERVICE" as const },
      { name: "Халуун рашаан", description: "Халуун рашаан усанд орох үйлчилгээ", price: "45000", type: "SERVICE" as const },
      { name: "Шавар эмчилгээ", description: "Шавар эмчилгээ, арьс арчилгаа", price: "55000", type: "SERVICE" as const },
      { name: "Зүү эмчилгээ", description: "Уламжлалт зүү эмчилгээ", price: "75000", type: "SERVICE" as const },
      { name: "7 хоногийн багц", description: "Массаж + Халуун рашаан + Шавар эмчилгээ (7 хоног)", price: "350000", type: "PACKAGE" as const },
      { name: "14 хоногийн багц", description: "Бүх үйлчилгээ + Зүү эмчилгээ (14 хоног)", price: "650000", type: "PACKAGE" as const },
      { name: "VIP багц", description: "Бүх эмчилгээ + VIP өрөө + Хоол (14 хоног)", price: "1200000", type: "PACKAGE" as const },
    ]);
    console.log("Services seeded");
  }

  const existingInventory = await db.select().from(inventory);
  if (existingInventory.length === 0) {
    const invItems = await db.insert(inventory).values([
      { itemName: "Массажны тос", stockQuantity: "50", unit: "литр", minStockLevel: "10" },
      { itemName: "Алчуур (том)", stockQuantity: "100", unit: "ширхэг", minStockLevel: "20" },
      { itemName: "Шавар багц", stockQuantity: "30", unit: "багц", minStockLevel: "5" },
      { itemName: "Зүү (нэг удаагийн)", stockQuantity: "500", unit: "ширхэг", minStockLevel: "100" },
      { itemName: "Рашааны давс", stockQuantity: "25", unit: "кг", minStockLevel: "5" },
      { itemName: "Ариутгагч шингэн", stockQuantity: "20", unit: "литр", minStockLevel: "5" },
      { itemName: "Нэг удаагийн хөнжил", stockQuantity: "200", unit: "ширхэг", minStockLevel: "50" },
    ]).returning();

    const allSvcs = await db.select().from(services);
    const invMap = Object.fromEntries(invItems.map(i => [i.itemName, i.id]));
    const svcMap = Object.fromEntries(allSvcs.map(s => [s.name, s.id]));

    const bomData: { serviceId: string; inventoryId: string; quantityNeeded: string }[] = [];
    if (svcMap["Нурууны эмчилгээ"]) {
      bomData.push(
        { serviceId: svcMap["Нурууны эмчилгээ"], inventoryId: invMap["Массажны тос"], quantityNeeded: "0.5" },
        { serviceId: svcMap["Нурууны эмчилгээ"], inventoryId: invMap["Алчуур (том)"], quantityNeeded: "2" },
      );
    }
    if (svcMap["Бүх биеийн массаж"]) {
      bomData.push(
        { serviceId: svcMap["Бүх биеийн массаж"], inventoryId: invMap["Массажны тос"], quantityNeeded: "1" },
        { serviceId: svcMap["Бүх биеийн массаж"], inventoryId: invMap["Алчуур (том)"], quantityNeeded: "3" },
      );
    }
    if (svcMap["Халуун рашаан"]) {
      bomData.push(
        { serviceId: svcMap["Халуун рашаан"], inventoryId: invMap["Рашааны давс"], quantityNeeded: "2" },
        { serviceId: svcMap["Халуун рашаан"], inventoryId: invMap["Алчуур (том)"], quantityNeeded: "2" },
      );
    }
    if (svcMap["Шавар эмчилгээ"]) {
      bomData.push(
        { serviceId: svcMap["Шавар эмчилгээ"], inventoryId: invMap["Шавар багц"], quantityNeeded: "1" },
        { serviceId: svcMap["Шавар эмчилгээ"], inventoryId: invMap["Алчуур (том)"], quantityNeeded: "2" },
      );
    }
    if (svcMap["Зүү эмчилгээ"]) {
      bomData.push(
        { serviceId: svcMap["Зүү эмчилгээ"], inventoryId: invMap["Зүү (нэг удаагийн)"], quantityNeeded: "10" },
        { serviceId: svcMap["Зүү эмчилгээ"], inventoryId: invMap["Ариутгагч шингэн"], quantityNeeded: "0.1" },
      );
    }

    if (bomData.length > 0) {
      await db.insert(serviceMaterials).values(bomData);
    }

    console.log("Inventory and BOM seeded");
  }

  console.log("Database seed complete");
}

import { drizzle } from "drizzle-orm/node-postgres";
import { roomCategories, rooms, guests } from "@shared/schema";

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
      { roomNumber: "101", categoryId: standard.id, status: "AVAILABLE" as const },
      { roomNumber: "102", categoryId: standard.id, status: "OCCUPIED" as const },
      { roomNumber: "103", categoryId: standard.id, status: "AVAILABLE" as const },
      { roomNumber: "201", categoryId: deluxe.id, status: "AVAILABLE" as const },
      { roomNumber: "202", categoryId: deluxe.id, status: "CLEANING" as const },
      { roomNumber: "301", categoryId: vip.id, status: "AVAILABLE" as const },
      { roomNumber: "302", categoryId: vip.id, status: "OCCUPIED" as const },
      { roomNumber: "401", categoryId: family.id, status: "AVAILABLE" as const },
      { roomNumber: "402", categoryId: family.id, status: "PENDING" as const },
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

  console.log("Database seed complete");
}

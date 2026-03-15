import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, boolean, timestamp, json, pgEnum, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const roomStatusEnum = pgEnum("room_status", [
  "AVAILABLE",
  "OCCUPIED",
  "PENDING",
  "CLEANING",
  "CLEANING_IN_PROGRESS",
  "INSPECTED",
  "OUT_OF_ORDER",
  "OUT_OF_SERVICE",
  "DUE_OUT",
]);
export const bookingStatusEnum = pgEnum("booking_status", ["PENDING", "CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED", "NO_SHOW", "EXTENDED"]);

export const roomCategories = pgTable("room_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  basePrice: decimal("base_price", { precision: 10, scale: 2 }).notNull(),
  capacity: integer("capacity").notNull(),
});

export const floors = pgTable("floors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  number: text("number").notNull().unique(),
});

export const rooms = pgTable("rooms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roomNumber: text("room_number").notNull().unique(),
  floorId: varchar("floor_id").notNull().references(() => floors.id, { onDelete: "restrict" }),
  categoryId: varchar("category_id").notNull().references(() => roomCategories.id, { onDelete: "cascade" }),
  status: roomStatusEnum("status").default("AVAILABLE").notNull(),
});

export const guests = pgTable("guests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  idNumber: text("id_number").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone").notNull(),
  medicalHistory: json("medical_history"),
  isVip: boolean("is_vip").default(false).notNull(),
  loyaltyPoints: integer("loyalty_points").default(0).notNull(),
  parentId: varchar("parent_id").references((): any => guests.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_guests_parent_id").on(table.parentId),
  index("idx_guests_created_at").on(table.createdAt),
]);

export const bookings = pgTable("bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  guestId: varchar("guest_id").notNull().references(() => guests.id, { onDelete: "restrict" }),
  roomId: varchar("room_id").notNull().references(() => rooms.id, { onDelete: "restrict" }),
  checkIn: timestamp("check_in").notNull(),
  checkOut: timestamp("check_out").notNull(),
  status: bookingStatusEnum("status").default("PENDING").notNull(),
  guestCount: integer("guest_count").default(1).notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  depositPaid: decimal("deposit_paid", { precision: 10, scale: 2 }).default("0").notNull(),
}, (table) => [
  index("idx_bookings_status").on(table.status),
  index("idx_bookings_room_id").on(table.roomId),
  index("idx_bookings_guest_id").on(table.guestId),
  index("idx_bookings_check_in").on(table.checkIn),
  index("idx_bookings_check_out").on(table.checkOut),
  index("idx_bookings_status_check_in").on(table.status, table.checkIn),
]);

export const staff = pgTable("staff", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  role: text("role").notNull(),
  phone: text("phone"),
  isActive: boolean("is_active").default(true).notNull(),
});

export const treatmentPlans = pgTable("treatment_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bookingId: varchar("booking_id").notNull().references(() => bookings.id, { onDelete: "restrict" }),
  serviceId: varchar("service_id").references((): any => services.id, { onDelete: "set null" }),
  serviceName: text("service_name").notNull(),
  staffId: varchar("staff_id").references(() => staff.id, { onDelete: "set null" }),
  scheduleTime: timestamp("schedule_time").notNull(),
  status: text("status").notNull(),
  notes: text("notes"),
  completedAt: timestamp("completed_at"),
}, (table) => [
  index("idx_treatment_plans_booking_id").on(table.bookingId),
  index("idx_treatment_plans_schedule_time").on(table.scheduleTime),
]);

export const inventory = pgTable("inventory", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  itemName: text("item_name").notNull().unique(),
  stockQuantity: decimal("stock_quantity", { precision: 10, scale: 2 }).notNull(),
  unit: text("unit").notNull(),
  minStockLevel: decimal("min_stock_level", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const materialUsages = pgTable("material_usages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  treatmentId: varchar("treatment_id").notNull().references(() => treatmentPlans.id, { onDelete: "restrict" }),
  inventoryId: varchar("inventory_id").notNull().references(() => inventory.id, { onDelete: "restrict" }),
  quantityUsed: decimal("quantity_used", { precision: 10, scale: 2 }).notNull(),
  usageDate: timestamp("usage_date").defaultNow().notNull(),
});

export const serviceMaterials = pgTable("service_materials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  serviceId: varchar("service_id").notNull().references((): any => services.id, { onDelete: "cascade" }),
  inventoryId: varchar("inventory_id").notNull().references(() => inventory.id, { onDelete: "restrict" }),
  quantityNeeded: decimal("quantity_needed", { precision: 10, scale: 2 }).notNull(),
});

export const inventoryPurchases = pgTable("inventory_purchases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  inventoryId: varchar("inventory_id").notNull().references(() => inventory.id, { onDelete: "restrict" }),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  purchaseDate: timestamp("purchase_date").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bookingId: varchar("booking_id").notNull().references(() => bookings.id, { onDelete: "restrict" }),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  type: text("type").notNull(),
  paymentMethod: text("payment_method").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_transactions_booking_id").on(table.bookingId),
  index("idx_transactions_created_at").on(table.createdAt),
]);

export const serviceTypeEnum = pgEnum("service_type", ["SERVICE", "PACKAGE"]);

export const services = pgTable("services", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  type: serviceTypeEnum("type").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const packageServices = pgTable("package_services", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  packageId: varchar("package_id").notNull().references((): any => services.id, { onDelete: "cascade" }),
  serviceId: varchar("service_id").notNull().references((): any => services.id, { onDelete: "restrict" }),
});

export const bookingServices = pgTable("booking_services", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bookingId: varchar("booking_id").notNull().references(() => bookings.id, { onDelete: "restrict" }),
  serviceId: varchar("service_id").notNull().references((): any => services.id, { onDelete: "restrict" }),
  quantity: integer("quantity").default(1).notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
}, (table) => [
  index("idx_booking_services_booking_id").on(table.bookingId),
]);

export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull(),
  action: text("action").notNull(),
  description: text("description").notNull(),
  targetTable: text("target_table").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const settings = pgTable("settings", {
  key: varchar("key").primaryKey(),
  value: text("value").notNull(),
});

export const insertStaffSchema = createInsertSchema(staff).omit({ id: true });
export const insertRoomCategorySchema = createInsertSchema(roomCategories).omit({ id: true });
export const insertFloorSchema = createInsertSchema(floors).omit({ id: true });
export const insertRoomSchema = createInsertSchema(rooms).omit({ id: true }).extend({
  status: z.enum(["AVAILABLE", "OCCUPIED", "PENDING", "CLEANING", "CLEANING_IN_PROGRESS", "INSPECTED", "OUT_OF_ORDER", "OUT_OF_SERVICE", "DUE_OUT"]).optional(),
});
export const insertGuestSchema = createInsertSchema(guests).omit({ id: true, createdAt: true });
export const insertBookingSchema = createInsertSchema(bookings).omit({ id: true });
export const insertTreatmentPlanSchema = createInsertSchema(treatmentPlans).omit({ id: true });
export const insertInventorySchema = createInsertSchema(inventory).omit({ id: true, createdAt: true });
export const insertMaterialUsageSchema = createInsertSchema(materialUsages).omit({ id: true });
export const insertTransactionSchema = createInsertSchema(transactions).omit({ id: true, createdAt: true });
export const insertServiceSchema = createInsertSchema(services).omit({ id: true, createdAt: true });
export const insertPackageServiceSchema = createInsertSchema(packageServices).omit({ id: true });
export const insertBookingServiceSchema = createInsertSchema(bookingServices).omit({ id: true });
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, timestamp: true });
export const insertServiceMaterialSchema = createInsertSchema(serviceMaterials).omit({ id: true });
export const insertInventoryPurchaseSchema = createInsertSchema(inventoryPurchases).omit({ id: true, createdAt: true });

export type RoomCategory = typeof roomCategories.$inferSelect;
export type InsertRoomCategory = z.infer<typeof insertRoomCategorySchema>;
export type Floor = typeof floors.$inferSelect;
export type InsertFloor = z.infer<typeof insertFloorSchema>;
export type Room = typeof rooms.$inferSelect;
export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type Guest = typeof guests.$inferSelect;
export type InsertGuest = z.infer<typeof insertGuestSchema>;
export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type TreatmentPlan = typeof treatmentPlans.$inferSelect;
export type InsertTreatmentPlan = z.infer<typeof insertTreatmentPlanSchema>;
export type Inventory = typeof inventory.$inferSelect;
export type InsertInventory = z.infer<typeof insertInventorySchema>;
export type MaterialUsage = typeof materialUsages.$inferSelect;
export type InsertMaterialUsage = z.infer<typeof insertMaterialUsageSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Service = typeof services.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;
export type PackageService = typeof packageServices.$inferSelect;
export type InsertPackageService = z.infer<typeof insertPackageServiceSchema>;
export type BookingService = typeof bookingServices.$inferSelect;
export type InsertBookingService = z.infer<typeof insertBookingServiceSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type ServiceMaterial = typeof serviceMaterials.$inferSelect;
export type InsertServiceMaterial = z.infer<typeof insertServiceMaterialSchema>;
export type InventoryPurchase = typeof inventoryPurchases.$inferSelect;
export type InsertInventoryPurchase = z.infer<typeof insertInventoryPurchaseSchema>;
export type Staff = typeof staff.$inferSelect;
export type InsertStaff = z.infer<typeof insertStaffSchema>;
export type Setting = typeof settings.$inferSelect;

import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, boolean, timestamp, json, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const roomStatusEnum = pgEnum("room_status", ["AVAILABLE", "OCCUPIED", "PENDING", "CLEANING"]);
export const bookingStatusEnum = pgEnum("booking_status", ["PENDING", "CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED"]);

export const roomCategories = pgTable("room_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  basePrice: decimal("base_price", { precision: 10, scale: 2 }).notNull(),
  capacity: integer("capacity").notNull(),
});

export const rooms = pgTable("rooms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roomNumber: text("room_number").notNull().unique(),
  floor: integer("floor").notNull().default(1),
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
});

export const bookings = pgTable("bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  guestId: varchar("guest_id").notNull(),
  roomId: varchar("room_id").notNull(),
  checkIn: timestamp("check_in").notNull(),
  checkOut: timestamp("check_out").notNull(),
  status: bookingStatusEnum("status").default("PENDING").notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  depositPaid: decimal("deposit_paid", { precision: 10, scale: 2 }).default("0").notNull(),
});

export const treatmentPlans = pgTable("treatment_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bookingId: varchar("booking_id").notNull(),
  serviceName: text("service_name").notNull(),
  scheduleTime: timestamp("schedule_time").notNull(),
  status: text("status").notNull(),
});

export const inventory = pgTable("inventory", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  itemName: text("item_name").notNull().unique(),
  stockQuantity: decimal("stock_quantity", { precision: 10, scale: 2 }).notNull(),
  unit: text("unit").notNull(),
  minStockLevel: decimal("min_stock_level", { precision: 10, scale: 2 }).notNull(),
});

export const materialUsages = pgTable("material_usages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  treatmentId: varchar("treatment_id").notNull(),
  inventoryId: varchar("inventory_id").notNull(),
  quantityUsed: decimal("quantity_used", { precision: 10, scale: 2 }).notNull(),
});

export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bookingId: varchar("booking_id").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  type: text("type").notNull(),
  paymentMethod: text("payment_method").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

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

export const bookingServices = pgTable("booking_services", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bookingId: varchar("booking_id").notNull(),
  serviceId: varchar("service_id").notNull(),
  quantity: integer("quantity").default(1).notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
});

export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull(),
  action: text("action").notNull(),
  description: text("description").notNull(),
  targetTable: text("target_table").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const insertRoomCategorySchema = createInsertSchema(roomCategories).omit({ id: true });
export const insertRoomSchema = createInsertSchema(rooms).omit({ id: true });
export const insertGuestSchema = createInsertSchema(guests).omit({ id: true, createdAt: true });
export const insertBookingSchema = createInsertSchema(bookings).omit({ id: true });
export const insertTreatmentPlanSchema = createInsertSchema(treatmentPlans).omit({ id: true });
export const insertInventorySchema = createInsertSchema(inventory).omit({ id: true });
export const insertMaterialUsageSchema = createInsertSchema(materialUsages).omit({ id: true });
export const insertTransactionSchema = createInsertSchema(transactions).omit({ id: true, createdAt: true });
export const insertServiceSchema = createInsertSchema(services).omit({ id: true, createdAt: true });
export const insertBookingServiceSchema = createInsertSchema(bookingServices).omit({ id: true });
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, timestamp: true });

export type RoomCategory = typeof roomCategories.$inferSelect;
export type InsertRoomCategory = z.infer<typeof insertRoomCategorySchema>;
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
export type BookingService = typeof bookingServices.$inferSelect;
export type InsertBookingService = z.infer<typeof insertBookingServiceSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const cartridges = pgTable("cartridges", {
  id: serial("id").primaryKey(),
  brand: text("brand").notNull(),
  model: text("model").notNull(),
  color: text("color").notNull().default("N/A"),
  barcode: text("barcode"),
  printers: text("printers").notNull().default(""),
  quantity: integer("quantity").notNull().default(0),
  minThreshold: integer("min_threshold").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

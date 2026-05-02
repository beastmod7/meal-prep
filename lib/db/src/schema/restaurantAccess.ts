import { pgTable, text, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { portalUsersTable } from "./portalUsers";
import { restaurantsTable } from "./restaurants";

export const restaurantAccessTable = pgTable(
  "restaurant_access",
  {
    userId: text("user_id")
      .notNull()
      .references(() => portalUsersTable.id, { onDelete: "cascade" }),
    restaurantId: text("restaurant_id")
      .notNull()
      .references(() => restaurantsTable.id, { onDelete: "cascade" }),
    grantedAt: timestamp("granted_at").defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.restaurantId] })],
);

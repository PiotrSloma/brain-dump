import { sql } from "drizzle-orm";
import { index, sqliteTableCreator } from "drizzle-orm/sqlite-core";

export const createTable = sqliteTableCreator((name) => `brain-dump_${name}`);

export const categories = createTable(
	"category",
	(d) => ({
		id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
		userId: d.text().notNull(),
		name: d.text({ length: 100 }).notNull(),
		createdAt: d
			.integer({ mode: "timestamp" })
			.default(sql`(unixepoch())`)
			.notNull(),
	}),
	(t) => [index("category_user_idx").on(t.userId)],
);

export const entries = createTable(
	"entry",
	(d) => ({
		id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
		userId: d.text().notNull(),
		content: d.text().notNull(),
		categoryId: d.integer({ mode: "number" }).references(() => categories.id),
		createdAt: d
			.integer({ mode: "timestamp" })
			.default(sql`(unixepoch())`)
			.notNull(),
		updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
	}),
	(t) => [
		index("entry_user_idx").on(t.userId),
		index("entry_category_idx").on(t.categoryId),
	],
);

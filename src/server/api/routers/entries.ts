import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { entries } from "~/server/db/schema";

export const entriesRouter = createTRPCRouter({
	list: protectedProcedure.query(async ({ ctx }) => {
		return ctx.db
			.select()
			.from(entries)
			.where(eq(entries.userId, ctx.userId))
			.orderBy(desc(entries.createdAt))
			.limit(50);
	}),

	create: protectedProcedure
		.input(z.object({ content: z.string().min(1).max(2000) }))
		.mutation(async ({ ctx, input }) => {
			const [entry] = await ctx.db
				.insert(entries)
				.values({
					userId: ctx.userId,
					content: input.content.trim(),
				})
				.returning();
			return entry;
		}),
});

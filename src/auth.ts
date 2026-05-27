import { compareSync } from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

import { env } from "~/env";

export const { handlers, auth, signIn, signOut } = NextAuth({
	providers: [
		Credentials({
			credentials: {
				email: { label: "Email", type: "email" },
				password: { label: "Password", type: "password" },
			},
			async authorize(credentials) {
				const parsed = z
					.object({ email: z.string().email(), password: z.string() })
					.safeParse(credentials);

				if (!parsed.success) return null;

				const { email, password } = parsed.data;

				if (email !== env.ADMIN_EMAIL) return null;
				if (!compareSync(password, env.ADMIN_PASSWORD_HASH)) return null;

				return { id: env.ADMIN_EMAIL, email: env.ADMIN_EMAIL };
			},
		}),
	],
	session: {
		strategy: "jwt",
	},
	pages: {
		signIn: "/login",
	},
	callbacks: {
		authorized({ auth: session }) {
			return !!session?.user;
		},
	},
});

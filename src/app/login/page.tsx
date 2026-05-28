"use client";

import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";

export default function LoginPage() {
	const router = useRouter();
	const [error, setError] = useState<string | null>(null);
	const [pending, setPending] = useState(false);

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const form = e.currentTarget;
		const email = (form.elements.namedItem("email") as HTMLInputElement).value;
		const password = (form.elements.namedItem("password") as HTMLInputElement)
			.value;

		setPending(true);
		setError(null);

		const result = await signIn("credentials", {
			email,
			password,
			redirect: false,
		});

		setPending(false);

		if (result?.error) {
			setError("Nieprawidłowy email lub hasło.");
			return;
		}

		router.push("/");
	}

	return (
		<main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
			<div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm">
				<h1 className="mb-6 font-semibold text-2xl text-gray-900">BrainDump</h1>
				<form className="flex flex-col gap-4" onSubmit={handleSubmit}>
					<div className="flex flex-col gap-1">
						<label
							className="font-medium text-gray-700 text-sm"
							htmlFor="email"
						>
							Email
						</label>
						<input
							autoComplete="email"
							className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500"
							id="email"
							name="email"
							required
							type="email"
						/>
					</div>
					<div className="flex flex-col gap-1">
						<label
							className="font-medium text-gray-700 text-sm"
							htmlFor="password"
						>
							Hasło
						</label>
						<input
							autoComplete="current-password"
							className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500"
							id="password"
							name="password"
							required
							type="password"
						/>
					</div>
					{error && <p className="text-red-600 text-sm">{error}</p>}
					<button
						className="mt-2 rounded-lg bg-gray-900 px-4 py-2 font-medium text-sm text-white transition-colors hover:bg-gray-700 disabled:opacity-50"
						disabled={pending}
						type="submit"
					>
						{pending ? "Logowanie..." : "Zaloguj się"}
					</button>
				</form>
			</div>
		</main>
	);
}

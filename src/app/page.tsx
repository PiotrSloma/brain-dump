import { redirect } from "next/navigation";

import { auth } from "~/auth";

export default async function Home() {
	const session = await auth();
	if (!session?.user) redirect("/login");

	return (
		<main className="flex min-h-screen flex-col items-center justify-center gap-4">
			<h1 className="font-semibold text-2xl">BrainDump</h1>
			<p className="text-gray-500 text-sm">
				Zalogowano jako {session.user.email}
			</p>
		</main>
	);
}

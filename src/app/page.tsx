import { redirect } from "next/navigation";
import { CaptureFeed } from "~/app/_components/capture-feed";
import { auth } from "~/auth";
import { api, HydrateClient } from "~/trpc/server";

export default async function Home() {
	const session = await auth();
	if (!session?.user) redirect("/login");

	void api.entries.list.prefetch();

	return (
		<HydrateClient>
			<CaptureFeed />
		</HydrateClient>
	);
}

"use client";

import { useEffect, useRef, useState } from "react";

import type { RouterOutputs } from "~/trpc/react";
import { api } from "~/trpc/react";

type EntryRow = RouterOutputs["entries"]["list"][number];

function formatTimestamp(date: Date): string {
	const now = new Date();
	const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const yesterdayStart = new Date(todayStart);
	yesterdayStart.setDate(todayStart.getDate() - 1);
	const dateStart = new Date(
		date.getFullYear(),
		date.getMonth(),
		date.getDate(),
	);
	const time = date.toLocaleTimeString("pl-PL", {
		hour: "2-digit",
		minute: "2-digit",
	});
	if (dateStart >= todayStart) return `dziś o ${time}`;
	if (dateStart >= yesterdayStart) return `wczoraj o ${time}`;
	return `${date.toLocaleDateString("pl-PL", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	})} o ${time}`;
}

export function CaptureFeed() {
	const [content, setContent] = useState("");
	const [error, setError] = useState<string | null>(null);
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const utils = api.useUtils();

	useEffect(() => {
		textareaRef.current?.focus();
	}, []);

	const { data: entries = [] } = api.entries.list.useQuery();

	const { mutate, isPending } = api.entries.create.useMutation({
		onMutate: async ({ content: text }) => {
			setError(null);
			await utils.entries.list.cancel();
			const previous = utils.entries.list.getData();
			const optimistic: EntryRow = {
				id: -Date.now(),
				userId: "",
				content: text,
				categoryId: null,
				createdAt: new Date(),
				updatedAt: null,
			};
			utils.entries.list.setData(undefined, (old) => [
				optimistic,
				...(old ?? []),
			]);
			return { previous };
		},
		onError: (_err, variables, ctx) => {
			if (ctx?.previous !== undefined) {
				utils.entries.list.setData(undefined, ctx.previous);
			}
			setContent(variables.content);
			setError("Nie udało się zapisać wpisu. Spróbuj ponownie.");
		},
		onSettled: () => {
			void utils.entries.list.invalidate();
		},
	});

	function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			const text = content.trim();
			if (!text || isPending) return;
			setContent("");
			mutate({ content: text });
		}
	}

	return (
		<main className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 px-4 py-8">
			<h1 className="font-semibold text-2xl text-gray-900">BrainDump</h1>

			<div className="flex flex-col gap-2">
				<textarea
					className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-gray-900 text-sm outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 disabled:opacity-50"
					disabled={isPending}
					onChange={(e) => setContent(e.target.value)}
					onKeyDown={handleKeyDown}
					placeholder="Co masz na myśli? (Enter = zapisz, Shift+Enter = nowa linia)"
					ref={textareaRef}
					rows={3}
					value={content}
				/>
				{error && <p className="text-red-600 text-sm">{error}</p>}
			</div>

			<ul className="flex flex-col gap-3">
				{entries.length === 0 ? (
					<li className="text-gray-400 text-sm">Brak wpisów. Napisz coś…</li>
				) : (
					entries.map((entry) => (
						<li
							className="flex flex-col gap-1 rounded-xl border border-gray-100 bg-white px-4 py-3"
							key={entry.id}
						>
							<p className="whitespace-pre-wrap text-gray-900 text-sm">
								{entry.content}
							</p>
							<div className="flex items-center gap-2">
								<span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-500 text-xs">
									nieprzypisana
								</span>
								<span
									className="text-gray-400 text-xs"
									suppressHydrationWarning
								>
									{formatTimestamp(entry.createdAt)}
								</span>
							</div>
						</li>
					))
				)}
			</ul>
		</main>
	);
}

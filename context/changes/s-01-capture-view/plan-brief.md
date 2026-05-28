# S-01 Capture + Instant View — Plan Brief

> Full plan: `context/changes/s-01-capture-view/plan.md`

## What & Why

Pierwsza funkcja którą użytkownik faktycznie używa. Pole tekstowe na górze strony, Enter = zapisz, wpis pojawia się natychmiast bez czekania na serwer. Bez AI (to S-02) — kategoria to placeholder "nieprzypisana". Cel: zamknąć pętlę przechwytywania myśli end-to-end.

## Starting Point

F-01 (auth) i F-02 (schema: `entries`, `categories`) są gotowe. Home page pokazuje tylko "Zalogowano jako {email}". `appRouter` jest pusty — brak domain procedur. `TRPCReactProvider` i `protectedProcedure` gotowe do użycia.

## Desired End State

Strona główna: textarea na górze + lista wpisów poniżej. Wpisujesz myśl, naciskasz Enter — wpis pojawia się na liście w ciągu milisekund (optimistic UI), persystuje do Turso. Każdy wpis: tekst, szara chipka "nieprzypisana", hybryda timestamp (dziś/wczoraj/data). Empty state przy pierwszym wejściu.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
|---|---|---|
| Architektura strony | RSC shell + Client island | Szybszy first load (dane w HTML), `HydrateClient` prefetchuje listę server-side |
| Optimistic UI | setData + rollback | Wpis widoczny natychmiast — spełnia FR-004 "zawsze zapisany" bez opóźnienia |
| Błąd mutacji | Inline error + przywróć tekst | Użytkownik nie traci treści — to guardrail produktu |
| Format wpisu | Treść + chip + timestamp | Chipka "nieprzypisana" ma naturalne miejsce na rozbudowę w S-02 |
| Timestamp | Hybryda (dziś/wczoraj/data) | Czytelny na mobile, bez zewnętrznej biblioteki |
| Limit listy | 50 wpisów, bez paginacji | Wystarczy na tygodnie MVP; do poprawki w S-03 |
| Walidacja | min 1, max 2000 znaków | Zod na serwerze + `maxLength` na kliencie |

## Scope

**In scope:** `entries.list` + `entries.create` tRPC, optimistic update, CaptureFeed component, RSC page shell, timestamp utility, empty state, inline error recovery

**Out of scope:** AI classification (S-02), category grouping (S-02), edit/archive (S-03), paginacja, date-fns

## Architecture / Approach

```
page.tsx (RSC)
  └─ auth() check + redirect
  └─ api.entries.list.prefetch()  ← server-side
  └─ <HydrateClient>
       └─ <CaptureFeed />  ← "use client"
            ├─ textarea (Enter=submit, Shift+Enter=newline)
            ├─ api.entries.create.useMutation() + optimistic setData
            └─ api.entries.list.useQuery() → entry rows
```

Jeden Client Component owning textarea + list. Mutacja: onMutate prepends temp entry (id: -Date.now()), onError restores, onSettled invalidates.

## Phases at a Glance

| Phase | What it delivers | Key risk |
|---|---|---|
| 1. Entries router | `entries.list` + `entries.create`, rejestracja w root, usunięcie `@ts-expect-error` | Drizzle `.returning()` zwraca array — trzeba destructure `[entry]` |
| 2. Capture + Feed UI | CaptureFeed component + RSC page shell | Optimistic ID collision (użyj ujemnego `Date.now()`) |

**Prerequisites:** F-01 ✅, F-02 ✅  
**Estimated effort:** 1 sesja, 2 fazy

## Open Risks & Assumptions

- Timestamp jest po stronie klienta — przy SSR może być hydration mismatch (zaadresuj przez `suppressHydrationWarning` na elemencie czasu lub renderuj timestamp tylko po mounted)
- Po 50+ wpisach starsze znikają z widoku — świadomie odroczone do S-03

## Success Criteria (Summary)

- Wpisujesz tekst, Enter → wpis pojawia się natychmiast bez page reload
- Po odświeżeniu wpis nadal istnieje (Turso)
- Przy błędzie sieci — tekst wraca do textarea, widoczny komunikat błędu

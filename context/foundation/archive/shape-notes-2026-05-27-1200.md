---
project: "BrainDump"
context_type: greenfield
created: 2026-05-25
updated: 2026-05-25
checkpoint:
  current_phase: 8
  phases_completed: [1, 2, 3, 4, 5, 6, 7]
  gray_areas_resolved:
    - topic: "core pain locus"
      decision: "capturing — zero friction at moment of writing is the product contract; no decisions at input time"
    - topic: "categories"
      decision: "AI creates and evolves categories dynamically from empty state; no predefined list"
    - topic: "keyword routing"
      decision: "demoted to nice-to-have; AI handles project detection from content; prefix routing is v2"
    - topic: "insight"
      decision: "existing tools require a taxonomy decision at capture moment — cognitive cost that blocks ADHD users; this product removes all capture-time decisions"
    - topic: "enter key"
      decision: "Enter = submit, Shift+Enter = new line (chat-UI pattern)"
    - topic: "delete behavior"
      decision: "soft delete / archive instead of hard delete"
  frs_drafted: 10
  quality_check_status: accepted
product_type: web-app
target_scale:
  users: small
timeline_budget:
  mvp_weeks: 2
  hard_deadline: "2026-07-05"
  after_hours_only: true
---

## Vision & Problem Statement

Każde istniejące narzędzie do notatek wymaga decyzji w momencie zapisu: folder, tag, workspace, notatnik. Dla użytkownika z ADHD zarządzającego równoległymi projektami ten kognitywny koszt jest blokadą — myśl ginie, zanim zdąży trafić na ekran.

Insight: narzędzie do przechwytywania myśli nie powinno nic pytać użytkownika w momencie zapisu. Cały ciężar sortowania i przypisywania kontekstu może i powinien należeć do aplikacji, nie do użytkownika. Istniejące narzędzia (Notion, Obsidian, Bear, Apple Notes) budowane są dla użytkowników którzy utrzymują taksonomię — to jest różnica, której brakuje.

## User & Persona

**Piotr** — jeden użytkownik, ADHD, prowadzi równolegle 4 projekty zawodowe. Sięga po aplikację w każdym momencie, gdy pojawia się myśl: pomysł do projektu, przypomnienie miłej chwili, zadanie do zrobienia, refleksja. Moment interakcji jest zawsze krótki i rozproszony — przerwa między zadaniami, szybki flash podczas pracy, wieczorna sesja.

Potrzeba: jedno pole, jeden enter, koniec. Klasyfikacja i kontekst projektu — widoczne po fakcie, bez żadnej decyzji po stronie użytkownika podczas pisania.

## Success Criteria

### Primary
- Zalogowany użytkownik wpisuje tekst, naciska enter, widzi wpis przypisany do kategorii przez AI. Całkowity czas od zatwierdzenia do widoczności wpisu w widoku nie blokuje użytkownika.

### Secondary
- Użytkownik może edytować lub przenieść do archiwum istniejący wpis po fakcie.

### Guardrails
- Wpis ZAWSZE jest zapisywany — nawet jeśli klasyfikacja AI się nie powiedzie lub zajmie za długo. Brak danych to niedopuszczalny błąd.
- Dane użytkownika nie trafiają nigdzie poza kontekstem niezbędnym do wywołania AI (LLM API). Żadnego logowania treści wpisów na zewnętrznych serwisach.

## User Stories

### US-01: Przechwycenie myśli z automatyczną kategoryzacją

- **Given** zalogowany użytkownik na stronie głównej
- **When** wpisuje tekst w główne pole i zatwierdza enterem
- **Then** wpis pojawia się w widoku, przypisany do kategorii wybranej przez AI

#### Acceptance Criteria
- Wpis widoczny w widoku natychmiast po zatwierdzeniu (nawet jeśli AI jeszcze przetwarza)
- Kategoria wyświetlona przy wpisie
- Jeśli klasyfikacja AI nie zakończyła się: wpis widoczny jako "nieprzypisany", bez blokady UI

## Functional Requirements

### Autentykacja
- FR-001: Użytkownik może zalogować się emailem i hasłem. Priority: must-have
  > Socrates: Kontrargument rozważony: "hardkodowany token wystarczy dla single-user MVP." Rozwiązanie: zostawiono — dane są prywatne i muszą być chronione nawet przy jednym użytkowniku; sesja z hasłem to minimalny standard bezpieczeństwa.
- FR-002: Użytkownik niezalogowany jest przekierowywany do strony logowania. Priority: must-have
  > Socrates: Brak kontrargumentu. Oczywiste zachowanie bezpieczeństwa.

### Przechwytywanie wpisów
- FR-003: Użytkownik może wpisać tekst w wieloliniowe pole i zatwierdzić jedną akcją (Enter = submit, Shift+Enter = nowa linia). Priority: must-have
  > Socrates: Kontrargument rozważony: "Enter może zakończyć wpis zbyt wcześnie przy wieloliniowym tekście." Rozwiązanie: Enter = submit, Shift+Enter = nowa linia. Standardowy pattern chat-UI, rozwiązuje konflikt.
- FR-004: Wpis jest zawsze zapisywany niezależnie od wyniku klasyfikacji AI. Priority: must-have
  > Socrates: Brak kontrargumentu. To guardrail produktu — bez niego aplikacja jest bezwartościowa.

### Klasyfikacja AI
- FR-005: Aplikacja automatycznie przypisuje każdy wpis do kategorii na podstawie treści, używając listy już istniejących kategorii jako kontekstu. Priority: must-have
  > Socrates: Kontrargument rozważony: "kategorie bez zamrożonej listy mogą być chaotyczne; koszt LLM per wpis może być zauważalny." Rozwiązanie: AI ma dostęp do listy aktualnych kategorii jako kontekst — to stabilizuje klasyfikację. Koszt API jest akceptowany jako trade-off wobec wartości zero-friction.

### Widok wpisów
- FR-006: Użytkownik może przeglądać wszystkie wpisy pogrupowane według kategorii przypisanych przez AI. Priority: must-have
  > Socrates: Brak kontrargumentu. Bez widoku aplikacja jest czarną dziurą.

### Zarządzanie wpisami (nice-to-have)
- FR-007: Użytkownik może edytować treść istniejącego wpisu. Priority: nice-to-have
  > Socrates: Kontrargument rozważony: "edycja treści może wymagać re-klasyfikacji przez AI — co dzieje się z kategorią po edycji?" Rozwiązanie: otwarte pytanie → Open Questions.
- FR-008: Użytkownik może przenieść wpis do archiwum (soft delete). Priority: nice-to-have
  > Socrates: Kontrargument rozważony: "soft delete + archiwum lepsze niż hard delete — przy ADHD archiwum może być przydatne ('czy już to miałem?')." Rozwiązanie: FR zaktualizowany z hard delete na soft delete/archiwum.

### Routing projektowy (nice-to-have)
- FR-009: Użytkownik może wymusić przypisanie wpisu do projektu przez użycie prefixu (nadpisuje AI). Priority: nice-to-have
  > Socrates: Kontrargument rozważony: "dobry model AI wykryje projekt z treści bez prefixu — prefix to obejście słabego klasyfikatora." Rozwiązanie: zdegradowany do nice-to-have. MVP polega na AI. Prefix routing to v2.
- FR-010: Użytkownik może definiować i zarządzać własną listą projektów i słów kluczowych. Priority: nice-to-have
  > Socrates: Kontrargument rozważony: "konfiguracja to dodatkowy ekran poza głównym flow." Rozwiązanie: zdegradowany do nice-to-have razem z FR-009. Na MVP projekty mogą być zasiane bezpośrednio w bazie.

## Non-Functional Requirements

- Aplikacja jest użyteczna na małych ekranach (telefony komórkowe), bez wymogu instalacji natywnej aplikacji.

## Business Logic

Aplikacja decyduje do której kategorii należy każda zapisana myśl użytkownika.

Dane wejściowe: treść wpisu tekstowego + lista kategorii aktualnie istniejących w systemie dla danego użytkownika. Nie ma predefiniowanej listy kategorii — AI tworzy je i rozszerza dynamicznie od pustego stanu, grupując wpisy w spójne skupiska znaczeniowe. AI zna bieżący zestaw kategorii i bierze go pod uwagę przy każdej nowej klasyfikacji.

Wyjście: przypisanie wpisu do kategorii (istniejącej lub nowo nazwanej). Użytkownik widzi wynik jako etykietę przy wpisie w widoku. Użytkownik nie ma wpływu na decyzję w momencie zapisu — widzi ją po fakcie.

## Access Control

MVP: jeden użytkownik, logowanie email + hasło. Brak ról, brak współdzielenia.

Architektura NIE powinna zakładać na zawsze single-user — w przyszłości możliwi inni użytkownicy (osobne konta, osobne dane). Ale w MVP nie ma nic do implementowania poza "zalogowany / niezalogowany".

Niezalogowany użytkownik → przekierowanie na stronę logowania. Brak rejestracji publicznej (tylko Piotr ma konto).

## Non-Goals

- Brak współdzielenia wpisów z innymi użytkownikami — brak team workspace, brak udostępniania linkami, brak współpracy. MVP jest single-user.
- Brak wyszukiwania pełnotekstowego — widok pogrupowany według kategorii to jedyna nawigacja po wpisach w MVP.
- Brak eksportu danych (PDF, CSV, Markdown) — dane zostają w aplikacji. Eksport to scope przyszłej wersji.
- Brak notyfikacji i reminderów do zadań — aplikacja nie jest todo app z alarmami. Wpisane zadania widoczne w widoku, ale nie pushowane.

## Open Questions

1. **Re-klasyfikacja po edycji wpisu** — gdy użytkownik edytuje treść wpisu, czy AI powinna ponownie przypisać kategorię? Właściciel: Piotr. Blokuje: FR-007 (nice-to-have); nie blokuje MVP.
2. **Stabilizacja kategorii** — jak zapobiec chaotycznemu rozrastaniu się listy kategorii gdy AI dynamicznie je tworzy? Np. czy podobne kategorie (Zadania / Zadania do zrobienia / TODO) powinny być scalane? Właściciel: Piotr. Blokuje: FR-005 (must-have); wymaga decyzji przed implementacją.
3. **Widok projektu vs. kategoria** — w nice-to-have FR-009 wpisy mają przypisanie projektu ORAZ kategorię. Jak te dwa wymiary współistnieją w widoku? Osobne zakładki? Filtry? Właściciel: Piotr. Blokuje: FR-009/010 (nice-to-have); nie blokuje MVP.

## Quality Cross-Check

All 5 items: accepted.
- Access Control: present
- Business Logic: present (one-sentence rule)
- Project artifacts: present
- Timeline-cost: present (2 weeks ≤ 3)
- Non-Goals: present (4 entries)
- Preserved behavior: n/a (greenfield)

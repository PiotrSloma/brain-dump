---
project: "BrainDump"
version: 1
status: draft
created: 2026-05-25
context_type: greenfield
product_type: web-app
target_scale:
  users: small
  qps: low
  data_volume: small
timeline_budget:
  mvp_weeks: 2
  hard_deadline: "2026-07-05"
  after_hours_only: true
---

## Vision & Problem Statement

Każde istniejące narzędzie do notatek wymaga decyzji w momencie zapisu: folder, tag, workspace, notatnik. Dla użytkownika z ADHD zarządzającego równoległymi projektami ten kognitywny koszt jest blokadą — myśl ginie, zanim zdąży trafić na ekran.

Istniejące narzędzia do notatek budowane są dla użytkowników, którzy utrzymują taksonomię. Narzędzie do przechwytywania myśli nie powinno nic pytać użytkownika w momencie zapisu — cały ciężar sortowania i przypisywania kontekstu może i powinien należeć do aplikacji, nie do użytkownika. To jest różnica, której brakuje.

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
- Dane użytkownika nie trafiają poza kontekstem niezbędnym do realizacji klasyfikacji. Treść wpisów nie jest logowana na zewnętrznych serwisach.

## User Stories

### US-01: Przechwycenie myśli z automatyczną kategoryzacją

- **Given** zalogowany użytkownik na stronie głównej
- **When** wpisuje tekst w główne pole i zatwierdza enterem
- **Then** wpis pojawia się w widoku, przypisany do kategorii wybranej przez AI

#### Acceptance Criteria
- Wpis widoczny w widoku natychmiast po zatwierdzeniu (nawet jeśli AI jeszcze przetwarza)
- Kategoria wyświetlona przy wpisie
- Jeśli klasyfikacja AI nie zakończyła się: wpis widoczny jako "nieprzypisany", bez blokady UI

### US-02: Routing wpisu do projektu przez prefix (nice-to-have)

- **Given** zalogowany użytkownik z zdefiniowanym projektem "API_HUB"
- **When** wpisuje tekst zaczynający się od "API_HUB" i zatwierdza
- **Then** wpis trafia do projektu "API_HUB" bez pytania o kategorię

#### Acceptance Criteria
- Prefix rozpoznawany niezależnie od wielkości liter
- Jeśli prefix nie istnieje na liście projektów, wpis trafia do klasyfikacji AI jak zwykły tekst
- Użytkownik widzi przypisanie projektu przy wpisie w widoku

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
  > Socrates: Kontrargument rozważony: "kategorie bez zamrożonej listy mogą być chaotyczne; koszt klasyfikacji per wpis może być zauważalny." Rozwiązanie: system ma dostęp do listy aktualnych kategorii jako kontekst — to stabilizuje klasyfikację. Koszt jest akceptowany jako trade-off wobec wartości zero-friction.

### Widok wpisów
- FR-006: Użytkownik może przeglądać wszystkie wpisy pogrupowane według kategorii przypisanych przez AI. Priority: must-have
  > Socrates: Brak kontrargumentu. Bez widoku aplikacja jest czarną dziurą.

### Zarządzanie wpisami
- FR-007: Użytkownik może edytować treść istniejącego wpisu. Priority: nice-to-have
  > Socrates: Kontrargument rozważony: "edycja treści może wymagać ponownej klasyfikacji — co dzieje się z kategorią po edycji?" Rozwiązanie: otwarte pytanie → Open Questions.
- FR-008: Użytkownik może przenieść wpis do archiwum. Priority: nice-to-have
  > Socrates: Kontrargument rozważony: "archiwum zamiast trwałego usunięcia — przy ADHD archiwum może być przydatne ('czy już to miałem?')." Rozwiązanie: FR zaktualizowany z trwałego usunięcia na archiwizację.

### Routing projektowy
- FR-009: Użytkownik może wymusić przypisanie wpisu do projektu przez użycie prefixu (nadpisuje klasyfikację AI). Priority: nice-to-have
  > Socrates: Kontrargument rozważony: "dobry model klasyfikacji wykryje projekt z treści bez prefixu — prefix to obejście słabego klasyfikatora." Rozwiązanie: zdegradowany do nice-to-have. MVP polega na klasyfikacji AI. Prefix routing to v2.
- FR-010: Użytkownik może definiować i zarządzać własną listą projektów i słów kluczowych. Priority: nice-to-have
  > Socrates: Kontrargument rozważony: "konfiguracja to dodatkowy ekran poza głównym flow." Rozwiązanie: zdegradowany do nice-to-have razem z FR-009. Na MVP projekty mogą być wstępnie skonfigurowane.

## Non-Functional Requirements

- Aplikacja jest użyteczna na małych ekranach (telefony komórkowe), bez wymogu instalacji natywnej aplikacji.

## Business Logic

Aplikacja decyduje do której kategorii należy każda zapisana myśl użytkownika.

Dane wejściowe reguły: treść wpisu tekstowego oraz lista kategorii aktualnie istniejących dla danego użytkownika. Nie ma predefiniowanej listy kategorii — kategorie tworzone i rozszerzane są dynamicznie od pustego stanu, grupując wpisy w spójne skupiska znaczeniowe. Każda nowa klasyfikacja uwzględnia bieżący zestaw kategorii jako kontekst.

Wyjście reguły: przypisanie wpisu do kategorii (istniejącej lub nowo nazwanej). Użytkownik widzi wynik jako etykietę przy wpisie w widoku. Użytkownik nie ma wpływu na decyzję w momencie zapisu — widzi ją po fakcie.

## Access Control

Jeden użytkownik; logowanie emailem i hasłem. Brak ról, brak współdzielenia.

Architektura nie powinna zakładać trwałej single-user izolacji — w przyszłości możliwe konta dla innych użytkowników (osobne dane, osobne kategorie). W MVP zakres to wyłącznie "zalogowany / niezalogowany".

Niezalogowany użytkownik jest przekierowywany do strony logowania. Brak publicznej rejestracji.

## Non-Goals

- Brak współdzielenia wpisów z innymi użytkownikami — brak team workspace, brak udostępniania linkami, brak współpracy. MVP jest single-user.
- Brak wyszukiwania pełnotekstowego — widok pogrupowany według kategorii to jedyna nawigacja po wpisach w MVP.
- Brak eksportu danych (PDF, CSV, Markdown) — dane zostają w aplikacji. Eksport to scope przyszłej wersji.
- Brak notyfikacji i reminderów do zadań — aplikacja nie jest todo app z alarmami. Wpisane zadania widoczne w widoku, ale nie pushowane.

## Open Questions

1. **Stabilizacja kategorii** — jak zapobiec chaotycznemu rozrastaniu się listy kategorii tworzonych dynamicznie? Np. czy podobne kategorie (Zadania / Zadania do zrobienia / TODO) powinny być scalane? Właściciel: Piotr. Blokuje: FR-005 (must-have); wymaga decyzji przed implementacją.
2. **Re-klasyfikacja po edycji wpisu** — gdy użytkownik edytuje treść wpisu, czy kategoria powinna być ponownie przypisana? Właściciel: Piotr. Blokuje: FR-007 (nice-to-have); nie blokuje MVP.
3. **Widok projektu vs. kategoria** — wpisy mogą mieć przypisanie projektu ORAZ kategorię (FR-009/010). Jak te dwa wymiary współistnieją w widoku? Osobne zakładki? Filtry? Właściciel: Piotr. Blokuje: FR-009/010 (nice-to-have); nie blokuje MVP.
4. **Mierzalność Primary Success Criterion** — "nie blokuje użytkownika" wymaga doprecyzowania jako konkretny limit czasowy (np. widoczność w widoku < 2 s od zatwierdzenia). Właściciel: Piotr. Blokuje: testy akceptacyjne.

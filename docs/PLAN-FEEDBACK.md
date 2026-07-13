# PLAN — Docent-feedback & peer-feedback (masterplan week 2 + 5)

## Deel 1 — Docent-feedback (gebouwd, week 2)

**Doel**: de pedagogische cirkel rond — opdracht → maken → inleveren → feedback → verbeteren. Dit was hét functionele gat t.o.v. SoundTrap/BandLab for Education.

**Kernprobleem dat de architectuur bepaalde**: een klas-inzending had geen bewaarcode en er is geen leerling-identiteit, dus feedback kon de leerling nooit bereiken. Oplossing: **elke klas-inzending mint automatisch een bewaarcode** (de bestaande 6-char code = de per-leerling-handle, zonder account).

### Datamodel (migratie 026)
- `submissions`: `feedback_sticker` (vaste set: star/rhythm/build/teamwork/surprise/target), `feedback_level` (1-3), `feedback_text` (≤300), `feedback_at`, `teacher_seen_at`, `submitted_at`.
- `submitted_at` is nodig omdat élke v2-inzending een save_code heeft: het dashboard splitst voortaan Ingeleverd (`submitted_at` gezet, of legacy zonder save_code) vs. In bewerking (save_code zonder `submitted_at`). Migratie backfillt legacy-rijen.
- RPC's: `set_submission_feedback` + `mark_submission_seen` (SECURITY DEFINER, klas-ownership, rate limited) · `submit_or_update_composition_v2` (mint save_code+secret, RETURNS `(submission_id, save_code)`; v1 blijft bestaan voor oude clients) · `load_saved_composition` uitgebreid met feedbackvelden (DROP+CREATE, extra kolommen zijn backward-compatible).

### Flows
- **Docent**: opent inzending → `mark_submission_seen` → FeedbackPanel (sticker + 1-3 sterren + tekstje) → versturen. SubmissionCard toont status **nieuw** (pulserende badge) / **beoordeeld** (sticker + sterren); ClassDetail toont "{n} nieuw". Digibord = de fullscreen SubmissionPlayer met het paneel. Geen printblad (bewuste keuze Bert).
- **Leerling**: na inleveren toont het podium "Jouw code: XXXXXX" (auto-gemint; ook in localStorage `soundscout:class-feedback-code`). Terugkomen via "Ik heb een code" → studio toont de FeedbackBanner. Op hetzelfde apparaat checkt het startscherm stil op nieuwe feedback → "💌 Je hebt een reactie!"-knop → modal. Alles faalt geruisloos zonder migratie/offline.
- **Client-fallback**: `submitOrUpdateComposition` probeert v2, valt bij PGRST202 terug op v1 (geen code) — deploy-volgorde maakt dus niet uit.

### E2E-test (na migratie 026, door Bert)
1. Leerling-browser: klascode invoeren → componeren → Podium → Opslaan → **code-kaart verschijnt** onder de knoppen.
2. Docent: klas openen → inzending heeft **Nieuw**-badge en teller → afspelen (badge verdwijnt bij refresh: beluisterd) → sticker + sterren + tekstje → Versturen → kaart toont **Beoordeeld**.
3. Tweede leerling-browser (of incognito): "Ik heb een code" → de code → studio opent **met feedback-banner**.
4. Eerste leerling-browser: app opnieuw openen → "💌 Je hebt een reactie"-knop op het startscherm → modal toont sticker/sterren/tekst; daarna niet opnieuw (dedup).
5. RLS: tweede docentaccount → `set_submission_feedback` op andermans inzending → hoort te falen.

## Deel 2 — Peer-feedback via feedbackkaarten (ontwerp, bouw in week 5)

**Keuze Bert (2026-07-13)**: de complimenten-dimensies zijn niet hard-coded maar **door de docent in te stellen** via een **feedbackkaart** — mogelijk als losse feature, analoog aan de opdrachtkaart.

### Model (volgt het `assignment_cards`-patroon)
- Tabel `feedback_cards`: `teacher_id` (NULL = ingebouwd, zoals `lesson_cards.builtin_key`), `title`, `chips JSONB` (max ~8 chips: `{key, emoji, label_nl, label_en}`), RLS CRUD op eigen kaarten.
- Ingebouwde default-kaarten per dimensie: ritme & puls · opbouw & vorm · klankkleur & verrassing · past-bij-beeld. Docent kan kopiëren/aanpassen of eigen chips maken.
- `class_assignments.feedback_card_id UUID NULL` (`ON DELETE SET NULL`) + `peer_review_enabled BOOLEAN DEFAULT FALSE` — docent zet "klasgenoten luisteren" aan per opdracht en kiest de kaart.
- Tabel `peer_feedback`: `submission_id`, `from_submission_id` (anoniem — géén namen), `chips TEXT[]`, `created_at`; UNIQUE (submission_id, from_submission_id).

### Runtime-flow
1. Leerling levert in → als `peer_review_enabled`: "Luister naar 3 klasgenoten"-scherm.
2. RPC `get_peer_review_batch(p_class_code, p_own_submission_id)`: 3-4 willekeurige inzendingen uit dezelfde klas+opdracht, **nooit eigen werk**, voorkeur voor werk met de minste ontvangen reviews (eerlijke spreiding), rate limited.
3. Per fragment: afspelen → 1-2 chips van de feedbackkaart kiezen. **Geen vrije tekst** (moderatierisico bij kinderen).
4. RPC `submit_peer_feedback(...)`: valideert chips tegen de kaart, idempotent per (ontvanger, gever).
5. Ontvanger ziet complimenten **anoniem geaggregeerd** ("3 klasgenoten kozen: Lekker ritme!") — via `load_saved_composition`-uitbreiding en in het docentendashboard.

### Open ontwerppunten (beslissen bij de bouw, week 5)
- Verplicht vs. vrijwillig na inleveren (voorstel: uitnodigend maar overslaanbaar).
- Feedbackkaart-editor: eigen tab onder "Mijn opdrachten" (consistent met opdrachtkaarten) of geïntegreerd in de activatie-modal.
- Weergave voor de ontvanger: aggregatie op het podium én in de feedback-banner.
- Docent-moderatie: teller per inzending in ClassDetail; chips zijn vooraf goedgekeurd dus risico is laag.

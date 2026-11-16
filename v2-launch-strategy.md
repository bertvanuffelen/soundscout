# SoundScout V2 — Launch and Growth Strategy

> Status: **APPROVED** (approved by Bert, 15-11-2026) · Companion to `v2-architecture-proposal.md`.
> It stays inside the eleven locked decisions: Dutch and English only, no microphone, no generative AI, privacy by default, static hosting on Strato with `deel.soundscout.nl` for previews, no blog.
> Facts about laws, curricula and events were checked on the web on 15-11-2026. What was confirmed and what was not is listed in **Verification** at the end. Nothing here is legal advice.
> No testimonial, user number, award or quote in this document is real. Every such slot is a marked placeholder.

## Locked decisions (15-11-2026)

These eight decisions are final. Where older text in this document differed, it has been changed to match.

| # | Topic | Decision |
|---|---|---|
| 1 | Business model | **Everything free for individual teachers through 2027**, to win market share. Paid school and district licences come later. `docs/FREEMIUM-OPTIES.md` proposal 3 is the direction. |
| 2 | The child's name | **The free-text name fields in the save and share modals stay.** The FAQ and privacy texts are rewritten to say that a name *can* be entered; every "anonymous" claim goes. |
| 3 | Which English | **British English.** The UK comes first. |
| 4 | US route | **Organic only ("teachers find us").** Bert does not pursue or sign district agreements (NDPA) as a sole trader. |
| 5 | US legal budget | **Zero.** No paid US privacy review, and therefore **no active US promotion**. |
| 6 | Data location | **100 % EU (Supabase EU region).** Accept that some strict US schools will block it; present EU storage as a strength to European schools. |
| 7 | A face on the page | **Bert front and centre:** name, photo and background as music teacher and pabo lecturer. |
| 8 | Typed names on public share pages | **Hidden by default** when the V2 share page is built (Phase 5b), in line with V2 decision 10 (privacy by default). |

Added 16-11-2026:

| # | Topic | Decision |
|---|---|---|
| 9 | Name when saving online | **Optional.** An empty field saves under a generated alias (built in the dark start-screen step, commit a63cea5). |
| 10 | Teacher-portal redesign (branch `claude/docentenportaal-ombouw`, head 1d260c7) | **Integrated once, into V2, after the staging test**; it goes live with the December release. Not merged into `main` first: V2 already contains all of `main`, and the portal conflicts with V2 in 14 files (incl. `Playhead.tsx`, `ActivateAssignmentModal.tsx`, the teacher hooks), so a detour via `main` would mean resolving the conflicts twice. Work on its own branch with a PR into the V2 branch; bring back the title toggle (migration 037) and `ClassMembersPanel` (038–042), the latter as a class-level section; re-run runbook block F afterwards. Sinterklaas still ships on V1 `main` before 5 December. |

## Summary

**The position.** The teacher page explains the product well and proves nothing: there is no class work to hear, no teacher's voice, and the first action is "create an account". Abroad, the blocker is paperwork and English lesson material, not promotion. Growth has to come from the lesson travelling with the children's work, because one person cannot do outreach in three countries.

**The ten moves, in order**

| # | Move | Needs V2 code? | When |
|---|---|---|---|
| 1 | Put one real class on the teacher page: an album with names off, playable without login, with the lesson it came from | No | Dec 2026 |
| 2 | Make "Kies een les en start" the main action everywhere, with the account inside that action | Copy now; fast path in Phase 3c | Dec 2026, then 3c |
| 3 | Add "Made with the lesson *X* — use it in your class" to the public album and shared player that exist today | Small change in the current app | Jan 2027 |
| 4 | Publish "Privacy en veiligheid voor scholen" with a data map, EU storage stated plainly, and a downloadable data agreement, in both languages | No | Jan 2027 |
| 5 | Rewrite the FAQ and privacy texts so they say a name can be entered (decision 2); add a hint to both name fields | Text only | Dec 2026 |
| 6 | English base (British English): `/en/teacher`, the four built-in lessons as English pages with PDFs, three English videos, England and US curriculum blocks | Generator change only | Feb 2027 |
| 7 | Five UK teachers run one lesson each and report what broke; one free online session through a music hub | No | Mar–May 2027 |
| 8 | Put Bert on the page: name, photo, music teacher and pabo lecturer (decision 7) | No | Dec 2026 |
| 9 | Ship the playable hero and the two-minute teacher path | Phase 3c | with V2 |
| 10 | Switch on showcase pages, teacher-to-teacher lesson sharing, embed and preview images, and measure the loop | Phase 5b | with V2 |

Moves 1–8 do not wait for V2. If V2 slips, they still stand.

**What not to do**

- No promotion abroad before moves 4 and 6 are done.
- No active promotion in the US at all, no US privacy review and no district agreements (NDPA or state contracts). US teachers who find SoundScout are welcome; nobody is sent to find them.
- No paid advertising, no exhibition stand, no travel to the US.
- No third language and no second English spelling variant.
- No blog, no scheduled newsletter, no daily social media.
- No LMS or rostering integrations (Google Classroom, Clever, ClassLink); class codes are the answer for now.
- No per-state mappings or approvals in the US; respond when a district asks.
- No public gallery, leaderboards, pupil profiles or public comments.
- No invented or paraphrased testimonials, no logos without written permission, no counts that are not true on the day.
- No referral rewards for teachers; the lesson link is the mechanism.
- No microphone or AI feature to answer a competitor.

**Ambition check.** "The leading music-education app internationally" is not a twelve-month result for one person. A twelve-month result that is worth having: clearly the best soundscape-composition tool for ages 7–12, proven with Dutch classes, and a repeatable way into UK primary schools. US teachers who arrive on their own are a bonus, not a target. Each step below earns the next.

---

## 1. Landing page: what is missing to convert

### 1.1 What exists and what is missing

Checked against `src/pages/TeacherLandingPage.tsx`, `teacher.html` and `public/les/`.

| Visitor's need | Exists today | Missing |
|---|---|---|
| Understand it in ten seconds | Hero animation; H1 is "SoundScout"; tagline "Compositietool voor het basisonderwijs" | A headline that states the outcome; sound within one tap (playable hero, Phase 3c) |
| See a real result | Three screen-recorded videos, Dutch spoken | Real class work to listen to, with no login |
| Start without commitment | "Log in of maak een gratis account" | "Kies een les en start" as the first action; account inside it |
| Trust | Trust strip, privacy band, eleven-question FAQ | A person (Bert, name and face); any third-party voice; a data agreement to download (now "op aanvraag") |
| Fit my role | One page for everyone | Short blocks for the music specialist, the school leader or ICT coordinator, and parents |
| Fit my country | Kerndoelen 54–56 | The new Dutch kerndoelen; England and US blocks on the English page |
| Read it in English | Translated interface strings | English videos; English lesson pages (the four `/les/` pages are Dutch only); a static `/en/teacher` |
| Know the cost | "De basis blijft gratis", low in the FAQ | "Gratis" in the hero strip. Decided: free for individual teachers through 2027 (locked decision 1). Hero line: "Gratis voor leerkrachten" / "Free for teachers" |
| Take the lesson away | Four lesson pages | A PDF per lesson: all four have `pdf: null` in `scripts/les-pages-data.json` |

### 1.2 Teacher page, section by section

Order for `/teacher` and `/en/teacher`. Existing sections are reordered; five are new.

| # | Section | Content | Status |
|---|---|---|---|
| 1 | Hero | Outcome headline, one-sentence sub, primary button, secondary "Luister naar een klas", trust strip with "Gratis" first | Rewrite |
| 2 | **Hear a class** | One real album in the lite player (today: the existing album viewer), names off. Caption: which lesson, which year group, how many lessons | **New** |
| 3 | Start in two minutes | Three steps; step 1 is "Kies een les", not "Maak een klas" | Rewrite |
| 4 | Lessons | Existing lesson browser; every card ends in "Gebruik deze les in mijn klas" and shows its duration | CTA changes |
| 5 | Three ways to compose | Existing | Keep |
| 6 | **"Ik ben niet muzikaal"** | Three reassurances and a 30-second clip of the "start the lesson" screen | **New** |
| 7 | Feedback, sequencer, themes | Existing, moved down: they show depth, not first value | Keep |
| 8 | **For your school** | No installation, no pupil accounts, devices, data agreement download, cost | **New** |
| 9 | Curriculum | NL: kerndoelen. EN: tabs "England" and "United States" (§2.2) | Extend |
| 10 | **Who makes this** | Photo of Bert, two sentences, link to workshops | **New** |
| 11 | **What teachers say** | Real quotes only; the section is not rendered until three exist | **New**, empty |
| 12 | FAQ | Existing eleven, plus "Kan dit zonder digibord?" and, in English, "Where is the data stored?" | Extend |
| 13 | Final CTA | Same button as the hero | New |

### 1.3 Student home (`/` and `/en/`)

For children first, nearly wordless: code bar on top ("Ik heb een code"), the playable hero, three exits ("Verder bouwen" · "Ik heb een code" · "Voor leerkrachten"), a strip of three example soundscapes, two lines for parents, footer. This is §6.4 of the proposal; nothing is added here except the parent lines and the listen strip.

### 1.4 Copy, Dutch and English

All lines are templates to test, not claims of fact. English uses "your class" and "children" so the same page reads naturally in the UK ("pupils") and the US ("students").

| Slot | Dutch | English |
|---|---|---|
| H1, option A | Je klas componeert een eigen soundscape | Your class composes its own soundscape |
| H1, option B | Muziek maken met de hele klas, ook als je zelf geen muziekdocent bent | Composing with the whole class, even if you are not a music specialist |
| Sub | Kinderen verzamelen geluiden, bouwen er een soundscape mee en laten die horen op het digibord. Jij kiest een les en deelt een klascode. | Children collect sounds, build a soundscape and present it on the classroom board. You pick a lesson and share a class code. |
| Primary button | Kies een les en start | Pick a lesson and start |
| Secondary button | Luister naar een klas | Listen to a class |
| Trust strip | Gratis · Geen leerlingaccounts · Werkt op Chromebook, iPad en digibord | Free · No student accounts · Works on Chromebooks, iPads and the classroom board |
| Section 2 caption | Groep 6 · les "Robotfabriek" · twee lessen | Ages 9–10 · lesson "Robot Factory" · two lessons |
| Section 6 title | Je hoeft geen noten te kunnen lezen | You do not need to read music |
| Section 6 body | De les vertelt wat je zegt en wanneer. De geluiden passen bij elkaar, dus het klinkt snel goed. | The lesson tells you what to say and when. The sounds fit together, so it sounds good quickly. |
| Section 8 title | Voor directie en ICT | For school leaders and IT |
| Section 10 title | Wie maakt SoundScout? | Who makes SoundScout? |
| Section 10 body | Ik ben Bert van Uffelen, muziekdocent en docent aan de pabo. Ik bouw SoundScout zelf, en test elke les met echte klassen. | I'm Bert van Uffelen, a music teacher and a lecturer in primary teacher training. I build SoundScout myself and test every lesson with real classes. |
| EU storage line | Alle gegevens staan in de EU. | All data is stored in the EU. |
| Section 8 body | Niets installeren. Geen leerlingaccounts. Geen tracking, geen advertenties. Werk wordt na één schooljaar verwijderd. Download de verwerkersovereenkomst. | Nothing to install. No student accounts. No tracking, no ads. Work is deleted after one school year. Download the data processing agreement. |
| Student hero | Tik op een geluid. Bouw je eigen soundscape. | Tap a sound. Build your own soundscape. |
| Parent lines | SoundScout is gratis. Je kind heeft geen account nodig. Een naam invullen mag, maar hoeft niet. | SoundScout is free. Your child needs no account. Entering a name is optional. |
| Under shared work | Gemaakt met de les "…". Gebruik deze les in je klas. | Made with the lesson "…". Use it in your class. |

The section 2 caption is an example of the format; fill it with the real class. Do not write "in één les" unless the lesson cards say so: a promise the first lesson breaks costs more than an honest "twee lessen".

### 1.5 Value per audience, and their objections

| Audience | One-sentence proposition | Objection | Answer on the page |
|---|---|---|---|
| Class teacher | "Kies een les, deel een code, en je klas componeert." | "Ik ben niet muzikaal" · "Geen tijd" | Section 6; duration on every lesson card; the two-minute path |
| Music specialist | "Echt componeren: vorm, lagen en herhaling, met feedbackcriteria die jij kiest." | "Is dit een speeltje?" | Sequencer, sections, feedback cards, Listening Mirror; curriculum block |
| School leader, ICT | "Niets installeren, geen leerlingaccounts, verwerkersovereenkomst klaar om te tekenen." | Privacy · cost · devices | Section 8 and the privacy page; state the phone limit honestly (decision 9) |
| Parent | "Gratis, geen account, geen advertenties." | "Is het veilig?" | Two lines and the privacy link |
| Any teacher | — | "Het wordt alleen herrie" | Six sounds in the bag and a listening question per lesson: the limit is the pedagogy |

### 1.6 Social proof: a collection plan

| Proof | Whom to ask | How | Shown as | Consent |
|---|---|---|---|---|
| Teacher quotes | Teachers who activated a lesson twice; workshop participants; pabo colleagues | Personal e-mail from Bert, three questions: what did you do, what surprised you, what would you tell a colleague | One or two sentences, first name, role, school type, region | Written reply to the text below |
| Class work | Two or three classes Bert knows | Teacher shares the album; Bert asks to feature it | Album with names off, class title chosen by the teacher | School permission; removable on request |
| Usage figures | The anonymous `usage_stats` table | Publish only a number that is true on the day, with the date | One line | None needed (aggregate) |
| Expert voice | Dutch music-education and teacher-training colleagues | Ask for a review, not an endorsement | Link to their own text | Their publication |

Consent text (NL): *"Ik geef SoundScout toestemming om bovenstaande uitspraak te tonen op soundscout.nl en in promotiemateriaal, met mijn voornaam, functie en regio. Ik kan deze toestemming altijd intrekken per e-mail; de uitspraak wordt dan binnen een week verwijderd."*
Consent text (EN): *"I give SoundScout permission to show the statement above on soundscout.nl and in promotional material, with my first name, role and region. I can withdraw this permission at any time by e-mail; the statement will then be removed within one week."*

Layout placeholder, never to be published: `[QUOTE — real teacher, first name, role, region — consent pending]`.

---

## 2. International rollout

### 2.1 Order: Netherlands, then UK, then US

| Order | Market | Why | Gate before promotion |
|---|---|---|---|
| 1 | Netherlands | The network and the proof are here | Three consented quotes and two example classes |
| 2 | UK, England first | UK GDPR is close to the AVG and data can flow both ways (§2.4); composing is statutory at Key Stage 2; a few national bodies reach most music leads | English lessons, videos and the privacy page |
| 3 | US | Organic only (decisions 4 and 5): the English pages and US curriculum block are there for teachers who find them; no outreach, no review, no district contracts | — (no promotion planned) |

### 2.2 Curriculum alignment

One generated page per system. Use the system's own words and link to the source. Never write "fully aligned"; say which statements a lesson addresses.

| System | Source and status | SoundScout addresses | It does not |
|---|---|---|---|
| Netherlands | Kerndoelen 54–56 on the page today. New kerndoelen kunst en cultuur: SLO published the final concept in November 2025; planned legal date 1-8-2027; schools are encouraged to use them from 2026/27. | Add the new goals next to 54–56 now; drop the old ones after 1-8-2027 | — |
| England, current | National curriculum, music, KS2: pupils "improvise and compose music for a range of purposes using the inter-related dimensions of music" (statutory) | Composing, listening with attention to detail, structure, texture, dynamics | Singing, instruments, staff notation, music history |
| England, guidance | Model Music Curriculum, March 2021 (non-statutory) | Composing strand, Years 3–6 | The rest |
| England, coming | Revised national curriculum: final version due spring 2027, first teaching September 2028 | Re-map in spring 2027; a page that already cites the new text will be early | — |
| US | National Core Arts Standards (2014): four processes and eleven anchor standards. Creating = anchors 1–3 (Imagine; Plan and Make; Evaluate, Refine, Present). Responding = anchors 7–9 (Select and Analyze; Interpret; Evaluate). | Creating in full; Responding through feedback cards and the Listening Mirror; anchor 6 (Present) through the board presentation | Instrumental and vocal performance |
| Scotland, Wales | Curriculum for Excellence (Expressive Arts); Curriculum for Wales (Expressive Arts) | Do not map until a teacher there asks | — |

US states adopt or adapt the national standards. Name the national framework; do not build fifty mappings.

### 2.3 Terminology and devices

| Topic | Netherlands | UK | US | Rule |
|---|---|---|---|---|
| Age band | groep 5–8 | Years 3–6 (KS2) | Grades 3–5, some 6 | Show ages plus the local label. The English interface already shows ages ("Ages 8-10"); add the label on lesson pages |
| Children | leerlingen | pupils | students | Marketing copy: "children", "your class". Interface: "students". Remove "pupils" from the English interface, which now mixes both |
| Board | digibord | interactive whiteboard | interactive display | "classroom board" |
| Teacher | leerkracht, vakleerkracht | class teacher, music lead | classroom teacher, music specialist | Name both in the audience blocks |
| Praatplaat | praatplaat | sound map | sound map | Keep; ask the five UK teachers |
| Spelling | — | colour, programme | color, program | **British English** (locked decision 3). Avoid words that differ in buttons and headings, so US visitors are not put off |

Devices: Chromebooks are widely used in US schools and iPads and Chromebooks in UK primaries, but I found no share figure I would quote. What follows for the product does not depend on the number: test on a low-end managed Chromebook behind a school filter; publish an "allowlist these domains" note for IT (soundscout.nl, deel.soundscout.nl, the Supabase project domain); add a "works without headphones" tip to each lesson (pairs, low volume).

### 2.4 Compliance: what a school will ask for

SoundScout's design helps: no student accounts, no trackers, no ads, automatic deletion. Schools still want it in writing.

**First, the child's name (locked decision 2).** The class-code flow submits under a generated alias (`useStageSave` passes the pseudonym). Two places let a child type a name, and they stay: `ShareWithTeacherModal` (the older submit route) and `SaveOnlineModal`. Composition titles are free text too. So the texts change, not the code (move 5):

| Text | Now | New (NL) | New (EN) |
|---|---|---|---|
| Teacher FAQ, privacy answer (`teacher.html`, landing FAQ) | "Leerlingen werken anoniem met een willekeurige schuilnaam" | Leerlingen hebben geen account, geen e-mailadres en geen wachtwoord. Bij inleveren met een klascode krijgen ze automatisch een schuilnaam. Bij opslaan of delen kan een kind zelf een naam invullen; dat hoeft niet. Wij raden een voornaam of de schuilnaam aan. | Children have no account, no e-mail address and no password. When they hand in work with a class code, they get an alias automatically. When saving or sharing, a child can type a name; this is optional. We recommend a first name or the alias. |
| Privacy statement (`privacy.*` in i18n) | "Je werkt dan anoniem" | Je krijgt een willekeurige schuilnaam. Vul je zelf een naam in, gebruik dan alleen je voornaam. | You get a random alias. If you type a name yourself, use only your first name. |
| Hint under both name fields | — | Alleen je voornaam, of laat leeg voor een schuilnaam. | First name only, or leave it empty for an alias. |

Check every other occurrence of "anoniem" / "anonymous" in `nl.json`, `en.json` and `teacher.html` before release; peer review stays anonymous between classmates and that sentence may stay.

**Remaining risk to know about.** A name typed in the share modal appears publicly on the listen page ("door …" in `SharedPlayer`). That sits uneasily with locked V2 decision 10 (names off by default on public pages), which was written for class showcases. The hint text above limits it until V2. Decided (locked decision 8): the V2 share page built in Phase 5b hides a typed name by default.

| Gate | What was confirmed | What SoundScout needs |
|---|---|---|
| **COPPA** (US) | The amended rule was published 22-04-2025; general compliance date 22-04-2026. The FTC did not codify the proposed school-authorisation exception; it stays FTC guidance: a school may consent for a parent when the data is used only for the educational purpose. An IP address counts as a persistent identifier; one used only for the service's internal operations is treated differently from one used for profiling or advertising. | A data map: alias or typed name, composition data, class link, server logs at Supabase and Strato. A typed name is personal information. With no US promotion and no review (decisions 4 and 5), say plainly on the English page that SoundScout is built for European schools and that US schools use it under their own assessment. |
| **FERPA** (US) | Vendors act under the "school official" exception, 34 CFR 99.31(a)(1)(i)(B): the school outsources a function and keeps direct control over use and maintenance of the records. A vendor who can change its terms alone weakens that control. | Terms that say: use only for the school's purpose, no resale, deletion on request, changes announced in advance. |
| **District agreements** (US) | The Student Data Privacy Consortium's National Data Privacy Agreement (v2) is the common contract; a vendor obtains the state-specific version from a participating district or alliance. Commentators note its audit clause can let several districts audit one company. The Student Privacy Pledge was retired on 25-04-2025; do not plan around it. | Not signed (locked decision 4). If a district asks, answer politely that SoundScout does not sign district agreements. |
| **US state laws** | Examples: California SOPIPA, New York Education Law 2-d, Illinois SOPPA. | Not pursued. |
| **Data location** | The privacy text says "server in de EU". | 100 % EU (locked decision 6). Name the Supabase EU region and the sub-processors on the page, and lead with it for Dutch and UK schools. Some US districts require US storage; that loss is accepted. |
| **UK GDPR, Children's Code** | The ICO's Age Appropriate Design Code has 15 standards and can apply to edtech. The ICO published "Edtech examined" on 24-06-2026, an audit of 28 providers; recurring gaps were processor/controller status, school contracts, data-flow mapping, minimisation and retention. A statutory edtech code is promised; no date found. | Answer exactly those five gaps on the privacy page. A UK data protection officer will check them. |
| **UK schools' own DPIA** | DfE guidance asks schools for a DPIA on higher-risk edtech. | A pre-filled DPIA helper a school can adapt. |
| **UK–EU transfers** | The European Commission renewed the UK adequacy decisions on 19-12-2025, valid to 27-12-2031 (EU to UK). The UK treats the EEA as adequate (UK to EU). | One sentence on the page; no extra contract clauses needed. |

**The one deliverable that covers most of this:** a public page **"Privacy en veiligheid voor scholen" / "Privacy and safety for schools"** with the data map, sub-processors and region, retention periods, the data agreement as a download, the DPIA helper, and short notes per country. Replace "Verwerkersovereenkomst op aanvraag" with the download.

### 2.5 Channels and calendar

| Market | Where teachers are | One concrete action |
|---|---|---|
| NL | Bert's workshops and pabo network; music- and culture-education bodies | Collect the quotes and example classes (§1.6) |
| UK | Music Mark and the Music Hubs; Music Teachers Association; Music Teacher magazine. Note: the DfE's new National Centre for Arts Education is planned to take over the hub network from 1-9-2027 | Offer one free online session to one hub in spring 2027; submit a lesson to a resource collection, not an advert |
| UK event | Music & Drama Education Expo, London, 11–12 February 2027 (free entry) | Visit as a delegate to listen and to find the five test teachers. Skip Bett |
| US | NAfME and the state music educators associations; elementary music teacher groups online | None (locked decisions 4 and 5). If a US teacher shares SoundScout, the English lesson pages and the US curriculum block catch them |

| Period | NL | England | US | Consequence |
|---|---|---|---|---|
| Aug–Sep | Year starts | Starts early September | Starts August to early September | Back-to-school lesson pack in NL and EN by end of August |
| Oct–Dec | Sinterklaas, Christmas themes | Autumn term, Christmas performances | Fall, holiday concerts | Sinterklaas live in NL and EN from November 2026; Christmas theme in English by October 2027 |
| Jan–Mar | Spring projects | Spring term; Expo | Music In Our Schools Month | English material live by **February 2027** |
| Apr–Jul | Project weeks, presentations | Summer term, lighter after Year 6 tests | Year ends May–June; vetting for next year | UK test lessons in March–May |

### 2.6 What must exist in English before any promotion abroad

1. `/en/` and `/en/teacher` as static pages with `hreflang`.
2. The four built-in lessons as English lesson pages with age and year/grade labels and a PDF each; two more if time allows. (`generate-les-pages.mjs` reads Dutch only today.)
3. The three videos re-recorded in English.
4. Teacher guide, privacy statement and the privacy-and-safety page.
5. English texts for every published theme, culture-bound themes included. **Decided by Bert (15-11-2026): culture-bound themes such as Sinterklaas are bilingual (NL/EN)**, with English labels and an English map; they are not restricted to Dutch. Christmas, spooky and pirates travel the same way.
6. English feedback cards, assignment cards and Listening Mirror questions.
7. One support address and a reply time Bert can keep.

---

## 3. Growth loops

### 3.1 The loops

A loop closes only if a stranger who meets the artifact can have a class running in a few minutes. Every loop ends in the same action: **"Use this lesson in my class"**.

| Loop | Trigger | Artifact | Next person's entry | Exists today | Measure |
|---|---|---|---|---|---|
| **Class showcase** | The class finishes; the teacher wants to show it | Showcase page on `deel.soundscout.nl` with a generated preview image | "Made with the lesson *X* — use it in your class" | Album share (`?album=`), 30-day code | Showcases per active class; lesson clicks per 100 views; classes started from them |
| **Lesson sharing** | A colleague asks "what did you do?" | Lesson page, or a copy of the teacher's own lesson | "Use this lesson" → account inside the action → class code | `/les/<key>` and `?lesson=` for built-in lessons | Links made; opens; copies; first class code within a day |
| **Embed** | School newsletter or website | Player on the school's site | "Made with SoundScout" → the lesson | — | Loads, plays, clicks |
| **Board presentation** | Parents' evening, open day, assembly | The room sees it; an address line and QR on the closing screen | QR to the showcase | Presentation screen | Presentations; showcase visits after |
| **Parent sharing** | A child wants to show work at home | Listen page with preview image | "Make your own" (child) · "For teachers" (adult) | Share link (8-character code) | Views; "make your own" starts |
| **Teacher communities** | A teacher posts a result | Showcase or lesson link with a rich preview | The link itself | Links without previews | Visits by source group |

### 3.2 How to read the loop

New teachers per activated teacher = showcases shared per teacher × views per showcase × share of viewers who click the lesson × share of those who reach a first class code.

Only the last two factors are under SoundScout's control, and both live on two screens: the line under the player and the fast path. That is why moves 2 and 3 come before any channel work. I give no target value: there is no baseline, and a guessed number would be an invention.

### 3.3 Start before V2

Three of these loops can start in the current app, without waiting for Phase 5b:

1. Add the "Made with the lesson" line with the existing `?lesson=` deep link to `SharedAlbumViewer` and the shared player (move 3).
2. Send the teacher one e-mail before an album code expires ("verleng of laat verlopen"); a dead link in a school newsletter reflects on the school. This needs the mail route that the retention warning also needs, so it may have to wait.
3. Put "Deel deze les met een collega" on each built-in lesson card in the dashboard: it copies the `/les/<key>` address.

### 3.4 Details that make a loop close

- **One fast path.** "Use this lesson" works signed-out: e-mail and password, class created automatically, class code and QR next. E-mail confirmation does not block the first lesson (proposal §6.2).
- **The lesson travels with the work.** Every public page with class work names its lesson and links to it.
- **Preview images** show the theme picture, clip blocks, class title and logo. No names, no faces (decision 10).
- **Showcase pages are not indexed** and follow the retention rules.
- **Class titles are public free text.** Put "geen namen van kinderen" in the field and a report link on every public page.
- **Embed:** a framing rule for `/embed/` only, fixed aspect ratio, no autoplay.
- **Presentation footer:** off by default, never visible while a piece plays.
- **Shared own lessons are copies.** The author's name appears only if the author chooses it, and the link can be revoked.

### 3.5 Measuring without trackers

The `usage_stats` table already counts anonymous daily totals. Extend it with the same mechanism:

| New counter | Split by (fixed lists only) |
|---|---|
| `landing_view`, `hero_first_tap`, `hero_keep_building` | language |
| `lesson_page_view`, `lesson_use_clicked`, `lesson_activated_first` | language, lesson key, source group |
| `showcase_created`, `showcase_view`, `showcase_lesson_click` | language |
| `embed_load`, `embed_play`, `embed_click` | — |
| `teacher_signup_started`, `teacher_signup_completed`, `first_class_code_shown` | language, source group |

Rules: counts per day; no user or device identifier; no IP; no full referrer. The browser reduces the referrer to one of `showcase`, `lesson-link`, `embed`, `search`, `direct`, `other` and discards the rest. Country is not derived from IP; use page language and an optional "country" field at teacher sign-up. Add one sentence to the privacy statement. The price is that funnels are totals, not journeys; at this scale that is enough.

---

## 4. Twelve months (December 2026 – November 2027)

| Phase | Months | Without new V2 code | Depends on V2 |
|---|---|---|---|
| **A. Proof at home** | Dec–Feb | Moves 1–6 and 8. Rewrite hero and steps; add sections 2, 6, 8 and 10; rewrite FAQ and privacy texts; lesson PDFs; new kerndoelen on the page; visit the London Expo (11–12 Feb) | Baseline counters (Phase 0) |
| **B. Quiet UK start** | Mar–May | Five UK test teachers; one hub session; DPIA helper; re-map England when the new curriculum is published | — |
| **C. Front door** | Jun–Aug | Press kit texts; back-to-school lesson pack in both languages | Playable hero, `/en/`, fast path (Phase 3c) |
| **D. Loops on** | Sep–Nov | First UK showcases and quotes; Christmas theme in English | Showcase, lesson sharing, embed, preview images (Phase 5b) |

**Six metrics**

| Metric | Definition |
|---|---|
| Activated teachers | Teachers whose class received at least five submissions in a month |
| Time to first class code | Median minutes from landing to code shown |
| Repeat rate | Share of activated teachers who activate a second lesson within 60 days |
| Loop rate | New classes started from a showcase, lesson link or embed, per 100 activated teachers |
| English share | Share of activated teachers on the English interface |
| Support load | Bert's hours per week on e-mail and fixes |

Targets are set in February against the Phase 0 baseline, not before.

**Decision gates**

| When | Question | Yes | No |
|---|---|---|---|
| End Feb 2027 | Three consented quotes and two example classes? | Publish proof; start B | No promotion abroad; March goes to Dutch classes |
| End May 2027 | Did three of five UK teachers run a second lesson unprompted? | Continue UK; open a second UK hub | Fix what they reported before more UK outreach |
| End Aug 2027 | Median time to first class code under five minutes, and support load bearable? | Promote the loops | Simplify the fast path first |
| End Nov 2027 | Loop rate rising month on month? | Year two: introduce the paid school licence (decision 1); weigh a third language; revisit the US only if Bert then sets a legal budget | Stay NL and UK; simplify before adding anything |

---

## 5. Decisions

**Decided on 15-11-2026:** the eight decisions in **Locked decisions** at the top (free through 2027, name fields stay with honest texts, British English, US organic only, no US legal budget, 100 % EU, Bert's face on the page, typed names hidden by default on V2 share pages).

**Parked (15-11-2026).** These do not block Phase 0 or Phase 1 and are picked up later. Each is a choice between named options; my recommendation is marked.

1. **Example classes.** Which two or three classes do you ask, and who asks the school?
2. **Support in English.** How many hours a week, and which reply time do you promise: (a) two working days, (b) one week?
3. **One trip.** (a) Two days at the London Expo in February 2027 — *recommended.* (b) No travel; find the five UK teachers online.
4. **Workshops abroad.** (a) Offer online sessions in English as a paid service. (b) Keep workshops Dutch only and end the English page without that band — *recommended for 2027.*
5. **Old kerndoelen.** (a) Show 54–56 and the new goals side by side until 1-8-2027 — *recommended.* (b) Switch to the new goals now.
6. **The Supabase region on the public page.** Which exact region and which sub-processors? A fact to fill in, not a choice.

---

## Verification

**Confirmed on 15-11-2026**

- England: the revised national curriculum is due in final form in spring 2027, with first teaching from September 2028 (several education sources and the DfE's Education Hub).
- COPPA: final amendments published 22-04-2025; the school-authorisation proposals were not finalised and existing FTC guidance continues.
- FERPA: the school-official wording, from the regulation text and the US Department of Education's FAQ.
- National Core Arts Standards: four processes, eleven anchor standards and their labels, from a New York State Education Department document and NYSSMA; not from nationalartsstandards.org itself.
- UK adequacy: renewed 19-12-2025 until 27-12-2031.
- ICO "Edtech examined" report of 24-06-2026 and its five recurring gaps (from law-firm summaries).
- Dutch kerndoelen kunst en cultuur: final concept November 2025; planned legal date 1-8-2027.
- The National Centre for Arts Education and the planned hub handover on 1-9-2027 (from the DfE tender notices).
- Repository claims: eleven FAQ questions, four Dutch lesson pages with no PDFs, the alias in the class flow and the two name fields.

**Not verified**

- Device shares in UK and US schools. No number is quoted.
- Whether COPPA applies. With typed names kept (decision 2) some personal information can be collected; with no US review (decision 5) this stays unassessed, which is why there is no US promotion.
- The NDPA's exact insurance, audit and liability clauses; the current version number (sources name v2.2 and v2.4).
- The clauses US state laws require; states are named from overviews.
- How a vendor requests a Common Sense privacy evaluation. A vendor training page exists; no request route was found.
- The UK side of transfers (UK to EEA) rests on one secondary source.
- A date for the UK statutory edtech code. Whether the Dutch kerndoelen bill has passed.
- Whether the National Centre for Arts Education has opened and who runs it.
- Music In Our Schools Month 2027: March by long practice; no NAfME page for 2027 found.
- Scotland and Wales outcome statements; no codes are quoted.
- UK term dates and test timing, which vary by local authority.
- Current activity of teacher groups online.
- Event dates for the London Expo come from the first draft's source and were not re-checked.
- Lesson duration, and every example line of copy, are untested.

## Sources

- England curriculum: [National curriculum, music programmes of study — GOV.UK](https://www.gov.uk/government/publications/national-curriculum-in-england-music-programmes-of-study/national-curriculum-in-england-music-programmes-of-study) · [Model Music Curriculum — GOV.UK](https://assets.publishing.service.gov.uk/media/6061f833d3bf7f5ce1060a90/Model_Music_Curriculum_Full.pdf) · [Changes to the national curriculum — DfE Education Hub](https://educationhub.blog.gov.uk/2025/11/what-you-need-to-know-about-the-changes-to-the-national-curriculum) · [New curriculum in 2028 — Schools Week](https://schoolsweek.co.uk/new-curriculum-to-be-introduced-in-2028-as-review-published/) · [Curriculum reform — NAHT](https://features.naht.org.uk/curriculum-reform-what-it-means-for-school-leaders)
- UK channels: [National Centre for Arts Education tender — Find a Tender](https://www.find-tender.service.gov.uk/Notice/015425-2026) · [Music hubs — Schools Week](https://schoolsweek.co.uk/highly-valued-music-hubs-face-funding-and-staffing-challenges/) · [Music & Drama Education Expo 2027 — Business Design Centre](https://www.businessdesigncentre.co.uk/event/music-drama-education-expo-london-2027/)
- US standards: [National Core Arts Standards overview — NYSSMA](https://nyssma.org/wp-content/uploads/2025/02/National-Core-Arts-Standards-Overview.pdf) · [Music at a glance — NYSED](https://www.nysed.gov/sites/default/files/programs/standards-instruction/nys-music-at-a-glance-final-8.2.2017-high-res-v2.pdf) · [Music In Our Schools Month — NAfME](https://nafme.org/programs/miosm)
- COPPA: [Final rule — Federal Register, 22-04-2025](https://www.federalregister.gov/documents/2025/04/22/2025-05904/childrens-online-privacy-protection-rule) · [The amended COPPA rule — Loeb](https://www.loeb.com/en/insights/publications/2025/05/childrens-online-privacy-in-2025-the-amended-coppa-rule) · [Complying with COPPA: FAQ — FTC](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions) · [FTC updates to the COPPA FAQs — Future of Privacy Forum](https://fpf.org/blog/ftc-updates-coppa-faqs/)
- FERPA: [Who is a "school official"? — US Department of Education](https://studentprivacy.ed.gov/faq/who-school-official-under-ferpa) · [34 CFR 99.31 — Cornell LII](https://www.law.cornell.edu/cfr/text/34/99.31)
- District agreements: [NDPA v2 usage guide — A4L / SDPC](https://files.a4l.org/privacy/NDPA/NDPAv2_Usage_Guide_and_Development_Process.pdf) · [NDPA v2 key changes — A4L](https://a4l.freshdesk.com/support/solutions/articles/103000315808-ndpa-v2-key-changes-from-ndpa-v1) · [The first national model agreement — Future of Privacy Forum](https://fpf.org/blog/the-first-national-model-student-data-privacy-agreement-launches/) · [Student Privacy Pledge, retired — Future of Privacy Forum](https://fpf.org/student-privacy-pledge/)
- Common Sense: [Evaluation process](https://privacy.commonsense.org/resource/evaluation-process) · [Privacy training for vendors](https://privacy.commonsense.org/resource/vendor-privacy-training)
- UK data protection: [Age appropriate design code — ICO](https://ico.org.uk/for-organisations/guide-to-data-protection/ico-codes-of-practice/age-appropriate-design-code) · [The Data (Use and Access) Act 2025 in schools — GOV.UK](https://www.gov.uk/guidance/data-protection-in-schools/the-data-use-and-access-act-2025) · [Regulatory outlook July 2026, incl. "Edtech examined" — Osborne Clarke](https://www.osborneclarke.com/insights/regulatory-outlook-july-2026-data-law) · [ICO plans, education sector guide — Browne Jacobson](https://www.brownejacobson.com/insights/the-ico-sets-its-plans-for-next-two-years-education-sector-guide) · [What the Act means for children's privacy — 5Rights](https://5rightsfoundation.com/new-uk-data-law-what-does-it-mean-for-childrens-privacy/)
- UK–EU transfers: [Commission renews UK adequacy until 27-12-2031 — Freeths](https://www.freeths.co.uk/insights-events/legal-articles/2026/european-commission-renews-uk-adequacy-decisions-until-27-december-2031/) · [UK adequacy and transfers — Bratby Law](https://bratby.law/uk-adequacy-decision-inbound-eu-to-uk-transfers/)
- Netherlands: [Vernieuwing van het landelijke curriculum — Rijksoverheid](https://www.rijksoverheid.nl/themas/onderwijs/basisonderwijs/vernieuwing-van-het-landelijke-curriculum) · [Conceptkerndoelen kunst en cultuur — SLO](https://slo.nl/publish/pages/22306/conceptkerndoelen-kunst-cultuur.pdf) · [Kamerstuk 36699-39](https://zoek.officielebekendmakingen.nl/kst-36699-39.html)

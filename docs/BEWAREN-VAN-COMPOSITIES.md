# Bewaren van composities — wanneer, waar, hoe lang, en hoe je ze terugvindt

> Leesbaar naslag voor Bert. Beantwoordt: **wanneer** wordt het werk van een
> leerling bewaard (en wanneer niet), **waar** staat het, **hoe lang** blijft het,
> en **hoe** vinden docent én leerling het terug.
>
> De technische details (kolommen, RPC-filters, cascade-regels) staan in
> `HANDLEIDING-BEHEER.md §"Bewaartermijnen — wat blijft er staan, en hoe lang?"`.
> Dit document is de menselijke uitleg daarbovenop.

---

## In één oogopslag

| Manier van bewaren | Waar | Nodig om terug te vinden | Termijn |
|---|---|---|---|
| **Lokaal** ("Mijn composities") | In de browser (localStorage) van dát apparaat | Automatisch, op hetzelfde apparaat | Blijft, maar **max. 10** — de oudste verdwijnt; weg bij browser-opschoning |
| **Online bewaarcode** | Onze database (Supabase) | De **6-tekens bewaarcode** | Werkt tot **60 dagen** ná de laatste wijziging |
| **Klas-inzending** (klascode) | Onze database | De **klascode** (docent) · de bewaarcode (leerling) | **1 schooljaar** na de laatste activiteit, dan automatisch verwijderd (docent 30 d vooraf gewaarschuwd) |
| **Praatplaat-inzending** | Onze database | Via de klas/praatplaat (docent) | Zoals klas-inzending |
| **Deel-link** (luisteren) | Onze database | De **8-tekens deelcode** | Link werkt **30 dagen** |
| **Album-link** (hele opdracht) | Onze database | De **8-tekens albumcode** | Link werkt **30 dagen** (verlengbaar) |

> **Belangrijke nuance (bijgewerkt 24-7):** "60 dagen" en "30 dagen" betekenen
> eerst dat de **code/link stopt met werken**. Sinds migratie 035 wordt het werk
> daarna óók echt **automatisch verwijderd**: losse bewaarcodes/deellinks na
> 60 dagen inactiviteit, en klas-inzendingen (leerlingwerk met voornaam) na
> **1 schooljaar** — alléén de inzending, de klas/opdracht/code blijven. De
> opruiming draait dagelijks (pg_cron); de docent krijgt 30 dagen vooraf een
> waarschuwing in het dashboard. Back-ups van Supabase rouleren daarna vanzelf uit.

---

## 1. Lokaal bewaren ("Mijn composities")

- **Wanneer:** een leerling die op het podium op **Opslaan** klikt (op dit
  apparaat). Ook zonder klascode of account.
- **Waar:** in de browser van dat ene apparaat (localStorage) — niet in onze
  database, niet zichtbaar voor de docent.
- **Hoe terug:** op **hetzelfde apparaat/dezelfde browser** via "Mijn
  composities".
- **Hoe lang:** blijft staan, maar met een **maximum van 10**: sla je een 11e op,
  dan verdwijnt de oudste. Alles is weg als de browsergegevens gewist worden
  (of op een ander apparaat — het staat er niet).

## 2. Online bewaarcode (6 tekens)

- **Wanneer:** podium → **Opslaan & Delen** → **Bewaar online**. De leerling
  krijgt een **6-tekens code** (en een QR).
- **Waar:** onze database.
- **Hoe terug:** op **elk** apparaat de code invoeren via "Ik heb een code" →
  het werk laadt in de studio om verder te werken. Op een nieuw apparaat "claimt"
  de leerling het werk (krijgt een nieuw geheim token om te mogen bewerken).
- **Hoe lang:** de code blijft werken tot **60 dagen ná de laatste wijziging**.
  Elke keer opslaan/bijwerken zet die teller opnieuw op 60 dagen.

## 3. Inleveren met een klascode (4 cijfers)

- **Wanneer:** de leerling voert de **klascode** in, maakt werk en levert in
  (podium → **Lever in**). Elke klas-inzending krijgt **automatisch ook een
  bewaarcode** (sinds migratie 026), zodat de leerling zijn eigen werk kan
  terugvinden.
- **Waar:** onze database, gekoppeld aan de klas.
- **Hoe de docent het terugvindt:** in het **klaslokaal** bij de inzendingen. Er
  is een splitsing:
  - **Ingeleverd** = formeel ingeleverd (heeft een inlever-moment).
  - **In bewerking** = wel online opgeslagen met de klascode, maar nog niet
    formeel ingeleverd.
  De docent kan inzendingen **presenteren** (digibord), er **feedback** op geven,
  en ze in een **album** delen.
- **Hoe de leerling het terugvindt:** zie §5.

## 4. Praatplaat, deel-link en album

- **Praatplaat-inzending:** als §3, maar gekoppeld aan een praatplaat; de docent
  ziet ze op het praatplaat-bord en in de inzendingen.
- **Deel-link (luisteren):** een **8-tekens code** waarmee iedereen (ook zonder
  klas) één compositie kan beluisteren. Werkt **30 dagen**.
- **Album-link:** een **8-tekens code** voor álle ingeleverde composities van één
  opdracht samen. Werkt **30 dagen** (te verlengen). Toont alleen **ingeleverde**
  composities.

## 5. Hoe een leerling zijn werk (en feedback) dagen later terugvindt

- **Op hetzelfde apparaat/dezelfde browser:** de melding **"Je hebt een reactie!"**
  verschijnt op het startscherm zodra de docent feedback heeft gegeven; klikken
  opent het werk op het podium. Dit werkt omdat de code lokaal onthouden is.
- **Op een ander of leeggemaakt apparaat** (of een gedeelde Chromebook waarvan de
  gegevens gewist zijn): de leerling heeft zijn **bewaarcode** nodig. Die voert
  hij in via "Ik heb een code" en ziet dan zijn compositie + feedback op het
  podium.
- **Zonder genoteerde bewaarcode, op een vreemd apparaat:** dan kan de leerling
  het zelf niet terughalen — we bewaren bewust **geen leerling-mailadres**
  (privacy). Tip voor de klas: laat leerlingen hun 6-tekens code noteren, of laat
  de docent de feedback klassikaal via het digibord of een album-link teruggeven.

## 6. Wat verdwijnt wél — en wanneer

- **Een klas verwijderen** wist **alle inzendingen van die klas** mee (harde
  verwijdering, migratie 009). Onomkeerbaar.
- **Een praatplaat verwijderen** wist de inzendingen van díe praatplaat mee.
- **Een opdracht uit "Eerdere opdrachten" halen** verwijdert **alleen die
  overzichtsregel** — het leerlingwerk blijft bij de inzendingen staan.
- Er draait **geen automatische opschoning**: er is geen taak die na X dagen
  oude rijen wist. "Verlopen" codes blijven dus als (onbereikbare) rijen bestaan.

## Wat betekent "verloopt" precies? (eerlijk over privacy)

"Werkt tot 60 dagen" en "link 30 dagen" gaan over **de code/link die stopt met
werken** — niet over verwijderen. Na die termijn:

- is de compositie **niet meer op te halen via die code/link**, maar
- **staat de rij nog gewoon in de database** (en in de back-ups van onze
  hostingprovider).

Er is dus op dit moment **geen echte bewaartermijn** die data na verloop van tijd
verwijdert. Of we dat willen (bijvoorbeeld leerlingwerk met namen automatisch
opruimen na een periode) is een open ontwerp-/AVG-vraag — vastgelegd als taak en
in `HANDLEIDING-BEHEER.md §Bewaartermijnen`.

---

*Zie ook: `docs/HANDLEIDING-BEHEER.md §3` (Supabase, handmatige opschoon-queries)
en `docs/WOORDENLIJST.md` (klascode / bewaarcode / inzending).*

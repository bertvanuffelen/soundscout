# Ontwerp: leerling-codes & groepjes (17-7-2026)

> **Aanleiding (Bert)**: een docent wil vooraf inlogcodes klaarzetten voor zijn klas — anoniem, printbaar, een schooljaar geldig — zodat een kind dat vandaag werkt volgende week met dezelfde code verder kan, automatisch aan de juiste klas gekoppeld. Daarbovenop wil de docent soms groepjes klaarzetten. Dit fundament maakt ook "Samen één verhaal" (automatische scène-verdeling) mogelijk.
> **Status**: ontwerp ter bespreking — nog niet bouwen. Open vragen onderaan.

---

## 1. Wat er nu is, en waar het wringt

| Nu | Probleem |
|---|---|
| Leerling typt **klascode (4 cijfers)** en daarna een **vrije naam** bij het inleveren. | De naam is een vrij tekstveld dat in de database belandt — kinderen typen echte voor- en achternamen. Dat is nu ons zwakste AVG-punt. |
| Elke inzending mint een **bewaarcode (6 tekens)** waarmee je op elk apparaat verder kunt. | De code hoort bij één *compositie*, niet bij een *kind*. Nieuwe les = nieuwe code; code kwijt (briefje weg, andere Chromebook) = werk onvindbaar. Continuïteit over lessen heen bestaat feitelijk niet. |
| Geen identiteit betekent: geen historie per kind, geen verdeling, geen groepjes, geen "wie heeft nog niet ingeleverd". | Alles wat de docent over tijd wil volgen, strandt hier. |

**Kerninzicht**: de bewaarcode lost *werk bewaren* op; Berts leerling-code lost *iemand zijn* op. Dat tweede is het fundament waar steeds meer features om vragen.

## 2. Voorgesteld model

### 2.1 De leerling-code
- Docent kiest per klas: "maak N leerling-codes" (bv. 25). Elke code krijgt automatisch een **anoniem, kindvriendelijk label**: dier + nummer — `VOS-07`, `UIL-12`, `BEER-03`.
- **De code ís het label**: het kind typt `VOS07` in het bestaande code-invoerveld. Herkenning: patroon 3-4 letters + 2 cijfers botst niet met de bestaande codetypes (4 cijfers = klascode, 6 alfanumeriek = bewaarcode, 8 = deelcodes) én is voorleesbaar/onthoudbaar voor een 7-jarige — geen los wachtwoord.
- Uniciteit is **binnen de app globaal** (dier×nummer×random-check bij generatie), zodat de leerling géén klascode meer hoeft: `VOS07` impliceert de klas.
- **Geldigheid: één schooljaar** (vervaldatum 31 juli, instelbaar). Daarna deactiveert de code; het werk blijft voor de docent zichtbaar tot die de klas opruimt.
- **Namen bestaan alleen op papier**: de docent print een lijst/kaartjes (code + schrijflijn) en schrijft dáár de echte namen bij. In de database staat nooit een naam. De bestaande vrije-naam-invoer bij inleveren vervalt voor klas-leerlingen (het label wordt de afzender); zonder leerling-code (gast-flow) blijft de huidige weg bestaan, met een hint om geen echte achternaam te gebruiken.

### 2.2 Datamodel (schets)
```
class_members
  id UUID PK
  class_id UUID → classes (CASCADE)
  member_code TEXT UNIQUE        -- 'VOS07'
  label TEXT                     -- 'Vos-07' (weergave)
  group_id UUID NULL → class_groups
  expires_at DATE                -- einde schooljaar
  created_at

class_groups
  id UUID PK
  class_id UUID → classes (CASCADE)
  name TEXT                      -- 'Groepje 1' of docent-naam ('De Trommels')

submissions
  + member_id UUID NULL → class_members   -- nieuwe koppeling (bestaande kolommen blijven)
```
RPC's (SECURITY DEFINER, rate-limited zoals alle publieke functies): `generate_class_members(class_id, count)` · `login_with_member_code(code)` → klas + label + actieve opdracht · `get_class_members(class_id)` (docent). RLS: docent ziet alleen eigen klassen; leerling-route alleen via de RPC.

### 2.3 De leerling-flow
1. Kind typt `VOS07` op het startscherm (zelfde veld als alle codes).
2. App herkent het patroon → `login_with_member_code` → sessie krijgt klas + label + de actieve opdracht (zelfde landingsflow als de klascode nu).
3. Alles wat het kind maakt hangt aan `member_id`. **Verder werken** = dezelfde code, welk apparaat en welke week dan ook → laatste werk opent, historie beschikbaar.
4. De bewaarcode blijft onder water bestaan (het opslagmechanisme verandert niet) maar het kind hoeft hem nooit meer te zien; voor gasten zonder klas blijft de bewaarcode de zichtbare route.

### 2.4 Docent-kant
- In het klaslokaal een blok **"Leerlingen"**: codes genereren (aantal kiezen, bijmaken kan later), lijst met label + laatste activiteit + inzendingen-teller, code deactiveren/vervangen (kwijt/misbruik), en **Print** (A4: kaartjes met code groot + schrijflijn voor de naam; en een lijstversie).
- **Groepjes**: docent maakt groepjes (naam + leden slepen/aanvinken). Een groepje is een *koppeling tussen members* — elk kind houdt zijn eigen code (belangrijk: werk blijft individueel herleidbaar; een "groepscode" die iedereen deelt maakt inzendingen stuurloos). Bij een groepsopdracht telt een inzending van één lid voor het groepje.
- "Wie heeft nog niet…"-overzichtjes worden hiermee gratis mogelijk (inzending per member zichtbaar).

### 2.5 "Samen één verhaal" (de eerste grote afnemer)
- Docent activeert een storyboard-opdracht met **verdeling aan**: de app verdeelt members (of groepjes, als die bestaan) gelijkmatig over de M scènes — 25 kinderen over 5 scènes = automatisch 5 groepjes van 5, tenzij de docent al groepjes had (dan die gebruiken).
- Leerling logt in met code → ziet "Jouw scène: 3 — De sprong" → componeert alleen die scène (studio kadert op het scène-deel van de tijdlijn).
- Presentatie: het presentatiescherm speelt de scènes aaneen — per scène de inzending(en) van dat groepje. Het bestaande PresentationSurface + sectie-model dragen dit al grotendeels.

## 3. AVG-paragraaf
- Geen namen, e-mails of andere persoonsgegevens van kinderen in de database — alleen dierlabels. De koppeling label↔kind bestaat uitsluitend op papier bij de docent (verwerkingsverantwoordelijkheid blijft bij school, wij verwerken niets herleidbaars).
- Dit ontwerp *verbetert* de huidige situatie (vrije-naam-veld) aantoonbaar — sterk verhaal richting scholen/privacy-coördinatoren.
- Vervaldatum + cascade-delete bij klasverwijdering = ingebouwde bewaartermijn. Vermelden in de privacyverklaring.

## 4. Relatie met bestaande systemen
- **Klascode (4 cijfers) blijft bestaan** voor de lichte flow (invaller, eerste les, geen voorbereiding). Leerling-codes zijn de "ingerichte klas"-modus — docent kiest per klas of hij ze gebruikt.
- **Bewaarcodes** blijven het opslag-/deelmechanisme; leerling-codes worden er de eigenaar van. Geen migratie van oude data nodig (member_id is nullable).
- **Peer-feedback** kan later op members draaien (wie beoordeelde wie) i.p.v. op inzendings-paren — niet in v1.
- **Freemium**: leerling-codes/groepjes zijn een natuurlijke Plus-feature (zie FREEMIUM-OPTIES voorstel 1).

## 5. Bouwomvang (indicatie)
Migratie (2 tabellen + kolom + 3 RPC's) · code-detectie + landingsflow · klaslokaal-blok met print · groepjes-UI · sessie/store-werk. Schatting: vergelijkbaar met de praatplaat-bouw (#72) — een volwaardige ronde van meerdere dagen, geen tussendoortje. "Samen één verhaal" daarbovenop is een tweede ronde.

## 6. Open vragen voor Bert
1. **Codeformaat akkoord?** Dier+nummer (`VOS07`) — of liever iets anders (kleuren, neutrale letters)? Dieren zijn onthoudbaar maar kunnen "status" krijgen in de klas ("ik wil de vos zijn").
2. **Mag de docent labels hernoemen?** (bv. naar voornamen). Mijn advies: **nee**, hooguit een eigen pseudoniem — anders staan er via de achterdeur alsnog namen in de DB en is het AVG-verhaal weg.
3. **Einde schooljaar**: codes automatisch laten verlopen op een vaste datum (31 juli), of docent kiest per klas? En wat ziet een kind dat een verlopen code intypt?
4. **Groepsopdracht-gedrag**: levert bij een groepsopdracht élk lid in (meerdere versies per groepje) of één inzending per groepje (eerste/beste)? 
5. **Volgorde**: dit fundament vóór of ná de klas-album/leskaart-pagina's (R4)? Het is groter maar ontgrendelt meer.

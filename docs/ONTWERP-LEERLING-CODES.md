# Ontwerp: leerling-codes (v2 — besloten 17-7-2026)

> **Status: besloten — bouwfase R3 (na de deploy-ronde).** Dit is v2, met Berts feedback verwerkt. De grotere vervolgen staan in eigen documenten: [ONTWERP-GROEPJES-SAMENWERKEN.md](ONTWERP-GROEPJES-SAMENWERKEN.md) en [ONTWERP-SAMEN-EEN-VERHAAL.md](ONTWERP-SAMEN-EEN-VERHAAL.md).
> **Aanleiding (Bert)**: een docent wil vooraf inlogcodes klaarzetten voor zijn klas — anoniem, printbaar, een schooljaar geldig — zodat een kind dat vandaag werkt volgende week met dezelfde code verder kan, automatisch aan de juiste klas gekoppeld.

---

## 1. Wat er nu is, en waar het wringt

| Nu | Probleem |
|---|---|
| Leerling komt binnen met de **klascode (4 cijfers)**; de app genereert een **pseudoniem** als afzender ("Fladderende Pinguïn") — kinderen voeren nooit een eigen naam in. | Het pseudoniem is per sessie/inzending: volgende week is het kind "iemand anders". Er is geen doorlopende identiteit. |
| Elke inzending mint een **bewaarcode (6 tekens)** waarmee je op elk apparaat verder kunt. | De code hoort bij één *compositie*, niet bij een *kind*. Nieuwe les = nieuwe code; briefje kwijt = werk onvindbaar. |
| Geen identiteit betekent: geen historie per kind, geen "wie heeft nog niet ingeleverd", geen basis voor verdeling of groepjes. | Alles wat de docent over tijd wil volgen, strandt hier. |

**Kerninzicht**: de bewaarcode lost *werk bewaren* op; de leerling-code lost *iemand zijn* op. De privacy is al goed geregeld (pseudoniemen, geen namen) — de code voegt daar *continuïteit* aan toe.

## 2. Besloten model

### 2.1 De code — formaat `XX-0000`
- **2 letters + 4 cijfers** (bv. `LK-4827`), uit het bestaande veilige deelcode-alfabet (zonder 0/O/1/I): **~5,8 miljoen unieke codes** — ruim genoeg voor honderden scholen, jarenlang. (Besluit Bert: neutraal en schaalbaar; geen dierennamen — die zijn te beperkt bij groei en onnodig voor oudere leerlingen.)
- Docent kiest per klas "maak N leerling-codes"; bijmaken kan altijd. De code is globaal uniek en **impliceert de klas**: geen klascode meer nodig.
- **Pseudoniem wordt persistent**: elke code krijgt éénmalig een gegenereerd pseudoniem ("Fladderende Pinguïn") dat het hele jaar de afzender is van alles wat dit kind maakt. Het kind herkent zichzelf, de docent ziet continuïteit, en er staat nog steeds geen naam in de database. De **compositienaam blijft door het kind zelf gekozen** (zoals nu).
- **Labels zijn niet hernoembaar** (besluit Bert) — geen namen via de achterdeur.

### 2.2 Geldigheid — schooljaar
- Codes verlopen standaard op **31 juli**. In het klaslokaal staat een toggle **"Bewaar deze klas voor volgend jaar"** die alle codes één jaar verlengt.
- Een kind met een verlopen code ziet een vriendelijke melding: **"Jouw code is niet meer actief. Vraag je docent om een nieuwe."** Het werk blijft voor de docent zichtbaar tot die de klas opruimt.

### 2.3 De leerling-flow
1. Kind typt `LK4827` op het startscherm (zelfde codeveld als alles; patroon 2 letters + 4 cijfers botst niet met klascode/bewaarcode/deelcodes).
2. App logt in → sessie krijgt klas, pseudoniem en de actieve opdracht (zelfde landing als de klascode-flow).
3. Alles hangt aan het kind: **verder werken** = zelfde code, welk apparaat of welke week dan ook → laatste werk opent, historie beschikbaar. Bij opslaan/inleveren is **nooit meer een klascode nodig**.
4. **De klascode-flow blijft parallel bestaan** (besluit Bert): een kind zonder code (invaller-les, kaartje kwijt, proefles) kan altijd via de 4-cijferige klascode werken zoals nu — bewaarcodes blijven daar de zichtbare route.

### 2.4 Datamodel (schets)
```
class_members
  id UUID PK
  class_id UUID → classes (CASCADE)
  member_code TEXT UNIQUE        -- 'LK4827'
  pseudonym TEXT                 -- 'Fladderende Pinguïn' (eenmalig gegenereerd)
  expires_at DATE                -- 31 juli, verlengbaar per klas
  created_at

submissions
  + member_id UUID NULL → class_members   -- nieuwe koppeling (bestaande kolommen blijven)
```
RPC's (SECURITY DEFINER, rate-limited): `generate_class_members(class_id, count)` · `extend_class_members(class_id)` ("bewaar voor volgend jaar") · `login_with_member_code(code)` → klas + pseudoniem + actieve opdracht · `get_class_members(class_id)` (docent). RLS: docent alleen eigen klassen; leerling-route alleen via RPC. *(Groepjes zitten bewust níet in v1 — zie het groepjes-document.)*

### 2.5 Docent-kant
- Klaslokaal-blok **"Leerlingen"**: codes genereren, lijst met pseudoniem + laatste activiteit + inzendingen-teller, code deactiveren/vervangen (kwijt/misbruik), verleng-toggle, en **Print** (A4-kaartjes: code groot + pseudoniem + schrijflijn waar de docent op papier de echte naam bijzet; plus een lijstversie).
- "Wie heeft nog niet…"-overzicht wordt hiermee mogelijk (inzending per member).

## 3. AVG-paragraaf
- Er stonden al geen namen in de database (pseudoniem-systeem); dit ontwerp houdt dat zo en maakt het verhaal completer: identiteit = code + pseudoniem, de koppeling naar het echte kind bestaat alleen op papier bij de docent.
- Vervaldatum (31 juli) + cascade-delete bij klasverwijdering = ingebouwde bewaartermijn. Vermelden in de privacyverklaring.

## 4. Relatie met bestaande systemen
- **Klascode blijft** de lichte flow; leerling-codes zijn de "ingerichte klas"-modus, opt-in per klas.
- **Bewaarcodes** blijven het opslagmechanisme; met een leerling-code hoeft het kind ze nooit meer te zien (member = eigenaar). Geen datamigratie nodig (member_id nullable).
- **Freemium**: leerling-codes zijn een natuurlijke Plus-feature (FREEMIUM-OPTIES, voorstel 1).
- **Toekomst-afnemers**: groepjes/samenwerken (eigen masterplan) en "Samen één verhaal" (eigen document) bouwen hierop voort.

## 5. Bouwomvang (indicatie)
Migratie (1 tabel + kolom + 4 RPC's) · code-detectie + landingsflow · sessie/store-werk · klaslokaal-blok met print. Zonder groepjes: **kleiner dan de eerdere schatting** — vergelijkbaar met een stevige testronde-fixronde, niet met de volledige praatplaat-bouw.

## 6. Besluitenlog (was: open vragen)
1. Codeformaat: **2 letters + 4 cijfers**, veilig alfabet. ✔
2. Labels hernoemen: **nee**. ✔
3. Verloop: **standaard 31 juli** + "Bewaar deze klas voor volgend jaar"-toggle; verlopen-melding "Jouw code is niet meer actief". ✔
4. Groepsopdrachten: **buiten v1** — model (één officiële inzending per groepje, elk lid kan eraan werken/inleveren) staat uitgewerkt in ONTWERP-GROEPJES-SAMENWERKEN.md. ✔
5. Volgorde: **R3, na de deploy-ronde**; R4 (klas-album + leskaart-pagina's) is naar voren gehaald. ✔

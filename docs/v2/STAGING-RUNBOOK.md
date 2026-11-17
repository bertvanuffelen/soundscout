# V2 staging test — 2-hour runbook

One session, in this order. Each block builds on the one before. Tick boxes as you go; write anything odd in the notes column of the results table at the end.

**Devices:** iPad (Safari), Chromebook (Chrome), laptop with Chrome + DevTools, digibord (HDMI), Bluetooth speaker or headphones.
**Accounts:** two **test**-teacher accounts on the production Supabase project (A = test admin, B = a second test address), one pupil device. Never use your real teacher account or real class codes on staging.
**Setup done beforehand** (not part of the two hours): `docs/v2/STAGING.md` — subdomain with SSL, migration 043 on production, staging redirect URL, `.env.staging`. Have **both** builds ready: the V1 build from `main` and the V2 build (`npm run build:staging`). Have `docs/v2/staging/staging-testthema.sspack` on the laptop.

---

## Before the block (10 min, the day before is fine)

- [ ] Upload the **V1** build to staging.
- [ ] On the iPad and the Chromebook, open `https://staging.soundscout.nl`, make **two soundscapes** each and save them locally ("Opslaan"). Give one a recognisable title, e.g. "test iPad 1".

---

## A. Upgrade and saved work — 0:00–0:12

- [ ] Upload the **V2** build, `sw.js` last.
- [ ] iPad and Chromebook: reload. Open "Mijn soundscapes". **All four soundscapes are there**, with the right titles.
- [ ] Laptop/Chromebook, DevTools → Application:
  - [ ] IndexedDB contains the compositions;
  - [ ] localStorage still has `soundscout:compositions` (the backup);
  - [ ] `soundscout:migrated-to-idb` shows state `done` and the right count.
- [ ] Delete one soundscape. It disappears from the list **and** from the localStorage backup.
- [ ] DevTools → Application → Service workers: `sw.js` is active.
- [ ] Response headers of `/sw.js`, `/index.html` and `/manifest.json`: `no-cache`.

## B. Pupil journey and layout — 0:12–0:27

Do this on the Chromebook and the iPad (landscape), then a quick look at the digibord.

- [ ] **Dark start screen, Chromebook:** in a fresh private window, the buttons respond within about 2 seconds of opening the page. The farm picture may appear slightly later.
- [ ] Start screen with saved work: the "Verder werken" row and the seasonal button sit neatly, without overlapping the hero.
- [ ] Start screen → "Nieuwe soundscape" → *Hoe wil je componeren?* → *Kies je wereld*. The choice flow works as before.
- [ ] Map: it fits the screen **without scrolling**; markers are large enough to tap.
- [ ] Location: Terug, the title and Naar Studio sit in **one row** and do not overlap; collect three sounds.
- [ ] Studio: drag sounds to the timeline; open a clip's toolbar.
- [ ] Browser **Back** goes studio → location → map → start.
- [ ] Refresh in the studio: you land on the start screen with "Verder werken", and your work is there.
- [ ] Shared link: open an old-style link `https://staging.soundscout.nl/?theme=winterspelen` → the winter map opens.
- [ ] Luisterspiegel (behind a flag in this build): open `/?dev=true`, make a soundscape, go to the podium. Step 3 "Luisterspiegel" shows the form map and two questions; you can skip it and still save.

## C. Audio and sync — 0:27–0:45

Use a soundscape with a short, sharp sound (e.g. the dog) and a loop.

- [ ] **Laptop speakers:** the playhead crosses the start of the sharp sound at the moment you hear it.
- [ ] **Bluetooth:** same test; the playhead does not run ahead of the sound.
- [ ] **Digibord (HDMI):** same test, in the studio and on the podium.
- [ ] **iPad Safari:** same test; the playhead is not visibly late.
- [ ] Pause and resume: playback continues from the same spot. (A hop of about a fifth of a beat on pause is known.)
- [ ] Storyboard composition: the images change at the section boundaries during playback.

## D. Sound Lab and tempo — 0:45–1:03

- [ ] **Loops at four tempi:** put a music-shop loop (city theme) and the pirate accordion on the timeline. Switch Traag 90 → Rustig 105 → Normaal 120 → Snel 135:
  - [ ] the loops keep the **same width** on the timeline;
  - [ ] they sound clean, with no wobble or artefacts;
  - [ ] they keep the **same pitch** at every tempo.
- [ ] **Sound effect at 135:** it sounds the same, but takes more space. If it now overlaps the next clip, it gets a dashed red outline. One undo restores tempo and positions.
- [ ] **Tempo change during playback:** the playhead stays on the same beat, and nothing glitches.
- [ ] **Vervormen** (on a clip, not on a sequence):
  - [ ] speed ½× and 2× sound like tape;
  - [ ] Achterstevoren plays reversed and the waveform is drawn reversed;
  - [ ] echo is audible;
  - [ ] filter goes from dull to bright.
- [ ] **Preview = export:** apply Vervormen to two clips, then export an **MP3** on the podium. The MP3 sounds the same as the preview and as playback.
- [ ] **Melodie:** open the sequencer → tab Melodie → place notes.
  - [ ] Try Warm, Helder and Tokkel, and a sound from your library as the voice.
  - [ ] Swing is audible.
  - [ ] Hard, Middel and Zacht are audibly different.
  - [ ] Close the tab, place the melody on the timeline and play the composition.
- [ ] *If time allows:* **video export** (storyboard composition) finishes with the sound in sync.

## E. Offline — 1:03–1:15

- [ ] On the iPad and the Chromebook, visit the app once online, open the farm and wait 10 seconds (background download).
- [ ] Switch **Wi-Fi off** and reload. These all work, with sound: start, map, location, collecting sounds, studio, podium.
- [ ] Offline, try **Inleveren** with a class code and **share**: you get the normal error, not a fake "gelukt".
- [ ] Wi-Fi on again: online features work again without a reinstall.

## F. Teacher flows — 1:15–1:40

On the laptop as teacher, with the iPad as the pupil and the digibord for presenting.

- [ ] **Register** test teacher A on staging, confirm the e-mail, log in. Then run the admin insert from 043 for this address (production SQL editor).
- [ ] **Class:** create a class, then activate a lesson card. The class code appears.
- [ ] **Hand-in:** on the iPad enter the class code, make a short soundscape and hand it in.
- [ ] **Presenting:** present on the digibord while the iPad hands in a second soundscape. It is added to the end of the list within about 20 seconds, without interrupting playback or showing a spinner.
- [ ] **Feedback:** give feedback; the "Beluisterd" badge survives a refresh.
- [ ] **Share link and QR:** open the class album share link and the QR code in a private window on another device. They open and play.
- [ ] **Password reset:** request a reset e-mail for teacher B, click the link and set a new password. You can log in with it.
- [ ] **Shared computer:** log in as A, log out, log in as B. Nothing of A is visible at any moment.
## G. Theme platform `/beheer` — 1:40–1:55

Use the prepared test pack, not a real theme (publishing a real theme here would change it for every class on the next load): `docs/v2/staging/staging-testthema.sspack` (a small fake theme with two locations and seven generated tones, one of them an 8-second loop; it passes every dashboard check and is never shown in a picker).

- [ ] **As B (not an admin):** `/beheer` shows "Geen toegang".
- [ ] **As A (admin):** the theme list shows the three real themes with their rule warnings (expected).
- [ ] **Import:** Importeren → choose `staging-testthema.sspack` → the report shows no errors → a draft "Staging-testthema" appears.
- [ ] **Editor check:** open the draft, drag a hotspot into the red edge → an error appears and Publiceren is blocked → drag it back → Concept bewaren.
- [ ] **Publish** → open `https://staging.soundscout.nl/?theme=staging-testthema` in a private window: the test map opens, the tones play, and the console shows no CSP errors.
- [ ] **New version + rollback:** change one text, save and publish as version 2, then Vorige versie → version 1 is live again.
- [ ] **Clean-up:** set the test theme to hidden.

## H. Wrap-up — 1:55–2:00


- [ ] Fill in the results table below.
- [ ] Optional, only if time is left: rehearse the emergency stop on staging. Upload `docs/v2/sw-kill-switch.js` as `sw.js`, reload the iPad (it reloads once and is clean), then upload the real `sw.js` again.

---

## Results

| Block | OK / not OK | Device | Notes |
|---|---|---|---|
| A. Upgrade and saved work | | | |
| B. Pupil journey and layout | | | |
| C. Audio and sync | | | |
| D. Sound Lab and tempo | | | |
| E. Offline | | | |
| F. Teacher flows | | | |
| G. Theme platform | | | |

## Go / no-go for a December release

**Blocks an early release** (fix first, then retest that block):
- saved soundscapes missing after the upgrade (A);
- the playhead visibly out of sync on the digibord or iPad (C);
- the MP3 export sounding different from playback (D);
- offline reload not opening the app (E);
- a hand-in, presentation, share link or password reset failing (F);
- a non-admin able to reach `/beheer` data, or the test theme failing to publish or play (G).

**Does not block** (note it and fix after release): small layout details, a stretched loop that sounds slightly "processed" at 90, a slow first load, Luisterspiegel details (it is behind a flag anyway).

See `docs/v2/RELEASE-SAFETY.md` for the mixed-version protection (migration 046), the rollback steps and the release-day list.

When everything in "blocks" is OK, the remaining step before a production release is cleaning up the test accounts (the hotspots in the three real themes were fixed on 17-11-2026, see `docs/v2/THEMES.md` §2) (`docs/v2/STAGING.md` §2, step 5).

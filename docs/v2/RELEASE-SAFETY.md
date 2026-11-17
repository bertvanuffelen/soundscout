# V2 release safety (D1)

What must hold before V2 replaces V1 on soundscout.nl, and how each point is covered. Written 17-11-2026.

## 1. Old and new versions side by side

**The risk (measured, not assumed).** After the release some devices still run V1 for a while: a tab that was left open, a Chromebook that was asleep. I fed a V2 soundscape (a melody, an effect sound, tempo 90, speed/echo/filter on a clip) to V1's own validation code. V1 accepts it without any error, and silently drops:

| In the V2 soundscape | What V1 keeps |
|---|---|
| Melody sequence | An empty rhythm sequence (silent) |
| Effect sounds (`effectSounds`, `effectSoundId`) | Nothing |
| Speed, reverse, echo, filter on a clip | Only volume, pitch, reverb, fades |
| Tempo other than 120 | The number, but V1 always plays at 120 |

If that V1 tab then saves (save-code sync or handing in again), the stripped copy replaces the online one. The child's melody and effects are gone for good.

**The fix.**
- V2 writes `formatVersion: 2` into every soundscape it saves (`src/utils/buildCompositionData.ts`). V1 does not know the field, so it never sends it.
- Migration 046 adds a trigger on `submissions`: an update that would lower the format number is refused (`client_outdated`). The outdated app shows its normal "saving failed" message; the work in the database stays whole.
- Nothing changes for existing use: V1 work updated from V1, new work from either version, and updates that do not touch the soundscape (feedback, seen, share codes) all still work. Covered by `supabase/tests/046` (7 tests, in `npm run test:db`).

**Not covered:** work that exists only on a device (never saved online). V1 opening V2 work locally cannot happen, because V1 does not read V2's local database.

**Run migration 046 before the release.** It is safe to run while V1 is still live: V1 work has no format number on either side.

## 2. Going back to V1 (emergency)

1. Upload `docs/v2/sw-kill-switch.js` as `sw.js`. Each device removes the V2 service worker and its caches at its next visit and reloads once.
2. Upload the V1 build (`staging-builds/soundscout-v1-staging.zip` is the same code as `main`, but built for staging: for production build `main` with `npm run build`).
3. What pupils notice:
   - Soundscapes saved **locally** in V2 are in V2's local database; V1 reads the older local storage, which V2 kept as a backup. Work made only in V2 after the upgrade may not show under "Mijn soundscapes" in V1.
   - Soundscapes saved **online** in V2 open in V1 without melody and new effects, and V1 cannot update them online (migration 046). That is intended: no silent loss.
4. This has **not been rehearsed**. Rehearse it once on staging before the release: V2 with saved work, kill switch, V1, check what is still there.

## 3. Still open before the release

| # | Item | Who |
|---|---|---|
| 1 | Run migration 046 | Bert |
| 2 | Rollback rehearsal on staging (§2, step 4) | Bert |
| 3 | Staging retest of blocks B, C, D plus everything from the design round (see the PR list) | Bert |
| 4 | A soundscape does not record which theme version it was made with; republishing a theme changes it for running classes. Until this is built: do not republish a theme while classes are using it. | Claude, after the release unless Bert wants it sooner |
| 5 | Sinterklaas: the V1 theme (TypeScript) must be converted to a V2 manifest with the same sound ids before V2 replaces V1, or the theme and the work made with it stop working. Needs the final sounds first. | Claude, once the sounds exist |
| 6 | One pass on a school Chromebook: studio, export, offline | Bert |
| 7 | Remove the test accounts; make a database backup | Bert |

## 4. Release day

1. Rebuild from the final V2 commit; staging gets that same build first.
2. Merge V2 into `main` through a PR.
3. Upload, `sw.js` last.
4. Smoke test on production: an old save code, a class code, a hand-in, a presentation, an offline reload.
5. Not on a Friday, not during school hours, not in the Sinterklaas weeks.

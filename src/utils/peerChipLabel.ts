/**
 * Vertaling van de ingebouwde feedbackkaarten (fase 3.3).
 *
 * De ingebouwde kaarten staan in de database in het Nederlands (migratie
 * 027) en de sterren worden per criterium-tekst opgeslagen. Daarom
 * vertalen we alleen de weergave: de opgeslagen sleutel blijft Nederlands,
 * zodat beoordelingen van NL- en EN-leerlingen bij elkaar blijven.
 * Eigen kaarten van docenten blijven zoals de docent ze schreef.
 */

const EN: Record<string, string> = {
  // Kaarttitels
  'Standaard complimenten': 'Standard compliments',
  'Ritme & puls': 'Rhythm & pulse',
  'Opbouw & vorm': 'Build-up & form',
  'Klankkleur & verrassing': 'Sound colour & surprise',
  'Past bij beeld of verhaal': 'Fits the picture or story',
  // Criteria
  'Lekker ritme!': 'Great rhythm!',
  'Mooie opbouw!': 'Nice build-up!',
  'Verrassend geluid!': 'Surprising sound!',
  'Knap gecombineerd!': 'Clever combination!',
  'Strakke puls!': 'Steady pulse!',
  'Fijne herhaling!': 'Nice repetition!',
  'Goed getimed!': 'Well timed!',
  'Spannend begin!': 'Exciting start!',
  'Sterk einde!': 'Strong ending!',
  'Duidelijke delen!': 'Clear sections!',
  'Mooie klanken!': 'Beautiful sounds!',
  'Origineel idee!': 'Original idea!',
  'Bijzondere combinatie!': 'Unusual combination!',
  'Past goed bij het beeld!': 'Fits the picture well!',
  'Vertelt echt een verhaal!': 'Really tells a story!',
  'Goede sfeer!': 'Great atmosphere!',
  'Beeld en geluid kloppen!': 'Picture and sound match!',
};

export function peerChipLabel(text: string, language?: string): string {
  if (!language?.startsWith('en')) return text;
  return EN[text] ?? text;
}

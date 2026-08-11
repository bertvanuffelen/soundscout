/**
 * Colofon- en contactgegevens — één plek, want ze staan op meerdere schermen
 * (/over, PrivacyModal, docentenpagina) en mogen niet uit elkaar lopen.
 *
 * Bewust GEEN i18n: een e-mailadres en KvK-nummer zijn in elke taal hetzelfde.
 * Alleen de labels eromheen worden vertaald.
 */

/**
 * Contactadres op het eigen domein. Professioneler dan een privé-Gmail op een
 * pagina die schoolbesturen lezen, en later door te zetten naar een ander
 * postvak zonder dat de site wijzigt.
 *
 * Dit is het ENIGE contactadres op de site: /over én de privacyverklaring
 * gebruiken deze constante. Controleer vóór een deploy dat het adres echt
 * post ontvangt — anders is er geen enkele werkende contactweg meer.
 */
export const CONTACT_EMAIL = 'hello@soundscout.nl';

/** LinkedIn-profiel — zelfde URL als in de footer van het startscherm. */
export const LINKEDIN_URL = 'https://www.linkedin.com/in/bvanuffelen/';

/** Eigen site. Wordt bijgewerkt met lead-zin + workshop-aanbod (lanceertaak). */
export const PERSONAL_SITE_URL = 'https://bertvanuffelen.nl';

/** Bedrijfsnaam zoals ingeschreven bij de KvK. */
export const COMPANY_NAME = 'UFB Productions';

/**
 * KvK-nummer. Geen wettelijke plicht op soundscout.nl zelf (er wordt hier
 * niets verkocht — het betaalde workshop-aanbod staat op bertvanuffelen.nl),
 * maar wel een gratis betrouwbaarheidssignaal voor een schoolleider die moet
 * goedkeuren dat een klas hier inlogt.
 *
 * Vestigingsadres bewust NIET vermeld: dat is het huisadres, het staat al in
 * het KvK-register en herhalen voegt niets toe.
 */
export const KVK_NUMBER = '55237029';

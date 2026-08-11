/**
 * AboutPage — de publieke Over/colofon + contactpagina op /over.
 *
 * Waarom een eigen route en geen modal: dit is de pagina die een
 * ICT-coördinator of schoolleider opzoekt (en doorstuurt) vóórdat een klas
 * ergens inlogt. Dat vraagt een deelbare, vindbare URL met eigen SEO-meta —
 * vandaar `over.html` als derde Vite-entry, net als `/teacher`.
 *
 * De pagina is de enige plek met "wie ben ik / waarom bestaat dit / hoe bereik
 * je mij". Het startscherm en de docentenpagina linken hierheen; ze herhalen
 * de inhoud niet.
 */

import { useEffect, useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import {
  ArrowLeft,
  Mail,
  Linkedin,
  Globe,
  MessageCircle,
  Music,
  Shield,
  Sparkles,
  History,
  GraduationCap,
} from 'lucide-react';
import { Button, Card, LanguageSwitcher } from '../components/ui';
import { PrivacyModal } from '../components/PrivacyModal';
import { FeedbackModal } from '../components/feedback/FeedbackModal';
import { THEME_CREDITS } from '../data/credits';
import {
  CONTACT_EMAIL,
  LINKEDIN_URL,
  PERSONAL_SITE_URL,
  COMPANY_NAME,
  KVK_NUMBER,
} from '../data/colofon';

export default function AboutPage() {
  const { t } = useTranslation();
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showContact, setShowContact] = useState(false);

  // over.html draagt de Nederlandse SEO-titel (die telt voor de crawler).
  // Wisselt de bezoeker naar Engels, dan moet de tabtitel meegaan — anders
  // staat er een Nederlandse titel boven een Engelse pagina.
  const metaTitle = t('about.meta.title');
  useEffect(() => {
    document.title = metaTitle;
  }, [metaTitle]);

  return (
    <div className="min-h-screen bg-bg-app text-text-main">
      {/* Terug naar de app + taalwissel — zelfde kop als de docentenpagina */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 flex items-center justify-between">
        <button
          onClick={() => { window.location.href = '/'; }}
          className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-main transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('teacher.common.backToSoundScout')}
        </button>
        <LanguageSwitcher variant="light" />
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16 flex flex-col gap-12 sm:gap-16">
        <HeroSection />
        <MakerSection />
        <WhySection />
        <CostSection />
        <ContactSection onOpenContact={() => setShowContact(true)} />
        <ColofonSection onOpenPrivacy={() => setShowPrivacy(true)} />
      </div>

      <AboutFooter />

      <PrivacyModal isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} />
      {showContact && (
        <FeedbackModal isOpen={showContact} onClose={() => setShowContact(false)} mode="feedback" />
      )}
    </div>
  );
}

// --- Hero ---
function HeroSection() {
  const { t } = useTranslation();
  return (
    <section className="flex flex-col gap-3">
      <span className="inline-flex items-center gap-1.5 text-sm font-bold text-accent-700 uppercase tracking-wide">
        <Music className="w-4 h-4" />
        SoundScout
      </span>
      <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
        {t('about.hero.title')}
      </h1>
      <p className="text-text-muted text-base sm:text-lg leading-relaxed">
        {t('about.hero.intro')}
      </p>
    </section>
  );
}

// --- Wie maakt SoundScout ---
function MakerSection() {
  const { t } = useTranslation();
  return (
    <section className="flex flex-col gap-4">
      <SectionHeading icon={GraduationCap} title={t('about.maker.title')} />
      <p className="text-text-main text-base sm:text-lg leading-relaxed font-medium">
        {t('about.maker.lead')}
      </p>
      <p className="text-text-muted leading-relaxed">{t('about.maker.body')}</p>
    </section>
  );
}

// --- Waarom SoundScout bestaat (incl. ontstaansgeschiedenis) ---
function WhySection() {
  const { t } = useTranslation();
  return (
    <section className="flex flex-col gap-4">
      <SectionHeading icon={Sparkles} title={t('about.why.title')} />
      <p className="text-text-muted leading-relaxed">{t('about.why.body1')}</p>
      <p className="text-text-muted leading-relaxed">{t('about.why.body2')}</p>

      <Card padding="lg" className="flex items-start gap-4 mt-2">
        <span className="w-11 h-11 rounded-xl bg-accent-100 text-accent-700 flex items-center justify-center shrink-0">
          <History size={22} />
        </span>
        <div>
          <h3 className="text-lg font-bold text-text-main mb-1">{t('about.origin.title')}</h3>
          <p className="text-sm text-text-muted leading-relaxed">{t('about.origin.body')}</p>
        </div>
      </Card>
    </section>
  );
}

// --- Wat het kost ---
function CostSection() {
  const { t } = useTranslation();
  return (
    <section className="flex flex-col gap-4">
      <SectionHeading icon={Shield} title={t('about.cost.title')} />
      <p className="text-text-muted leading-relaxed">{t('about.cost.body')}</p>
    </section>
  );
}

// --- Contact ---
function ContactSection({ onOpenContact }: { onOpenContact: () => void }) {
  const { t } = useTranslation();
  return (
    <section className="flex flex-col gap-4">
      <SectionHeading icon={Mail} title={t('about.contact.title')} />
      <p className="text-text-muted leading-relaxed">{t('about.contact.body')}</p>

      <Card padding="lg" className="flex flex-col gap-4">
        <div className="flex flex-col gap-3">
          <ContactRow
            icon={Mail}
            label={t('about.contact.emailLabel')}
            value={CONTACT_EMAIL}
            href={`mailto:${CONTACT_EMAIL}`}
          />
          <ContactRow
            icon={Linkedin}
            label={t('about.contact.linkedinLabel')}
            value={LINKEDIN_URL.replace(/^https:\/\/(www\.)?/, '')}
            href={LINKEDIN_URL}
            external
          />
          <ContactRow
            icon={Globe}
            label={t('about.contact.siteLabel')}
            value={PERSONAL_SITE_URL.replace(/^https:\/\/(www\.)?/, '')}
            href={PERSONAL_SITE_URL}
            external
          />
        </div>

        <div className="pt-4 border-t border-border-subtle flex flex-col sm:flex-row sm:items-center gap-3">
          <p className="text-sm text-text-muted flex-1">{t('about.contact.formHint')}</p>
          <Button variant="secondary" onClick={onOpenContact} className="shrink-0">
            <MessageCircle className="w-4 h-4 mr-2" />
            {t('about.contact.formButton')}
          </Button>
        </div>
      </Card>

      <p className="text-sm text-text-muted">{t('about.contact.responseTime')}</p>
    </section>
  );
}

function ContactRow({
  icon: Icon,
  label,
  value,
  href,
  external,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
  href: string;
  external?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-9 h-9 rounded-lg bg-accent-100 text-accent-700 flex items-center justify-center shrink-0">
        <Icon size={18} />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-text-muted">{label}</p>
        <a
          href={href}
          {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          className="text-brand-700 hover:text-brand-800 font-medium underline underline-offset-2 break-all"
        >
          {value}
        </a>
      </div>
    </div>
  );
}

// --- Colofon: verantwoordelijke, bedrijfsgegevens, privacy, bronvermelding ---
function ColofonSection({ onOpenPrivacy }: { onOpenPrivacy: () => void }) {
  const { t } = useTranslation();
  return (
    <section className="flex flex-col gap-4">
      <SectionHeading icon={Music} title={t('about.colofon.title')} />

      <Card padding="lg" className="flex flex-col gap-4">
        <dl className="flex flex-col gap-3 text-sm">
          <ColofonRow label={t('about.colofon.responsibleLabel')} value={t('about.colofon.responsibleValue')} />
          <ColofonRow label={t('about.colofon.companyLabel')} value={COMPANY_NAME} />
          <ColofonRow label={t('about.colofon.kvkLabel')} value={KVK_NUMBER} />
          <ColofonRow label={t('about.colofon.contactLabel')} value={CONTACT_EMAIL} href={`mailto:${CONTACT_EMAIL}`} />
        </dl>

        <div className="pt-4 border-t border-border-subtle">
          <p className="text-sm text-text-muted leading-relaxed">
            <Trans
              i18nKey="about.colofon.privacyText"
              components={{
                privacy: (
                  <button
                    onClick={onOpenPrivacy}
                    className="text-brand-700 hover:text-brand-800 font-medium underline underline-offset-2"
                  />
                ),
              }}
            />
          </p>
        </div>
      </Card>

      <CreditsBlock />
    </section>
  );
}

function ColofonRow({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:gap-3">
      <dt className="text-text-muted sm:w-40 shrink-0">{label}</dt>
      <dd className="text-text-main font-medium break-words">
        {href ? (
          <a href={href} className="text-brand-700 hover:text-brand-800 underline underline-offset-2">
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

/**
 * Bronvermelding. CC-BY verplicht naamsvermelding, dus dit is geen
 * beleefdheid maar een voorwaarde om de geluiden te mogen gebruiken.
 * Ingeklapt zodat de lijst de pagina niet overneemt.
 */
function CreditsBlock() {
  const { t } = useTranslation();
  if (THEME_CREDITS.length === 0) return null;

  return (
    <Card padding="lg" className="flex flex-col gap-3">
      <h3 className="text-lg font-bold text-text-main">{t('about.credits.title')}</h3>
      <p className="text-sm text-text-muted leading-relaxed">
        <Trans
          i18nKey="about.credits.intro"
          components={{
            freesound: (
              <a
                href="https://freesound.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-700 hover:text-brand-800 font-medium underline underline-offset-2"
              />
            ),
          }}
        />
      </p>

      {THEME_CREDITS.map((theme) => (
        <details key={theme.themeId} className="group">
          <summary className="cursor-pointer text-sm font-semibold text-text-main hover:text-brand-700 transition-colors py-1">
            {t('about.credits.themeToggle', {
              theme: t(theme.nameKey),
              count: theme.sounds.length,
            })}
          </summary>
          <ul className="mt-2 flex flex-col gap-1.5 text-sm text-text-muted">
            {theme.sounds.map((sound) => (
              <li key={sound.sourceUrl} className="leading-relaxed">
                <a
                  href={sound.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-700 hover:text-brand-800 underline underline-offset-2"
                >
                  {sound.title}
                </a>
                {' — '}
                {sound.author}
                {' · '}
                <a
                  href={sound.licenseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:text-text-main"
                >
                  {sound.license}
                </a>
              </li>
            ))}
          </ul>
        </details>
      ))}
    </Card>
  );
}

// --- Gedeelde kop per sectie ---
function SectionHeading({ icon: Icon, title }: { icon: typeof Mail; title: string }) {
  return (
    <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2.5">
      <Icon className="w-6 h-6 text-accent-500 shrink-0" />
      {title}
    </h2>
  );
}

// --- Footer ---
function AboutFooter() {
  const { t } = useTranslation();
  return (
    <footer className="bg-bg-app py-8 sm:py-10 border-t border-border-subtle">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 flex flex-col items-center gap-3 text-center">
        <span className="inline-flex items-center gap-1.5 text-text-main font-extrabold tracking-tight">
          <Music className="w-4 h-4 text-accent-500" />
          SoundScout
        </span>
        <nav className="flex flex-wrap justify-center gap-x-5 gap-y-1.5 text-sm">
          <a href="/" className="text-text-muted hover:text-text-main underline underline-offset-2 transition-colors">
            {t('about.footer.app')}
          </a>
          <a href="/teacher" className="text-text-muted hover:text-text-main underline underline-offset-2 transition-colors">
            {t('teacherLanding.footer.guide')}
          </a>
        </nav>
        <p className="text-sm text-text-muted">{t('teacherLanding.footer.madeBy')}</p>
      </div>
    </footer>
  );
}

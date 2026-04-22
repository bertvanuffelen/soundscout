/**
 * PrivacyModal - Privacy & gegevensgebruik informatie
 *
 * Transparante uitleg over hoe SoundScout omgaat met gegevens,
 * opslag en privacy. Toegankelijk via de footer op het startscherm.
 */

import { useTranslation, Trans } from 'react-i18next';
import { Modal } from './ui';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PrivacyModal({ isOpen, onClose }: PrivacyModalProps) {
  const { t } = useTranslation();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('privacy.title')}
      size="lg"
    >
      <div className="space-y-5 text-text-main text-sm sm:text-base">
        {/* Sectie 1: Gegevensgebruik */}
        <section>
          <h3 className="font-semibold text-base sm:text-lg mb-1.5">
            {t('privacy.dataTitle')}
          </h3>
          <p className="text-text-muted leading-relaxed">
            {t('privacy.dataText')}
          </p>
        </section>

        {/* Sectie 2: Klascode & docent */}
        <section>
          <h3 className="font-semibold text-base sm:text-lg mb-1.5">
            {t('privacy.classCodeTitle')}
          </h3>
          <p className="text-text-muted leading-relaxed">
            {t('privacy.classCodeText')}
          </p>
        </section>

        {/* Sectie 3: Cookies & tracking */}
        <section>
          <h3 className="font-semibold text-base sm:text-lg mb-1.5">
            {t('privacy.cookiesTitle')}
          </h3>
          <p className="text-text-muted leading-relaxed">
            {t('privacy.cookiesText')}
          </p>
        </section>

        {/* Sectie 4: Contact */}
        <section className="pt-2 border-t border-neutral-200">
          <p className="text-text-muted leading-relaxed">
            <Trans
              i18nKey="privacy.contact"
              components={{
                mail: (
                  <a
                    href="mailto:bvanuffelen@gmail.com"
                    className="text-brand-700 hover:text-brand-800 font-medium underline underline-offset-2"
                  />
                ),
              }}
            />
          </p>
        </section>
      </div>
    </Modal>
  );
}

export default PrivacyModal;

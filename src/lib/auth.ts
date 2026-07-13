/**
 * Auth Helper Functies
 *
 * Functies voor docent authenticatie:
 * - signUpTeacher: Registreer nieuwe docent
 * - signInTeacher: Login bestaande docent
 * - signOut: Uitloggen
 * - getCurrentUser: Huidige gebruiker ophalen
 */

import { getSupabase } from './supabase';
import {
  ERR_AUTH_ALREADY_REGISTERED,
  ERR_AUTH_INVALID_EMAIL,
  ERR_AUTH_PASSWORD_TOO_SHORT,
  ERR_AUTH_INVALID_CREDENTIALS,
  ERR_AUTH_EMAIL_NOT_CONFIRMED,
  ERR_AUTH_RATE_LIMIT,
  matchesError,
} from './supabaseErrors';
import { sanitizeError } from '../utils/errorSanitize';
import { logger } from '../utils/logger';
import { withTimeout } from '../utils/withTimeout';
import i18n from '../i18n';

/**
 * Registreer een nieuwe docent
 *
 * @param email - Email adres
 * @param password - Wachtwoord (min 6 tekens)
 * @param displayName - Weergavenaam van de docent
 * @returns User object of gooit error
 */
export async function signUpTeacher(
  email: string,
  password: string,
  displayName: string
) {
  const supabase = await getSupabase();
  const { data, error } = await withTimeout(
    supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
        },
      },
    }),
    20_000,
    'errors.networkTimeout'
  );

  if (error) {
    // Vertaal veelvoorkomende fouten naar Nederlands
    if (matchesError(error, ERR_AUTH_ALREADY_REGISTERED)) {
      throw new Error(i18n.t('auth.emailAlreadyRegistered'));
    }
    if (matchesError(error, ERR_AUTH_INVALID_EMAIL)) {
      throw new Error(i18n.t('auth.invalidEmail'));
    }
    if (matchesError(error, ERR_AUTH_PASSWORD_TOO_SHORT)) {
      throw new Error(i18n.t('auth.passwordTooShort'));
    }
    throw new Error(error.message);
  }

  return data.user;
}

/**
 * Login een bestaande docent
 *
 * @param email - Email adres
 * @param password - Wachtwoord
 * @returns Session object of gooit error
 */
export async function signInTeacher(email: string, password: string) {
  const supabase = await getSupabase();
  const { data, error } = await withTimeout(
    supabase.auth.signInWithPassword({
      email,
      password,
    }),
    20_000,
    'errors.networkTimeout'
  );

  if (error) {
    // Vertaal veelvoorkomende fouten naar Nederlands
    if (matchesError(error, ERR_AUTH_INVALID_CREDENTIALS)) {
      throw new Error(i18n.t('auth.invalidCredentials'));
    }
    if (matchesError(error, ERR_AUTH_EMAIL_NOT_CONFIRMED)) {
      throw new Error(i18n.t('auth.emailNotConfirmed'));
    }
    throw new Error(error.message);
  }

  return data.session;
}

/**
 * Uitloggen
 */
export async function signOut() {
  const supabase = await getSupabase();
  const { error } = await withTimeout(
    supabase.auth.signOut(),
    20_000,
    'errors.networkTimeout'
  );

  if (error) {
    throw new Error(i18n.t('auth.logoutError'));
  }
}

/**
 * Haal huidige gebruiker op
 *
 * @returns User object of null
 */
export async function getCurrentUser() {
  const supabase = await getSupabase();
  try {
    const { data, error } = await withTimeout(
      supabase.auth.getUser(),
      15_000,
      'errors.networkTimeout'
    );

    if (error) {
      logger.error('Fout bij ophalen gebruiker:', sanitizeError(error));
      return null;
    }

    return data.user;
  } catch (err) {
    // Behoud het "return null"-contract, ook bij timeout (TimeoutError).
    logger.error('Fout bij ophalen gebruiker:', sanitizeError(err));
    return null;
  }
}

/**
 * Haal huidige sessie op
 *
 * @returns Session object of null
 */
export async function getCurrentSession() {
  const supabase = await getSupabase();
  try {
    const { data, error } = await withTimeout(
      supabase.auth.getSession(),
      15_000,
      'errors.networkTimeout'
    );

    if (error) {
      logger.error('Fout bij ophalen sessie:', sanitizeError(error));
      return null;
    }

    return data.session;
  } catch (err) {
    // Behoud het "return null"-contract, ook bij timeout (TimeoutError).
    logger.error('Fout bij ophalen sessie:', sanitizeError(err));
    return null;
  }
}

/**
 * Verstuur wachtwoord reset email
 *
 * @param email - Email adres van de docent
 */
export async function resetPassword(email: string) {
  const supabase = await getSupabase();
  const { error } = await withTimeout(
    // Query-param i.p.v. hash-fragment: Supabase plakt zijn recovery-token
    // zelf als #fragment achter de redirect-URL, dus een eigen #hash botst.
    supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/?screen=reset-password`,
    }),
    20_000,
    'errors.networkTimeout'
  );

  if (error) {
    // Vertaal veelvoorkomende fouten naar Nederlands
    if (matchesError(error, ERR_AUTH_RATE_LIMIT)) {
      throw new Error(i18n.t('auth.rateLimited'));
    }
    throw new Error(i18n.t('auth.resetEmailFailed'));
  }
}

/**
 * Stel een nieuw wachtwoord in (na klikken op de reset-link)
 *
 * Vereist een actieve sessie — de recovery-link uit de e-mail logt de
 * docent tijdelijk in, waarna dit het wachtwoord definitief wijzigt.
 *
 * @param newPassword - Het nieuwe wachtwoord (min 6 tekens)
 */
export async function updatePassword(newPassword: string) {
  const supabase = await getSupabase();
  const { error } = await withTimeout(
    supabase.auth.updateUser({ password: newPassword }),
    20_000,
    'errors.networkTimeout'
  );

  if (error) {
    if (matchesError(error, ERR_AUTH_PASSWORD_TOO_SHORT)) {
      throw new Error(i18n.t('auth.passwordTooShort'));
    }
    if (matchesError(error, ERR_AUTH_RATE_LIMIT)) {
      throw new Error(i18n.t('auth.rateLimited'));
    }
    throw new Error(i18n.t('auth.updatePasswordFailed'));
  }
}

/**
 * Verstuur de bevestigingsmail (verificatie) opnieuw
 *
 * Voor docenten die zich registreerden maar de mail kwijt zijn.
 *
 * @param email - Email adres van de docent
 */
export async function resendConfirmationEmail(email: string) {
  const supabase = await getSupabase();
  const { error } = await withTimeout(
    supabase.auth.resend({ type: 'signup', email }),
    20_000,
    'errors.networkTimeout'
  );

  if (error) {
    if (matchesError(error, ERR_AUTH_RATE_LIMIT)) {
      throw new Error(i18n.t('auth.rateLimited'));
    }
    throw new Error(i18n.t('auth.resendConfirmationFailed'));
  }
}

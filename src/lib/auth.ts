/**
 * Auth Helper Functies
 *
 * Functies voor docent authenticatie:
 * - signUpTeacher: Registreer nieuwe docent
 * - signInTeacher: Login bestaande docent
 * - signOut: Uitloggen
 * - getCurrentUser: Huidige gebruiker ophalen
 */

import { supabase } from './supabase';
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
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
      },
    },
  });

  if (error) {
    // Vertaal veelvoorkomende fouten naar Nederlands
    if (error.message.includes('already registered')) {
      throw new Error(i18n.t('auth.emailAlreadyRegistered'));
    }
    if (error.message.includes('valid email')) {
      throw new Error(i18n.t('auth.invalidEmail'));
    }
    if (error.message.includes('at least 6 characters')) {
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
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // Vertaal veelvoorkomende fouten naar Nederlands
    if (error.message.includes('Invalid login credentials')) {
      throw new Error(i18n.t('auth.invalidCredentials'));
    }
    if (error.message.includes('Email not confirmed')) {
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
  const { error } = await supabase.auth.signOut();

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
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    console.error('Fout bij ophalen gebruiker:', error);
    return null;
  }

  return data.user;
}

/**
 * Haal huidige sessie op
 *
 * @returns Session object of null
 */
export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    console.error('Fout bij ophalen sessie:', error);
    return null;
  }

  return data.session;
}

/**
 * Verstuur wachtwoord reset email
 *
 * @param email - Email adres van de docent
 */
export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/#reset-password`,
  });

  if (error) {
    // Vertaal veelvoorkomende fouten naar Nederlands
    if (error.message.includes('rate limit')) {
      throw new Error(i18n.t('auth.rateLimited'));
    }
    throw new Error(i18n.t('auth.resetEmailFailed'));
  }
}

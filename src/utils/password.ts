/**
 * Wachtwoordeisen voor docenten. Moet gelijk lopen met Supabase
 * (Authentication → Sign In / Providers → Email): minimaal 8 tekens, en
 * letters én cijfers. Het gratis abonnement heeft geen controle op gelekte
 * wachtwoorden; sterke eisen zijn daar het alternatief.
 */

export const MIN_PASSWORD_LENGTH = 8;

export type PasswordProblem = 'tooShort' | 'needsLetterAndDigit';

export function checkPassword(password: string): PasswordProblem | null {
  if (password.length < MIN_PASSWORD_LENGTH) return 'tooShort';
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'needsLetterAndDigit';
  return null;
}

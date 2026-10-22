import { describe, it, expect } from 'vitest';
import { checkPassword } from '../password';

describe('checkPassword', () => {
  it('weigert te korte wachtwoorden', () => {
    expect(checkPassword('abc12')).toBe('tooShort');
    expect(checkPassword('abcde12')).toBe('tooShort');
  });
  it('eist letters én cijfers', () => {
    expect(checkPassword('alleenletters')).toBe('needsLetterAndDigit');
    expect(checkPassword('12345678')).toBe('needsLetterAndDigit');
  });
  it('accepteert 8+ tekens met letters en cijfers', () => {
    expect(checkPassword('muziek2026')).toBeNull();
    expect(checkPassword('abcdefg1')).toBeNull();
  });
});

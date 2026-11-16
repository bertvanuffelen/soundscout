/**
 * Het test-themapakket voor de stagingtest (docs/v2/staging/) moet door
 * ALLE controles van het dashboard komen: geen fouten en geen waarschuwingen,
 * anders kan Bert er in blok G niet mee publiceren.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { unpackZip, validatePack } from '../pack';

/** WAV-duur uit de header (8-bit mono, 8 kHz: bytes na de 44-byte header). */
const decodeDuration = async (bytes: Uint8Array) => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const rate = view.getUint32(24, true);
  const dataBytes = view.getUint32(40, true);
  return dataBytes / rate;
};

describe('staging-testthema.sspack', () => {
  it('is geldig: geen fouten, geen waarschuwingen, alle bestanden aanwezig', async () => {
    const files = await unpackZip(new Uint8Array(readFileSync(join(process.cwd(), 'docs/v2/staging/staging-testthema.sspack'))));
    const result = await validatePack(files, { decodeDuration });
    expect(result.issues).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.manifest?.id).toBe('staging-testthema');
    expect(result.manifest?.isPublic).toBe(false);
    expect(result.manifest?.samples.filter((s) => s.kind === 'loop').map((s) => s.duration)).toEqual([8]);
    expect(result.files.size).toBe(10);
  });
});

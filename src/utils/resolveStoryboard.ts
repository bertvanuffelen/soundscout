/**
 * resolveStoryboard — storyboard-resolutie uit composition_data.
 *
 * Verving de 4× gedupliceerde regel
 * `findStoryboardById(data.storyboardId)?.storyboard ?? null` in de
 * presentatie-oppervlakken (universeel presentatiescherm, fase 1).
 */

import { findStoryboardById } from '../data/themes';
import type { CompositionData, Storyboard } from '../types';

export function resolveStoryboard(data: CompositionData | null | undefined): Storyboard | null {
  if (!data?.storyboardId) return null;
  return findStoryboardById(data.storyboardId)?.storyboard ?? null;
}

/**
 * Sinterklaas-thema (interim-release november 2026, V1-pad).
 * Plan: v2-theme-sinterklaas-pipeline.md · werkmap: .thema-studio/sinterklaas/.
 *
 * Status: vier locatiebeelden en de kaart (NL + EN) zijn goedgekeurd; het
 * stoombootbeeld nog niet. Alle 30 geluiden zijn nog tijdelijke tonen. Zie
 * INTEGRATIE.md voor wat er nog moet gebeuren.
 */

import type { ThemeConfig } from '../types';
import { locations } from './locations';
import { samples } from './samples';
import { mapConfig } from './map';

export const sinterklaasTheme: ThemeConfig = {
  id: 'sinterklaas',
  name: 'themes.sinterklaas.name',
  description: 'themes.sinterklaas.description',
  // Besluit Bert 15-11-2026: geen datumvenster, een handmatige schakelaar.
  // Verborgen tot alle beelden en geluiden goedgekeurd zijn én Bert de
  // gevoeligheidscheck heeft gedaan (harde poort). ?theme=sinterklaas werkt wel.
  isPublic: false,

  locations,
  samples,
  map: mapConfig,

  colors: {
    primary: '#B3261E',
    accent: '#F2B632',
    mapBackground: '#FBEFD5',
  },
};

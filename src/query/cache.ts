/**
 * Hulpjes rond de query-cache die elke docent-hook deelt.
 */

import { useCallback, useContext, useState } from 'react';
import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { AuthContext } from '../contexts/AuthContext';

/**
 * De id van de ingelogde docent, of null. Leest de context rechtstreeks
 * (niet via useAuth, dat gooit zonder provider) zodat een hook buiten de
 * docent-omgeving zich gedraagt als "niet ingelogd" i.p.v. te crashen.
 */
export function useTeacherId(): string | null {
  return useContext(AuthContext)?.user?.id ?? null;
}

/** Sleutel-plaatshouder zolang er niemand is ingelogd (query staat dan uit). */
export const NO_USER = 'none';

/**
 * Werk een lijst in de cache bij ná een geslaagde schrijfactie.
 *
 * Een verzoek dat al onderweg was (bv. de polling) zou de wijziging zo weer
 * overschrijven met de oude serverstand; dat verzoek wordt daarom eerst
 * afgebroken. Alleen als er al data ís: een eerste laadbeurt afbreken zou
 * de query voorgoed op "laden" laten staan.
 */
export async function updateCached<T>(
  client: QueryClient,
  key: QueryKey,
  updater: (prev: T | undefined) => T | undefined,
): Promise<void> {
  if (client.getQueryData(key) !== undefined) {
    await client.cancelQueries({ queryKey: key });
  }
  client.setQueryData<T>(key, updater);
}

/**
 * De `refetch` die de hooks teruggeven. Vóór TanStack Query zette elke
 * (her)laadbeurt `loading` aan en wiste hij de foutmelding; dat blijft zo
 * voor een herlaadactie die de gebruiker of de hook zelf start. Verversen
 * op de achtergrond (polling, opnieuw openen) laat `loading` met rust.
 */
export function useManualRefetch(refetch: () => Promise<unknown>): {
  refetching: boolean;
  refetch: () => Promise<void>;
} {
  const [pending, setPending] = useState(0);
  const run = useCallback(async () => {
    setPending((n) => n + 1);
    try {
      await refetch();
    } finally {
      setPending((n) => n - 1);
    }
  }, [refetch]);
  return { refetching: pending > 0, refetch: run };
}

/** Foutmelding zoals de hooks hem altijd gaven: de tekst van de fout, anders de terugvaltekst. */
export function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

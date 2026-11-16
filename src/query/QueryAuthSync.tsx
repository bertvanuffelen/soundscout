/**
 * QueryAuthSync — houdt de query-cache gelijk met wie er is ingelogd.
 *
 * Bij uitloggen of wisselen van docent worden alle queries van de vórige
 * docent uit het geheugen gehaald. De eigenlijke afscherming zit in de
 * sleutels (de docent-id staat erin, zie queryKeys.ts); dit is de bezem
 * erachteraan, zodat er op een gedeelde computer niets achterblijft.
 */

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTeacherId } from './cache';
import { queryKeys } from './queryKeys';

export function QueryAuthSync(): null {
  const client = useQueryClient();
  const userId = useTeacherId();
  const previous = useRef<string | null>(userId);

  useEffect(() => {
    const before = previous.current;
    previous.current = userId;
    if (before && before !== userId) {
      const key = queryKeys.teacher.user(before);
      void client.cancelQueries({ queryKey: key });
      client.removeQueries({ queryKey: key });
    }
  }, [client, userId]);

  return null;
}

export default QueryAuthSync;

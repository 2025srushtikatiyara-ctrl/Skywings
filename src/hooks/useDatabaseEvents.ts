/**
 * Real-Time Database Event Synchronization Hook
 * Subscribes to browserDb changes locally with zero latency.
 * Provides immediate reactivity across all views, search cards, and metrics.
 */

import { useEffect, useState, useRef } from 'react';
import { browserDb } from '../lib/engine/database';

export interface DbChangeEvent {
  table: string;
  action: string;
  timestamp: string;
  details?: any;
}

export function useDatabaseEvents(onEvent?: (event: DbChangeEvent) => void) {
  const [isConnected, setIsConnected] = useState(true);
  const [lastEvent, setLastEvent] = useState<DbChangeEvent | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const callbackRef = useRef(onEvent);
  callbackRef.current = onEvent;

  useEffect(() => {
    setIsConnected(true);
    const unsubscribe = browserDb.subscribe(({ table, action, affectedRows }) => {
      const event: DbChangeEvent = {
        table,
        action,
        timestamp: new Date().toISOString(),
        details: { affectedRows },
      };
      setLastEvent(event);
      setLastSyncTime(new Date());
      if (callbackRef.current) {
        callbackRef.current(event);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return { isConnected, lastEvent, lastSyncTime };
}

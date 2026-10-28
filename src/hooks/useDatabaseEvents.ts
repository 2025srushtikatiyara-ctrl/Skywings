/**
 * Real-Time Database Event Synchronization Hook
 * Listens to Server-Sent Events (SSE) from /api/admin/events.
 * Fires invalidation callbacks and maintains live sync status.
 */

import { useEffect, useState, useCallback, useRef } from 'react';

export interface DbChangeEvent {
  table: string;
  action: string;
  timestamp: string;
  details?: any;
}

export function useDatabaseEvents(onEvent?: (event: DbChangeEvent) => void) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<DbChangeEvent | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const callbackRef = useRef(onEvent);
  callbackRef.current = onEvent;

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let retryTimeout: any = null;

    function connect() {
      try {
        eventSource = new EventSource('/api/admin/events');

        eventSource.onopen = () => {
          setIsConnected(true);
        };

        eventSource.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data);
            if (data.type === 'DB_CHANGED' && data.event) {
              setLastEvent(data.event);
              setLastSyncTime(new Date());
              if (callbackRef.current) {
                callbackRef.current(data.event);
              }
            } else if (data.type === 'CONNECTED') {
              setIsConnected(true);
            }
          } catch (parseErr) {
            // Heartbeat comments or text
          }
        };

        eventSource.onerror = () => {
          setIsConnected(false);
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          // Retry reconnection after 3 seconds
          retryTimeout = setTimeout(connect, 3000);
        };
      } catch (err) {
        setIsConnected(false);
        retryTimeout = setTimeout(connect, 5000);
      }
    }

    connect();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, []);

  return { isConnected, lastEvent, lastSyncTime };
}

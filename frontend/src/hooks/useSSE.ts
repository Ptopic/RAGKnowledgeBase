"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSSEContext } from "@/components/providers/SSEProvider";

export interface SSEEvent {
  id: string;
  topic: string;
  // biome-ignore lint/suspicious/noExplicitAny: SSE data can contain anything
  data: any;
  timestamp: number;
  creatorId?: string;
}

export interface UseSSEOptions {
  creatorId?: string;
  baseUrl?: string;
  topic?: string | string[];
}

export interface UseSSEReturn {
  events: SSEEvent[];
  lastEvent: SSEEvent | null;
  isConnected: boolean;
  error: string | null;
  connect: () => void;
  disconnect: () => void;
  clearEvents: () => void;
  connectionId: string | null;
}

export function useSSE(options: UseSSEOptions = {}): UseSSEReturn {
  const { topic = "*" } = options;
  const topics = Array.isArray(topic) ? topic : [topic];

  const { subscribe, unsubscribe, connectionId, isConnected } = useSSEContext();

  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null);

  const callbackRef = useRef<(event: SSEEvent) => void>(null);

  callbackRef.current = (event: SSEEvent) => {
    setLastEvent(event);
    setEvents((prev) => [...prev, event]);
  };

  useEffect(() => {
    const handler = (event: SSEEvent) => callbackRef.current?.(event);
    for (const t of topics) {
      subscribe(t, handler);
    }
    return () => {
      for (const t of topics) {
        unsubscribe(t, handler);
      }
    };
    // topicsKey is a stable string derived from topics array
  }, [subscribe, unsubscribe, topics]);

  const clearEvents = useCallback(() => {
    setEvents([]);
    setLastEvent(null);
  }, []);

  return {
    events,
    lastEvent,
    isConnected,
    error: null,
    connect: () => {},
    disconnect: () => {},
    clearEvents,
    connectionId,
  };
}

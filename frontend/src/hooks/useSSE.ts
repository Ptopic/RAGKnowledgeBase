"use client";
import { useEffect, useRef, useState } from "react";
import { useSSEContext } from "@/components/providers/SSEProvider";

export interface SSEEvent {
  id: string;
  topic: string;
  // biome-ignore lint/suspicious/noExplicitAny: SSE data can contain anything
  data: any;
  timestamp: number;
}

export interface UseSSEOptions {
  topic?: string | string[];
}

export interface UseSSEReturn {
  lastEvent: SSEEvent | null;
  isConnected: boolean;
  connectionId: string | null;
}

export function useSSE(options: UseSSEOptions = {}): UseSSEReturn {
  const { topic = "*" } = options;
  const topics = Array.isArray(topic) ? topic : [topic];

  const { subscribe, unsubscribe, connectionId, isConnected } = useSSEContext();

  const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null);
  const callbackRef = useRef<(event: SSEEvent) => void>(null);

  callbackRef.current = (event: SSEEvent) => {
    setLastEvent(event);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscribe, unsubscribe, topics]);

  return {
    lastEvent,
    isConnected,
    connectionId,
  };
}

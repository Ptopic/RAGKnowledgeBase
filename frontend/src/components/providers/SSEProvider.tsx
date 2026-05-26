"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { SSEEvent } from "@/hooks/useSSE";
import { config } from "@/shared/config/config";
import { COOKIE_NAME } from "@/shared/constants/cookies";

type SSECallback = (event: SSEEvent) => void;

interface SSEContextValue {
  subscribe: (topic: string, callback: SSECallback) => void;
  unsubscribe: (topic: string, callback: SSECallback) => void;
  connectionId: string | null;
  isConnected: boolean;
}

const SSEContext = createContext<SSEContextValue | null>(null);

export function useSSEContext(): SSEContextValue {
  const ctx = useContext(SSEContext);
  if (!ctx) {
    throw new Error("useSSEContext must be used within an SSEProvider");
  }
  return ctx;
}

export function SSEProvider({ children }: { children: React.ReactNode }) {
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const eventSourceRef = useRef<EventSource | null>(null);
  const isConnectingRef = useRef(false);
  const connectionIdRef = useRef<string | null>(null);
  const subscribersRef = useRef<Map<string, Set<SSECallback>>>(new Map());

  const connect = useCallback(() => {
    if (eventSourceRef.current || isConnectingRef.current) return;

    isConnectingRef.current = true;

    if (!connectionIdRef.current) {
      // SSE EventSource doesn't support custom headers, so we pass token as query param
      const getCookieValue = (name: string) => {
        const match = document.cookie.match(
          new RegExp(`(?:^|; )${name}=([^;]*)`),
        );
        return match ? decodeURIComponent(match[1]) : null;
      };

      const token = getCookieValue(COOKIE_NAME.ACCESS_TOKEN);
      if (!token) {
        isConnectingRef.current = false;
        return;
      }

      connectionIdRef.current = token;
      setConnectionId(token);
    }

    const baseUrl = config.apiUrl || "";
    const url = `${baseUrl}/sse/events?token=${encodeURIComponent(connectionIdRef.current)}`;
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      isConnectingRef.current = false;
    };

    eventSource.onmessage = (event) => {
      try {
        const parsed: SSEEvent = JSON.parse(event.data);

        // Handle connection handshake
        if (parsed.topic === "connection" && parsed.data?.connectionId) {
          setConnectionId(parsed.data.connectionId);
          return;
        }

        // Skip heartbeats
        if (parsed.topic === "heartbeat") return;

        // Dispatch to topic subscribers
        const callbacks = subscribersRef.current.get(parsed.topic);
        if (callbacks) {
          for (const cb of callbacks) {
            cb(parsed);
          }
        }

        // Also dispatch to wildcard subscribers
        const wildcardCallbacks = subscribersRef.current.get("*");
        if (wildcardCallbacks) {
          for (const cb of wildcardCallbacks) {
            cb(parsed);
          }
        }
      } catch {
        // Ignore parse errors
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      eventSource.close();
      eventSourceRef.current = null;
      isConnectingRef.current = false;

      // Retry after 2s
      setTimeout(() => {
        if (!eventSourceRef.current && !isConnectingRef.current) {
          connect();
        }
      }, 2000);
    };
  }, []);

  const subscribe = useCallback((topic: string, callback: SSECallback) => {
    if (!subscribersRef.current.has(topic)) {
      subscribersRef.current.set(topic, new Set());
    }
    subscribersRef.current.get(topic)?.add(callback);
  }, []);

  const unsubscribe = useCallback((topic: string, callback: SSECallback) => {
    const callbacks = subscribersRef.current.get(topic);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        subscribersRef.current.delete(topic);
      }
    }
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    connect();
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [connect]);

  // Reconnect on visibility change
  useEffect(() => {
    const handleVisibility = () => {
      if (
        document.visibilityState === "visible" &&
        !eventSourceRef.current &&
        !isConnectingRef.current
      ) {
        connect();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [connect]);

  return (
    <SSEContext.Provider
      value={{ subscribe, unsubscribe, connectionId, isConnected }}
    >
      {children}
    </SSEContext.Provider>
  );
}

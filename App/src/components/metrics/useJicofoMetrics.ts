import { useState, useEffect, useRef, useCallback } from 'react';

// TypeScript types for Prometheus response
export type PromInstant = {
  status: "success" | "error";
  data: {
    resultType: "vector";
    result: Array<{
      metric: Record<string, string>;
      value: [number | string, string]; // [timestamp, valueString]
    }>;
  };
};

export type JicofoSummary = {
  conferences: number;
  participants: number;
  largestConference: number;
  pairs: number;
  jibri: {
    connected: number;
    available: number;
    busy: number;      // recording + streaming + sip
    idle: number;      // connected - busy
    recActive: number;
    streamActive: number;
    sipActive: number;
    failures: { recording: number; streaming: number; sip: number };
  };
  bridges: {
    total: number;
    operational: number;
    inShutdown: number;
    healthyPct: number;
    items: Array<{ jvb: string; endpoints?: number; iceFailing: number }>;
  };
  health: {
    threads: number;
    xmppDisconnects: number;
    version?: string;
  };
};

// Configuration - Prefer env override, else proxy in dev and direct in prod
const isDevelopment = import.meta.env.MODE === 'development';
const ENV_PROM_BASE = (import.meta as any)?.env?.VITE_PROMETHEUS_BASE_URL as string | undefined;
const ENABLE_PROM_MOCK = ((import.meta as any)?.env?.VITE_ENABLE_PROM_MOCK === 'true');
const PROMETHEUS_BASE = (ENV_PROM_BASE && ENV_PROM_BASE.trim())
  ? ENV_PROM_BASE.trim()
  : (isDevelopment ? '/prometheus' : 'https://meet.in8.com/prometheus');
const BATCH_URL = `${PROMETHEUS_BASE}/api/v1/query?query=` + 
  encodeURIComponent('{__name__=~"jitsi_jicofo.*"}');

const POLL_INTERVAL = 10000; // 10 seconds
const MAX_RETRIES = 3;
const INITIAL_BACKOFF = 1000; // 1 second

// Mock data for development/testing when Prometheus is not available
// Using stable values to prevent continuous re-renders
let mockDataCache: JicofoSummary | null = null;
let lastMockUpdate = 0;
const MOCK_UPDATE_INTERVAL = 30000; // Update mock data every 30 seconds

const createMockData = (): JicofoSummary => {
  const now = Date.now();
  
  // Return cached data if it's still fresh
  if (mockDataCache && (now - lastMockUpdate) < MOCK_UPDATE_INTERVAL) {
    return mockDataCache;
  }
  
  // Generate new mock data
  lastMockUpdate = now;
  mockDataCache = {
    conferences: 12,
    participants: 45,
    largestConference: 8,
    pairs: 25,
    jibri: {
      connected: 5,
      available: 3,
      busy: 2,
      idle: 3,
      recActive: 1,
      streamActive: 1,
      sipActive: 0,
      failures: {
        recording: 2,
        streaming: 1,
        sip: 0
      }
    },
    bridges: {
      total: 4,
      operational: 4,
      inShutdown: 0,
      healthyPct: 100,
      items: [
        { jvb: 'JVB-1', endpoints: 15, iceFailing: 0 },
        { jvb: 'JVB-2', endpoints: 12, iceFailing: 0 },
        { jvb: 'JVB-3', endpoints: 18, iceFailing: 0 },
        { jvb: 'JVB-4', endpoints: 8, iceFailing: 0 }
      ]
    },
    health: {
      threads: 35,
      xmppDisconnects: 2,
      version: '2.0.8465'
    }
  };
  
  return mockDataCache;
};

// Fetch and parse Jicofo metrics
export async function fetchJicofoSummary(): Promise<JicofoSummary> {
  try {
    const res = await fetch(BATCH_URL, { 
      cache: "no-store",
      headers: {
        'Accept': 'application/json',
      }
    });
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const json: PromInstant = await res.json();

  if (json.status !== 'success') {
    throw new Error('Prometheus query failed');
  }

  const byName = new Map<string, Array<{labels: Record<string,string>, value: number}>>();
  
  for (const r of json.data.result) {
    const name = r.metric.__name__;
    const val = Number((r.value as any)[1] ?? 0);
    const labels = r.metric;
    if (!byName.has(name)) byName.set(name, []);
    byName.get(name)!.push({ labels, value: val });
  }
  
  const firstVal = (n: string) => byName.get(n)?.[0]?.value ?? 0;

  // Calculate Jibri metrics
  const jibriRec = firstVal('jitsi_jicofo_jibri_recording_active');
  const jibriStr = firstVal('jitsi_jicofo_jibri_live_streaming_active');
  const jibriSip = firstVal('jitsi_jicofo_jibri_sip_active');
  const jibriConn = firstVal('jitsi_jicofo_jibri_instances');
  const jibriBusy = jibriRec + jibriStr + jibriSip;
  const jibriIdle = Math.max(jibriConn - jibriBusy, 0);

  // Calculate bridge metrics
  const total = firstVal('jitsi_jicofo_bridge_selector_bridge_count');
  const operational = firstVal('jitsi_jicofo_bridge_selector_bridge_count_operational');
  const inShutdown = firstVal('jitsi_jicofo_bridge_selector_bridge_count_in_shutdown');
  const healthyPct = total ? (operational / total) * 100 : 0;

  // Parse per-bridge data
  const bridgesFail = byName.get('jitsi_jicofo_bridge_failing_ice')?.map(e => ({
    jvb: e.labels.jvb,
    iceFailing: e.value,
  })) ?? [];

  const bridgeEndpoints = new Map<string, number>();
  (byName.get('jitsi_jicofo_bridge_endpoints') ?? []).forEach(e => {
    bridgeEndpoints.set(e.labels.jvb, e.value);
  });

  const bridgeItems = Array.from(new Set([
    ...bridgesFail.map(b => b.jvb),
    ...Array.from(bridgeEndpoints.keys()),
  ]))
  .filter(Boolean)
  .map(jvb => ({
    jvb,
    endpoints: bridgeEndpoints.get(jvb),
    iceFailing: bridgesFail.find(b => b.jvb === jvb)?.iceFailing ?? 0
  }));

    return {
      conferences: firstVal('jitsi_jicofo_conferences'),
      participants: firstVal('jitsi_jicofo_participants_current'),
      largestConference: firstVal('jitsi_jicofo_largest_conference'),
      pairs: firstVal('jitsi_jicofo_participants_pairs'),
      jibri: {
        connected: jibriConn,
        available: firstVal('jitsi_jicofo_jibri_instances_available'),
        busy: jibriBusy,
        idle: jibriIdle,
        recActive: jibriRec,
        streamActive: jibriStr,
        sipActive: jibriSip,
        failures: {
          recording: firstVal('jitsi_jicofo_jibri_recording_failures_total'),
          streaming: firstVal('jitsi_jicofo_jibri_live_streaming_failures_total'),
          sip: firstVal('jitsi_jicofo_jibri_sip_failures_total'),
        }
      },
      bridges: {
        total,
        operational,
        inShutdown,
        healthyPct,
        items: bridgeItems
      },
      health: {
        threads: firstVal('jitsi_jicofo_threads'),
        xmppDisconnects: firstVal('jitsi_jicofo_xmpp_disconnects_total'),
        version: byName.get('jitsi_jicofo_version_info')?.[0]?.labels?.version
      }
    };
  } catch (error) {
    // Provide mock data only if explicitly enabled via env
    if (ENABLE_PROM_MOCK) {
      console.warn('Prometheus endpoint not accessible, using mock data:', error);
      return createMockData();
    }

    // Otherwise, surface the error to the UI
    throw error;
  }
}

// Custom hook with polling, error handling, and exponential backoff
export function useJicofoMetrics() {
  const [data, setData] = useState<JicofoSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async (isRetry = false) => {
    try {
      // Cancel any existing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      if (!isRetry) {
        setLoading(true);
        setError(null);
      }

      const summary = await fetchJicofoSummary();
      
      setData(summary);
      
      setError(null);
      setLastUpdated(new Date());
      retryCountRef.current = 0; // Reset retry count on success
      
      if (loading) {
        setLoading(false);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Failed to fetch Jicofo metrics:', errorMessage);
      
      setError(errorMessage);
      
      if (loading) {
        setLoading(false);
      }

      // Implement exponential backoff for retries
      if (retryCountRef.current < MAX_RETRIES) {
        const backoffTime = INITIAL_BACKOFF * Math.pow(2, retryCountRef.current);
        retryCountRef.current++;
        
        retryTimeoutRef.current = setTimeout(() => {
          fetchData(true);
        }, backoffTime);
      }
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchData();

    // Set up polling interval
    intervalRef.current = setInterval(() => {
      fetchData();
    }, POLL_INTERVAL);

    // Cleanup function
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const refetch = useCallback(() => {
    retryCountRef.current = 0;
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    lastUpdated,
    refetch
  };
}

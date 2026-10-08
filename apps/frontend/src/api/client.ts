import type { ApiResponse, HealthStatus } from '@tutor-manager/shared';

async function baseUrl(): Promise<string> {
  const bridge = window.tutorManager;
  if (bridge) {
    try {
      return await bridge.getBackendUrl();
    } catch {
      // fall through to relative proxy
    }
  }
  return '';
}

export async function fetchHealth(): Promise<ApiResponse<HealthStatus>> {
  const base = await baseUrl();
  const res = await fetch(`${base}/api/health`);
  if (!res.ok) throw new Error(`health failed: ${res.status}`);
  return res.json() as Promise<ApiResponse<HealthStatus>>;
}

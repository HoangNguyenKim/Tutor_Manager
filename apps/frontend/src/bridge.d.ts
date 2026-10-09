export interface TutorManagerBridge {
  getBackendUrl: () => Promise<string>;
  getVersion: () => Promise<string>;
  getAuthToken?: () => Promise<string>;
  pingBackend: () => Promise<boolean>;
}

declare global {
  interface Window {
    tutorManager?: TutorManagerBridge;
  }
}

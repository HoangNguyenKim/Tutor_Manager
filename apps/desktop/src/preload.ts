import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('tutorManager', {
  getBackendUrl: (): Promise<string> => ipcRenderer.invoke('tutor-manager:get-backend-url'),
  getVersion: (): Promise<string> => ipcRenderer.invoke('tutor-manager:get-version'),
  getAuthToken: (): Promise<string> => ipcRenderer.invoke('tutor-manager:get-auth-token'),
  pingBackend: (): Promise<boolean> => ipcRenderer.invoke('tutor-manager:ping'),
});

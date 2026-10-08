import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('tutorManager', {
  getBackendUrl: (): Promise<string> => ipcRenderer.invoke('tutor-manager:get-backend-url'),
  getVersion: (): Promise<string> => ipcRenderer.invoke('tutor-manager:get-version'),
  pingBackend: (): Promise<boolean> => ipcRenderer.invoke('tutor-manager:ping'),
});

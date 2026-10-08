import { loadConfig, type BackendConfig } from './config';

export const BACKEND_CONFIG = 'BACKEND_CONFIG';

export const configProvider = {
  provide: BACKEND_CONFIG,
  useFactory: (): BackendConfig => loadConfig(),
};

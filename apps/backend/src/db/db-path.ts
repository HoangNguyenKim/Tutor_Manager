import fs from 'node:fs';
import path from 'node:path';

/** Single file DB. Dev default `./data`; packaged Electron passes DATA_DIR=userData. */
export function resolveDbPath(dataDir: string = process.env['DATA_DIR'] ?? './data'): string {
  const dir = path.resolve(dataDir);
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'tutor-manager.db');
}

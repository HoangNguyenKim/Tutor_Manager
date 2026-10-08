// Copies prisma/migrations into dist/prisma/migrations so the packaged
// backend can apply them at boot without the Prisma schema engine.
const fs = require('node:fs');
const path = require('node:path');

const src = path.join(__dirname, '..', 'prisma', 'migrations');
const dest = path.join(__dirname, '..', 'dist', 'prisma', 'migrations');
fs.rmSync(dest, { recursive: true, force: true });
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.cpSync(src, dest, { recursive: true });
console.log(`[build] copied migrations to ${dest}`);

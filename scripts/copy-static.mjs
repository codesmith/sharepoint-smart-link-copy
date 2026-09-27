import { cpSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const distDir = path.join(rootDir, 'dist');

mkdirSync(distDir, { recursive: true });

cpSync(path.join(rootDir, 'manifest.json'), path.join(distDir, 'manifest.json'));
cpSync(path.join(rootDir, 'public'), path.join(distDir), { recursive: true });

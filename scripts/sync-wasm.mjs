import { mkdir, copyFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve } from 'node:path';

const rootWasm = resolve(process.cwd(), 'sql-wasm.wasm');
const targetDir = resolve(process.cwd(), 'public/assets');
const targetWasm = resolve(targetDir, 'sql-wasm.wasm');

try {
  await access(rootWasm, constants.R_OK);
  await mkdir(targetDir, { recursive: true });
  await copyFile(rootWasm, targetWasm);
  console.log(`Synced wasm: ${targetWasm}`);
} catch (error) {
  console.warn('Skipping wasm sync:', error instanceof Error ? error.message : String(error));
}

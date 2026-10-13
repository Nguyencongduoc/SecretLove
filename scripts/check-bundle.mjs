import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
const secrets = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'VERIFICATION_HMAC_KEY',
  'RATE_LIMIT_HMAC_KEY',
  'CRON_SECRET',
]
  .map((name) => ({ name, value: process.env[name] }))
  .filter((item) => item.value && item.value.length >= 16);
let checked = 0;
async function scan(path) {
  for (const item of await readdir(path, { withFileTypes: true })) {
    const file = join(path, item.name);
    if (item.isDirectory()) await scan(file);
    else {
      const data = await readFile(file);
      checked++;
      for (const secret of secrets)
        if (data.includes(Buffer.from(secret.value))) {
          console.error(`Client bundle contains forbidden server setting: ${secret.name}`);
          process.exitCode = 1;
        }
    }
  }
}
await scan('.next/static');
if (!process.exitCode)
  console.log(`Server-secret scan passed for ${checked} client assets; values withheld.`);

#!/usr/bin/env node
// Mints an account and prints the SQL to insert it. Run: pnpm key "my board"

import { randomUUID, randomBytes, createHash } from "node:crypto";

const label = process.argv[2] ?? "personal";
const token = "pc_" + randomBytes(24).toString("base64url");
const hash = createHash("sha256").update(token).digest("hex");
const id = randomUUID();

const sql =
  `INSERT INTO accounts (id, label, key_hash, weekly_hours, created_at) ` +
  `VALUES ('${id}', '${label.replace(/'/g, "''")}', '${hash}', 20, ${Date.now()});`;

console.log(`\nToken (shown once — save it now):\n\n  ${token}\n`);
console.log(`Apply it:\n`);
console.log(`  wrangler d1 execute portfolio --local --command "${sql}"\n`);
console.log(`Then open the board without typing anything:\n`);
console.log(`  http://localhost:8787/?key=${token}\n`);
console.log(`For the deployed version, run the same insert with --remote.\n`);

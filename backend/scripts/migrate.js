const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const config = require('../config');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

async function run() {
  if (!config.supabase.directUrl) {
    console.error('Missing DIRECT_URL in .env — required for running migrations.');
    process.exit(1);
  }

  const client = new Client({
    connectionString: config.supabase.directUrl,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  try {
    await client.query(`
      create table if not exists schema_migrations (
        filename text primary key,
        applied_at timestamptz not null default now()
      );
    `);

    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const { rows } = await client.query(
        'select 1 from schema_migrations where filename = $1',
        [file]
      );
      if (rows.length) {
        console.log(`skip   ${file} (already applied)`);
        continue;
      }

      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      console.log(`apply  ${file} ...`);
      await client.query('begin');
      try {
        await client.query(sql);
        await client.query('insert into schema_migrations (filename) values ($1)', [file]);
        await client.query('commit');
        console.log(`done   ${file}`);
      } catch (err) {
        await client.query('rollback');
        throw err;
      }
    }

    console.log('All migrations applied.');
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});

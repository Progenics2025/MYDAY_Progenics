import { Pool } from 'pg';

async function main() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'paypulse_user',
    password: process.env.DB_PASSWORD || 'Prolab#05',
    database: process.env.DB_NAME || 'paypulsepro'
  });

  const res = await pool.query('SELECT id, notification_type, reference_id, manager_id, employee_id, status, created_at FROM notifications ORDER BY created_at DESC LIMIT 5');
  console.log(res.rows);
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });

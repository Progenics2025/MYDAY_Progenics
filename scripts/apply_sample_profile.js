// scripts/apply_sample_profile.js
// Run: node scripts/apply_sample_profile.js [EMPLOYEE_ID]

const { Pool } = require('pg');

async function run() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'paypulse_user',
    password: process.env.DB_PASSWORD || 'Prolab#05',
    database: process.env.DB_NAME || 'paypulsepro'
  });

  const client = await pool.connect();
  try {
    const employeeId = process.argv[2] || 'EMP001';

    const sample = {
      phone: '9876543210',
      emergency_contact: '9123456789',
      address: '123 Sample St, Example City',
      date_of_birth: '1990-08-15',
      blood_group: 'O+',
      marital_status: 'married',
      skills: JSON.stringify(['Node.js','React','SQL']),
      profile_photo_url: '/uploads/profiles/sample-photo.png'
    };

    const updateSql = `
      UPDATE employees
      SET phone = $1,
          emergency_contact = $2,
          address = $3,
          date_of_birth = $4,
          blood_group = $5,
          marital_status = $6,
          skills = $7::jsonb,
          profile_photo_url = $8,
          updated_at = now()
      WHERE employee_id = $9
      RETURNING *;
    `;

    const res = await client.query(updateSql, [
      sample.phone,
      sample.emergency_contact,
      sample.address,
      sample.date_of_birth,
      sample.blood_group,
      sample.marital_status,
      sample.skills,
      sample.profile_photo_url,
      employeeId
    ]);

    if (res.rowCount === 0) {
      console.log('No employee found with employee_id=', employeeId);
    } else {
      console.log('Updated employee profile:', res.rows[0]);
    }
  } catch (err) {
    console.error('Failed to apply sample profile', err);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
}

run();


import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
    connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER || 'paypulse_user'}:${process.env.DB_PASSWORD || 'Prolab#05'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'paypulsepro'}`,
};

console.log('Connecting with config:', {
    ...dbConfig,
    connectionString: dbConfig.connectionString.replace(/:([^:@]+)@/, ':****@')
});

const pool = new Pool(dbConfig);

async function migrate() {
    console.log('Starting migration...');
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const columns = [
            'city VARCHAR(100)',
            'state VARCHAR(100)',
            'total_days DECIMAL(5, 1)',
            'days_paid DECIMAL(5, 1)',
            'arrear_days DECIMAL(5, 1)',
            'absent_days DECIMAL(5, 1)',
            'lop DECIMAL(10, 2)'
        ];

        for (const col of columns) {
            const colName = col.split(' ')[0];
            // Check if column exists
            const checkRes = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='payroll' AND column_name=$1
      `, [colName]);

            if (checkRes.rowCount === 0) {
                console.log(`Adding column ${colName} to payroll table...`);
                await client.query(`ALTER TABLE payroll ADD COLUMN ${col}`);
            } else {
                console.log(`Column ${colName} already exists in payroll table.`);
            }
        }

        await client.query('COMMIT');
        console.log('Migration completed successfully.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();

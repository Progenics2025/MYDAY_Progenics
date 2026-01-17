import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

async function main() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        console.log('Adding address column to gps_locations table...');

        // Check if column already exists
        const checkResult = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'gps_locations' AND column_name = 'address'
        `);

        if (checkResult.rows.length > 0) {
            console.log('Address column already exists. No changes needed.');
        } else {
            await pool.query(`ALTER TABLE gps_locations ADD COLUMN address TEXT`);
            console.log('Successfully added address column to gps_locations!');
        }
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

main();

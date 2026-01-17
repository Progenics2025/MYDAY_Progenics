import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

async function main() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        console.log('Checking GPS locations with addresses...');

        const result = await pool.query(`
            SELECT id, attendance_id, latitude, longitude, address, timestamp 
            FROM gps_locations 
            ORDER BY timestamp DESC 
            LIMIT 10
        `);

        console.log('Recent GPS locations:');
        console.table(result.rows);

        const addressCount = await pool.query(`
            SELECT COUNT(*) as total, COUNT(address) as with_address 
            FROM gps_locations
        `);
        console.log('Address stats:', addressCount.rows[0]);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
}

main();

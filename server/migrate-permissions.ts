import { Pool } from 'pg';

async function addPermissionRequestsTable() {
    console.log('Adding permission_requests table...');

    const pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USER || 'paypulse_user',
        password: process.env.DB_PASSWORD || 'Prolab#05',
        database: process.env.DB_NAME || 'paypulsepro'
    });

    try {
        // Create permission_requests table
        await pool.query(`
      CREATE TABLE IF NOT EXISTS permission_requests (
        id VARCHAR(36) PRIMARY KEY,
        employee_id VARCHAR(50) NOT NULL,
        permission_date TIMESTAMP NOT NULL,
        duration INTEGER NOT NULL,
        reason TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        approved_by VARCHAR(36),
        approved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

        // Create permission_usage table to track monthly usage
        await pool.query(`
      CREATE TABLE IF NOT EXISTS permission_usage (
        id VARCHAR(36) PRIMARY KEY,
        employee_id VARCHAR(50) NOT NULL,
        month INTEGER NOT NULL,
        year INTEGER NOT NULL,
        total_hours_used DECIMAL(5,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(employee_id, month, year)
      );
    `);

        console.log('Permission tables created successfully!');
    } catch (error) {
        console.error('Error creating permission tables:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

// Run migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    addPermissionRequestsTable()
        .then(() => {
            console.log('Permission migration completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Permission migration failed:', error);
            process.exit(1);
        });
}

export { addPermissionRequestsTable };

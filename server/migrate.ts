import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { 
  users, employees, attendance, payroll, leaveRequests, expenses, documents, gpsLocations 
} from "@shared/schema";
import { randomUUID } from 'crypto';

async function createTables() {
  console.log('Environment variables:', {
    DB_HOST: process.env.DB_HOST,
    DB_PORT: process.env.DB_PORT,
    DB_USER: process.env.DB_USER,
    DB_PASSWORD: process.env.DB_PASSWORD ? '***' : 'undefined',
    DB_NAME: process.env.DB_NAME
  });

  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'paypulse_user',
    password: process.env.DB_PASSWORD || 'Prolab#05',
    database: process.env.DB_NAME || 'paypulsepro'
  });

  const db = drizzle(pool);

  try {
    console.log('Creating database tables...');
    
    // Create tables using raw SQL since we don't have migrations set up
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'employee',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS employees (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) REFERENCES users(id),
        employee_id VARCHAR(50) NOT NULL UNIQUE,
        first_name VARCHAR(255) NOT NULL,
        last_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        phone VARCHAR(20),
        department VARCHAR(100),
        role VARCHAR(100),
        salary DECIMAL(10,2),
        basic_salary DECIMAL(10,2),
        hra DECIMAL(10,2),
        transport_allowance DECIMAL(10,2),
        medical_allowance DECIMAL(10,2),
        other_allowances DECIMAL(10,2),
        join_date TIMESTAMP,
        status VARCHAR(20) DEFAULT 'active',
        address TEXT,
        date_of_birth TIMESTAMP,
        emergency_contact VARCHAR(20),
        blood_group VARCHAR(5),
        marital_status VARCHAR(20),
        pan_number VARCHAR(10),
        aadhaar_number VARCHAR(12),
        uan_number VARCHAR(12),
        esic_number VARCHAR(17),
        bank_account VARCHAR(20),
        ifsc_code VARCHAR(11),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id VARCHAR(36) PRIMARY KEY,
        employee_id VARCHAR(50) NOT NULL,
        date TIMESTAMP NOT NULL,
        punch_in TIMESTAMP,
        punch_out TIMESTAMP,
        total_hours DECIMAL(5,2),
        status VARCHAR(20) DEFAULT 'present',
        notes TEXT,
        location JSON,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS payroll (
        id VARCHAR(36) PRIMARY KEY,
        employee_id VARCHAR(50) NOT NULL,
        month INTEGER NOT NULL,
        year INTEGER NOT NULL,
        basic_salary DECIMAL(10,2) NOT NULL,
        hra DECIMAL(10,2) NOT NULL,
        transport_allowance DECIMAL(10,2) NOT NULL,
        medical_allowance DECIMAL(10,2) NOT NULL,
        other_allowances DECIMAL(10,2) NOT NULL,
        gross_salary DECIMAL(10,2) NOT NULL,
        provident_fund DECIMAL(10,2) NOT NULL,
        esi DECIMAL(10,2) NOT NULL,
        professional_tax DECIMAL(10,2) NOT NULL,
        income_tax DECIMAL(10,2) NOT NULL,
        total_deductions DECIMAL(10,2) NOT NULL,
        net_salary DECIMAL(10,2) NOT NULL,
        payment_date TIMESTAMP,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS leave_requests (
        id VARCHAR(36) PRIMARY KEY,
        employee_id VARCHAR(50) NOT NULL,
        leave_type VARCHAR(50) NOT NULL,
        start_date TIMESTAMP NOT NULL,
        end_date TIMESTAMP NOT NULL,
        reason TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        approved_by VARCHAR(36),
        approved_at TIMESTAMP,
        total_days DECIMAL(5,1) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id VARCHAR(36) PRIMARY KEY,
        employee_id VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        amount DECIMAL(10,2) NOT NULL,
        category VARCHAR(50) NOT NULL,
        date TIMESTAMP NOT NULL,
        receipt_url VARCHAR(500),
        status VARCHAR(20) DEFAULT 'pending',
        approved_by VARCHAR(50),
        approved_at TIMESTAMP,
        remarks TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id VARCHAR(36) PRIMARY KEY,
        employee_id VARCHAR(50) NOT NULL,
        document_type VARCHAR(100) NOT NULL,
        document_name VARCHAR(255) NOT NULL,
        file_url VARCHAR(500) NOT NULL,
        file_size INTEGER,
        mime_type VARCHAR(100),
        uploaded_by VARCHAR(50),
        is_verified BOOLEAN DEFAULT FALSE,
        verified_by VARCHAR(50),
        verified_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS gps_locations (
        id VARCHAR(36) PRIMARY KEY,
        attendance_id VARCHAR(36) REFERENCES attendance(id),
        latitude DECIMAL(10,8) NOT NULL,
        longitude DECIMAL(11,8) NOT NULL,
        accuracy DECIMAL(10,2),
        timestamp TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('Database tables created successfully!');

    // Create default admin user if it doesn't exist
    const adminCheck = await pool.query('SELECT id FROM users WHERE username = $1', ['admin']);
    
    if (adminCheck.rows.length === 0) {
      console.log('Creating default admin user...');
      
      const adminUserId = randomUUID();
      await pool.query(`
        INSERT INTO users (id, username, password, email, name, role)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [adminUserId, 'admin', 'admin123', 'admin@company.com', 'System Administrator', 'admin']);

      await pool.query(`
        INSERT INTO employees (id, user_id, employee_id, first_name, last_name, email, department, role, salary, status, join_date)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        randomUUID(),
        adminUserId,
        'EMP001',
        'System',
        'Administrator',
        'admin@company.com',
        'IT',
        'Administrator',
        '100000',
        'active',
        new Date()
      ]);

      console.log('Default admin user created successfully!');
      console.log('Username: admin');
      console.log('Password: admin123');
    }

  } catch (error) {
    console.error('Error creating database tables:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createTables()
    .then(() => {
      console.log('Migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export { createTables };

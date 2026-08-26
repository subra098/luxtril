const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'luxtril',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'bps',
});

const migrate = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query('DROP TABLE IF EXISTS slot_overrides CASCADE');
    await client.query('DROP TABLE IF EXISTS staff_services CASCADE');
    await client.query('DROP TABLE IF EXISTS booking_services CASCADE');
    await client.query('DROP TABLE IF EXISTS reviews CASCADE');
    await client.query('DROP TABLE IF EXISTS payments CASCADE');
    await client.query('DROP TABLE IF EXISTS bookings CASCADE');
    await client.query('DROP TABLE IF EXISTS working_hours CASCADE');
    await client.query('DROP TABLE IF EXISTS staff CASCADE');
    await client.query('DROP TABLE IF EXISTS services CASCADE');
    await client.query('DROP TABLE IF EXISTS salons CASCADE');
    await client.query('DROP TABLE IF EXISTS users CASCADE');

    await client.query(`
      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        role VARCHAR(50) NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'salon_owner', 'admin')),
        gender VARCHAR(20),
        profile_image TEXT,
        is_active BOOLEAN DEFAULT true,
        reset_password_token VARCHAR(255),
        reset_password_expires TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE salons (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        owner_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        phone VARCHAR(20),
        email VARCHAR(255),
        address_street VARCHAR(255),
        address_city VARCHAR(255),
        address_state VARCHAR(255),
        address_pincode VARCHAR(20),
        images JSONB DEFAULT '[]'::jsonb,
        latitude DOUBLE PRECISION,
        longitude DOUBLE PRECISION,
        is_approved BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        slot_duration INTEGER DEFAULT 30,
        seats_per_slot INTEGER DEFAULT 3,
        rating_average DECIMAL(3,2) DEFAULT 0,
        rating_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE working_hours (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        salon_id UUID REFERENCES salons(id) ON DELETE CASCADE NOT NULL,
        day_of_week VARCHAR(20) NOT NULL,
        is_open BOOLEAN DEFAULT true,
        open_time TIME DEFAULT '09:00',
        close_time TIME DEFAULT '21:00',
        UNIQUE(salon_id, day_of_week)
      )
    `);

    await client.query(`
      CREATE TABLE services (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        salon_id UUID REFERENCES salons(id) ON DELETE CASCADE NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100),
        gender VARCHAR(50) DEFAULT 'unisex',
        price DECIMAL(10,2) NOT NULL,
        duration INTEGER NOT NULL,
        image TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE staff (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        salon_id UUID REFERENCES salons(id) ON DELETE CASCADE NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(100),
        phone VARCHAR(20),
        email VARCHAR(255),
        profile_image TEXT,
        is_available BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE staff_services (
        staff_id UUID REFERENCES staff(id) ON DELETE CASCADE NOT NULL,
        service_id UUID REFERENCES services(id) ON DELETE CASCADE NOT NULL,
        PRIMARY KEY (staff_id, service_id)
      )
    `);

    await client.query(`
      CREATE TABLE bookings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
        salon_id UUID REFERENCES salons(id) ON DELETE CASCADE NOT NULL,
        staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
        booking_date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        total_amount DECIMAL(10,2) NOT NULL,
        total_duration INTEGER,
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
        payment_status VARCHAR(50) DEFAULT 'pending',
        razorpay_order_id VARCHAR(255),
        razorpay_payment_id VARCHAR(255),
        razorpay_signature VARCHAR(255),
        cancellation_reason TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE booking_services (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
        service_id UUID REFERENCES services(id) ON DELETE SET NULL,
        service_name VARCHAR(255),
        price DECIMAL(10,2),
        duration INTEGER
      )
    `);

    await client.query(`
      CREATE TABLE payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
        razorpay_order_id VARCHAR(255),
        razorpay_payment_id VARCHAR(255),
        razorpay_signature TEXT,
        amount DECIMAL(10,2),
        currency VARCHAR(10) DEFAULT 'INR',
        status VARCHAR(50),
        error_details TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE reviews (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
        salon_id UUID REFERENCES salons(id) ON DELETE CASCADE NOT NULL,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        response_text TEXT,
        responded_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE slot_overrides (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        salon_id UUID REFERENCES salons(id) ON DELETE CASCADE NOT NULL,
        date DATE NOT NULL,
        is_available BOOLEAN DEFAULT true,
        open_time TIME,
        close_time TIME,
        reason VARCHAR(255),
        UNIQUE(salon_id, date)
      )
    `);

    await client.query('COMMIT');
    console.log('Migration completed successfully - all tables created');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
};

migrate();

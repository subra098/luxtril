const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'luxtril',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'bps',
});

const seed = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const adminPassword = await bcrypt.hash('admin123', 12);
    const adminResult = await client.query(
      `INSERT INTO users (name, email, password, phone, role) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (email) DO NOTHING RETURNING id`,
      ['Admin', 'admin@luxtril.com', adminPassword, '9999999999', 'admin']
    );

    const ownerPassword = await bcrypt.hash('owner123', 12);
    const ownerResult = await client.query(
      `INSERT INTO users (name, email, password, phone, role) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (email) DO NOTHING RETURNING id`,
      ['Demo Owner', 'owner@luxtril.com', ownerPassword, '8888888888', 'salon_owner']
    );

    const clientPassword = await bcrypt.hash('TestPassword123', 12);
    const clientResult = await client.query(
      `INSERT INTO users (name, email, password, phone, role) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (email) DO NOTHING RETURNING id`,
      ['Demo Client', 'testuser@example.com', clientPassword, '7777777777', 'customer']
    );

    console.log('Users seeded');

    if (ownerResult.rows.length > 0) {
      const ownerId = ownerResult.rows[0].id;
      const salonResult = await client.query(
        `INSERT INTO salons (owner_id, name, description, phone, email, address_street, address_city, address_state, address_pincode, latitude, longitude, is_approved, is_active, slot_duration, seats_per_slot)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,true,true,45,3) RETURNING id`,
        [ownerId, 'Premium Cuts Salon', 'Premium salon offering haircut, beard styling, and grooming services', '8888888888', 'owner@luxtril.com', 'Main Street', 'Mumbai', 'Maharashtra', '400001', 19.0760, 72.8777]
      );

      const salonId = salonResult.rows[0].id;

      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      for (const day of days) {
        const isOpen = day !== 'sunday';
        await client.query(
          'INSERT INTO working_hours (salon_id, day_of_week, is_open, open_time, close_time) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (salon_id, day_of_week) DO NOTHING',
          [salonId, day, isOpen, '09:00', '21:00']
        );
      }

      console.log('Salon and working hours seeded');

      const services = [
        { name: 'Classic Haircut', description: 'Premium haircut with styling', category: 'haircut', price: 499, duration: 30 },
        { name: 'Beard Grooming', description: 'Professional beard trim & shaping', category: 'beard', price: 299, duration: 20 },
        { name: 'Hair & Beard Combo', description: 'Complete grooming package', category: 'haircut', price: 699, duration: 45 },
        { name: 'Face Clean-Up', description: 'Refreshing face clean-up', category: 'other', price: 399, duration: 25 },
        { name: 'Head Massage', description: 'Relaxing head massage', category: 'other', price: 349, duration: 20 },
      ];

      const serviceIds = [];
      for (const svc of services) {
        const svcResult = await client.query(
          'INSERT INTO services (salon_id, name, description, category, price, duration) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
          [salonId, svc.name, svc.description, svc.category, svc.price, svc.duration]
        );
        serviceIds.push(svcResult.rows[0].id);
      }

      console.log('Services seeded');

      const staffResult = await client.query(
        `INSERT INTO staff (salon_id, name, role, phone, is_available) VALUES ($1,$2,$3,$4,$5), ($1,$2,$3,$4,$5) RETURNING id`,
        [salonId, 'Rahul Sharma', 'Senior Stylist', '9876543210', true]
      );
      const staffResult2 = await client.query(
        `INSERT INTO staff (salon_id, name, role, phone, is_available) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        [salonId, 'Amit Verma', 'Junior Stylist', '9876543211', true]
      );

      for (const sid of serviceIds) {
        await client.query('INSERT INTO staff_services (staff_id, service_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [staffResult.rows[0].id, sid]);
        await client.query('INSERT INTO staff_services (staff_id, service_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [staffResult2.rows[0].id, sid]);
      }

      console.log('Staff seeded');
    }

    await client.query('COMMIT');

    console.log('\nSeed completed successfully!');
    console.log('\n--- Login Credentials ---');
    console.log('Admin:      admin@luxtril.com / admin123');
    console.log('Owner:      owner@luxtril.com / owner123');
    console.log('Client:     testuser@example.com / TestPassword123');
    console.log('-------------------------\n');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
};

seed();

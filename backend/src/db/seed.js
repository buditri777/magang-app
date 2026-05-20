const bcrypt = require('bcrypt');
const db = require('./connection');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

async function seed() {
  try {
    const hash = await bcrypt.hash('admin123', 10);

    // Update existing super admin or insert
    await db.query(
      `UPDATE profiles SET password_hash = ? WHERE email = 'admin@upi.edu'`,
      [hash]
    );

    console.log('✓ Super Admin seeded');
    console.log('  Email: admin@upi.edu');
    console.log('  Password: admin123');
    console.log('  (wajib ganti saat login pertama)');

    // Seed sample Admin UPI
    const adminHash = await bcrypt.hash('adminupi123', 10);
    const [existing] = await db.query('SELECT id FROM profiles WHERE email = ?', ['adminupi@upi.edu']);
    if (existing.length === 0) {
      await db.query(
        `INSERT INTO profiles (email, password_hash, full_name, role, status)
         VALUES (?, ?, ?, ?, ?)`,
        ['adminupi@upi.edu', adminHash, 'Admin UPI', 'admin_upi', 'must_change_password']
      );
      console.log('✓ Admin UPI seeded');
      console.log('  Email: adminupi@upi.edu');
      console.log('  Password: adminupi123');
    }

    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

seed();

const bcrypt = require('bcrypt');
const prisma = require('./prisma');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

async function seed() {
  try {
    const hash = await bcrypt.hash('admin123', 10);

    // Upsert Super Admin
    await prisma.profile.upsert({
      where: { email: 'admin@udb.ac.id' },
      update: { password_hash: hash },
      create: {
        email: 'admin@udb.ac.id',
        password_hash: hash,
        full_name: 'Super Admin',
        role: 'super_admin',
        status: 'must_change_password',
      },
    });

    console.log('✓ Super Admin seeded');
    console.log('  Email: admin@udb.ac.id');
    console.log('  Password: admin123');
    console.log('  (wajib ganti saat login pertama)');

    // Upsert Admin UPI
    const adminHash = await bcrypt.hash('adminupi123', 10);
    await prisma.profile.upsert({
      where: { email: 'adminupi@udb.ac.id' },
      update: { password_hash: adminHash },
      create: {
        email: 'adminupi@udb.ac.id',
        password_hash: adminHash,
        full_name: 'Admin UPI',
        role: 'admin_upi',
        status: 'must_change_password',
      },
    });

    console.log('✓ Admin UPI seeded');
    console.log('  Email: adminupi@udb.ac.id');
    console.log('  Password: adminupi123');

    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

seed();

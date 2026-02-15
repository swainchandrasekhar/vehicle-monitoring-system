const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');

async function updatePasswords() {
  try {
    console.log('========================================');
    console.log('  Updating User Passwords');
    console.log('========================================\n');
    
    // Generate proper hash for 'sekhar'
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('sekhar', salt);

    console.log('Password: sekhar');
    console.log('Hash generated successfully\n');

    // Update all test users with the new hash
    const result = await pool.query(
      `UPDATE users 
       SET password_hash = $1 
       WHERE email IN (
         'admin@vehicle.local',
         'driver1@vehicle.local',
         'driver2@vehicle.local',
         'driver3@vehicle.local',
         'viewer1@vehicle.local'
       )
       RETURNING email, role`,
      [passwordHash]
    );

    console.log('Updated passwords for:');
    result.rows.forEach(row => {
      console.log(` ✓ ${row.email} (${row.role})`);
    });

    console.log('\n========================================');
    console.log('✓ All passwords updated to: sekhar');
    console.log('========================================\n');
    
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    console.error(err);
    process.exit(1);
  }
}

updatePasswords();

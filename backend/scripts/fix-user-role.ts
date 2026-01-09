import 'dotenv/config';
import { query } from '../src/db';

async function fixUserRole() {
  console.log('🔧 Cập nhật role cho user bao@lhu.edu.vn...\n');

  try {
    // Update role to admin
    await query(
      `UPDATE Users SET role = 'admin', updated_at = GETDATE() WHERE email = 'bao@lhu.edu.vn'`
    );
    
    console.log('✅ Đã cập nhật role thành admin');

    // Verify
    const users = await query<{ id: string; email: string; role: string }>(
      `SELECT id, email, role FROM Users WHERE email = 'bao@lhu.edu.vn'`
    );
    console.log('👤 User sau khi cập nhật:', users);

    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi:', error);
    process.exit(1);
  }
}

fixUserRole();

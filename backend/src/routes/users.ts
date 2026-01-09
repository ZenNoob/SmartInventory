import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { query, queryOne } from '../db';
import { authenticate, authorize, storeContext, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// POST /api/users - Create new user
router.post('/', authorize('admin'), storeContext, async (req: AuthRequest, res: Response) => {
  try {
    const { email, password, displayName, role, status } = req.body;
    const storeId = req.storeId;

    if (!email || !password) {
      res.status(400).json({ error: 'Email và mật khẩu là bắt buộc' });
      return;
    }

    // Check if email already exists
    const existingUser = await queryOne(
      'SELECT id FROM Users WHERE email = @email',
      { email }
    );

    if (existingUser) {
      res.status(400).json({ error: 'Email đã được sử dụng' });
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const result = await query(
      `INSERT INTO Users (id, email, password_hash, display_name, role, status, created_at, updated_at)
       OUTPUT INSERTED.*
       VALUES (NEWID(), @email, @passwordHash, @displayName, @role, @status, GETDATE(), GETDATE())`,
      { 
        email, 
        passwordHash, 
        displayName: displayName || email.split('@')[0],
        role: role || 'salesperson',
        status: status || 'active'
      }
    );

    const newUser = result[0];

    // Add user to current store if storeId is provided
    if (storeId) {
      await query(
        `INSERT INTO UserStores (id, user_id, store_id, created_at)
         VALUES (NEWID(), @userId, @storeId, GETDATE())`,
        { userId: newUser.id, storeId }
      );
    }

    res.status(201).json({
      id: newUser.id,
      email: newUser.email,
      displayName: newUser.display_name,
      role: newUser.role,
      status: newUser.status,
      createdAt: newUser.created_at,
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// GET /api/users
router.get('/', authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const users = await query(
      'SELECT id, email, display_name, role, status, created_at FROM Users ORDER BY created_at DESC'
    );

    // Get stores for each user
    const usersWithStores = await Promise.all(
      users.map(async (u: Record<string, unknown>) => {
        const stores = await query(
          `SELECT s.id as storeId, s.name as storeName, s.slug as storeCode, us.role
           FROM UserStores us
           JOIN Stores s ON us.store_id = s.id
           WHERE us.user_id = @userId`,
          { userId: u.id }
        );

        return {
          id: u.id,
          email: u.email,
          displayName: u.display_name,
          role: u.role,
          status: u.status,
          createdAt: u.created_at,
          stores: stores.map((s: Record<string, unknown>) => ({
            storeId: s.storeId,
            storeName: s.storeName,
            storeCode: s.storeCode,
            role: s.role,
          })),
        };
      })
    );

    res.json(usersWithStores);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// GET /api/users/:id
router.get('/:id', authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = await queryOne(
      'SELECT id, email, display_name, role, status, created_at FROM Users WHERE id = @id',
      { id }
    );

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Get stores for this user
    const stores = await query(
      `SELECT s.id as storeId, s.name as storeName, s.slug as storeCode, us.role
       FROM UserStores us
       JOIN Stores s ON us.store_id = s.id
       WHERE us.user_id = @userId`,
      { userId: id }
    );

    res.json({
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      role: user.role,
      status: user.status,
      createdAt: user.created_at,
      stores: stores.map((s: Record<string, unknown>) => ({
        storeId: s.storeId,
        storeName: s.storeName,
        storeCode: s.storeCode,
        role: s.role,
      })),
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// PUT /api/users/:id
router.put('/:id', authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { displayName, role, status, storeIds, permissions } = req.body;

    const user = await queryOne(
      'SELECT id FROM Users WHERE id = @id',
      { id }
    );

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Update user info
    await query(
      `UPDATE Users SET 
        display_name = COALESCE(@displayName, display_name),
        role = COALESCE(@role, role),
        status = COALESCE(@status, status),
        permissions = @permissions,
        updated_at = GETDATE()
       WHERE id = @id`,
      { 
        id, 
        displayName, 
        role, 
        status,
        permissions: permissions ? JSON.stringify(permissions) : null
      }
    );

    // Update store assignments if storeIds is provided
    if (storeIds !== undefined && Array.isArray(storeIds)) {
      // Delete existing store assignments
      await query('DELETE FROM UserStores WHERE user_id = @id', { id });

      // Insert new store assignments
      for (const storeId of storeIds) {
        await query(
          `INSERT INTO UserStores (id, user_id, store_id, role, created_at, updated_at)
           VALUES (NEWID(), @userId, @storeId, 'staff', GETDATE(), GETDATE())`,
          { userId: id, storeId }
        );
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// DELETE /api/users/:id
router.delete('/:id', authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user!.id;

    // Prevent self-deletion
    if (id === currentUserId) {
      res.status(400).json({ error: 'Không thể xóa tài khoản của chính mình' });
      return;
    }

    const user = await queryOne(
      'SELECT id FROM Users WHERE id = @id',
      { id }
    );

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Delete all related data in correct order (respecting foreign key constraints)
    
    // 1. Delete user's sessions
    await query('DELETE FROM Sessions WHERE user_id = @id', { id });
    
    // 2. Delete user's employee work shifts (if table exists)
    try {
      await query('DELETE FROM EmployeeWorkShifts WHERE user_id = @id', { id });
    } catch (e) {
      // Table might not exist, ignore error
      console.log('EmployeeWorkShifts table not found or error deleting:', e);
    }
    
    // 3. Delete user's online store associations (if table exists)
    try {
      await query('DELETE FROM UserOnlineStores WHERE user_id = @id', { id });
    } catch (e) {
      // Table might not exist, ignore error
      console.log('UserOnlineStores table not found or error deleting:', e);
    }
    
    // 4. Delete user's store associations
    await query('DELETE FROM UserStores WHERE user_id = @id', { id });
    
    // 5. Update Shifts to remove user reference (set to NULL or handle appropriately)
    try {
      await query('UPDATE Shifts SET user_id = NULL WHERE user_id = @id', { id });
    } catch (e) {
      console.log('Error updating Shifts:', e);
    }
    
    // 6. Finally, delete the user
    await query('DELETE FROM Users WHERE id = @id', { id });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;

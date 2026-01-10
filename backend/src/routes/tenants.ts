/**
 * Tenant Registration Routes
 * 
 * Handles tenant registration, provisioning status, and tenant management.
 * 
 * Requirements: 1.1, 1.4
 */

import { Router, Request, Response } from 'express';
import { tenantRepository, type CreateTenantInput } from '../repositories/tenant-repository';
import { tenantUserRepository } from '../repositories/tenant-user-repository';
import { tenantProvisioningService } from '../services/tenant-provisioning-service';
import { tenantRouter } from '../db/tenant-router';
import { z } from 'zod';

const router = Router();

/**
 * Registration request validation schema
 */
const registrationSchema = z.object({
  // Business info
  businessName: z.string().min(2, 'Tên doanh nghiệp phải có ít nhất 2 ký tự').max(255),
  businessEmail: z.string().email('Email không hợp lệ'),
  businessPhone: z.string().optional(),
  
  // Owner info
  ownerName: z.string().min(2, 'Tên chủ sở hữu phải có ít nhất 2 ký tự').max(255),
  ownerEmail: z.string().email('Email không hợp lệ'),
  ownerPassword: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự'),
  
  // Optional
  subscriptionPlan: z.enum(['basic', 'standard', 'premium']).optional().default('basic'),
  defaultStoreName: z.string().optional(),
});

type RegistrationRequest = z.infer<typeof registrationSchema>;

/**
 * POST /api/tenants/register
 * 
 * Register a new tenant with business info.
 * Creates tenant record, provisions database, and creates owner account.
 * 
 * Requirements: 1.1, 1.4
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validationResult = registrationSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      res.status(400).json({ error: 'Dữ liệu không hợp lệ', errors });
      return;
    }

    const data: RegistrationRequest = validationResult.data;

    // Ensure tenant router is initialized
    await tenantRouter.initialize();

    // Check if business email already exists
    const existingTenant = await tenantRepository.findByEmail(data.businessEmail);
    if (existingTenant) {
      res.status(400).json({ 
        error: 'Email đã được sử dụng',
        errorCode: 'TENANT001',
      });
      return;
    }

    // Check if owner email already exists in any tenant
    const existingUser = await tenantUserRepository.findByEmail(data.ownerEmail);
    if (existingUser) {
      res.status(400).json({ 
        error: 'Email chủ sở hữu đã được sử dụng',
        errorCode: 'TENANT002',
      });
      return;
    }

    // Generate unique slug and database name
    const slug = generateUniqueSlug(data.businessName);
    const databaseName = `SmartInventory_${slug.replace(/-/g, '_')}`;
    const databaseServer = process.env.DB_SERVER || 'localhost';

    // Check if slug is unique
    if (await tenantRepository.slugExists(slug)) {
      res.status(400).json({ 
        error: 'Tên doanh nghiệp đã được sử dụng, vui lòng chọn tên khác',
        errorCode: 'TENANT003',
      });
      return;
    }

    // Create tenant record in Master DB
    const tenantInput: CreateTenantInput = {
      name: data.businessName,
      slug,
      email: data.businessEmail,
      phone: data.businessPhone,
      subscriptionPlan: data.subscriptionPlan,
      databaseName,
      databaseServer,
    };

    const tenant = await tenantRepository.create(tenantInput);

    // Start async provisioning
    // Return immediately with tenant ID for progress tracking
    res.status(202).json({
      success: true,
      message: 'Đang tạo tài khoản...',
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
    });

    // Provision database asynchronously
    provisionTenantAsync(tenant.id, {
      tenantId: tenant.id,
      databaseName,
      databaseServer,
      ownerEmail: data.ownerEmail,
      ownerPassword: data.ownerPassword,
      ownerDisplayName: data.ownerName,
      defaultStoreName: data.defaultStoreName,
    });

  } catch (error) {
    console.error('Registration error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ 
      error: `Đăng ký thất bại: ${errorMessage}`,
      errorCode: 'TENANT_ERROR',
    });
  }
});


/**
 * Async provisioning function
 */
async function provisionTenantAsync(tenantId: string, input: {
  tenantId: string;
  databaseName: string;
  databaseServer: string;
  ownerEmail: string;
  ownerPassword: string;
  ownerDisplayName: string;
  defaultStoreName?: string;
}): Promise<void> {
  try {
    const result = await tenantProvisioningService.provisionTenant(input);

    if (result.success && result.ownerId) {
      // Create TenantUser record in Master DB for authentication
      await tenantUserRepository.create({
        tenantId: input.tenantId,
        email: input.ownerEmail,
        password: input.ownerPassword,
        isOwner: true,
      });

      console.log(`✅ Tenant ${tenantId} provisioned successfully`);
    } else {
      // Mark tenant as failed
      await tenantRepository.update(tenantId, { status: 'suspended' });
      console.error(`❌ Tenant ${tenantId} provisioning failed:`, result.error);
    }
  } catch (error) {
    console.error(`❌ Tenant ${tenantId} provisioning error:`, error);
    // Mark tenant as failed
    try {
      await tenantRepository.update(tenantId, { status: 'suspended' });
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * GET /api/tenants/register/status/:tenantId
 * 
 * Get provisioning status for a tenant.
 * Used for progress indicator during registration.
 * 
 * Requirements: 1.5
 */
router.get('/register/status/:tenantId', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;

    // Get provisioning progress
    const progress = tenantProvisioningService.getProgress(tenantId);

    if (!progress) {
      // Check if tenant exists and is active (provisioning completed)
      const tenant = await tenantRepository.findById(tenantId);
      
      if (!tenant) {
        res.status(404).json({ error: 'Không tìm thấy tenant' });
        return;
      }

      if (tenant.status === 'active') {
        res.json({
          status: 'completed',
          progress: 100,
          message: 'Hoàn tất!',
          tenant: {
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
          },
        });
        return;
      }

      if (tenant.status === 'suspended') {
        res.json({
          status: 'failed',
          progress: 0,
          message: 'Đăng ký thất bại',
          error: 'Vui lòng liên hệ hỗ trợ',
        });
        return;
      }
    }

    res.json(progress);
  } catch (error) {
    console.error('Get status error:', error);
    res.status(500).json({ error: 'Không thể lấy trạng thái' });
  }
});

/**
 * POST /api/tenants/check-email
 * 
 * Check if email is available for registration.
 */
router.post('/check-email', async (req: Request, res: Response) => {
  try {
    const { email, type } = req.body;

    if (!email) {
      res.status(400).json({ error: 'Email là bắt buộc' });
      return;
    }

    await tenantRouter.initialize();

    if (type === 'business') {
      const exists = await tenantRepository.emailExists(email);
      res.json({ available: !exists });
    } else {
      // Check owner email
      const existingUser = await tenantUserRepository.findByEmail(email);
      res.json({ available: !existingUser });
    }
  } catch (error) {
    console.error('Check email error:', error);
    res.status(500).json({ error: 'Không thể kiểm tra email' });
  }
});

/**
 * POST /api/tenants/check-slug
 * 
 * Check if business name/slug is available.
 */
router.post('/check-slug', async (req: Request, res: Response) => {
  try {
    const { businessName } = req.body;

    if (!businessName) {
      res.status(400).json({ error: 'Tên doanh nghiệp là bắt buộc' });
      return;
    }

    await tenantRouter.initialize();

    const slug = generateUniqueSlug(businessName);
    const exists = await tenantRepository.slugExists(slug);
    
    res.json({ 
      available: !exists,
      suggestedSlug: slug,
    });
  } catch (error) {
    console.error('Check slug error:', error);
    res.status(500).json({ error: 'Không thể kiểm tra tên doanh nghiệp' });
  }
});

/**
 * Generate unique slug from business name
 */
function generateUniqueSlug(name: string): string {
  const baseSlug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);

  // Add timestamp suffix for uniqueness
  const timestamp = Date.now().toString(36).slice(-4);
  return `${baseSlug}-${timestamp}`;
}

export default router;

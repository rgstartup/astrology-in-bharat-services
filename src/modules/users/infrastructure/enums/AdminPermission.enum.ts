// src/modules/users/infrastructure/enums/AdminPermission.enum.ts
// Ye enum define karta hai ki kaunse pages/modules ki permissions exist karti hain.
// Har value admin_data.json ke menu item ke "permissionKey" se match karni chahiye.

export enum AdminPermission {
  DASHBOARD = 'dashboard',
  // Management
  USER_MANAGEMENT = 'user_management',
  EXPERT_MANAGEMENT = 'expert_management',
  AGENT_MANAGEMENT = 'agent_management',
  MANDIR_MANAGEMENT = 'mandir_management',
  SHOP_MANAGEMENT = 'shop_management',
  ORDER_MANAGEMENT = 'order_management',

  // Finance
  PAYOUT_REQUESTS = 'payout_requests',
  REFUND_MANAGEMENT = 'refund_management',

  // Content / Monitoring
  LIVE_SESSIONS = 'live_sessions',
  REVIEWS_MODERATION = 'reviews_moderation',

  // Commerce
  COUPONS_OFFERS = 'coupons_offers',
  PRODUCTS = 'products',

  // Analytics & Settings
  ANALYTICS_DASHBOARD = 'analytics_dashboard',
  SETTINGS = 'settings',

  // KYC
  KYC_REVIEW = 'kyc_review',
}

export const ALL_PERMISSIONS = Object.values(AdminPermission);

const fs = require('fs');
const path = require('path');

const targetFile = path.resolve('src/modules/admin/api/controllers/admin.controller.ts');
const lines = fs.readFileSync(targetFile, 'utf8').split('\n');

const rules = [
  { methods: ['getReviews', 'getReviewStats', 'updateReviewStatus', 'deleteReview', 'sendReviewResponse'], perm: 'AdminPermission.REVIEWS_MODERATION' },
  { methods: ['getUserGrowthStats', 'getDashboardStats', 'getRevenueTrend', 'getEarningsBreakdown'], perm: 'AdminPermission.ANALYTICS_DASHBOARD' },
  { methods: ['getTopExperts', 'getExpertsStats', 'getAllExperts', 'getExpertDetail', 'updateExpertStatus'], perm: 'AdminPermission.EXPERT_MANAGEMENT' },
  { methods: ['getClientStats', 'getAllUsers', 'getClientDetail', 'toggleUserBlock', 'getFilteredUsersCount', 'getFilteredUsersList'], perm: 'AdminPermission.USER_MANAGEMENT' },
  { methods: ['getLiveSessions', 'getLiveSessionStats', 'getChatHistory', 'terminateSession'], perm: 'AdminPermission.LIVE_SESSIONS' },
  { methods: ['getCoupons', 'getCouponStats', 'createCoupon', 'updateCoupon', 'assignCouponBulk'], perm: 'AdminPermission.COUPONS_OFFERS' },
  { methods: ['getWithdrawals', 'getWithdrawalStats', 'updateWithdrawalStatus'], perm: 'AdminPermission.PAYOUT_REQUESTS' },
  { methods: ['getAllMerchants', 'updateMerchantStatus', 'getMerchantSalesOverview', 'getMerchantSalesDetails'], perm: 'AdminPermission.SHOP_MANAGEMENT' },
  { methods: ['createAgent', 'getAgents', 'getAgentStats'], perm: 'AdminPermission.AGENT_MANAGEMENT' },
  { methods: ['getListings', 'updateListingStatus'], perm: 'AdminPermission.PRODUCTS' },
];

const newLines = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // check if line contains async method declaration
  const methodMatch = line.match(/^\s*async\s+([a-zA-Z0-9_]+)\s*\(/);
  if (methodMatch) {
    const methodName = methodMatch[1];
    let matchedPerm = null;
    for (const rule of rules) {
      if (rule.methods.includes(methodName)) {
        matchedPerm = rule.perm;
        break;
      }
    }
    
    if (matchedPerm) {
      // Find where to insert (above @Get, @Post etc)
      // Look backwards for decorators connected to this method
      let insertIndex = newLines.length;
      while (insertIndex > 0 && (newLines[insertIndex - 1].trim().startsWith('@') || newLines[insertIndex - 1].trim() === '')) {
        insertIndex--;
      }
      
      // Check if it already has @RequirePermissions
      let alreadyHas = false;
      for (let j = insertIndex; j < newLines.length; j++) {
        if (newLines[j].includes('@RequirePermissions')) {
          alreadyHas = true;
          break;
        }
      }
      
      if (!alreadyHas) {
        // Insert at insertIndex
        const spaces = lines[i].match(/^\s*/)[0];
        newLines.splice(insertIndex, 0, spaces + `@RequirePermissions(${matchedPerm})`);
      }
    }
  }
  
  newLines.push(line);
}

fs.writeFileSync(targetFile, newLines.join('\n'));
console.log('Decorators added safely.');

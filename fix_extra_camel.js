const fs = require('fs');
const path = require('path');

const rootDir = 'd:/ravi/astrology-in-bharat-services/src';

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        if (file === 'node_modules' || file === 'dist' || file.includes('cart')) return;
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            results = results.concat(walk(fullPath));
        } else if (file.endsWith('.ts')) {
            results.push(fullPath);
        }
    });
    return results;
}

const files = walk(rootDir);

const map = {
    'totalAgents': 'total_agents',
    'activeAgents': 'active_agents',
    'blockedAgents': 'blocked_agents',
    'totalListings': 'total_listings',
    'pendingPayouts': 'pending_payouts',
    'pendingApproval': 'pending_approval',
    'totalChatSessions': 'total_chat_sessions',
    'totalExperts': 'total_experts',
    'totalUsers': 'total_users',
    'totalEarnings': 'total_earnings',
    'adminEarnings': 'admin_earnings',
    'totalSpent': 'total_spent',
    'walletBalance': 'wallet_balance',
    'totalWithdrawn': 'total_withdrawn',
    'revenueGrowth': 'revenue_growth',
    'availableBalance': 'available_balance',
    'actualEarnings': 'actual_earnings',
    'processingAmount': 'processing_amount',
    'totalPayouts': 'total_payouts',
    'nextPayoutDate': 'next_payout_date',
    'averageRating': 'average_rating',
    'ratingDistribution': 'rating_distribution',
    'weeklyTargetProgress': 'weekly_target_progress',
    'currentTier': 'current_tier',
    'salesData': 'sales_data',
    'totalProducts': 'total_products',
    'monthlyEarnings': 'monthly_earnings',
    'totalPending': 'total_pending',
    'totalProcessing': 'total_processing',
    'totalSuccess': 'total_success',
    'totalRejected': 'total_rejected',
    'totalAmountPending': 'total_amount_pending',
    'totalAmountSuccess': 'total_amount_success',
    'pendingAmount': 'pending_amount',
    'approvedAmount': 'approved_amount',
    'pendingWithdrawals': 'pending_withdrawals'
};

let modifiedCount = 0;

for (const file of files) {
    const originalContent = fs.readFileSync(file, 'utf8');
    let newContent = originalContent;
    let modified = false;

    for (const [camel, snake] of Object.entries(map)) {
        const regex = new RegExp(`\\b${camel}\\b`, 'g');
        if (newContent.match(regex)) {
            newContent = newContent.replace(regex, snake);
            modified = true;
        }
    }

    if (modified) {
        fs.writeFileSync(file, newContent, 'utf8');
        console.log(`Updated: ${file.replace(rootDir, '')}`);
        modifiedCount++;
    }
}

console.log(`\nFixed extra camelCase properties in ${modifiedCount} files.`);

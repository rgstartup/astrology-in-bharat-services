import { Injectable, NotFoundException } from '@nestjs/common';
import { ChatService } from '@/modules/chat/application/services/chat.service';
import { ProfileService } from '@/modules/expert/application/services/profile.service';
import { UsersService } from '@/modules/users/application/services/users.service';
import { WalletService } from '@/modules/wallet/application/services/wallet.service';
import { OrderService } from '@/modules/order/application/services/order.service';

@Injectable()
export class AdminService {
    constructor(
        private readonly usersService: UsersService,
        private readonly walletService: WalletService,
        private readonly profileService: ProfileService,
        private readonly chatService: ChatService,
        private readonly orderService: OrderService,
    ) { }

    async getUserGrowthStats(days: number) {
        return this.usersService.getUserExpertGrowthStats(days);
    }

    async getDashboardStats() {
        const expertStats = await this.usersService.getExpertStats();
        const userStats = await this.usersService.getUserStats();
        const chatSessionsCount = await this.chatService.getTotalSessionsCount();
        const totalEarnings = await this.walletService.getGlobalEarnings();

        return {
            totalChatSessions: chatSessionsCount,
            totalExperts: expertStats.totalExperts,
            totalUsers: userStats.totalUsers,
            totalEarnings: totalEarnings,
            trends: expertStats.trends,
        };
    }

    async getExpertsStats() {
        return this.usersService.getExpertStats();
    }

    async getUserStats() {
        return this.usersService.getUserStats();
    }

    async getAllUsers(search?: string, page: number = 1, limit: number = 10) {
        return this.usersService.findAllByRole('client', search, page, limit);
    }

    async getAllExperts(search?: string, page: number = 1, limit: number = 10) {
        return this.usersService.findAllByRole('expert', search, page, limit);
    }

    async getExpertDetail(id: number) {
        const user = await this.usersService.findById(id);
        if (!user.profile_expert) {
            throw new NotFoundException('Expert profile not found for this user');
        }

        const profile = user.profile_expert;
        const totalEarnings = await this.walletService.getTotalEarnings(user.id);

        return {
            id: user.id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            gender: profile.gender,
            dob: profile.date_of_birth ? new Date(profile.date_of_birth).toISOString() : null,
            phone: profile.phoneNumber || user.profile_client?.phone || '',
            languages: profile.languages ? profile.languages.split(',') : [],
            bio: profile.bio || '',
            experience: profile.experience_in_years,
            specialization: profile.specialization || '',
            rating: profile.rating,
            consultationCount: profile.consultationCount,
            totalEarnings: totalEarnings,
            intro_video_url: profile.video || (profile.videos && profile.videos.length > 0 ? profile.videos[0] : ''),
            gallery: profile.gallery || [],
            documents: profile.documents || [],
            addresses: profile.addresses?.map(addr => ({
                houseNo: addr.houseNo || '',
                district: addr.district || '',
                city: addr.city || '',
                state: addr.state || '',
                country: addr.country || '',
                pincode: addr.pincode || addr.zipCode || ''
            })) || [],
            kyc_details: {
                status: profile.kycStatus,
                reason: profile.rejectionReason,
            },
        };
    }

    async updateExpertStatus(id: number, status: string, reason?: string) {
        return this.profileService.updateKycStatus(id, status, reason);
    }

    async toggleUserBlock(id: number, isBlocked: boolean) {
        return this.usersService.update(id, { isBlocked });
    }

    async getUserDetail(id: number) {
        const user = await this.usersService.findById(id);
        const profile = user.profile_client;

        // Fetch wallet balance
        const walletBalance = await this.walletService.getBalance(user.id);

        // Let's check how many chat sessions this user has completed
        const sessions = await this.chatService.getAllSessionsByClient(user.id);
        const completedSessions = sessions.filter(s => s.status === 'completed');
        const calculatedTotalSpent = completedSessions.reduce((sum, s) => sum + (s.totalCost || 0), 0);

        // Fetch user orders (purchases)
        const orders = await this.orderService.getUserOrders(user.id);

        return {
            id: user.id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            phone: user.phone || profile?.phone || '',
            gender: profile?.gender || 'other',
            dob: profile?.date_of_birth ? new Date(profile.date_of_birth).toISOString() : null,
            joinDate: user.createdAt.toISOString(),
            status: user.isBlocked ? 'Blocked' : 'Active',
            isBlocked: user.isBlocked,
            totalConsultations: completedSessions.length,
            totalSpent: calculatedTotalSpent,
            walletBalance: walletBalance,
            lastActive: user.updatedAt.toISOString(),
            addresses: profile?.addresses?.map(addr => ({
                id: addr.id,
                line1: addr.line1,
                city: addr.city,
                state: addr.state,
                country: addr.country,
                zipCode: addr.zipCode,
                tag: addr.tag,
            })) || [],
            about_me: profile?.about_me || '',
            occupation: profile?.occupation || '',
            marital_status: profile?.marital_status || '',
            purchases: orders.map(order => ({
                id: order.id,
                amount: order.totalAmount,
                status: order.status,
                createdAt: order.createdAt,
                items: order.items.map(item => ({
                    productName: item.product?.name || 'Unknown Product',
                    quantity: item.quantity,
                    price: item.price
                }))
            }))
        };
    }

    async getLiveSessions(type?: string) {
        return this.chatService.getAllLiveSessions(type);
    }

    async getChatHistory(sessionId: number) {
        return this.chatService.getMessages(sessionId);
    }
}


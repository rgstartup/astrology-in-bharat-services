import { Module } from "@nestjs/common";
import { ExpertEarningsModule } from "./earnings/expert-earnings.module";
import { ExpertDashboardModule } from "./dashboard/expert-dashboard.module";
import { TodosModule } from "./todos/todos.module";
import { ExpertAuthModule } from "./auth/auth.module";
import { ExpertAccountModule } from "./account/account.module";
import { ExpertDiscoveryModule } from "./discovery/discovery.module";
import { SpecializationModule } from "./specialization/specialization.module";
import { ProfessionModule } from "./profession/profession.module";
import { OnboardingModule } from "./onboarding/onboarding.module";
import { PayoutsAccountsModule } from "@/internal/actors/expert/payout-accounts/payouts-accounts.module";
import { ExpertProductsModule } from "./products/products.module";
import { PresenceModule } from "./presence/presence.module";
import { ExpertRealtimeModule } from "./realtime/expert-realtime.module";
import { ExpertChatModule } from "./consultation/chat/chat.module";
import { ExpertReviewsModule } from "./consultation/reviews/expert-reviews.module";
import { ExpertNotificationsModule } from "./notifications/notifications.module";

@Module({
  imports: [
    ExpertEarningsModule,
    ExpertDashboardModule,
    TodosModule,
    ExpertAuthModule,
    ExpertAccountModule,
    ExpertDiscoveryModule,
    SpecializationModule,
    ProfessionModule,
    OnboardingModule,
    PayoutsAccountsModule,
    ExpertProductsModule,
    PresenceModule,
    ExpertRealtimeModule,
    ExpertChatModule,
    ExpertReviewsModule,
    ExpertNotificationsModule,
  ],
  exports: [
    ExpertEarningsModule,
    ExpertDashboardModule,
    TodosModule,
    ExpertAuthModule,
    ExpertAccountModule,
    ExpertDiscoveryModule,
    SpecializationModule,
    ProfessionModule,
    OnboardingModule,
    PayoutsAccountsModule,
    ExpertProductsModule,
    PresenceModule,
    ExpertRealtimeModule,
    ExpertChatModule,
    ExpertReviewsModule,
    ExpertNotificationsModule,
  ],
})
export class ExpertModule {}

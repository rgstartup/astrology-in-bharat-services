import { Module } from '@nestjs/common';
import { ProfileModule } from './profile/profile.module';
import { ExpertDashboardModule } from './dashboard/expert-dashboard.module';

@Module({
  imports: [ProfileModule, ExpertDashboardModule],
})
export class ExpertModule { }

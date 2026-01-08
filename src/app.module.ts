import { Module } from '@nestjs/common';
import { UsersModule } from '@/modules/users/users.module';
import { CoreModule } from '@/core/core.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { RolesModule } from '@/modules/role/roles.module';
import { NotificationModule } from '@/notification/notification.module';
import { ClientModule } from '@/modules/client/client.module';
import { ExpertModule } from '@/modules/expert/expert.module';
import { AdminModule } from '@/modules/admin/admin.module';
import { ProductModule } from '@/modules/product/product.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';


@Module({
  imports: [
    UsersModule,
    CoreModule,
    AuthModule,
    RolesModule,
    NotificationModule,
    ClientModule,
    ExpertModule,
    AdminModule,
    ProductModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),

  ],
})

export class AppModule { }

import { Module } from '@nestjs/common';
import { PushSubscriptionController } from './push-subscription.controller';
import { PushNotificationController } from './push-notification.controller';
import { PushNotificationService } from './push-notification.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [PushSubscriptionController, PushNotificationController],
  providers: [PushNotificationService, PrismaService],
  exports: [PushNotificationService],
})
export class PushModule {}
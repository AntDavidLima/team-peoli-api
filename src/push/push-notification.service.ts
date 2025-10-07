import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as webpush from 'web-push';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);

  constructor(private prismaService: PrismaService) {
    if (process.env.VAPID_SUBJECT && process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
      webpush.setVapidDetails(
        process.env.VAPID_SUBJECT,
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY,
      );
    } else {
      this.logger.warn('VAPID keys not found in environment variables. Push notifications will not work.');
    }
  }

  async scheduleRestNotification(userId: number, durationInSeconds: number, data?: {url: string}) {
    const sendAt = new Date(Date.now() + durationInSeconds * 1000);
    
    const payload = {
      title: 'Acabou a moleza!',
      body: 'O descanso encerrou, execute a próxima série!',
      data: data || { url: '/' } 
    };

    const notification = await this.prismaService.scheduledNotification.create({
      data: {
        userId,
        sendAt,
        payload,
        status: 'PENDING',
      },
    });

    this.logger.log(`Notification ${notification.id} scheduled for user ${userId} at ${sendAt.toISOString()}`);
    return notification;
  }

  async cancelScheduledNotification(notificationId: number, userId: number) {
    const { count } = await this.prismaService.scheduledNotification.updateMany({
      where: {
        id: notificationId,
        userId,
        status: 'PENDING',
      },
      data: {
        status: 'CANCELLED',
      },
    });

    if (count > 0) {
      this.logger.log(`Notification ${notificationId} cancelled for user ${userId}`);
    }

    return { success: count > 0 };
  }

  @Cron(CronExpression.EVERY_SECOND)
  async handlePendingNotifications() {
    this.logger.log(`Cron job running. Current server time (UTC): ${new Date().toISOString()}`);

    this.logger.log('Checking for pending notifications...');

    const notificationsToSend = await this.prismaService.scheduledNotification.findMany({
      where: {
        status: 'PENDING',
        sendAt: {
          lte: new Date(),
        },
      },
      include: {
        user: {
          include: {
            pushSubscriptions: true,
          },
        },
      },
    });

    if (notificationsToSend.length === 0) {
      return;
    }

    this.logger.log(`Found ${notificationsToSend.length} notifications to send.`);

    for (const notification of notificationsToSend) {
      if (!notification.user.pushSubscriptions.length) {
        await this.prismaService.scheduledNotification.update({
          where: { id: notification.id },
          data: { status: 'ERROR' },
        });
        continue;
      }
      
      const payload = JSON.stringify(notification.payload);

      const sendPromises = notification.user.pushSubscriptions.map(sub =>
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload
        ).catch(err => {
            this.logger.error(`Failed to send push to ${sub.endpoint}. Error: ${err.message}`);
            if (err.statusCode === 410) {
              this.logger.log(`Subscription ${sub.endpoint} is expired. Removing from DB.`);
              return this.prismaService.pushSubscription.delete({
                where: { endpoint: sub.endpoint },
              });
            }
        })
      );
      
      await Promise.all(sendPromises);

      await this.prismaService.scheduledNotification.update({
        where: { id: notification.id },
        data: { status: 'SENT' },
      });

      this.logger.log(`Notification ${notification.id} sent to user ${notification.userId}`);
    }
  }
}
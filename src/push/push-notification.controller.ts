import { Controller, Post, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { AuthenticationGuard } from 'src/authentication/authentication.guard';
import { AuthenticationTokenPayload } from 'src/authentication/token-payload/token-payload.decorator';
import { AuthenticationTokenPayloadSchema } from 'src/authentication/authentication.strategy';
import { PushNotificationService } from './push-notification.service';
import { z } from 'zod';
import { ZodValidationPipe } from 'src/zod-validation/zod-validation.pipe';

const scheduleRestNotificationSchema = z.object({
  durationInSeconds: z.number().positive(),
});

const cancelNotificationSchema = z.object({
  notificationId: z.number().positive(),
});

@Controller('notifications')
@UseGuards(AuthenticationGuard)
export class PushNotificationController {
  constructor(private readonly pushNotificationService: PushNotificationService) {}

  @Post('schedule/rest')
  async scheduleRestNotification(
    @AuthenticationTokenPayload() payload: AuthenticationTokenPayloadSchema,
    @Body(new ZodValidationPipe(scheduleRestNotificationSchema)) body: { durationInSeconds: number },
  ) {
    const notification = await this.pushNotificationService.scheduleRestNotification(
      payload.sub,
      body.durationInSeconds,
    );
    return {
      message: 'Notification scheduled successfully',
      notificationId: notification.id,
    };
  }

  @Post('cancel')
  async cancelNotification(
    @AuthenticationTokenPayload() payload: AuthenticationTokenPayloadSchema,
    @Body(new ZodValidationPipe(cancelNotificationSchema)) body: { notificationId: number },
  ) {
    const result = await this.pushNotificationService.cancelScheduledNotification(
      body.notificationId,
      payload.sub,
    );
    if (!result.success) {
      return { message: 'Notification cancel request processed.' };
    }
    return { message: 'Notification cancelled successfully.' };
  }
}
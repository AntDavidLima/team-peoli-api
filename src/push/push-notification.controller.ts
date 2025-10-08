import { Controller, Post, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { AuthenticationGuard } from 'src/authentication/authentication.guard';
import { AuthenticationTokenPayload } from 'src/authentication/token-payload/token-payload.decorator';
import { AuthenticationTokenPayloadSchema } from 'src/authentication/authentication.strategy';
import { PushNotificationService } from './push-notification.service';
import { z } from 'zod';
import { ZodValidationPipe } from 'src/zod-validation/zod-validation.pipe';

const scheduleRestNotificationSchema = z.object({
  durationInSeconds: z.number().positive(),
  data: z.object({
    url: z.string(), 
  }).optional(),
});

const scheduleFinishReminderSchema = z.object({
  data: z.object({
    url: z.string(),
  }).optional(),
});

const cancelNotificationSchema = z.object({
  notificationId: z.number().positive(),
});

type ScheduleRestNotificationBody = z.infer<typeof scheduleRestNotificationSchema>;

type ScheduleFinishReminderBody = z.infer<typeof scheduleFinishReminderSchema>;

@Controller('notifications')
@UseGuards(AuthenticationGuard)
export class PushNotificationController {
  constructor(private readonly pushNotificationService: PushNotificationService) {}

  @Post('schedule/rest')
  async scheduleRestNotification(
    @AuthenticationTokenPayload() payload: AuthenticationTokenPayloadSchema,
    @Body(new ZodValidationPipe(scheduleRestNotificationSchema)) body: ScheduleRestNotificationBody,
  ) {
    const notification = await this.pushNotificationService.scheduleRestNotification(
      payload.sub,
      body.durationInSeconds,
      body.data, 
    );
    return {
      message: 'Notification scheduled successfully',
      notificationId: notification.id,
    };
  }

  @Post('schedule/finish-reminder')
  async scheduleFinishReminder(
    @AuthenticationTokenPayload() payload: AuthenticationTokenPayloadSchema,
    @Body(new ZodValidationPipe(scheduleFinishReminderSchema)) body: ScheduleFinishReminderBody,
  ) {
    await this.pushNotificationService.scheduleFinishWorkoutReminder(
      payload.sub,
      body.data,
    );
    
    return { message: 'Finish workout reminder scheduled successfully.' };
  }

  @Post('cancel-rest')
  async cancelRestNotifications(
    @AuthenticationTokenPayload() payload: AuthenticationTokenPayloadSchema,
  ) {
    const result = await this.pushNotificationService.cancelPendingRestNotificationsForUser(
      payload.sub,
    );
    
    return {
      message: 'Pending rest notifications have been cancelled.',
      count: result.count,
    };
  }

  @Post('cancel-all')
  async cancelAllNotifications(
    @AuthenticationTokenPayload() payload: AuthenticationTokenPayloadSchema,
  ) {
    const result = await this.pushNotificationService.cancelAllPendingNotificationsForUser(
      payload.sub,
    );
    
    return {
      message: 'All pending notifications have been cancelled.',
      count: result.count,
    };
  }
}
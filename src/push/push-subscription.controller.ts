import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthenticationGuard } from 'src/authentication/authentication.guard';
import { AuthenticationTokenPayloadSchema } from 'src/authentication/authentication.strategy';
import { AuthenticationTokenPayload } from 'src/authentication/token-payload/token-payload.decorator';
import { PrismaService } from 'src/prisma/prisma.service';
import { ZodValidationPipe } from 'src/zod-validation/zod-validation.pipe';
import { z } from 'zod';

const createPushSubscriptionBodySchema = z.object({
  endpoint: z.string({ required_error: "O campo 'endpoint' é obrigatório" }),
  keys: z.object({
    p256dh: z.string({ required_error: "O campo 'p256dh' é obrigatório" }),
    auth: z.string({ required_error: "O campo 'auth' é obrigatório" }),
  }),
});

type CreatePushSubscriptionBodySchema = z.infer<typeof createPushSubscriptionBodySchema>;

const deletePushSubscriptionBodySchema = z.object({
  endpoint: z.string({ required_error: "O campo 'endpoint' é obrigatório" }),
});

type DeletePushSubscriptionBodySchema = z.infer<typeof deletePushSubscriptionBodySchema>;

@Controller('push-subscription')
@UseGuards(AuthenticationGuard)
export class PushSubscriptionController {
  constructor(private prismaService: PrismaService) {}

  @Post()
  async store(
    @Body(new ZodValidationPipe(createPushSubscriptionBodySchema))
    { endpoint, keys }: CreatePushSubscriptionBodySchema,
    @AuthenticationTokenPayload()
    authenticationTokenPayload: AuthenticationTokenPayloadSchema,
  ) {
    try {
      const user = await this.prismaService.user.findUnique({
        where: {
          id: authenticationTokenPayload.sub,
        },
        select: {
          id: true,
        },
      });

      if (!user) {
        throw new BadRequestException('Usuário não encontrado');
      }

      const existingSubscription = await this.prismaService.pushSubscription.findUnique({
        where: {
          endpoint,
        },
      });

      if (existingSubscription) {
        const subscription = await this.prismaService.pushSubscription.update({
          where: {
            endpoint,
          },
          data: {
            p256dh: keys.p256dh,
            auth: keys.auth,
            userId: user.id,
          },
          select: {
            id: true,
            endpoint: true,
            createdAt: true,
          },
        });

        return {
          message: 'Assinatura de push atualizada com sucesso',
          subscription,
        };
      }

      const subscription = await this.prismaService.pushSubscription.create({
        data: {
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
          userId: user.id,
        },
        select: {
          id: true,
          endpoint: true,
          createdAt: true,
        },
      });

      return {
        message: 'Assinatura de push criada com sucesso',
        subscription,
      };
    } catch (error) {
      console.error('Erro ao salvar push subscription:', error);
      throw new BadRequestException('Erro ao salvar assinatura de push');
    }
  }

  @Delete()
  async destroy(
    @Body(new ZodValidationPipe(deletePushSubscriptionBodySchema))
    { endpoint }: DeletePushSubscriptionBodySchema,
    @AuthenticationTokenPayload()
    authenticationTokenPayload: AuthenticationTokenPayloadSchema,
  ) {
    try {
      const subscription = await this.prismaService.pushSubscription.findFirst({
        where: {
          endpoint,
          userId: authenticationTokenPayload.sub,
        },
      });

      if (!subscription) {
        throw new BadRequestException('Assinatura de push não encontrada');
      }

      await this.prismaService.pushSubscription.delete({
        where: {
          id: subscription.id,
        },
      });

      return {
        message: 'Assinatura de push removida com sucesso',
      };
    } catch (error) {
      console.error('Erro ao remover push subscription:', error);
      throw new BadRequestException('Erro ao remover assinatura de push');
    }
  }

  @Post('test-notification')
  async testNotification(
    @AuthenticationTokenPayload()
    authenticationTokenPayload: AuthenticationTokenPayloadSchema,
  ) {
    try {
      const subscriptions = await this.prismaService.pushSubscription.findMany({
        where: {
          userId: authenticationTokenPayload.sub,
        },
        select: {
          endpoint: true,
          p256dh: true,
          auth: true,
        },
      });

      if (subscriptions.length === 0) {
        throw new BadRequestException('Nenhuma assinatura de push encontrada para este usuário');
      }

      return {
        message: 'Notificação de teste enviada com sucesso',
        subscriptionsCount: subscriptions.length,
        subscriptions,
      };
    } catch (error) {
      console.error('Erro ao enviar notificação de teste:', error);
      throw new BadRequestException('Erro ao enviar notificação de teste');
    }
  }
}
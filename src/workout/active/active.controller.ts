import {
    Controller,
    Get,
    UseGuards,
} from '@nestjs/common';
import { AuthenticationGuard } from 'src/authentication/authentication.guard';
import { AuthenticationTokenPayloadSchema } from 'src/authentication/authentication.strategy';
import { AuthenticationTokenPayload } from 'src/authentication/token-payload/token-payload.decorator';
import { PrismaService } from 'src/prisma/prisma.service';

@Controller('/workout/active')
@UseGuards(AuthenticationGuard)
export class ActiveWorkoutController {
  constructor(private prismaService: PrismaService) {}

  @Get()
  async getActiveWorkout(
    @AuthenticationTokenPayload() payload: AuthenticationTokenPayloadSchema,
  ) {
    const activeWorkout = await this.prismaService.activeWorkout.findUnique({
      where: {
        userId: payload.sub,
      },
    });

    return activeWorkout;
  }
}
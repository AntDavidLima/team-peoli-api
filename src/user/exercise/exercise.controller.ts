import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthenticationGuard } from 'src/authentication/authentication.guard';
import { AuthenticationTokenPayloadSchema } from 'src/authentication/authentication.strategy';
import { AuthenticationTokenPayload } from 'src/authentication/token-payload/token-payload.decorator';
import { PrismaService } from 'src/prisma/prisma.service';
import { ZodValidationPipe } from 'src/zod-validation/zod-validation.pipe';
import { z } from 'zod';

const listExercisesParamsSchema = z.object({
  id: z.coerce.number(),
});

type ListExercisesParamsSchema = z.infer<typeof listExercisesParamsSchema>;

const listExercisesQueryParamsSchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

type ListExercisesQueryParamsSchema = z.infer<
  typeof listExercisesQueryParamsSchema
>;

@Controller('user/:id/exercise')
@UseGuards(AuthenticationGuard)
export class ExerciseController {
  constructor(private prismaService: PrismaService) {}

  @Get()
  async index(
    @AuthenticationTokenPayload()
    authenticationTokenPayload: AuthenticationTokenPayloadSchema,
    @Param(new ZodValidationPipe(listExercisesParamsSchema))
    { id }: ListExercisesParamsSchema,
    @Query(new ZodValidationPipe(listExercisesQueryParamsSchema))
    { startDate, endDate }: ListExercisesQueryParamsSchema,
  ) {
    const currentUser = await this.prismaService.user.findUnique({
      where: {
        id: authenticationTokenPayload.sub,
      },
      select: {
        isProfessor: true,
        id: true,
      },
    });

    if (!currentUser) {
      throw new BadRequestException(
        'Não foi possível identificar o usuário logado',
      );
    }

    if (currentUser.id !== id && !currentUser.isProfessor) {
      throw new ForbiddenException(
        'Somente professores podem visualizar os exercícios de outros usuários',
      );
    }

    const user = await this.prismaService.user.findUnique({
      where: {
        id,
      },
    });

    if (!user) {
      throw new BadRequestException('Usuário não encontrado');
    }

    return this.prismaService.exercise.findMany({
      where: {
        workouts: {
          some: {
            workout: {
              studentId: id,
              startTime: {
                gte: startDate,
                lte: endDate,
              }
            }
          }
        }
      },
      select: {
        id: true,
        name: true,
        workouts: {
          where: {
            workout: {
              startTime: {
                gte: startDate,
                lte: endDate,
              },
              studentId: id,
            }
          },
          select: {
            WorkoutExerciseSets: {
              select: {
                id: true,
                load: true,
                reps: true,
              },
            },
            workout: {
              select: {
                startTime: true,
              },
            },
          },
          orderBy: {
            workout: {
              startTime: 'asc',
            },
          },
        },
      },
    });
  }
}

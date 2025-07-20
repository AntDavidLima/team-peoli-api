import {
    BadRequestException,
    Controller,
    ForbiddenException,
    HttpCode,
    Put,
    Param,
    UseGuards,
    Body,
} from '@nestjs/common';
import { AuthenticationGuard } from 'src/authentication/authentication.guard';
import { AuthenticationTokenPayloadSchema } from 'src/authentication/authentication.strategy';
import { AuthenticationTokenPayload } from 'src/authentication/token-payload/token-payload.decorator';
import { PrismaService } from 'src/prisma/prisma.service';
import { ZodValidationPipe } from 'src/zod-validation/zod-validation.pipe';
import { z } from 'zod';

const getTrainingParamsSchema = z.object({
    id: z.coerce.number({ invalid_type_error: 'Treino não identificado' }),
});

const getExerciseParamsSchema = z.object({
    exerciseId: z.coerce.number({ invalid_type_error: 'Exercício não identificado' }),
});

const updateTrainingExerciseBodySchema = z.object({
    userNote: z.string().optional(),
});

type GetTrainingParamsSchema = z.infer<typeof getTrainingParamsSchema>;
type GetExerciseParamsSchema = z.infer<typeof getExerciseParamsSchema>;
type updateTrainingExerciseBodySchema = z.infer<typeof updateTrainingExerciseBodySchema>;

@Controller('/training/:id/exercise/')
@UseGuards(AuthenticationGuard)
export class ExerciseController {
    constructor(private prismaService: PrismaService) { }

    @Put(':exerciseId/userNote')
    @HttpCode(204)
    async updateUserNote(
        @AuthenticationTokenPayload()
        authenticationTokenPayload: AuthenticationTokenPayloadSchema,
        @Param(new ZodValidationPipe(getTrainingParamsSchema))
        { id: trainingId }: GetTrainingParamsSchema,
        @Param(new ZodValidationPipe(getExerciseParamsSchema))
        { exerciseId }: GetExerciseParamsSchema,
        @Body(new ZodValidationPipe(updateTrainingExerciseBodySchema))
        { userNote }: updateTrainingExerciseBodySchema,
    ) {
        const currentUser = await this.prismaService.user.findUnique({
            where: {
                id: authenticationTokenPayload.sub,
            },
            select: {
                id: true,
            },
        });

        if (!currentUser) {
            throw new BadRequestException(
                'Não foi possível identificar o usuário logado',
            );
        }

        const training = await this.prismaService.training.findUnique({
            where: {
                id: trainingId,
            },
            select: {
                routines: {
                    select: {
                        userId: true,
                    },
                },
            },
        });
        
        const trainingBelongsToCurrentUser = training?.routines.every(
            (routine) => routine.userId === currentUser.id,
        );

        if (!trainingBelongsToCurrentUser) {
            throw new ForbiddenException(
                'Somente professores podem visualizar treinos de outros alunos',
            );
        }

        const trainingExercisesUpdate = await this.prismaService.trainingExercise.update({
            where: {
                exerciseId_trainingId: {
                    exerciseId,
                    trainingId,
                }
            },
            data: {
                userNote,
            },
        })
    }
}

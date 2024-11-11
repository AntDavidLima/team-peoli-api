import {
	BadRequestException,
	Controller,
	Get,
	Param, Query,
	UseGuards,
} from '@nestjs/common';
import { AuthenticationGuard } from 'src/authentication/authentication.guard';
import { AuthenticationTokenPayloadSchema } from 'src/authentication/authentication.strategy';
import { AuthenticationTokenPayload } from 'src/authentication/token-payload/token-payload.decorator';
import { PrismaService } from 'src/prisma/prisma.service';
import { ZodValidationPipe } from 'src/zod-validation/zod-validation.pipe';
import { z } from 'zod';
import { Days } from '../../routine/routine.controller';

const getExerciseParamsSchema = z.object({
	id: z.coerce.number(),
});

type GetExerciseParamsSchema = z.infer<typeof getExerciseParamsSchema>;

const getExerciseQueryParamsSchema = z.object({
	day: z.enum(Days, {
		errorMap: (issue) => ({
			message:
				issue.code === 'invalid_enum_value'
					? 'Treino possui um dia inválido'
					: issue.message!,
		}),
	}),
});

type GetExerciseQueryParamsSchema = z.infer<typeof getExerciseQueryParamsSchema>;

@Controller('exercise/:id/last-execution')
@UseGuards(AuthenticationGuard)
export class LastExecutionController {
	constructor(private prismaService: PrismaService) { }

	@Get()
	async show(
		@AuthenticationTokenPayload()
		authenticationTokenPayload: AuthenticationTokenPayloadSchema,
		@Param(new ZodValidationPipe(getExerciseParamsSchema))
		{ id }: GetExerciseParamsSchema,
		@Query(new ZodValidationPipe(getExerciseQueryParamsSchema))
			{ day }: GetExerciseQueryParamsSchema,
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

		const execution = await this.prismaService.workoutExercise.findFirst({
			where: {
				exerciseId: id,
				workout: {
					studentId: currentUser.id,
					trainings: {
						every: {
							day,
						}
					}
				},
			},
			orderBy: {
				updatedAt: 'desc',
			},
			select: {
				WorkoutExerciseSets: {
					select: {
						load: true,
						reps: true,
					},
				},
			},
		});

		return execution;
	}
}

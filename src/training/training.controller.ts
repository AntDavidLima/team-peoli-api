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
import { Days } from 'src/routine/routine.controller';
import { ZodValidationPipe } from 'src/zod-validation/zod-validation.pipe';
import { z } from 'zod';

const getTrainingParamsSchema = z.object({
	id: z.coerce.number({ invalid_type_error: 'Treino não identificado' }),
});

type GetTrainingParamsSchema = z.infer<typeof getTrainingParamsSchema>;

const listTrainingsQuerySchema = z.object({
	studentId: z.coerce.number().optional(),
	day: z
		.enum(Days, {
			errorMap: (issue) => ({
				message:
					issue.code === 'invalid_enum_value' ? 'Dia inválido' : issue.message!,
			}),
		})
		.optional(),
});

type ListTrainingsQuerySchema = z.infer<typeof listTrainingsQuerySchema>;

@Controller('training')
@UseGuards(AuthenticationGuard)
export class TrainingController {
	constructor(private prismaService: PrismaService) { }

	@Get()
	async index(
		@AuthenticationTokenPayload()
		authenticationTokenPayload: AuthenticationTokenPayloadSchema,
		@Query(new ZodValidationPipe(listTrainingsQuerySchema))
		{ day }: ListTrainingsQuerySchema,
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

		const trainings = await this.prismaService.training.findMany({
			where: {
				day,
				routines: {
					every: {
						userId: currentUser.id,
					},
				},
			},
			select: {
				routines: {
					select: {
						userId: true,
					},
				},
				id: true,
			},
		});

		const trainingsBelongsToCurrentUser = trainings.every((training) =>
			training.routines.every((routine) => routine.userId === currentUser.id),
		);

		if (!currentUser.isProfessor && !trainingsBelongsToCurrentUser) {
			throw new ForbiddenException(
				'Somente professores podem visualizar treinos de outros alunos',
			);
		}

		return trainings;
	}

	@Get(':id')
	async show(
		@AuthenticationTokenPayload()
		authenticationTokenPayload: AuthenticationTokenPayloadSchema,
		@Param(new ZodValidationPipe(getTrainingParamsSchema))
		{ id }: GetTrainingParamsSchema,
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

		const training = await this.prismaService.training.findUnique({
			where: {
				id,
			},
			select: {
				routines: {
					select: {
						userId: true,
					},
				},
				exercises: {
					orderBy: {
						order: 'asc',
					},
					select: {
						sets: true,
						reps: true,
						restTime: true,
						orientations: true,
						userNote: true,
						exercise: {
							select: {
								id: true,
								name: true,
								executionVideoUrl: true,
							},
						},
					},
				},
			},
		});

		const trainingBelongsToCurrentUser = training?.routines.every(
			(routine) => routine.userId === currentUser.id,
		);

		if (!currentUser.isProfessor && !trainingBelongsToCurrentUser) {
			throw new ForbiddenException(
				'Somente professores podem visualizar treinos de outros alunos',
			);
		}

		return { exercises: training?.exercises };
	}
}

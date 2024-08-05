import {
	BadRequestException,
	Body,
	Controller,
	Param,
	Post,
	Put,
	UseGuards,
} from '@nestjs/common';
import { AuthenticationGuard } from 'src/authentication/authentication.guard';
import { AuthenticationTokenPayloadSchema } from 'src/authentication/authentication.strategy';
import { AuthenticationTokenPayload } from 'src/authentication/token-payload/token-payload.decorator';
import { PrismaService } from 'src/prisma/prisma.service';
import { ZodValidationPipe } from 'src/zod-validation/zod-validation.pipe';
import { z } from 'zod';

const createWorkoutBodySchema = z.object({
	trainingId: z.coerce.number({
		required_error:
			'Não foi possível identificar o treino a que este exercício pertence',
	}),
});

type CreateWorkoutBodySchema = z.infer<typeof createWorkoutBodySchema>;

const upadteWorkoutParamsSchema = z.object({
	id: z.coerce.number(),
});

type UpdateWorkoutParamsSchema = z.infer<typeof upadteWorkoutParamsSchema>;

const upadteWorkoutBodySchema = z.object({
	exerciseId: z.coerce.number(),
	reps: z.coerce.number(),
	load: z.coerce.number(),
	setId: z.coerce.number().optional(),
});

type UpdateWorkoutBodySchema = z.infer<typeof upadteWorkoutBodySchema>;

@Controller('workout')
@UseGuards(AuthenticationGuard)
export class WorkoutController {
	constructor(private prismaService: PrismaService) { }

	@Put(':id')
	async update(
		@Param(new ZodValidationPipe(upadteWorkoutParamsSchema))
		{ id }: UpdateWorkoutParamsSchema,
		@Body(new ZodValidationPipe(upadteWorkoutBodySchema))
		{ exerciseId, load, reps, setId }: UpdateWorkoutBodySchema,
		@AuthenticationTokenPayload()
		authenticationTokenPayload: AuthenticationTokenPayloadSchema,
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

		const workout = await this.prismaService.workout.findUnique({
			where: {
				id,
			},
			select: {
				id: true,
				studentId: true,
			},
		});

		if (!workout) {
			throw new BadRequestException('Não foi possível identificar o treino');
		}

		if (workout.studentId !== currentUser.id) {
			throw new BadRequestException(
				'Você não tem permissão para atualizar este treino',
			);
		}

		const exercise = await this.prismaService.exercise.findUnique({
			where: {
				id: exerciseId,
			},
			select: {
				id: true,
			},
		});

		if (!exercise) {
			throw new BadRequestException(
				'Não foi possível identificar o exercício a ser atualizado',
			);
		}

		const updatedWorkout = await this.prismaService.workout.update({
			where: {
				id: workout.id,
			},
			data: {
				exercises: {
					upsert: {
						where: {
							workoutId_exerciseId: {
								exerciseId: exercise.id,
								workoutId: workout.id,
							},
						},
						create: {
							exerciseId: exercise.id,
							WorkoutExerciseSets: {
								create: {
									load,
									reps,
								},
							},
						},
						update: {
							WorkoutExerciseSets: {
								upsert: {
									where: {
										id: setId || 0,
									},
									create: {
										load,
										reps,
									},
									update: {
										load,
										reps,
									},
								},
							},
						},
					},
				},
			},
			select: {
				exercises: {
					select: {
						WorkoutExerciseSets: {
							select: {
								id: true,
							},
						},
					},
				},
			},
		});

		return updatedWorkout;
	}

	@Post()
	async store(
		@Body(new ZodValidationPipe(createWorkoutBodySchema))
		{ trainingId }: CreateWorkoutBodySchema,
		@AuthenticationTokenPayload()
		authenticationTokenPayload: AuthenticationTokenPayloadSchema,
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
				id: true,
			},
		});

		if (!training) {
			throw new BadRequestException(
				'Não foi possível identificar o treino a que este exercício pertence',
			);
		}

		return await this.prismaService.workout.create({
			data: {
				startTime: new Date(),
				trainingId: training.id,
				studentId: currentUser.id,
			},
			select: {
				id: true,
				startTime: true,
			},
		});
	}
}

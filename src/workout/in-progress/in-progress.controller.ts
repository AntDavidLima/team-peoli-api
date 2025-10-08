import {
	BadRequestException,
	Controller,
	Get,
	Query,
	UseGuards,
} from '@nestjs/common';
import { AuthenticationGuard } from 'src/authentication/authentication.guard';
import { AuthenticationTokenPayloadSchema } from 'src/authentication/authentication.strategy';
import { AuthenticationTokenPayload } from 'src/authentication/token-payload/token-payload.decorator';
import { PrismaService } from 'src/prisma/prisma.service';
import { ZodValidationPipe } from 'src/zod-validation/zod-validation.pipe';
import { z } from 'zod';

const getWorkoutInProgressQuerySchema = z.object({
	trainingIds: z.array(
		z.coerce.number({
			required_error:
				'Não foi possível identificar o treino a que este exercício pertence',
		}),
	).or(z.coerce.number()).optional(),
});

type GetWorkoutInProgressQuerySchema = z.infer<
	typeof getWorkoutInProgressQuerySchema
>;

@Controller('workout/in-progress')
@UseGuards(AuthenticationGuard)
export class InProgressController {
	constructor(private prismaService: PrismaService) { }

	@Get()
	async index(
		@Query(new ZodValidationPipe(getWorkoutInProgressQuerySchema))
		{ trainingIds }: GetWorkoutInProgressQuerySchema,
		@AuthenticationTokenPayload()
		authenticationTokenPayload: AuthenticationTokenPayloadSchema,
	) {
		const currentUser = await this.prismaService.user.findUnique({
			where: {
				id: authenticationTokenPayload.sub,
			},
			select: {
				id: true,
				isProfessor: true,
			},
		});

		if (!currentUser) {
			throw new BadRequestException(
				'Não foi possível identificar o usuário logado',
			);
		}

		if (typeof trainingIds === 'number') {
			trainingIds = [trainingIds]
		}

		const trainings = await this.prismaService.training.findMany({
			where: {
				id: { in: trainingIds },
			},
			select: {
				routines: {
					select: {
						userId: true,
					},
				},
			},
		});

		if (trainingIds && trainings.length !== trainingIds.length) {
			throw new BadRequestException(
				'Não foi possível identificar um ou mais treinos do qual você deseja visualizar o treino em andamento',
			);
		}

		const trainingBelongsToCurrentUser = trainings.every((training) =>
			training.routines.every((routine) => routine.userId === currentUser.id),
		);

		if (!trainingBelongsToCurrentUser && !currentUser.isProfessor) {
			throw new BadRequestException(
				'Você não tem permissão para visualizar este treino',
			);
		}

		const workout = await this.prismaService.workout.findFirst({
			where: {
				trainings: {
					every: {
						id: { in: trainingIds },
					},
				},
				studentId: currentUser.id,
				endTime: null,
			},
			select: {
				id: true,
				startTime: true,
				trainings: {
					where: {
						routines: {
							some: {},
						},
					},
					select: {
						id: true,
					},
				},
				exercises: {
					select: {
						exerciseId: true,
						WorkoutExerciseSets: {
							select: {
								id: true,
								load: true,
								reps: true,
							},
						},
					},
				},
			},
		});

		return workout;
	}
}

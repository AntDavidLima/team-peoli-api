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
	trainingId: z.coerce.number({
		required_error:
			'Não foi possível identificar o treino a que este exercício pertence',
	}),
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
		{ trainingId }: GetWorkoutInProgressQuerySchema,
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

		if (!training) {
			throw new BadRequestException(
				'Não foi possível identificar o treino a que este exercício pertence',
			);
		}

		const trainingBelongsToCurrentUser = training.routines.some(
			(routine) => routine.userId === currentUser.id,
		);

		if (!trainingBelongsToCurrentUser && !currentUser.isProfessor) {
			throw new BadRequestException(
				'Você não tem permissão para visualizar este treino',
			);
		}

		const workout = await this.prismaService.workout.findFirst({
			where: {
				trainingId,
				studentId: currentUser.id,
				endTime: null,
			},
			select: {
				id: true,
				startTime: true,
			},
		});

		return workout;
	}
}

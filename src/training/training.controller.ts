import {
	BadRequestException,
	Controller,
	ForbiddenException,
	Get,
	Param,
	UseGuards,
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

type GetTrainingParamsSchema = z.infer<typeof getTrainingParamsSchema>;

@Controller('training')
@UseGuards(AuthenticationGuard)
export class TrainingController {
	constructor(private prismaService: PrismaService) { }

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
					select: {
						sets: true,
						reps: true,
						restTime: true,
						orientations: true,
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

		const trainingBelongsToCurrentUser = training?.routines.some(
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

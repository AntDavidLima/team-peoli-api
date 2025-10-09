import {
	BadRequestException,
	Controller,
	Param,
	Put,
	UseGuards,
} from '@nestjs/common';
import { AuthenticationGuard } from 'src/authentication/authentication.guard';
import { AuthenticationTokenPayloadSchema } from 'src/authentication/authentication.strategy';
import { AuthenticationTokenPayload } from 'src/authentication/token-payload/token-payload.decorator';
import { PrismaService } from 'src/prisma/prisma.service';
import { ZodValidationPipe } from 'src/zod-validation/zod-validation.pipe';
import { z } from 'zod';

const upadteWorkoutParamsSchema = z.object({
	id: z.coerce.number(),
});

type UpdateWorkoutParamsSchema = z.infer<typeof upadteWorkoutParamsSchema>;

@Controller('workout/stop')
@UseGuards(AuthenticationGuard)
export class StopController {
	constructor(private prismaService: PrismaService) { }

	@Put(':id')
	async update(
		@Param(new ZodValidationPipe(upadteWorkoutParamsSchema))
		{ id }: UpdateWorkoutParamsSchema,
		@AuthenticationTokenPayload()
		authenticationTokenPayload: AuthenticationTokenPayloadSchema,
	) {
		const studentId = authenticationTokenPayload.sub;
		const currentUser = await this.prismaService.user.findUnique({
			where: {
				id: studentId,
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
				'Você não tem permissão para finalizar este treino',
			);
		}

		const updatedWorkout = await this.prismaService.workout.update({
			where: {
				id: workout.id,
			},
			data: {
				endTime: new Date(),
			},
			select: {
				id: true,
				endTime: true,
				startTime: true,
			},
		});

		await this.prismaService.activeWorkout.deleteMany({
			where: { userId: studentId },
		});


		return updatedWorkout;
	}
}

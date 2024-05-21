import {
	BadRequestException,
	Body,
	Controller,
	ForbiddenException,
	Get,
	Post,
	UseGuards,
} from '@nestjs/common';
import { AuthenticationGuard } from 'src/authentication/authentication.guard';
import { AuthenticationTokenPayloadSchema } from 'src/authentication/authentication.strategy';
import { AuthenticationTokenPayload } from 'src/authentication/token-payload/token-payload.decorator';
import { PrismaService } from 'src/prisma/prisma.service';
import { ZodValidationPipe } from 'src/zod-validation/zod-validation.pipe';
import { z } from 'zod';

const createMuscleGroupBodySchema = z.object({
	name: z.string({ required_error: "O campo 'Nome' é obrigatório" }),
});

type CreateMuscleGroupBodySchema = z.infer<typeof createMuscleGroupBodySchema>;

@Controller('muscle-group')
@UseGuards(AuthenticationGuard)
export class MuscleGroupController {
	constructor(private prismaService: PrismaService) { }

	@Post()
	async store(
		@Body(new ZodValidationPipe(createMuscleGroupBodySchema))
		{ name }: CreateMuscleGroupBodySchema,
		@AuthenticationTokenPayload()
		authenticationTokenPayload: AuthenticationTokenPayloadSchema,
	) {
		const currentUser = await this.prismaService.user.findUnique({
			where: {
				id: authenticationTokenPayload.sub,
			},
			select: {
				isProfessor: true,
			},
		});

		if (!currentUser) {
			throw new BadRequestException(
				'Não foi possível identificar o usuário logado',
			);
		}

		if (!currentUser.isProfessor) {
			throw new ForbiddenException(
				'Apenas professores podem criar novos grupos musculares',
			);
		}

		return await this.prismaService.muscleGroup.create({
			data: {
				name,
			},
			select: {
				id: true,
				name: true,
			},
		});
	}

	@Get()
	async index(
		@AuthenticationTokenPayload()
		authenticationTokenPayload: AuthenticationTokenPayloadSchema,
	) {
		const currentUser = await this.prismaService.user.findUnique({
			where: {
				id: authenticationTokenPayload.sub,
			},
			select: {
				isProfessor: true,
			},
		});

		if (!currentUser) {
			throw new BadRequestException(
				'Não foi possível identificar o usuário logado',
			);
		}

		if (!currentUser.isProfessor) {
			throw new ForbiddenException(
				'Lista de grupos musculares disponível apenas para professores',
			);
		}

		return this.prismaService.muscleGroup.findMany({
			select: {
				id: true,
				name: true,
			},
		});
	}
}

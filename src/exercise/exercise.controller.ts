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

const createExerciseBodySchema = z.object({
	name: z.string({ required_error: "O campo 'Nome' é obrigatório" }),
	instructions: z.string().optional(),
	restTime: z.coerce.number().optional(),
});

type CreateExerciseBodySchema = z.infer<typeof createExerciseBodySchema>;

@Controller('exercise')
@UseGuards(AuthenticationGuard)
export class ExerciseController {
	constructor(private prismaService: PrismaService) { }

	@Post()
	async store(
		@Body(new ZodValidationPipe(createExerciseBodySchema))
		{ name, instructions, restTime }: CreateExerciseBodySchema,
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
				'Apenas professores podem criar novos exercícios',
			);
		}

		return await this.prismaService.exercise.create({
			data: {
				name,
				instructions,
				restTime,
			},
			select: {
				id: true,
				name: true,
				instructions: true,
				restTime: true,
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
				'Lista de exercícios disponível apenas para professores',
			);
		}

		return this.prismaService.exercise.findMany({
			select: {
				id: true,
				name: true,
				instructions: true,
				restTime: true,
			},
		});
	}
}

import {
	BadRequestException,
	Body,
	Controller,
	Delete,
	ForbiddenException,
	Get,
	HttpCode,
	HttpStatus,
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

const createMuscleGroupBodySchema = z.object({
	name: z.string({ required_error: "O campo 'Nome' é obrigatório" }),
});

type CreateMuscleGroupBodySchema = z.infer<typeof createMuscleGroupBodySchema>;

const deleteMuscleGroupParamsSchema = z.object({
	id: z.coerce.number({
		required_error: 'Não foi possível identificar o grupo muscular',
	}),
});

type DeleteMuscleGroupParamsSchema = z.infer<
	typeof deleteMuscleGroupParamsSchema
>;

const updateMuscleGroupParamsSchema = z.object({
	id: z.coerce.number({
		required_error: 'Não foi possível identificar o grupo muscular',
	}),
});

type UpdateMuscleGroupParamsSchema = z.infer<
	typeof updateMuscleGroupParamsSchema
>;

const updateMuscleGroupBodySchema = z.object({
	name: z.string({ required_error: "O campo 'Nome' é obrigatório" }),
});

type UpdateMuscleGroupBodySchema = z.infer<typeof updateMuscleGroupBodySchema>;

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

	@Delete(':id')
	@HttpCode(HttpStatus.NO_CONTENT)
	async destroy(
		@Param(new ZodValidationPipe(deleteMuscleGroupParamsSchema))
		{ id }: DeleteMuscleGroupParamsSchema,
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
				'Apenas professores podem deletar grupos musculares',
			);
		}

		const muscleGroup = await this.prismaService.muscleGroup.findUnique({
			where: {
				id,
			},
		});

		if (!muscleGroup) {
			throw new BadRequestException('Grupo muscular não encontrado');
		}

		await this.prismaService.muscleGroup.delete({
			where: {
				id,
			},
		});
	}

	@Put(':id')
	async update(
		@Param(new ZodValidationPipe(updateMuscleGroupParamsSchema))
		{ id }: UpdateMuscleGroupParamsSchema,
		@Body(new ZodValidationPipe(updateMuscleGroupBodySchema))
		{ name }: UpdateMuscleGroupBodySchema,
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
				'Apenas professores podem alterar grupos musculares',
			);
		}

		const muscleGroup = await this.prismaService.muscleGroup.findUnique({
			where: {
				id,
			},
		});

		if (!muscleGroup) {
			throw new BadRequestException('Grupo muscular não encontrado');
		}

		const updatedMuscleGroup = await this.prismaService.muscleGroup.update({
			where: {
				id,
			},
			data: {
				name,
			},
		});

		return updatedMuscleGroup;
	}
}

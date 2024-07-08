import {
	BadRequestException,
	Body,
	ConflictException,
	Controller,
	Delete,
	ForbiddenException,
	Get,
	HttpCode,
	HttpStatus,
	Param,
	Patch,
	Post,
	Query,
	UseGuards,
} from '@nestjs/common';
import { AuthenticationGuard } from 'src/authentication/authentication.guard';
import { AuthenticationTokenPayloadSchema } from 'src/authentication/authentication.strategy';
import { AuthenticationTokenPayload } from 'src/authentication/token-payload/token-payload.decorator';
import { PrismaService } from 'src/prisma/prisma.service';
import { ZodValidationPipe } from 'src/zod-validation/zod-validation.pipe';
import { z } from 'zod';

const literalSchema = z.union([z.string(), z.number(), z.boolean()]);
type Literal = z.infer<typeof literalSchema>;
type Json = Literal | { [key: string]: Json } | Json[];
const jsonSchema: z.ZodType<Json> = z.lazy(() =>
	z.union([literalSchema, z.array(jsonSchema), z.record(jsonSchema)]),
);

const createExerciseBodySchema = z.object({
	name: z.string({ required_error: "O campo 'Nome' é obrigatório" }),
	instructions: z.lazy(() =>
		z.union([literalSchema, z.array(jsonSchema), z.record(jsonSchema)]),
	),
	restTime: z.coerce.number().optional(),
	muscleGroups: z
		.object({
			value: z.coerce.number({
				required_error:
					'Não foi possível identificar um ou mais dos grupos musculares',
			}),
			weight: z.coerce.number({
				required_error: "Um ou mais dos grupos musculares está sem 'Peso'",
			}),
		})
		.array()
		.min(1, {
			message: 'Cada exercício deve possuir pelo menos um grupo muscular',
		}),
});

type CreateExerciseBodySchema = z.infer<typeof createExerciseBodySchema>;

const listExercisesQueryParamsSchema = z.object({
	rows: z.coerce.number().default(10),
	page: z.coerce.number().default(1),
	query: z.string().default(''),
});

type ListExercisesQueryParamsSchema = z.infer<
	typeof listExercisesQueryParamsSchema
>;

const deleteExerciseParamsSchema = z.object({
	id: z.coerce.number(),
});

type DeleteExerciseParamsSchema = z.infer<typeof deleteExerciseParamsSchema>;

const updateExerciseParamsSchema = z.object({
	id: z.coerce.number(),
});

type UpdateExerciseParamsSchema = z.infer<typeof updateExerciseParamsSchema>;

const updateExerciseBodySchema = z.object({
	name: z.string({ required_error: "O campo 'Nome' é obrigatório" }),
	instructions: z.lazy(() =>
		z.union([literalSchema, z.array(jsonSchema), z.record(jsonSchema)]),
	),
	restTime: z.coerce.number().optional(),
	muscleGroups: z
		.object({
			value: z.coerce.number({
				required_error:
					'Não foi possível identificar um ou mais dos grupos musculares',
			}),
			weight: z.coerce.number({
				required_error: "Um ou mais dos grupos musculares está sem 'Peso'",
			}),
		})
		.array()
		.min(1, {
			message: 'Cada exercício deve possuir pelo menos um grupo muscular',
		}),
});

type UpdateExerciseBodySchema = z.infer<typeof updateExerciseBodySchema>;

@Controller('exercise')
@UseGuards(AuthenticationGuard)
export class ExerciseController {
	constructor(private prismaService: PrismaService) { }

	@Post()
	async store(
		@Body(new ZodValidationPipe(createExerciseBodySchema))
		{ name, instructions, restTime, muscleGroups }: CreateExerciseBodySchema,
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

		const muscleGroupsExist = await this.prismaService.muscleGroup.findMany({
			where: {
				id: {
					in: muscleGroups.map((muscleGroup) => muscleGroup.value),
				},
			},
		});

		if (muscleGroupsExist.length !== muscleGroups.length) {
			throw new BadRequestException(
				'Um ou mais dos grupos musculares informados não foram encontrados',
			);
		}

		return await this.prismaService.exercise.create({
			data: {
				name,
				instructions,
				restTime,
				muscleGroups: {
					createMany: {
						data: muscleGroups.map((muscleGroup) => ({
							weight: muscleGroup.weight,
							muscleGroupId: muscleGroup.value,
						})),
					},
				},
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
		@Query(new ZodValidationPipe(listExercisesQueryParamsSchema))
		{ page, rows, query }: ListExercisesQueryParamsSchema,
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

		return this.prismaService.$transaction([
			this.prismaService.exercise.count({
				where: {
					OR: [
						{
							name: {
								contains: query,
							},
						},
						{
							muscleGroups: {
								some: {
									muscleGroup: {
										name: {
											contains: query,
										},
									},
								},
							},
						},
					],
				},
			}),
			this.prismaService.exercise.findMany({
				where: {
					OR: [
						{
							name: {
								contains: query,
							},
						},
						{
							muscleGroups: {
								some: {
									muscleGroup: {
										name: {
											contains: query,
										},
									},
								},
							},
						},
					],
				},
				select: {
					id: true,
					name: true,
					instructions: true,
					restTime: true,
					muscleGroups: {
						select: {
							weight: true,
							muscleGroup: {
								select: {
									name: true,
									id: true,
								},
							},
						},
					},
				},
				skip: (page - 1) * rows,
				take: rows,
			}),
		]);
	}

	@Delete(':id')
	@HttpCode(HttpStatus.NO_CONTENT)
	async destroy(
		@AuthenticationTokenPayload()
		authenticationTokenPayload: AuthenticationTokenPayloadSchema,
		@Param(new ZodValidationPipe(deleteExerciseParamsSchema))
		{ id }: DeleteExerciseParamsSchema,
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
				'Apenas professores podem deletar exercícios',
			);
		}

		const exercise = await this.prismaService.exercise.findUnique({
			select: {
				id: true,
				trainings: true,
			},
			where: {
				id,
			},
		});

		if (!exercise) {
			throw new BadRequestException('Exercício não encontrado');
		}

		if (exercise.trainings.length > 0) {
			throw new ConflictException(
				'Exercício não pode ser excluído por fazer parte de um ou mais treinos',
			);
		}

		const deleteExercisedMuscleGroupsPromise =
			this.prismaService.exercisedMuscleGroup.deleteMany({
				where: {
					exerciseId: exercise.id,
				},
			});

		const deleteExercisePromise = this.prismaService.exercise.delete({
			where: {
				id: exercise.id,
			},
		});

		await this.prismaService.$transaction([
			deleteExercisedMuscleGroupsPromise,
			deleteExercisePromise,
		]);
	}

	@Patch(':id')
	async update(
		@AuthenticationTokenPayload()
		authenticationTokenPayload: AuthenticationTokenPayloadSchema,
		@Param(new ZodValidationPipe(updateExerciseParamsSchema))
		{ id }: UpdateExerciseParamsSchema,
		@Body(new ZodValidationPipe(updateExerciseBodySchema))
		{ name, restTime, instructions, muscleGroups }: UpdateExerciseBodySchema,
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

		if (!currentUser.isProfessor) {
			throw new ForbiddenException(
				'Apenas professores podem editar exercícios',
			);
		}

		const exercise = await this.prismaService.exercise.findUnique({
			select: {
				id: true,
			},
			where: {
				id,
			},
		});

		if (!exercise) {
			throw new BadRequestException('Exercício não encontrado');
		}

		const updatedExercise = await this.prismaService.exercise.update({
			data: {
				name,
				instructions,
				restTime,
				muscleGroups: {
					deleteMany: {
						exerciseId: exercise.id,
					},
					createMany: {
						data: muscleGroups.map((muscleGroup) => ({
							weight: muscleGroup.weight,
							muscleGroupId: muscleGroup.value,
						})),
					},
				},
			},
			select: {
				id: true,
				name: true,
				instructions: true,
				restTime: true,
			},
			where: {
				id,
			},
		});

		return updatedExercise;
	}
}

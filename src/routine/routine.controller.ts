import {
	BadRequestException,
	Body,
	Controller,
	Delete,
	ForbiddenException,
	Get,
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

export const Days = [
	'SUNDAY',
	'MONDAY',
	'TUESDAY',
	'WEDNESDAY',
	'THURSDAY',
	'FRIDAY',
	'SATURDAY',
] as const;

const literalSchema = z.union([z.string(), z.number(), z.boolean()]);
type Literal = z.infer<typeof literalSchema>;
type Json = Literal | { [key: string]: Json } | Json[];
const jsonSchema: z.ZodType<Json> = z.lazy(() =>
	z.union([literalSchema, z.array(jsonSchema), z.record(jsonSchema)]),
);

const createRoutineBodySchema = z.object({
	name: z.string({ required_error: "O campo 'Nome' é obrigatório" }),
	startDate: z.coerce.date({
		required_error: "O campo 'Data inicial' é obrigatório",
	}),
	endDate: z.coerce.date().optional(),
	orientations: z
		.lazy(() =>
			z.union([literalSchema, z.array(jsonSchema), z.record(jsonSchema)]),
		)
		.optional(),
	userId: z.coerce.number({
		required_error:
			'Não foi possível identificar o usuário ao qual a rotina se refere',
	}),
});

type CreateRoutineBodySchema = z.infer<typeof createRoutineBodySchema>;

const listRoutinesQueryParamsSchema = z.object({
	userId: z.coerce.number({
		required_error: 'Não foi possível identificar o aluno',
	}),
	day: z
		.enum(Days, {
			errorMap: (issue) => ({
				message:
					issue.code === 'invalid_enum_value' ? 'Dia inválido' : issue.message!,
			}),
		})
		.optional(),
	listEmpty: z.coerce.boolean().optional(),
});

type ListRoutinesQueryParamsSchema = z.infer<
	typeof listRoutinesQueryParamsSchema
>;

const updateRoutineParamsSchema = z.object({
	id: z.coerce.number(),
});

type UpdateRoutineParamsSchema = z.infer<typeof updateRoutineParamsSchema>;

const deleteRoutineParamsSchema = z.object({
	id: z.coerce.number(),
});

type DeleteRoutineParamsSchema = z.infer<typeof deleteRoutineParamsSchema>;

const updateRoutineBodySchema = z.object({
	name: z.string({ required_error: "O campo 'Nome' é obrigatório" }),
	startDate: z.coerce.date({
		required_error: "O campo 'Início' é obrigatório",
		invalid_type_error: 'Data de início inválida',
	}),
	endDate: z.coerce
		.date({ invalid_type_error: 'Data de fim inválida' })
		.optional(),
	orientations: z.lazy(() =>
		z.union([literalSchema, z.array(jsonSchema), z.record(jsonSchema)]),
	),
	trainings: z.array(
		z
			.object({
				name: z.string().optional(),
				day: z.enum(Days, {
					errorMap: (issue) => ({
						message:
							issue.code === 'invalid_enum_value'
								? 'Treino possui um dia inválido'
								: issue.message!,
					}),
				}),
				id: z.coerce.number({
					required_error: 'Um dos treinos não pode ser identificado',
				}),
				exercises: z.array(
					z.object({
						sets: z.coerce.number(),
						reps: z.string(),
						restTime: z.coerce.number(),
						exerciseId: z.coerce.number(),
						orientations: z.lazy(() =>
							z.union([
								literalSchema,
								z.array(jsonSchema),
								z.record(jsonSchema),
							]),
						),
					}),
				),
			})
			.refine(
				(schema) => !(schema.exercises.length > 0 && !schema.name),
				'Todos os treinos com exercícios devem possuir um nome',
			),
	),
});

type UpdateRoutineBodySchema = z.infer<typeof updateRoutineBodySchema>;

@Controller('routine')
@UseGuards(AuthenticationGuard)
export class RoutineController {
	constructor(private prismaService: PrismaService) { }

	@Get()
	async index(
		@AuthenticationTokenPayload()
		authenticationTokenPayload: AuthenticationTokenPayloadSchema,
		@Query(new ZodValidationPipe(listRoutinesQueryParamsSchema))
		{ userId, day, listEmpty }: ListRoutinesQueryParamsSchema,
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

		if (!currentUser.isProfessor && currentUser.id !== userId) {
			throw new ForbiddenException(
				'Apenas professores podem visualizar as rotinas de outros alunos',
			);
		}

		const user = await this.prismaService.user.findUnique({
			select: {
				id: true,
			},
			where: {
				id: userId,
			},
		});

		if (!user) {
			throw new BadRequestException('Usuário não encontrado');
		}

		const routines = await this.prismaService.routine.findMany({
			where: {
				userId,
			},
			select: {
				id: true,
				name: true,
				startDate: true,
				endDate: true,
				orientations: true,
				trainings: {
					select: {
						day: true,
						id: true,
						name: true,
						exercises: {
							select: {
								sets: true,
								reps: true,
								orientations: true,
								restTime: true,
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
					where: {
						day,
						name: listEmpty
							? undefined
							: {
								not: null,
							},
					},
				},
			},
		});

		return routines;
	}

	@Post()
	async store(
		@Body(new ZodValidationPipe(createRoutineBodySchema))
		{ name, endDate, startDate, orientations, userId }: CreateRoutineBodySchema,
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
				'Apenas professores podem criar novas rotinas',
			);
		}

		if (endDate && startDate > endDate) {
			throw new BadRequestException(
				'A data inicial não pode ser maior que a data final',
			);
		}

		const user = await this.prismaService.user.findUnique({
			where: { id: userId },
		});

		if (!user) {
			throw new BadRequestException(
				'Não foi possível identificar o usuário ao qual a rotina se refere',
			);
		}

		const routine = await this.prismaService.routine.create({
			data: {
				name,
				endDate,
				startDate,
				orientations,
				userId: user.id,
				trainings: {
					create: Days.map((day) => ({
						day,
					})),
				},
			},
			select: {
				id: true,
				name: true,
				startDate: true,
				endDate: true,
				orientations: true,
			},
		});

		return routine;
	}

	@Patch(':id')
	async update(
		@AuthenticationTokenPayload()
		authenticationTokenPayload: AuthenticationTokenPayloadSchema,
		@Param(new ZodValidationPipe(updateRoutineParamsSchema))
		{ id }: UpdateRoutineParamsSchema,
		@Body(new ZodValidationPipe(updateRoutineBodySchema))
		{
			name,
			endDate,
			startDate,
			orientations,
			trainings,
		}: UpdateRoutineBodySchema,
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
			throw new ForbiddenException('Apenas professores podem editar rotinas');
		}

		const routine = await this.prismaService.routine.findUnique({
			select: {
				id: true,
			},
			where: {
				id,
			},
		});

		if (!routine) {
			throw new BadRequestException('Rotina não encontrada');
		}

		const updatedRoutine = await this.prismaService.$transaction([
			this.prismaService.routine.update({
				data: {
					name,
					startDate,
					endDate,
					orientations,
				},
				select: {
					id: true,
					name: true,
					startDate: true,
					endDate: true,
					orientations: true,
				},
				where: {
					id,
				},
			}),
			...trainings.map((training) =>
				this.prismaService.training.update({
					where: {
						id: training.id,
					},
					data: {
						name: training.name,
						exercises: {
							deleteMany: {
								trainingId: training.id,
							},
							createMany: {
								data: training.exercises.map((exercise) => ({
									sets: exercise.sets,
									reps: exercise.reps,
									restTime: exercise.restTime,
									exerciseId: exercise.exerciseId,
									orientations: exercise.orientations,
								})),
							},
						},
					},
				}),
			),
		]);

		return updatedRoutine;
	}

	@Delete(':id')
	async destroy(
		@AuthenticationTokenPayload()
		authenticationTokenPayload: AuthenticationTokenPayloadSchema,
		@Param(new ZodValidationPipe(deleteRoutineParamsSchema))
		{ id }: DeleteRoutineParamsSchema,
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
			throw new ForbiddenException('Apenas professores podem deletar rotinas');
		}

		const routine = await this.prismaService.routine.findUnique({
			select: {
				id: true,
			},
			where: {
				id,
			},
		});

		if (!routine) {
			throw new BadRequestException('Rotina não encontrada');
		}

		await this.prismaService.routine.delete({
			where: {
				id,
			},
		});
	}
}

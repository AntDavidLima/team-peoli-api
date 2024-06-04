import {
	BadRequestException,
	Body,
	Controller,
	ForbiddenException,
	Get,
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
});

type ListRoutinesQueryParamsSchema = z.infer<
	typeof listRoutinesQueryParamsSchema
>;

@Controller('routine')
@UseGuards(AuthenticationGuard)
export class RoutineController {
	constructor(private prismaService: PrismaService) { }

	@Get()
	async index(
		@AuthenticationTokenPayload()
		authenticationTokenPayload: AuthenticationTokenPayloadSchema,
		@Query(new ZodValidationPipe(listRoutinesQueryParamsSchema))
		{ userId }: ListRoutinesQueryParamsSchema,
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
}

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
import { ConfigService } from '@nestjs/config';
import { hash } from 'bcryptjs';
import { AuthenticationGuard } from 'src/authentication/authentication.guard';
import { AuthenticationTokenPayloadSchema } from 'src/authentication/authentication.strategy';
import { AuthenticationTokenPayload } from 'src/authentication/token-payload/token-payload.decorator';
import { Env } from 'src/env';
import { PrismaService } from 'src/prisma/prisma.service';
import { ZodValidationPipe } from 'src/zod-validation/zod-validation.pipe';
import { z } from 'zod';
import { compile } from 'handlebars';
import { NodemailerService } from 'src/nodemailer/nodemailer.service';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const createUserBodySchema = z.object({
	name: z.string({ required_error: "O campo 'Nome' é obrigatório" }),
	email: z
		.string({ required_error: "O campo 'E-mail' é obrigatório" })
		.email({ message: 'E-mail inválido' }),
	phone: z
		.string({ required_error: "O campo 'Telefone' é obrigatório" })
		.length(11, { message: 'O telefone deve possuir 11 dígitos' })
		.regex(/^\d{11}$/, { message: 'Telefone inválido' }),
});

type CreateUserBodySchema = z.infer<typeof createUserBodySchema>;

const getUserParamsSchema = z.object({
	id: z.coerce.number(),
});

type GetUserParamsSchema = z.infer<typeof getUserParamsSchema>;

const deleteUserParamsSchema = z.object({
	id: z.coerce.number(),
});

type DeleteUserParamsSchema = z.infer<typeof deleteUserParamsSchema>;

const updateUserParamsSchema = z.object({
	id: z.coerce.number(),
});

type UpdateUserParamsSchema = z.infer<typeof updateUserParamsSchema>;

const listUsersQueryParamsSchema = z.object({
	rows: z.coerce.number().default(10),
	page: z.coerce.number().default(1),
	query: z.string().default(''),
});

type ListUsersQueryParamsSchema = z.infer<typeof listUsersQueryParamsSchema>;

const updateUserBodySchema = z.object({
	name: z.string({ required_error: "O campo 'Nome' é obrigatório" }),
	email: z
		.string({ required_error: "O campo 'E-mail' é obrigatório" })
		.email({ message: 'E-mail inválido' }),
	phone: z
		.string({ required_error: "O campo 'Telefone' é obrigatório" })
		.length(11, { message: 'O telefone deve possuir 11 dígitos' })
		.regex(/^\d{11}$/, { message: 'Telefone inválido' }),
	newPassword: z.string().min(8).optional(),
});

type UpdateUserBodySchema = z.infer<typeof updateUserBodySchema>;

@Controller('user')
@UseGuards(AuthenticationGuard)
export class UserController {
	constructor(
		private prismaService: PrismaService,
		private configService: ConfigService<Env, true>,
		private nodemailerService: NodemailerService,
	) { }

	@Post()
	async store(
		@Body(new ZodValidationPipe(createUserBodySchema))
		{ email, name, phone }: CreateUserBodySchema,
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
				'Apenas professores podem criar novos usuários',
			);
		}

		const emailInUse = await this.prismaService.user.findUnique({
			where: { email },
		});

		if (emailInUse) {
			throw new ConflictException('Este e-mail já está em uso');
		}

		const password = Math.random().toString(36).slice(-8);

		const rounds = this.configService.get('ENCRYPTION_ROUNDS', {
			infer: true,
		});

		const passwordHash = await hash(password, rounds);

		const user = this.prismaService.user.create({
			data: {
				email,
				name,
				phone,
				password: passwordHash,
			},
			select: {
				email: true,
				name: true,
				phone: true,
				id: true,
			},
		});

		const passwordEmailTemplateFile = readFileSync(
			resolve(
				process.cwd(),
				'src',
				'templates',
				'user',
				'password',
				'password.template.hbs',
			),
			'utf-8',
		);

		const passwordEmailTemplate = compile(passwordEmailTemplateFile);

		const passwordEmail = passwordEmailTemplate({ password });

		await this.nodemailerService.sendMail({
			mailSender: 'Team Peoli <contato@teampeoli.com>',
			mailReceiver: email,
			subject: 'Bem vindo ao Team Peoli',
			body: passwordEmail,
		});

		return user;
	}

	@Get()
	async index(
		@AuthenticationTokenPayload()
		authenticationTokenPayload: AuthenticationTokenPayloadSchema,
		@Query(new ZodValidationPipe(listUsersQueryParamsSchema))
		{ page, rows, query }: ListUsersQueryParamsSchema,
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
				'Lista de alunos disponível apenas para professores',
			);
		}

		return this.prismaService.$transaction([
			this.prismaService.user.count({
				where: {
					isProfessor: false,
					OR: [
						{
							name: {
								contains: query,
							},
						},
						{
							email: {
								contains: query,
							},
						},
						{
							phone: {
								contains: query,
							},
						},
					],
				},
			}),
			this.prismaService.user.findMany({
				select: {
					id: true,
					name: true,
					email: true,
					phone: true,
				},
				where: {
					isProfessor: false,
					OR: [
						{
							name: {
								contains: query,
							},
						},
						{
							email: {
								contains: query,
							},
						},
						{
							phone: {
								contains: query,
							},
						},
					],
				},
				skip: (page - 1) * rows,
				take: rows,
			}),
		]);
	}

	@Get(':id')
	async show(
		@AuthenticationTokenPayload()
		authenticationTokenPayload: AuthenticationTokenPayloadSchema,
		@Param(new ZodValidationPipe(getUserParamsSchema))
		{ id }: GetUserParamsSchema,
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

		if (!currentUser.isProfessor && currentUser.id !== id) {
			throw new ForbiddenException(
				'Apenas professores podem visualizar outros usuários',
			);
		}

		const user = await this.prismaService.user.findUnique({
			select: {
				id: true,
				name: true,
				email: true,
				phone: true,
			},
			where: {
				id,
			},
		});

		if (!user) {
			throw new BadRequestException('Usuário não encontrado');
		}

		return user;
	}

	@Delete(':id')
	@HttpCode(HttpStatus.NO_CONTENT)
	async destroy(
		@AuthenticationTokenPayload()
		authenticationTokenPayload: AuthenticationTokenPayloadSchema,
		@Param(new ZodValidationPipe(deleteUserParamsSchema))
		{ id }: DeleteUserParamsSchema,
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
			throw new ForbiddenException('Apenas professores podem deletar alunos');
		}

		const user = await this.prismaService.user.findUnique({
			select: {
				id: true,
			},
			where: {
				id,
			},
		});

		if (!user) {
			throw new BadRequestException('Usuário não encontrado');
		}

		await this.prismaService.user.delete({
			where: {
				id: user.id,
			},
		});
	}

	@Patch(':id')
	async update(
		@AuthenticationTokenPayload()
		authenticationTokenPayload: AuthenticationTokenPayloadSchema,
		@Param(new ZodValidationPipe(updateUserParamsSchema))
		{ id }: UpdateUserParamsSchema,
		@Body(new ZodValidationPipe(updateUserBodySchema))
		{ email, name, phone, newPassword }: UpdateUserBodySchema,
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

		if (!currentUser.isProfessor && currentUser.id !== id) {
			throw new ForbiddenException(
				'Apenas professores podem editar outros alunos',
			);
		}

		const user = await this.prismaService.user.findUnique({
			select: {
				id: true,
				lastPasswordChange: true,
			},
			where: {
				id,
			},
		});

		if (!user) {
			throw new BadRequestException('Usuário não encontrado');
		}

		const emailInUse = await this.prismaService.user.findFirst({
			where: {
				email,
				id: {
					not: id,
				},
			},
		});

		if (emailInUse) {
			throw new ConflictException('E-mail já está em uso por outro usuário');
		}

		if (newPassword && user.lastPasswordChange) {
			throw new BadRequestException(
				'Informe a senha atual para poder alterala',
			);
		}

		const rounds = this.configService.get('ENCRYPTION_ROUNDS', {
			infer: true,
		});

		const updatedUser = await this.prismaService.user.update({
			select: {
				id: true,
				name: true,
				email: true,
				phone: true,
			},
			data: {
				email,
				name,
				phone,
				password: newPassword ? await hash(newPassword, rounds) : undefined,
				lastPasswordChange: newPassword ? new Date() : undefined,
			},
			where: {
				id,
			},
		});

		return updatedUser;
	}
}

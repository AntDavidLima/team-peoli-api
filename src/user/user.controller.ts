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
	UseInterceptors,
	UploadedFile,
	InternalServerErrorException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { compare, hash } from 'bcryptjs';
import { AuthenticationGuard } from 'src/authentication/authentication.guard';
import { AuthenticationTokenPayloadSchema } from 'src/authentication/authentication.strategy';
import { AuthenticationTokenPayload } from 'src/authentication/token-payload/token-payload.decorator';
import { Env } from 'src/env';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { ZodValidationPipe } from 'src/zod-validation/zod-validation.pipe';
import { z } from 'zod';
import { File, FileInterceptor } from '@nest-lab/fastify-multer';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path'

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

const updateUserBodySchema = z
	.object({
		name: z.string({ required_error: "O campo 'Nome' é obrigatório" }),
		email: z
			.string({ required_error: "O campo 'E-mail' é obrigatório" })
			.email({ message: 'E-mail inválido' }),
		phone: z
			.string({ required_error: "O campo 'Telefone' é obrigatório" })
			.length(11, { message: 'O telefone deve possuir 11 dígitos' })
			.regex(/^\d{11}$/, { message: 'Telefone inválido' }),
		newPassword: z.string().min(8).optional(),
		currentPassword: z.string().min(8).optional(),
		profilePhotoUrl: z.string().optional(),
		isActive: z.boolean().optional(),
	})
	.refine(
		(schema) => !(schema.newPassword && !schema.name),
		'Informe sua senha atual para poder alterá-la',
	);

type UpdateUserBodySchema = z.infer<typeof updateUserBodySchema>;

@Controller('user')
@UseGuards(AuthenticationGuard)
export class UserController {
	constructor(
		private prismaService: PrismaService,
		private configService: ConfigService<Env, true>,
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

		const whereConditions: Prisma.UserWhereInput = {};
		whereConditions.isProfessor = false;

		if (query) {
			whereConditions.OR = [
				{ name: { contains: query, mode: 'insensitive' } },
				{ email: { contains: query, mode: 'insensitive' } },
				{ phone: { contains: query, mode: 'insensitive' } },
			];
    	}
		return await this.prismaService.$transaction([
			this.prismaService.user.count({
				where: whereConditions,
			}),
			this.prismaService.user.findMany({
				select: {
					id: true,
					name: true,
					email: true,
					phone: true,
					isActive: true,
				},
				where: whereConditions,
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
				profilePhotoUrl: true,
				isActive: true,
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
	@UseInterceptors(FileInterceptor('profilePhoto'))
	async update(
		@AuthenticationTokenPayload()
		authenticationTokenPayload: AuthenticationTokenPayloadSchema,
		@Param(new ZodValidationPipe(updateUserParamsSchema))
		{ id }: UpdateUserParamsSchema,
		@Body(new ZodValidationPipe(updateUserBodySchema))
		{ email, name, phone, isActive, newPassword, profilePhotoUrl, currentPassword }: UpdateUserBodySchema,
		@UploadedFile() profilePhotoFile?: File,
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
				password: true,
				profilePhotoUrl: true,
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
			const passwordMatch = await compare(currentPassword!, user.password);

			if (!passwordMatch) {
				throw new BadRequestException('Senha atual incorreta');
			}
		}
		if (profilePhotoFile) {
		const s3Client = new S3Client({
			region: this.configService.get('BUCKET_REGION', { infer: true }),
			credentials: {
			accessKeyId: this.configService.get('BUCKET_ACCESS_KEY', {
				infer: true,
			}),
			secretAccessKey: this.configService.get('BUCKET_SECRET_ACCESS_KEY', {
				infer: true,
			}),
			},
		});

		if (user.profilePhotoUrl) {
			try {
			const oldKey = new URL(user.profilePhotoUrl).pathname.substring(1);
			
			if(oldKey && oldKey.includes('/')) {
				await s3Client.send(
				new DeleteObjectCommand({
					Bucket: this.configService.get('PROFILE_PHOTOS_BUCKET_NAME'),
					Key: oldKey,
				}),
				);
			}
			} catch (error) {
				throw new InternalServerErrorException("Não foi possível deletar a foto de perfil antiga");
			}
		}

		const fileExtension = extname(profilePhotoFile.originalname);
		const newKey = `${user.id}/${randomUUID()}${fileExtension}`;

		await s3Client.send(
			new PutObjectCommand({
			Bucket: this.configService.get('PROFILE_PHOTOS_BUCKET_NAME', {
				infer: true,
			}),
			Key: newKey,
			Body: profilePhotoFile.buffer,
			ContentType: profilePhotoFile.mimetype, 
			}),
		);

		const bucketName = this.configService.get('PROFILE_PHOTOS_BUCKET_NAME');
		const region = this.configService.get('BUCKET_REGION');
		profilePhotoUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${newKey}`;
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
			profilePhotoUrl: true, 
		},
		data: {
			email,
			name,
			phone,
			password: newPassword ? await hash(newPassword, rounds) : undefined,
			lastPasswordChange: newPassword ? new Date() : undefined,
			profilePhotoUrl: profilePhotoUrl,
			isActive: isActive ?? true,
		},
		where: {
			id,
		},
		});

		return updatedUser;
	}
}

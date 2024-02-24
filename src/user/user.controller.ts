import {
	Body,
	ConflictException,
	Controller,
	Post,
	UsePipes,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { hash } from 'bcryptjs';
import { PrismaService } from 'src/prisma/prisma.service';
import { ZodValidationPipe } from 'src/zod-validation/zod-validation.pipe';
import { z } from 'zod';

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

@Controller('user')
export class UserController {
	constructor(
		private prismaService: PrismaService,
		private configService: ConfigService,
	) { }

	@Post()
	@UsePipes(new ZodValidationPipe(createUserBodySchema))
	async store(@Body() { email, name, phone }: CreateUserBodySchema) {
		const emailInUse = await this.prismaService.user.findUnique({
			where: { email },
		});

		if (emailInUse) {
			throw new ConflictException('Este e-mail já está em uso');
		}

		const password = Math.random().toString(36).slice(-8);

		const passwordHash = await hash(
			password,
			this.configService.get<ConfigService>('ENCRYPTION_ROUNDS', {
				infer: true,
			}),
		);

		return this.prismaService.user.create({
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
	}
}

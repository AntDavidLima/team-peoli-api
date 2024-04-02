import {
	Body,
	ConflictException,
	Controller,
	Post,
	UseGuards,
	UsePipes,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { hash } from 'bcryptjs';
import { AuthenticationGuard } from 'src/authentication/authentication.guard';
import { Env } from 'src/env';
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
@UseGuards(AuthenticationGuard)
export class UserController {
	constructor(
		private prismaService: PrismaService,
		private configService: ConfigService<Env, true>,
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

		const rounds = this.configService.get('ENCRYPTION_ROUNDS', {
			infer: true,
		});

		const passwordHash = await hash(password, rounds);

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

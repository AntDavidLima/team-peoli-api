import {
	Body,
	Controller,
	Post,
	UnauthorizedException,
	UsePipes,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcryptjs';
import { PrismaService } from 'src/prisma/prisma.service';
import { ZodValidationPipe } from 'src/zod-validation/zod-validation.pipe';
import { z } from 'zod';

const authenticateBodySchema = z.object({
	email: z
		.string({ required_error: "O campo 'E-mail' é obrigatório" })
		.email({ message: 'E-mail inválido' }),
	password: z.string({ required_error: "O campo 'Senha' é obrigatório" }),
});

type AuthenticateBodySchema = z.infer<typeof authenticateBodySchema>;

@Controller('authentication')
export class AuthenticationController {
	constructor(
		private jwtService: JwtService,
		private prismaService: PrismaService,
	) { }

	@Post()
	@UsePipes(new ZodValidationPipe(authenticateBodySchema))
	async authenticate(@Body() { email, password }: AuthenticateBodySchema) {
		const user = await this.prismaService.user.findUnique({
			where: {
				email,
			},
			select: {
				password: true,
				id: true,
			},
		});

		if (!user) {
			throw new UnauthorizedException('E-mail ou senha inválidos');
		}

		const passwordMatch = await compare(password, user.password);

		if (!passwordMatch) {
			throw new UnauthorizedException('E-mail ou senha inválidos');
		}

		const token = this.jwtService.sign({ sub: user.id });

		return { auth_token: token };
	}
}

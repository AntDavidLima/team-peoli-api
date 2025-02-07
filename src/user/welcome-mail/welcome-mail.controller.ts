import { BadRequestException, Controller, ForbiddenException, Param, Post, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { hash } from 'bcryptjs';
import { compile } from 'handlebars';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { AuthenticationGuard } from 'src/authentication/authentication.guard';
import { AuthenticationTokenPayloadSchema } from 'src/authentication/authentication.strategy';
import { AuthenticationTokenPayload } from 'src/authentication/token-payload/token-payload.decorator';
import { Env } from 'src/env';
import { NodemailerService } from 'src/nodemailer/nodemailer.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ZodValidationPipe } from 'src/zod-validation/zod-validation.pipe';
import { z } from 'zod';

const storeWelcomeMailSchema = z.object({
  id: z.coerce.number(),
});

type StoreWelcomeMailSchema = z.infer<typeof storeWelcomeMailSchema>;

@Controller('user/:id/welcome-mail')
@UseGuards(AuthenticationGuard)
export class WelcomeMailController {
  constructor(
    private nodemailerService: NodemailerService,
    private prismaService: PrismaService,
    private configService: ConfigService<Env, true>,
  ) {}

  @Post()
  async store(
    @AuthenticationTokenPayload()
    authenticationTokenPayload: AuthenticationTokenPayloadSchema,
    @Param(new ZodValidationPipe(storeWelcomeMailSchema))
    { id }: StoreWelcomeMailSchema,
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
        'Apenas professores podem enviar e-mails de boas-vindas',
      );
    }

    const user = await this.prismaService.user.findUnique({
      where: {
        id,
      },
      select: {
        email: true,
        name: true,
        lastLogin: true,
      },
    });

    if (!user) {
      throw new BadRequestException('Usuário não encontrado');
    }

    if (user.lastLogin) {
      throw new BadRequestException('Você não pode enviar um e-mail de boas-vindas para um usuário que já fez login');
    }

		const password = Math.random().toString(36).slice(-8);

		const rounds = this.configService.get('ENCRYPTION_ROUNDS', {
			infer: true,
		});

		const passwordHash = await hash(password, rounds);

    await this.prismaService.user.update({
      where: {
        id,
      },
      data: {
        password: passwordHash,
      },
    });

		const passwordEmailTemplateFile = readFileSync(
			resolve(
				__dirname,
				'password',
				'password.template.hbs',
			),
			'utf-8',
		);

		const passwordEmailTemplate = compile(passwordEmailTemplateFile);

		const passwordEmail = passwordEmailTemplate({ password });

		await this.nodemailerService.sendMail({
			mailSender: 'Team Peoli <contato@teampeoli.com>',
			mailReceiver: user.email,
			subject: 'Bem vindo ao Team Peoli',
			body: passwordEmail,
		});

    return;
  }
}

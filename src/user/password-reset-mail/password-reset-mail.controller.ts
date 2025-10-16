import {
  BadRequestException,
  Body,
  Controller,
  Post,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { hash } from 'bcryptjs';
import { compile } from 'handlebars';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Env } from 'src/env';
import { NodemailerService } from 'src/nodemailer/nodemailer.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ZodValidationPipe } from 'src/zod-validation/zod-validation.pipe';
import { z } from 'zod';

const createPasswordResetSchema = z.object({
  email: z.string().email('Formato de e-mail inválido.'),
});

type CreatePasswordResetSchema = z.infer<typeof createPasswordResetSchema>;

@Controller('password-reset')
export class PasswordResetController {
  constructor(
    private nodemailerService: NodemailerService,
    private prismaService: PrismaService,
    private configService: ConfigService<Env, true>,
  ) {}

  @Post()
  async create(
    @Body(new ZodValidationPipe(createPasswordResetSchema))
    { email }: CreatePasswordResetSchema,
  ) {
    const user = await this.prismaService.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    if (!user) {
      throw new BadRequestException('Nenhum usuário encontrado com este e-mail.');
    }

    const newPassword = Math.random().toString(36).slice(-8);

    const rounds = this.configService.get('ENCRYPTION_ROUNDS', {
      infer: true,
    });
    const passwordHash = await hash(newPassword, rounds);

    await this.prismaService.user.update({
      where: {
        id: user.id,
      },
      data: {
        password: passwordHash,
      },
    });

    const passwordResetTemplateFile = readFileSync(
      resolve(
        __dirname,
        'password-reset',
        'password-reset.template.hbs',
      ),
      'utf-8',
    );

    const passwordResetTemplate = compile(passwordResetTemplateFile);

    const emailBody = passwordResetTemplate({
      newPassword,
      userName: user.name,
    });

    await this.nodemailerService.sendMail({
      mailSender: 'Team Peoli <contato@teampeoli.com>',
      mailReceiver: user.email,
      subject: 'Sua nova senha de acesso',
      body: emailBody,
    });

    return;
  }
}
import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { ProfessorController } from './professor/professor.controller';
import { ExerciseController } from './exercise/exercise.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { NodemailerService } from 'src/nodemailer/nodemailer.service';
import { WelcomeMailController } from './welcome-mail/welcome-mail.controller';

@Module({
	controllers: [UserController, ProfessorController, ExerciseController, WelcomeMailController],
	imports: [PrismaModule],
	providers: [NodemailerService],
})
export class UserModule { }

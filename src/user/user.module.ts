import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { ExerciseController } from './exercise/exercise.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { NodemailerService } from 'src/nodemailer/nodemailer.service';

@Module({
	controllers: [UserController, ExerciseController],
	imports: [PrismaModule],
	providers: [NodemailerService],
})
export class UserModule { }

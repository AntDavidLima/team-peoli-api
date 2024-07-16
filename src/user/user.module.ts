import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { ExerciseController } from './exercise/exercise.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
	controllers: [UserController, ExerciseController],
	providers: [PrismaService],
})
export class UserModule { }

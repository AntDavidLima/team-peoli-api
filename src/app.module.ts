import { Module } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { UserController } from './user/user.controller';
import { ConfigModule } from '@nestjs/config';
import { envSchema } from './env';
import { AuthenticationModule } from './authentication/authentication.module';
import { ExerciseController } from './exercise/exercise.controller';
import { MuscleGroupController } from './muscle-group/muscle-group.controller';
import { RoutineController } from './routine/routine.controller';

@Module({
	imports: [
		ConfigModule.forRoot({
			validate: (env) => envSchema.parse(env),
			isGlobal: true,
		}),
		AuthenticationModule,
	],
	controllers: [UserController, ExerciseController, MuscleGroupController, RoutineController],
	providers: [PrismaService],
})
export class AppModule { }

import { Module } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { ConfigModule } from '@nestjs/config';
import { envSchema } from './env';
import { AuthenticationModule } from './authentication/authentication.module';
import { ExerciseController } from './exercise/exercise.controller';
import { MuscleGroupController } from './muscle-group/muscle-group.controller';
import { RoutineController } from './routine/routine.controller';
import { MeController } from './me/me.controller';
import { TrainingController } from './training/training.controller';
import { WorkoutModule } from './workout/workout.module';
import { UserModule } from './user/user.module';
import { PrismaModule } from './prisma/prisma.module';
import { NodemailerService } from './nodemailer/nodemailer.service';

@Module({
	imports: [
		ConfigModule.forRoot({
			validate: (env) => envSchema.parse(env),
			isGlobal: true,
		}),
		AuthenticationModule,
		WorkoutModule,
		UserModule,
		PrismaModule,
	],
	controllers: [
		ExerciseController,
		MuscleGroupController,
		RoutineController,
		MeController,
		TrainingController,
	],
	providers: [PrismaService, NodemailerService],
})
export class AppModule { }

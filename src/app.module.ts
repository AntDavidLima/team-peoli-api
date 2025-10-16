import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule'; 
import { PrismaService } from './prisma/prisma.service';
import { ConfigModule } from '@nestjs/config';
import { envSchema } from './env';
import { AuthenticationModule } from './authentication/authentication.module';
import { ExerciseController } from './exercise/exercise.controller';
import { MuscleGroupController } from './muscle-group/muscle-group.controller';
import { RoutineController } from './routine/routine.controller';
import { MeController } from './me/me.controller';
import { WorkoutModule } from './workout/workout.module';
import { UserModule } from './user/user.module';
import { PrismaModule } from './prisma/prisma.module';
import { NodemailerService } from './nodemailer/nodemailer.service';
import { ExerciseModule } from './exercise/exercise.module';
import { TrainingModule } from './training/training.module';
import { SummaryController } from './summary/summary.controller';
import { PushModule } from './push/push.module';
import { PasswordResetController } from './user/password-reset-mail/password-reset-mail.controller';

@Module({
	imports: [
		ScheduleModule.forRoot(), 
		ConfigModule.forRoot({
			validate: (env) => envSchema.parse(env),
			isGlobal: true,
		}),
		AuthenticationModule,
		WorkoutModule,
		UserModule,
		PrismaModule,
		ExerciseModule,
		TrainingModule,
		PushModule
	],
	controllers: [
		ExerciseController,
		MuscleGroupController,
		RoutineController,
		MeController,
		SummaryController,
		PasswordResetController,
	],
	providers: [PrismaService, NodemailerService],
})
export class AppModule { }

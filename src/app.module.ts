import { Module } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { UserController } from './user/user.controller';
import { ConfigModule } from '@nestjs/config';
import { envSchema } from './env';
import { AuthenticationModule } from './authentication/authentication.module';
import { ExerciseController } from './exercise/exercise.controller';

@Module({
	imports: [
		ConfigModule.forRoot({
			validate: (env) => envSchema.parse(env),
			isGlobal: true,
		}),
		AuthenticationModule,
	],
	controllers: [UserController, ExerciseController],
	providers: [PrismaService],
})
export class AppModule { }

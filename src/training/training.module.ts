import { Module } from '@nestjs/common';
import { TrainingController } from './training.controller';
import { ExerciseController } from './exercise/exercise.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
	controllers: [TrainingController, ExerciseController ],
	imports: [PrismaModule],
})
export class TrainingModule { }

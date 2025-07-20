import { Module } from '@nestjs/common';
import { TrainingController } from './training.controller';
import { UserNoteController } from './exercise/exercise.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
	controllers: [TrainingController, UserNoteController ],
	imports: [PrismaModule],
})
export class TrainingModule { }

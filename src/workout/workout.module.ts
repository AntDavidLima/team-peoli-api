import { Module } from '@nestjs/common';
import { WorkoutController } from './workout.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { InProgressController } from './in-progress/in-progress.controller';

@Module({
	controllers: [WorkoutController, InProgressController],
	providers: [PrismaService],
})
export class WorkoutModule { }

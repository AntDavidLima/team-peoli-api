import { Module } from '@nestjs/common';
import { WorkoutController } from './workout.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { InProgressController } from './in-progress/in-progress.controller';
import { StopController } from './stop/stop.controller';

@Module({
	controllers: [WorkoutController, InProgressController, StopController],
	providers: [PrismaService],
})
export class WorkoutModule { }

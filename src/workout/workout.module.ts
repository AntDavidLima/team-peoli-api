import { Module } from '@nestjs/common';
import { WorkoutController } from './workout.controller';
import { InProgressController } from './in-progress/in-progress.controller';
import { StopController } from './stop/stop.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
	controllers: [WorkoutController, InProgressController, StopController],
	imports: [PrismaModule],
})
export class WorkoutModule { }

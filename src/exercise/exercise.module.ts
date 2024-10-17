import { Module } from '@nestjs/common';
import { LastExecutionController } from './last-execution/last-execution.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
	controllers: [LastExecutionController],
	imports: [PrismaModule],
})
export class ExerciseModule { }

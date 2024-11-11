import { Module } from '@nestjs/common';
import { LastExecutionController } from './last-execution/last-execution.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { FastifyMulterModule } from '@nest-lab/fastify-multer';

@Module({
	controllers: [LastExecutionController],
	imports: [PrismaModule, FastifyMulterModule],
})
export class ExerciseModule { }

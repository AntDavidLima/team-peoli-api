import {
	BadRequestException,
	Injectable,
	InternalServerErrorException,
	PipeTransform,
} from '@nestjs/common';
import { ZodSchema, ZodError } from 'zod';
import { fromZodError } from 'zod-validation-error';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
	constructor(private schema: ZodSchema) { }

	transform(value: unknown) {
		try {
			return this.schema.parse(value);
		} catch (error) {
			if (error instanceof ZodError) {
				throw new BadRequestException({
					error: fromZodError(error),
					message: 'Dados inválidos',
					statusCode: 400,
				});
			}

			throw new InternalServerErrorException('Erro ao validar dados');
		}
	}
}

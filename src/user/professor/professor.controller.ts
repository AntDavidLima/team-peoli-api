import {
	BadRequestException,
	Controller,
	Get,
	UseGuards,
	Param
} from '@nestjs/common';
import { AuthenticationGuard } from 'src/authentication/authentication.guard';
import { PrismaService } from 'src/prisma/prisma.service';

@Controller('/user/:id/professor')
@UseGuards(AuthenticationGuard)
export class ProfessorController {
	constructor(
		private prismaService: PrismaService,
	) { }

	@Get()
	async index(@Param('id') id: number) {
		const prof = await this.prismaService.user.findFirst({
			where: {
				isProfessor: true,
			},
			select: {
				id: true,
				name: true,
				email: true,
				phone: true,
			},
		});

		if (!prof) {
			throw new BadRequestException('Nenhum professor encontrado');
		}

		return prof;
	}

}

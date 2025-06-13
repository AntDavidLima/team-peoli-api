import {
	BadRequestException,
	Controller,
	Get,
	UseGuards,
} from '@nestjs/common';
import { AuthenticationGuard } from 'src/authentication/authentication.guard';
import { PrismaService } from 'src/prisma/prisma.service';

@Controller('/user/professor')
@UseGuards(AuthenticationGuard)
export class ProfessorController {
	constructor(
		private prismaService: PrismaService,
	) { }

	@Get('')
	async getProf() {
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

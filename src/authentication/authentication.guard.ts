import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthenticationTokenPayloadSchema } from './authentication.strategy';

@Injectable()
export class AuthenticationGuard extends AuthGuard('jwt') {
	constructor() {
		super();
	}

	handleRequest<TUser = AuthenticationTokenPayloadSchema>(
		err: Error | null,
		user: TUser | false,
	): TUser {
		if (err || !user) {
			throw new UnauthorizedException('Usuário não autenticado');
		}

		return user;
	}
}

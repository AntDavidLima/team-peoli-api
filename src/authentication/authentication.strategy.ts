import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Env } from 'src/env';
import { z } from 'zod';

const authenticationTokenPayloadSchema = z.object({
	sub: z.coerce.number(),
});

export type AuthenticationTokenPayloadSchema = z.infer<
	typeof authenticationTokenPayloadSchema
>;

@Injectable()
export class AuthenticationStrategy extends PassportStrategy(Strategy) {
	constructor(configService: ConfigService<Env, true>) {
		const publicKey = configService.get('JWT_PUBLIC_KEY');

		super({
			jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
			secretOrKey: Buffer.from(publicKey, 'base64'),
			algorithms: ['RS512'],
		});
	}

	validate(authenticationToken: AuthenticationTokenPayloadSchema) {
		return authenticationTokenPayloadSchema.parse(authenticationToken);
	}
}

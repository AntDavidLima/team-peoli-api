import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Env } from 'src/env';
import { AuthenticationController } from './authentication.controller';
import { AuthenticationStrategy } from './authentication.strategy';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
	imports: [
		PassportModule,
		PrismaModule,
		JwtModule.registerAsync({
			inject: [ConfigService],
			useFactory(configService: ConfigService<Env, true>) {
				const jwtPrivateKey = configService.get('JWT_PRIVATE_KEY', {
					infer: true,
				});
				const jwtPublicKey = configService.get('JWT_PUBLIC_KEY', {
					infer: true,
				});

				return {
					signOptions: { algorithm: 'RS512' },
					privateKey: Buffer.from(jwtPrivateKey, 'base64'),
					publicKey: Buffer.from(jwtPublicKey, 'base64'),
				};
			},
		}),
	],
	controllers: [AuthenticationController],
	providers: [AuthenticationStrategy],
})
export class AuthenticationModule { }

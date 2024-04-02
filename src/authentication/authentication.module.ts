import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Env } from 'src/env';
import { AuthenticationController } from './authentication.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
	imports: [
		PassportModule,
		JwtModule.registerAsync({
			inject: [ConfigService],
			useFactory(configService: ConfigService<Env>) {
				const jwtPrivateKey = configService.get('JWT_PRIVATE_KEY');
				const jwtPublicKey = configService.get('JWT_PUBLIC_KEY');

				return {
					signOptions: { algorithm: 'RS512' },
					privateKey: Buffer.from(jwtPrivateKey, 'base64'),
					publicKey: Buffer.from(jwtPublicKey, 'base64'),
				};
			},
		}),
	],
	controllers: [AuthenticationController],
	providers: [PrismaService],
})
export class AuthenticationModule { }

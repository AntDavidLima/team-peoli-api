import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import {
	FastifyAdapter,
	NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ConfigService } from '@nestjs/config';
import { Env } from './env';

async function bootstrap() {
	const app = await NestFactory.create<NestFastifyApplication>(
		AppModule,
		new FastifyAdapter(),
	);

	const config = new DocumentBuilder()
		.setTitle('Team Peoli')
		.setDescription('The Team Peoli API definition')
		.setVersion('1.0')
		.addTag('enpoints')
		.build();

	const document = SwaggerModule.createDocument(app, config);
	SwaggerModule.setup('api', app, document);

	const configService = app.get<ConfigService<Env, true>>(ConfigService);

	app.enableCors({
		origin: configService.get('CLIENT_URL'),
	});

	await app.listen(configService.get('APPLICATION_PORT'), '0.0.0.0');
}

bootstrap();

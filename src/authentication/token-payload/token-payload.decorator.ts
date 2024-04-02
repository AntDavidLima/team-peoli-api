import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { AuthenticationTokenPayloadSchema } from '../authentication.strategy';

export const AuthenticationTokenPayload = createParamDecorator(
	(_: never, context: ExecutionContext) => {
		return context
			.switchToHttp()
			.getRequest<{ user: AuthenticationTokenPayloadSchema }>().user;
	},
);

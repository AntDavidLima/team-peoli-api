import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { TokenPayloadSchema } from '../authentication.strategy';

export const User = createParamDecorator(
	(_: never, context: ExecutionContext) => {
		return context.switchToHttp().getRequest<{ user: TokenPayloadSchema }>()
			.user;
	},
);

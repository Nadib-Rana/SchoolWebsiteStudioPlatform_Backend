import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { SchoolMember } from "@prisma/client";

export const CurrentMember = createParamDecorator(
  (data: keyof SchoolMember | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const member = request.schoolMember;
    return data && member ? member[data] : member;
  },
);

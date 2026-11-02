import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { School } from "@prisma/client";

export const CurrentSchool = createParamDecorator(
  (data: keyof School | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const school = request.school;
    return data && school ? school[data] : school;
  },
);

import { Module } from "@nestjs/common";
import { GoverningBodyController } from "./governing-body.controller";
import { GoverningBodyService } from "./governing-body.service";

@Module({
  controllers: [GoverningBodyController],
  providers: [GoverningBodyService],
  exports: [GoverningBodyService],
})
export class GoverningBodyModule {}


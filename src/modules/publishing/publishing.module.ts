import { Module } from "@nestjs/common";
import { PublishingService } from "./publishing.service";
import { BackupRestoreService } from "./backup-restore.service";
import { PublishingController } from "./publishing.controller";

@Module({
  controllers: [PublishingController],
  providers: [PublishingService, BackupRestoreService],
  exports: [PublishingService, BackupRestoreService],
})
export class PublishingModule {}

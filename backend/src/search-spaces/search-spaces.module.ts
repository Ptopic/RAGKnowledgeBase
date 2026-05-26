import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { PrismaService } from '../prisma/prisma.service';
import { UploadModule } from '../upload';
import { SearchSpaceInvitationsController } from './search-space-invitations.controller';
import { SearchSpaceInvitationsService } from './search-space-invitations.service';
import { SearchSpacesController } from './search-spaces.controller';
import { SearchSpacesService } from './search-spaces.service';

@Module({
  imports: [PermissionsModule, MailModule, UploadModule],
  controllers: [SearchSpaceInvitationsController, SearchSpacesController],
  providers: [SearchSpacesService, SearchSpaceInvitationsService, PrismaService],
  exports: [SearchSpacesService],
})
export class SearchSpacesModule {}

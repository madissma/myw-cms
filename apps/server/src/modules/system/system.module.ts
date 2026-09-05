import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { OrgService } from './org.service';
import { RoleService } from './role.service';
import { DashboardService } from './dashboard.service';
import {
  AdminUsersController,
  AdminOrgsController,
  AdminRolesController,
  AdminSystemController,
} from './system.controller';

@Module({
  controllers: [AdminUsersController, AdminOrgsController, AdminRolesController, AdminSystemController],
  providers: [UserService, OrgService, RoleService, DashboardService],
  exports: [UserService, OrgService, RoleService, DashboardService],
})
export class SystemModule {}

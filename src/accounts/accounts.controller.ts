import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/types/jwt-payload';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { AccountsService } from './accounts.service';

@Controller('accounts')
@UseGuards(JwtAuthGuard)
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Post()
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateAccountDto) {
    return await this.accountsService.create(user, dto);
  }

  @Get()
  async findAll(@CurrentUser() user: JwtPayload) {
    return await this.accountsService.findAll(user);
  }

  @Get(':id')
  async findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return await this.accountsService.findOne(user, id);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateAccountDto,
  ) {
    return await this.accountsService.update(user, id, dto);
  }

  @Delete(':id')
  async remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return await this.accountsService.remove(user, id);
  }
}

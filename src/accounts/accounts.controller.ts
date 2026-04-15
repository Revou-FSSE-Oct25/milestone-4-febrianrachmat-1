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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/types/jwt-payload';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { AccountsService } from './accounts.service';

@ApiTags('Accounts')
@ApiBearerAuth('JWT-auth')
@Controller('accounts')
@UseGuards(JwtAuthGuard)
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Post()
  @ApiOperation({ summary: 'Create an account' })
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateAccountDto) {
    return await this.accountsService.create(user, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List accounts (own accounts; ADMIN sees all)' })
  async findAll(@CurrentUser() user: JwtPayload) {
    return await this.accountsService.findAll(user);
  }

  @Get(':id')
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOperation({ summary: 'Get one account by id' })
  async findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return await this.accountsService.findOne(user, id);
  }

  @Patch(':id')
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOperation({ summary: 'Update account type' })
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateAccountDto,
  ) {
    return await this.accountsService.update(user, id, dto);
  }

  @Delete(':id')
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOperation({
    summary: 'Delete account (balance must be zero)',
  })
  async remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return await this.accountsService.remove(user, id);
  }
}

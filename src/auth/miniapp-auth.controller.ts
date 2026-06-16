import { Body, Controller, Post } from '@nestjs/common';
import { MiniappAuthService } from './miniapp-auth.service';

type MiniappLoginBody = {
  code?: string;
};

@Controller('api/miniapp/auth')
export class MiniappAuthController {
  constructor(private readonly miniappAuthService: MiniappAuthService) {}

  @Post('login')
  async login(@Body() body: MiniappLoginBody = {}) {
    return this.miniappAuthService.loginWithCode(body.code);
  }
}

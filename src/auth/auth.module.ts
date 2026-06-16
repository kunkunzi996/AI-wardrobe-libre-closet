import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { ConditionalAuthGuard } from './conditional-auth.guard';
import { DisableRegistrationGuard } from './disable-registration.guard';
import { MiniappAuthController } from './miniapp-auth.controller';
import { MiniappAuthService } from './miniapp-auth.service';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { User } from '../dal/entity/user.entity';
import { PasswordReset } from '../dal/entity/passwordReset.entity';
import { EmailModule } from '../email/email.module';
import { ViewContextModule } from '../view-context/view-context.module';

@Module({
  imports: [
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('ACCESS_TOKEN_SECRET'),
        signOptions: { expiresIn: '365d' },
      }),
    }),
    MikroOrmModule.forFeature([PasswordReset, User]),
    EmailModule,
  ],
  controllers: [AuthController, MiniappAuthController],
  providers: [
    AuthService,
    MiniappAuthService,
    AuthGuard,
    ConditionalAuthGuard,
    DisableRegistrationGuard,
    ViewContextModule,
  ],
  exports: [JwtModule, AuthService, AuthGuard, ConditionalAuthGuard],
})
export class AuthModule {}

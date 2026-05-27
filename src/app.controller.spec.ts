import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { I18nContext } from 'nestjs-i18n';
import { AppService } from './app.service';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService, ConfigService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('index', () => {
    it('should return a context object with translated pageTitle', () => {
      const i18n = { t: (key: string) => key } as unknown as I18nContext;
      expect(appController.index(i18n)).toEqual({
        pageTitle: 'lang.PAGE_TITLE_HOME',
      });
    });
  });

  describe('Chinese product shell', () => {
    it('should provide product-facing Chinese navigation copy', () => {
      const zhPath = path.join(__dirname, 'i18n', 'zh', 'lang.json');
      const zh = JSON.parse(fs.readFileSync(zhPath, 'utf-8')) as Record<
        string,
        string
      >;

      expect(zh.APP_NAME).toBe('AI穿搭衣橱');
      expect(zh.WARDROBE).toBe('我的衣橱');
      expect(zh.PHOTO_INTAKE).toBe('拍照入库');
      expect(zh.AI_STYLING).toBe('AI搭配');
      expect(zh.CALENDAR).toBe('今日穿搭');
    });
  });
});

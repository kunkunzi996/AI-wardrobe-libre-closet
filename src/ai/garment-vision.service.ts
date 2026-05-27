import { Injectable } from '@nestjs/common';
import { GarmentVisionResult } from './dto/garment-vision-result.dto';

@Injectable()
export class GarmentVisionService {
  async analyzeImage(fileName: string): Promise<GarmentVisionResult> {
    return {
      fileName,
      category: 'tops',
      subcategory: undefined,
      color: undefined,
      seasons: [],
      styleTags: [],
      sceneTags: [],
      material: undefined,
      thickness: undefined,
      confidence: 0,
      notes: 'AI识别服务尚未配置，请手动确认衣物信息。',
    };
  }
}

import { GarmentVisionService } from './garment-vision.service';

describe('GarmentVisionService', () => {
  it('returns a safe editable draft when real AI is not configured', async () => {
    const service = new GarmentVisionService();

    const result = await service.analyzeImage('sample.webp');

    expect(result).toEqual({
      fileName: 'sample.webp',
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
    });
  });
});

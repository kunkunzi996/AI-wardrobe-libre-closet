export interface CreateCalendarEntryDto {
  date: Date;
  outfitId: number;
  scene?: string;
  weather?: string;
  temperature?: string;
  rating?: number | string;
  feedback?: string;
  complimented?: boolean | string;
  notes?: string;
}

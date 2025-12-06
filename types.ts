export enum SmileStyle {
  HOLLYWOOD = 'ابتسامة هوليوود (ناصعة ومثالية)',
  NATURAL = 'ابتسامة طبيعية (متناسقة)',
  VENEERS = 'فينيرز (تجميلي)',
  YOUTHFUL = 'ابتسامة شبابية (أسنان أطول قليلاً)',
  SOPHISTICATED = 'ابتسامة رزينة (خط مستقيم)',
}

export enum ToothShade {
  BL1 = 'BL1 (أبيض ناصع جداً)',
  BL3 = 'BL3 (أبيض ناصع)',
  A1 = 'A1 (أبيض طبيعي فاتح)',
  A2 = 'A2 (أبيض طبيعي)',
  B1 = 'B1 (أبيض لؤلؤي)',
}

export interface SimulationState {
  originalImage: string | null;
  generatedImage: string | null;
  isProcessing: boolean;
  selectedStyle: SmileStyle;
  selectedShade: ToothShade;
  error: string | null;
}
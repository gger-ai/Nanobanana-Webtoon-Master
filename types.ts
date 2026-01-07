
export enum ArtStyle {
  INSTATOON = '인스타툰 (Instatoon)',
  ANIME = '순정만화 (Anime)',
  HANDDRAWN = '손그림 (Hand-drawn)',
  THREE_D = '3D 캐릭터 (3D Render)',
  COMIC_BOOK = '만화책 (Comic Book)',
  GHIBLI = '지브리 (Ghibli)',
  PIXEL_ART = '픽셀 아트 (Pixel Art)',
  INK_WASH = '수묵화 (Ink Wash)',
  STORYBOOK = '동화책 (Storybook)'
}

export type ImageModelType = 'nano-flash' | 'nano-pro' | 'imagen';

export interface WebtoonPlan {
  subject: string;
  artStyle: ArtStyle;
  recommendedCharacter: {
    name: string;
    appearance: string;
    features: string;
  };
  storySummary: string[];
  dialogues: string[];
  infoTextBlock: string;
  referenceSources: string[];
  outroDetails: {
    secondCharacter: string;
    action: string;
    dialogue: string;
  };
  mainColor: string;
  englishPrompt: string;
}

export interface GenerationState {
  isPlanning: boolean;
  plan: WebtoonPlan | null;
  error: string | null;
}


export enum ArtStyle {
  INSTATOON = '인스타툰 (Instatoon)',
  ANIME = '순정만화 (Anime)',
  HANDDRAWN = '손그림 (Hand-drawn)',
  THREE_D = '3D 캐릭터 (3D Render)'
}

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

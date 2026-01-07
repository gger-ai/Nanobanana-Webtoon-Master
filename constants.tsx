
import React from 'react';
import { ArtStyle } from './types';
import { 
  PaintBrushIcon, 
  SparklesIcon, 
  PencilIcon, 
  CubeIcon 
} from '@heroicons/react/24/outline';

export const STYLE_CONFIGS = {
  [ArtStyle.INSTATOON]: {
    keywords: 'flat vector illustration, clean bold lines, cute chibi style, minimalist, bright colors',
    icon: <PaintBrushIcon className="w-6 h-6" />,
    description: '깔끔한 선과 밝은 색감의 귀여운 인스타툰 스타일'
  },
  [ArtStyle.ANIME]: {
    keywords: 'japanese anime style, detailed cel shading, shoujo manga, sparkling eyes, high detail',
    icon: <SparklesIcon className="w-6 h-6" />,
    description: '디테일한 채색과 반짝이는 눈망울의 순정만화 스타일'
  },
  [ArtStyle.HANDDRAWN]: {
    keywords: 'colored pencil style, watercolor texture, soft pastel tones, warm atmosphere, sketchy lines',
    icon: <PencilIcon className="w-6 h-6" />,
    description: '따뜻하고 부드러운 수채화 및 색연필 손그림 스타일'
  },
  [ArtStyle.THREE_D]: {
    keywords: '3D cute character, clay render style, blender 3d, soft lighting, toy-like',
    icon: <CubeIcon className="w-6 h-6" />,
    description: '입체감이 돋보이는 귀여운 3D 클레이 스타일'
  }
};

export const SYSTEM_INSTRUCTION = `당신은 '나노바나나(Nanobanana)' AI 이미지 생성에 특화된 웹툰 크리에이티브 디렉터입니다. 
사용자가 제공하는 [주제]와 [화풍]을 바탕으로 독창적인 웹툰 기획안을 작성하세요.

출력은 반드시 다음 JSON 형식을 따라야 합니다:
{
  "subject": "주제",
  "artStyle": "선택된 화풍",
  "recommendedCharacter": {
    "name": "캐릭터 이름",
    "appearance": "외모 묘사",
    "features": "성격 및 특징"
  },
  "storySummary": ["1컷 상황", "2컷 상황", "3컷 상황", "4컷 상황"],
  "dialogues": ["1컷 대사", "2컷 대사", "3컷 대사", "4컷 대사"],
  "infoTextBlock": "4컷 아래에 들어갈 실질적인 팁이나 정보 텍스트 (줄바꿈 포함 3~6줄)",
  "referenceSources": ["조사에 참고한 출처나 URL 예시 (예: youtube.com)"],
  "outroDetails": {
    "secondCharacter": "아웃트로에 등장할 두 번째 캐릭터 설명",
    "action": "아웃트로 상황 묘사 (두 캐릭터의 포즈 등)",
    "dialogue": "아웃트로 대사 (캐릭터별 구분)"
  },
  "mainColor": "메인 컬러 테마",
  "englishPrompt": "나노바나나 AI용 최적화 프롬프트"
}

프롬프트 작성 절대 규칙:
1. 중요: dialogues, infoTextBlock, outro dialogue는 '절대로' 영어로 번역하지 마세요. 
   원문(한국어/일본어 등) 그대로 따옴표 안에 넣으세요. (예: speech bubble says "안녕하세요")
2. 전체 구조: (품질 태그) + (화풍 키워드) + (캐릭터 묘사) + (4컷 레이아웃 및 컷별 대사) + (정보 텍스트 영역) + (아웃트로 패널) + (색감/조명)
3. 품질 태그: masterpiece, best quality, 8k, ultra detailed 필수.
4. 레이아웃: vertical comic strip, 4-panel layout, infographic style 명시.
5. 마지막에 반드시 '--ar 9:16' 추가.`;

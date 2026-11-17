/**
 * Design tokens "caderno escolar" — espelham tailwind.config.js (PRD §1 e §5).
 * Use as classes NativeWind (bg-paper, text-pen…) para layout e estes valores
 * quando um estilo precisa ser calculado em JS (animações, cores de morfemas).
 */
import type { MorphemeKind, Rarity } from '../types/grammar';

export const colors = {
  paper: '#FDFCF8',
  rule: '#DCE8F5',
  margin: '#F4B8B8',
  graphite: '#334155',
  pen: '#1D4ED8',
  correction: '#DC2626',
  highlighter: '#FDE047',
  pencil: '#16A34A',
  sharpener: '#EA580C',
  gel: '#7C3AED',
  postit: '#FEF08A',
  /* apoio (não estão no tailwind; usar via style) */
  ink: '#1E293B',
  inkSoft: '#475569',
  card: '#FFFFFF',
  tape: 'rgba(203, 213, 225, 0.55)',
  shadow: 'rgba(51, 65, 85, 0.18)',
  pencilInk: '#15803D',
  sharpenerInk: '#C2410C',
  eraserRed: '#F87171',
  eraserBlue: '#60A5FA',
  eraserWorn: '#CBD5E1',
} as const;

export const fonts = {
  hand: 'PatrickHand_400Regular',
  body: 'Nunito_400Regular',
  bodySemi: 'Nunito_600SemiBold',
  bodyBold: 'Nunito_700Bold',
  bodyHeavy: 'Nunito_800ExtraBold',
} as const;

/** Altura da pauta do caderno (px). */
export const RULE_HEIGHT = 30;
/** Distância da margem vermelha à esquerda (px). */
export const MARGIN_LEFT = 40;

export type MorphemeToken = {
  /** Sigla exibida no app. */
  short: string;
  /** Nome completo. */
  name: string;
  /** Cor do material (PRD §5) — para bordas, fundos e texto grande. */
  color: string;
  /** Variante com contraste ≥ 4.5:1 sobre papel — para texto pequeno. */
  ink: string;
  /** Fundo suave do bloco. */
  tint: string;
  material: string;
};

export const morphemeColors: Record<MorphemeKind | 'TEM', MorphemeToken> = {
  RAD: { short: 'RAD', name: 'Radical', color: colors.graphite, ink: colors.graphite, tint: '#E2E8F0', material: 'grafite' },
  VT: { short: 'VT', name: 'Vogal Temática', color: colors.pencil, ink: colors.pencilInk, tint: '#DCFCE7', material: 'lápis verde' },
  TEM: { short: 'TEM', name: 'Tema', color: colors.pen, ink: colors.pen, tint: '#DBEAFE', material: 'caneta azul' },
  DMT: { short: 'DMT', name: 'Desinência Modo-Temporal', color: colors.sharpener, ink: colors.sharpenerInk, tint: '#FFEDD5', material: 'apontador' },
  DNP: { short: 'DNP', name: 'Desinência Número-Pessoal', color: colors.gel, ink: colors.gel, tint: '#EDE9FE', material: 'caneta gel' },
};

export const rarityTokens: Record<Rarity, { label: string; color: string; tint: string; stars: number }> = {
  comum: { label: 'Comum', color: colors.graphite, tint: '#F1F5F9', stars: 1 },
  incomum: { label: 'Incomum', color: colors.pencilInk, tint: '#DCFCE7', stars: 2 },
  raro: { label: 'Raro', color: colors.pen, tint: '#DBEAFE', stars: 3 },
  lendario: { label: 'Lendário', color: colors.gel, tint: '#FEF9C3', stars: 4 },
};

export const RARITY_ORDER: Rarity[] = ['comum', 'incomum', 'raro', 'lendario'];

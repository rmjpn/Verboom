import { View } from 'react-native';
import type { MorphemeKind } from '../types/grammar';
import { morphemeColors } from '../theme/tokens';
import { Body, Hand } from './Typography';

type Props = {
  kind: MorphemeKind | 'TEM';
  /** Texto do morfema; '' = desinência zero (∅). */
  text: string;
  size?: 'sm' | 'md' | 'lg';
  /** Mostra a sigla (RAD/VT/…) acima do texto. */
  showLabel?: boolean;
};

export const ZERO = '∅';

/** Bloco colorido de um morfema (cores da Matriz Morfológica, PRD §5). */
export function MorphemeChip({ kind, text, size = 'md', showLabel = true }: Props) {
  const t = morphemeColors[kind];
  const fontSize = size === 'lg' ? 30 : size === 'md' ? 22 : 17;
  const display = text === '' ? ZERO : text;
  return (
    <View
      accessible
      accessibilityLabel={`${t.name}: ${text === '' ? 'desinência zero' : text}`}
      style={{
        alignItems: 'center',
        paddingHorizontal: size === 'sm' ? 8 : 12,
        paddingVertical: size === 'sm' ? 2 : 4,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: t.color,
        backgroundColor: t.tint,
        minWidth: size === 'sm' ? 36 : 48,
      }}
    >
      {showLabel && (
        <Body weight="heavy" style={{ fontSize: 10, color: t.ink, letterSpacing: 1 }}>
          {t.short}
        </Body>
      )}
      <Hand style={{ fontSize, color: t.ink, lineHeight: fontSize * 1.2 }}>{display}</Hand>
    </View>
  );
}

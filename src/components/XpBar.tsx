import { View } from 'react-native';
import type { NotebookLevel } from '../types/grammar';
import { levelName, levelProgress } from '../lib/labels';
import { colors } from '../theme/tokens';
import { Body, Hand } from './Typography';

type Props = { xp: number; level: NotebookLevel; compact?: boolean };

/** Nível do caderno + barra de progresso estilo lápis. */
export function XpBar({ xp, level, compact }: Props) {
  const { ratio, label } = levelProgress(xp);
  const name = levelName(level);
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Nível ${level}, ${name}. ${label}`}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(ratio * 100) }}
      style={{ gap: 4 }}
    >
      <View style={{ flexDirection: compact ? 'row' : 'column', alignItems: compact ? 'baseline' : 'flex-start', justifyContent: 'space-between', gap: compact ? 8 : 0 }}>
        <Hand style={{ fontSize: compact ? 18 : 24, color: colors.pen, flexShrink: 1 }} numberOfLines={compact ? 1 : 2}>
          {compact ? `Nível ${level} · ${name}` : name}
        </Hand>
        <Body weight="bold" style={{ fontSize: 12, color: colors.inkSoft }}>
          {compact ? label : `Nível ${level} · ${label}`}
        </Body>
      </View>
      <View
        style={{
          height: compact ? 10 : 14,
          borderRadius: 999,
          borderWidth: 1.5,
          borderColor: colors.graphite,
          backgroundColor: '#FFFFFF',
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            width: `${Math.max(3, ratio * 100)}%`,
            height: '100%',
            backgroundColor: colors.highlighter,
            borderRightWidth: ratio > 0 && ratio < 1 ? 2 : 0,
            borderRightColor: colors.sharpener,
          }}
        />
      </View>
    </View>
  );
}

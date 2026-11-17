import { View } from 'react-native';
import type { Rarity } from '../types/grammar';
import { rarityTokens } from '../theme/tokens';
import { Body } from './Typography';

type Props = { rarity: Rarity; size?: 'sm' | 'md'; prefix?: string };

/** Selo de raridade: Comum / Incomum / Raro / Lendário. */
export function RarityBadge({ rarity, size = 'md', prefix }: Props) {
  const t = rarityTokens[rarity];
  const stars = '★'.repeat(t.stars);
  return (
    <View
      accessible
      accessibilityLabel={`${prefix ? `${prefix}, ` : ''}raridade ${t.label}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 4,
        paddingHorizontal: size === 'sm' ? 8 : 10,
        paddingVertical: size === 'sm' ? 2 : 4,
        borderRadius: 999,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: t.color,
        backgroundColor: t.tint,
      }}
    >
      <Body weight="heavy" style={{ color: t.color, fontSize: size === 'sm' ? 10 : 12 }}>
        {stars}
      </Body>
      <Body weight="bold" style={{ color: t.color, fontSize: size === 'sm' ? 12 : 13 }}>
        {prefix ? `${prefix} · ${t.label}` : t.label}
      </Body>
    </View>
  );
}

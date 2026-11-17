import { Text } from 'react-native';
import type { ConjugatedForm } from '../types/grammar';
import { colors, morphemeColors } from '../theme/tokens';
import { Hand } from './Typography';

type Props = { form: ConjugatedForm; size?: number; negative?: boolean; onPress?: () => void };

/** Forma conjugada pintada por morfema (RAD grafite, VT verde, DMT laranja, DNP roxo). */
export function ColoredWord({ form, size = 44, negative, onPress }: Props) {
  const colored = form.segmentable && form.morphemes.map((m) => m.text).join('') === form.word;
  return (
    <Hand
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={`${negative ? 'não ' : ''}${form.word}${onPress ? '. Toque para ver o significado.' : ''}`}
      style={{ fontSize: size, lineHeight: size * 1.2, color: colors.ink, textAlign: 'center' }}
    >
      {negative && <Text style={{ color: colors.inkSoft }}>não </Text>}
      {colored
        ? form.morphemes.map((m, i) =>
            m.text ? (
              <Text key={i} style={{ color: morphemeColors[m.kind].ink }}>
                {m.text}
              </Text>
            ) : null,
          )
        : form.word}
    </Hand>
  );
}

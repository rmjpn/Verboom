import { Text } from 'react-native';
import { highlightSegments } from '../lib/highlight';
import { colors, fonts } from '../theme/tokens';
import { Body } from './Typography';

type Props = { sentence: string; words: string[]; stem?: string; size?: number };

/** Frase com o verbo destacado em amarelo marca-texto. */
export function HighlightedSentence({ sentence, words, stem, size = 16 }: Props) {
  const segs = highlightSegments(sentence, words, stem);
  return (
    <Body style={{ fontSize: size, lineHeight: size * 1.55, color: colors.ink }}>
      {segs.map((s, i) =>
        s.hl ? (
          <Text key={i} style={{ backgroundColor: colors.highlighter, fontFamily: fonts.bodyHeavy, color: colors.ink }}>
            {s.text}
          </Text>
        ) : (
          <Text key={i}>{s.text}</Text>
        ),
      )}
    </Body>
  );
}

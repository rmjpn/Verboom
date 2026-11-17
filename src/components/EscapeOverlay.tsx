import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Challenge } from '../types/grammar';
import { safeExplain } from '../lib/engineSafe';
import { challengeLabel } from '../lib/labels';
import { speakPtBR } from '../lib/speech';
import { colors } from '../theme/tokens';
import { ColoredWord } from './ColoredWord';
import { MorphemeChip } from './MorphemeChip';
import { NotebookBackground } from './NotebookBackground';
import { NotebookButton } from './NotebookButton';
import { Body, Hand } from './Typography';

type Props = { challenge: Challenge; onDone: () => void };

const CRUMBS = [
  { x: -40, y: 18, w: 7, h: 5 },
  { x: -10, y: -16, w: 5, h: 4 },
  { x: 30, y: 22, w: 6, h: 6 },
  { x: 70, y: -10, w: 4, h: 4 },
  { x: 110, y: 16, w: 6, h: 4 },
];

/** "O verbo foge!" — a palavra é apagada com rastro de borracha; a resposta só aparece depois. */
export function EscapeOverlay({ challenge, onDone }: Props) {
  const insets = useSafeAreaInsets();
  const [revealed, setRevealed] = useState(false);
  const word = challenge.verb.infinitive.toLocaleUpperCase('pt-BR');
  const negative = challenge.tense === 'imp_neg';

  const tx = useSharedValue(0);
  const fade = useSharedValue(1);
  const smear = useSharedValue(0);

  useEffect(() => {
    const easing = Easing.in(Easing.cubic);
    smear.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.quad) });
    fade.value = withDelay(250, withTiming(0, { duration: 900 }));
    tx.value = withDelay(
      200,
      withTiming(260, { duration: 1100, easing }, (fin) => {
        if (fin) scheduleOnRN(setRevealed, true);
      }),
    );
  }, [fade, smear, tx]);

  const wordStyle = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [{ translateX: tx.value }, { rotate: `${tx.value / 30}deg` }, { skewX: `${-tx.value / 25}deg` }],
  }));
  const smearStyle = useAnimatedStyle(() => ({ opacity: smear.value * 0.4, transform: [{ scaleX: smear.value }] }));

  return (
    <Animated.View
      entering={FadeIn.duration(250)}
      accessibilityViewIsModal
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50 }}
    >
      <NotebookBackground holes={false}>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            paddingTop: insets.top + 24,
            paddingBottom: insets.bottom + 32,
            paddingLeft: 56,
            paddingRight: 20,
            gap: 20,
          }}
        >
          <View style={{ height: 120, justifyContent: 'center', overflow: 'visible' }}>
            {/* rastro de borracha */}
            <Animated.View
              pointerEvents="none"
              style={[
                {
                  position: 'absolute',
                  left: -10,
                  right: -10,
                  height: 54,
                  borderRadius: 18,
                  borderTopRightRadius: 40,
                  borderBottomLeftRadius: 40,
                  backgroundColor: '#CBD5E1',
                  transformOrigin: 'left',
                },
                smearStyle,
              ]}
            />
            {CRUMBS.map((c, i) => (
              <Animated.View
                key={i}
                pointerEvents="none"
                style={[
                  { position: 'absolute', left: '40%', marginLeft: c.x, top: 60 + c.y, width: c.w, height: c.h, borderRadius: 3, backgroundColor: '#94A3B8' },
                  smearStyle,
                ]}
              />
            ))}
            <Animated.View style={[{ alignItems: 'center' }, wordStyle]}>
              <Hand style={{ fontSize: 52, color: colors.ink }} numberOfLines={1}>
                {word}
              </Hand>
            </Animated.View>
          </View>

          {!revealed ? (
            <Hand style={{ fontSize: 28, color: colors.correction, textAlign: 'center' }} accessibilityLiveRegion="polite">
              O verbo fugiu!
            </Hand>
          ) : (
            <Animated.View entering={FadeInDown.duration(400)} style={{ gap: 16 }}>
              <View style={{ alignItems: 'center', gap: 2 }}>
                <Hand style={{ fontSize: 32, color: colors.correction, textAlign: 'center' }} accessibilityRole="header">
                  O verbo voltou à natureza
                </Hand>
                <Body style={{ fontSize: 15, color: colors.inkSoft, textAlign: 'center' }}>
                  Você vai reencontrá-lo em uma próxima caçada.
                </Body>
              </View>

              <View
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 6,
                  padding: 16,
                  gap: 10,
                  borderLeftWidth: 4,
                  borderLeftColor: colors.correction,
                  boxShadow: '0px 6px 16px rgba(51,65,85,0.12)',
                }}
              >
                <Body weight="heavy" style={{ fontSize: 12, letterSpacing: 1, color: colors.correction }}>
                  CORREÇÃO DO PROFESSOR
                </Body>
                <Body weight="semibold" style={{ fontSize: 14, color: colors.inkSoft }}>
                  {challengeLabel(challenge)}
                </Body>
                <ColoredWord form={challenge.form} negative={negative} size={44} />
                {challenge.form.segmentable && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
                    {safeExplain(challenge).map((d, i) => (
                      <MorphemeChip key={i} kind={d.kind} text={d.text} size="sm" />
                    ))}
                  </View>
                )}
                <NotebookButton
                  label="Ouvir a forma correta"
                  variant="ghost"
                  onPress={() => speakPtBR(negative ? `não ${challenge.form.word}` : challenge.form.word)}
                  icon={<MaterialCommunityIcons name="volume-high" size={20} color={colors.pen} />}
                />
              </View>

              <NotebookButton
                label="Voltar à caça"
                size="lg"
                onPress={onDone}
                icon={<MaterialCommunityIcons name="cards-outline" size={22} color="#FFFFFF" />}
              />
            </Animated.View>
          )}
        </ScrollView>
      </NotebookBackground>
    </Animated.View>
  );
}

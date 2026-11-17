import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Challenge } from '../types/grammar';
import type { EncounterOutcome } from '../state/types';
import { safeExplain, safeModelSentence } from '../lib/engineSafe';
import { challengeLabel } from '../lib/labels';
import { speakPtBR, stopSpeaking } from '../lib/speech';
import { colors, morphemeColors } from '../theme/tokens';
import { ColoredWord } from './ColoredWord';
import { HighlightedSentence } from './HighlightedSentence';
import { MeaningPopover } from './MeaningPopover';
import { MorphemeChip } from './MorphemeChip';
import { NotebookBackground } from './NotebookBackground';
import { NotebookButton, Tape } from './NotebookButton';
import { Body, Hand } from './Typography';

type Props = {
  challenge: Challenge;
  outcome: EncounterOutcome | null;
  autoSpeak: boolean;
  onContinue: () => void;
};

function Stamp() {
  const scale = useSharedValue(2.4);
  const opacity = useSharedValue(0);
  useEffect(() => {
    opacity.value = withTiming(1, { duration: 140 });
    scale.value = withSequence(withTiming(0.92, { duration: 220 }), withSpring(1, { damping: 8, stiffness: 220 }));
  }, [opacity, scale]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ rotate: '-8deg' }, { scale: scale.value }] }));
  return (
    <Animated.View
      accessible
      accessibilityRole="header"
      accessibilityLabel="Capturado!"
      style={[
        {
          alignSelf: 'center',
          borderWidth: 4,
          borderColor: colors.pencilInk,
          borderRadius: 12,
          paddingHorizontal: 18,
          paddingVertical: 2,
          backgroundColor: 'rgba(220,252,231,0.6)',
        },
        style,
      ]}
    >
      <View style={{ position: 'absolute', top: 3, left: 3, right: 3, bottom: 3, borderWidth: 1.5, borderColor: colors.pencilInk, borderRadius: 8 }} />
      <Hand style={{ fontSize: 40, color: colors.pencilInk, letterSpacing: 2 }}>CAPTURADO ✓</Hand>
    </Animated.View>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <Hand style={{ fontSize: 22, color: colors.pen }} accessibilityRole="header">
      {children}
    </Hand>
  );
}

/** Pós-captura: carimbo, pronúncia, frases e dissecação morfológica (PRD §3.3). */
export function CaptureResultModal({ challenge, outcome, autoSpeak, onContinue }: Props) {
  const insets = useSafeAreaInsets();
  const [meaningOpen, setMeaningOpen] = useState(false);
  const { form, verb } = challenge;
  const negative = challenge.tense === 'imp_neg';
  const spoken = negative ? `não ${form.word}` : form.word;
  const dissection = safeExplain(challenge);
  const sentence = safeModelSentence(challenge);
  const rad = form.morphemes.find((m) => m.kind === 'RAD')?.text ?? '';
  const vt = form.morphemes.find((m) => m.kind === 'VT')?.text ?? '';

  useEffect(() => {
    if (!autoSpeak) return;
    const t = setTimeout(() => speakPtBR(spoken, 1.0), 450);
    return () => {
      clearTimeout(t);
      stopSpeaking();
    };
  }, [autoSpeak, spoken]);

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      accessibilityViewIsModal
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50 }}
    >
      <NotebookBackground holes={false}>
        <ScrollView
          contentContainerStyle={{
            paddingTop: insets.top + 24,
            paddingBottom: insets.bottom + 32,
            paddingLeft: 56,
            paddingRight: 20,
            gap: 18,
          }}
        >
          <Stamp />

          <Animated.View entering={FadeInDown.delay(250)} style={{ alignItems: 'center', gap: 4 }}>
            <ColoredWord form={form} negative={negative} size={52} onPress={() => setMeaningOpen(true)} />
            <Body weight="semibold" style={{ fontSize: 14, color: colors.inkSoft, textAlign: 'center' }}>
              {verb.infinitive} · {challengeLabel(challenge)}
            </Body>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(350)} style={{ flexDirection: 'row', gap: 10, justifyContent: 'center' }}>
            <NotebookButton
              label="Ouvir 1.0x"
              variant="secondary"
              onPress={() => speakPtBR(spoken, 1.0)}
              accessibilityLabel={`Ouvir ${spoken} em velocidade normal`}
              icon={<MaterialCommunityIcons name="volume-high" size={20} color={colors.graphite} />}
            />
            <NotebookButton
              label="Pausado 0.7x"
              variant="secondary"
              onPress={() => speakPtBR(spoken, 0.7)}
              accessibilityLabel={`Ouvir ${spoken} pausadamente`}
              icon={<MaterialCommunityIcons name="tortoise" size={20} color={colors.graphite} />}
            />
          </Animated.View>

          {outcome && (
            <Animated.View entering={FadeInDown.delay(420)} style={{ alignItems: 'center', gap: 4 }}>
              <View style={{ backgroundColor: colors.highlighter, paddingHorizontal: 12, paddingVertical: 2, transform: [{ rotate: '-1deg' }] }}>
                <Hand style={{ fontSize: 24, color: colors.ink }}>+{outcome.xpGained} XP</Hand>
              </View>
              {outcome.leveledUp && (
                <Body weight="heavy" style={{ color: colors.gel, fontSize: 15 }}>
                  Seu caderno evoluiu de nível!
                </Body>
              )}
            </Animated.View>
          )}

          {/* dissecação morfológica */}
          <Animated.View
            entering={FadeInDown.delay(500)}
            style={{ backgroundColor: '#FFFFFF', borderRadius: 6, padding: 16, gap: 12, boxShadow: '0px 6px 16px rgba(51,65,85,0.12)' }}
          >
            <Tape style={{ top: -12, right: 24, transform: [{ rotate: '6deg' }] }} />
            <SectionTitle>Dissecação morfológica</SectionTitle>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
              {dissection.map((d, i) => (
                <View key={`${d.kind}-${i}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {i > 0 && <Hand style={{ fontSize: 22, color: colors.inkSoft }}>+</Hand>}
                  <MorphemeChip kind={d.kind} text={d.text} size="sm" />
                </View>
              ))}
            </View>
            {form.segmentable && rad + vt !== rad && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MorphemeChip kind="TEM" text={rad + vt} size="sm" />
                <Body style={{ fontSize: 14, color: colors.ink, flex: 1 }}>Tema = radical + vogal temática.</Body>
              </View>
            )}
            {dissection.map((d, i) => (
              <View key={`e-${i}`} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, marginTop: 6, backgroundColor: morphemeColors[d.kind].color }} />
                <Body style={{ fontSize: 14, lineHeight: 21, color: colors.ink, flex: 1 }}>
                  <Body weight="heavy" style={{ color: morphemeColors[d.kind].ink }}>
                    {morphemeColors[d.kind].short} {d.text === '' ? '∅' : `“${d.text}”`}:{' '}
                  </Body>
                  {d.explanation}
                </Body>
              </View>
            ))}
          </Animated.View>

          {/* frases */}
          <Animated.View entering={FadeInDown.delay(600)} style={{ gap: 10 }}>
            {sentence && (
              <View style={{ gap: 4 }}>
                <SectionTitle>Frase-modelo</SectionTitle>
                <HighlightedSentence sentence={sentence} words={[form.word]} size={18} />
              </View>
            )}
            {verb.examples.length > 0 && (
              <View style={{ gap: 6 }}>
                <SectionTitle>Exemplos com o verbo</SectionTitle>
                {verb.examples.map((ex, i) => (
                  <View key={i} style={{ flexDirection: 'row', gap: 6 }}>
                    <Body style={{ color: colors.inkSoft, fontSize: 16, lineHeight: 25 }}>•</Body>
                    <View style={{ flex: 1 }}>
                      <HighlightedSentence sentence={ex} words={[form.word, verb.infinitive]} stem={rad} />
                    </View>
                  </View>
                ))}
              </View>
            )}
            <Pressable
              onPress={() => setMeaningOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={`Ver significado de ${verb.infinitive}`}
              style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }}
            >
              <Body weight="bold" style={{ color: colors.pen, fontSize: 15, textDecorationLine: 'underline' }}>
                Ver significado de “{verb.infinitive}”
              </Body>
            </Pressable>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(700)}>
            <NotebookButton
              label="Continuar caçando"
              size="lg"
              onPress={onContinue}
              icon={<MaterialCommunityIcons name="cards-outline" size={22} color="#FFFFFF" />}
            />
          </Animated.View>
        </ScrollView>
      </NotebookBackground>
      <MeaningPopover verb={verb} visible={meaningOpen} onClose={() => setMeaningOpen(false)} />
    </Animated.View>
  );
}


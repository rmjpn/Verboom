import { useCallback, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { GestureDetector, useCompetingGestures, usePanGesture, useTapGesture } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { VerbEntry } from '../types/grammar';
import { hapticImpact, hapticTap } from '../lib/haptics';
import { colors, rarityTokens } from '../theme/tokens';
import { MeaningPopover } from './MeaningPopover';
import { NotebookButton, Tape } from './NotebookButton';
import { Body, Hand } from './Typography';

type Props = {
  verb: VerbEntry;
  isReview?: boolean;
  /** Arrastar para a direita: encarar / capturar. */
  onSwipeRight: () => void;
  /** Arrastar para a esquerda: deixar passar. */
  onSwipeLeft: () => void;
  disabled?: boolean;
};

export const CARD_HEIGHT = 360;

/** Ficha do verbo (estilo Tinder no caderno): mostra apenas o infinitivo. */
export function VerbSwipeCard({ verb, isReview, onSwipeRight, onSwipeLeft, disabled }: Props) {
  const { width: screenW } = useWindowDimensions();
  const cardW = Math.min(screenW - 56, 340);
  const flyOut = Math.max(screenW, 500) * 1.2;
  const threshold = Math.min(cardW * 0.35, 120);

  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const gone = useSharedValue(false);
  const [meaningOpen, setMeaningOpen] = useState(false);

  const finish = useCallback(
    (dir: number) => {
      if (dir > 0) onSwipeRight();
      else onSwipeLeft();
    },
    [onSwipeLeft, onSwipeRight],
  );

  const openMeaning = useCallback(() => {
    hapticTap();
    setMeaningOpen(true);
  }, []);

  const flingTo = useCallback(
    (dir: 1 | -1) => {
      if (gone.value || disabled) return;
      gone.value = true;
      hapticImpact();
      ty.value = withTiming(-30, { duration: 280 });
      tx.value = withTiming(dir * flyOut, { duration: 280 }, (finished) => {
        if (finished) scheduleOnRN(finish, dir);
      });
    },
    [disabled, finish, flyOut, gone, tx, ty],
  );

  const pan = usePanGesture({
    enabled: !disabled,
    minDistance: 6,
    onUpdate: (e) => {
      'worklet';
      if (gone.value) return;
      tx.value = e.translationX;
      ty.value = e.translationY * 0.35;
    },
    onDeactivate: (e) => {
      'worklet';
      if (gone.value) return;
      const fast = Math.abs(e.velocityX) > 850 && Math.sign(e.velocityX) === Math.sign(e.translationX);
      if (Math.abs(e.translationX) > threshold || (fast && Math.abs(e.translationX) > 24)) {
        const dir = e.translationX > 0 ? 1 : -1;
        gone.value = true;
        const duration = Math.max(160, Math.min(320, 260000 / Math.max(Math.abs(e.velocityX), 800)));
        ty.value = withTiming(ty.value + e.velocityY * 0.08, { duration });
        tx.value = withTiming(dir * flyOut, { duration }, (finished) => {
          if (finished) scheduleOnRN(finish, dir);
        });
      } else {
        tx.value = withSpring(0, { damping: 14, stiffness: 160 });
        ty.value = withSpring(0, { damping: 14, stiffness: 160 });
      }
    },
  });

  const tap = useTapGesture({
    enabled: !disabled,
    onActivate: () => {
      'worklet';
      scheduleOnRN(openMeaning);
    },
  });

  const gesture = useCompetingGestures(pan, tap);

  const cardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(tx.value, [-cardW, 0, cardW], [-14, -1.5, 12], Extrapolation.CLAMP);
    const opacity = interpolate(Math.abs(tx.value), [0, flyOut * 0.8], [1, 0.2], Extrapolation.CLAMP);
    return {
      opacity,
      transform: [{ translateX: tx.value }, { translateY: ty.value }, { rotate: `${rotate}deg` }],
    };
  });
  const captureStamp = useAnimatedStyle(() => ({
    opacity: interpolate(tx.value, [20, threshold], [0, 1], Extrapolation.CLAMP),
    transform: [{ rotate: '-14deg' }, { scale: interpolate(tx.value, [20, threshold], [1.3, 1], Extrapolation.CLAMP) }],
  }));
  const skipStamp = useAnimatedStyle(() => ({
    opacity: interpolate(tx.value, [-threshold, -20], [1, 0], Extrapolation.CLAMP),
    transform: [{ rotate: '12deg' }, { scale: interpolate(tx.value, [-threshold, -20], [1, 1.3], Extrapolation.CLAMP) }],
  }));

  const word = verb.infinitive.toLocaleUpperCase('pt-BR');
  const fontSize = Math.min(64, Math.floor((cardW - 48) / (word.length * 0.56)));
  const rarity = rarityTokens[verb.rarity];

  return (
    <View style={{ alignItems: 'center', gap: 22 }}>
      <GestureDetector gesture={gesture} userSelect="none" touchAction="pan-y">
        <Animated.View
          accessible
          accessibilityRole="button"
          accessibilityLabel={`Verbo ${verb.infinitive}${isReview ? ', revisão' : ''}. Encontro selvagem, ${rarity.label}.`}
          accessibilityHint="Toque para ver o significado. Use os botões abaixo para encarar ou deixar passar."
          accessibilityActions={[
            { name: 'activate', label: 'Ver significado' },
            { name: 'capture', label: 'Encarar o verbo' },
            { name: 'skip', label: 'Deixar passar' },
          ]}
          onAccessibilityAction={(e) => {
            if (e.nativeEvent.actionName === 'activate') openMeaning();
            if (e.nativeEvent.actionName === 'capture') flingTo(1);
            if (e.nativeEvent.actionName === 'skip') flingTo(-1);
          }}
          style={[
            {
              width: cardW,
              height: CARD_HEIGHT,
              backgroundColor: colors.card,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              boxShadow: '0px 10px 24px rgba(51,65,85,0.16), 0px 2px 0px rgba(51,65,85,0.10)',
              overflow: 'visible',
            },
            cardStyle,
          ]}
        >
          {/* pauta de ficha pautada */}
          <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 8, overflow: 'hidden' }}>
            <View style={{ position: 'absolute', left: 0, right: 0, top: 58, height: 2, backgroundColor: colors.margin }} />
            {Array.from({ length: 9 }, (_, i) => (
              <View
                key={i}
                style={{ position: 'absolute', left: 0, right: 0, top: 58 + (i + 1) * 32, height: 1, backgroundColor: colors.rule }}
              />
            ))}
          </View>
          <Tape style={{ top: -10, left: -18, transform: [{ rotate: '-28deg' }] }} />
          <Tape style={{ top: -10, right: -18, transform: [{ rotate: '28deg' }] }} />

          {/* selo de encontro selvagem */}
          <View style={{ position: 'absolute', top: 14, left: 14, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 3,
                borderRadius: 6,
                borderWidth: 1.5,
                borderColor: rarity.color,
                transform: [{ rotate: '-3deg' }],
                backgroundColor: rarity.tint,
              }}
            >
              <Body weight="heavy" style={{ fontSize: 11, letterSpacing: 1.2, color: rarity.color }}>
                {'★'.repeat(rarity.stars)} ENCONTRO SELVAGEM
              </Body>
            </View>
          </View>
          {isReview && (
            <View
              style={{
                position: 'absolute',
                top: 12,
                right: -8,
                backgroundColor: colors.sharpenerInk,
                paddingHorizontal: 12,
                paddingVertical: 4,
                transform: [{ rotate: '6deg' }],
                borderRadius: 3,
                boxShadow: '0px 2px 4px rgba(0,0,0,0.18)',
              }}
            >
              <Body weight="heavy" style={{ color: '#FFFFFF', fontSize: 12, letterSpacing: 1.5 }}>
                REVISÃO
              </Body>
            </View>
          )}

          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, paddingTop: 40 }}>
            <Hand
              style={{ fontSize, lineHeight: fontSize * 1.15, color: colors.ink, letterSpacing: 1, textAlign: 'center' }}
              numberOfLines={1}
            >
              {word}
            </Hand>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10, opacity: 0.85 }}>
              <MaterialCommunityIcons name="gesture-tap" size={16} color={colors.inkSoft} />
              <Body style={{ fontSize: 13, color: colors.inkSoft }}>toque para ver o significado</Body>
            </View>
          </View>
          <Body style={{ position: 'absolute', bottom: 12, alignSelf: 'center', fontSize: 12, color: colors.inkSoft }}>
            {`← deixar passar  ·  encarar →`}
          </Body>

          {/* carimbos de decisão */}
          <Animated.View
            pointerEvents="none"
            style={[
              { position: 'absolute', top: 70, left: 18, borderWidth: 3, borderColor: colors.pen, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 2 },
              captureStamp,
            ]}
          >
            <Hand style={{ fontSize: 30, color: colors.pen }}>ENCARAR!</Hand>
          </Animated.View>
          <Animated.View
            pointerEvents="none"
            style={[
              { position: 'absolute', top: 70, right: 18, borderWidth: 3, borderColor: colors.correction, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 2 },
              skipStamp,
            ]}
          >
            <Hand style={{ fontSize: 30, color: colors.correction }}>PASSAR</Hand>
          </Animated.View>
        </Animated.View>
      </GestureDetector>

      <View style={{ flexDirection: 'row', gap: 12, width: cardW }}>
        <NotebookButton
          label="Deixar passar"
          variant="secondary"
          onPress={() => flingTo(-1)}
          disabled={disabled}
          accessibilityLabel={`Deixar ${verb.infinitive} passar`}
          icon={<MaterialCommunityIcons name="arrow-left" size={20} color={colors.graphite} />}
          style={{ flex: 1 }}
        />
        <NotebookButton
          label="Encarar!"
          onPress={() => flingTo(1)}
          disabled={disabled}
          accessibilityLabel={`Encarar ${verb.infinitive} na arena`}
          icon={<MaterialCommunityIcons name="sword-cross" size={20} color="#FFFFFF" />}
          style={{ flex: 1 }}
        />
      </View>

      <MeaningPopover verb={verb} visible={meaningOpen} onClose={() => setMeaningOpen(false)} />
    </View>
  );
}

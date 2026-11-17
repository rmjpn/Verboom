import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { colors } from '../theme/tokens';

type Props = { lives: number; max?: number };

function Eraser({ alive, index }: { alive: boolean; index: number }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(alive ? 1 : 0.35);

  useEffect(() => {
    if (!alive) {
      scale.value = withSequence(withTiming(1.25, { duration: 120 }), withSpring(0.82));
      opacity.value = withTiming(0.35, { duration: 400 });
    } else {
      scale.value = withSpring(1);
      opacity.value = withTiming(1, { duration: 200 });
    }
  }, [alive, opacity, scale]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ rotate: `${index % 2 === 0 ? -10 : 8}deg` }, { scale: scale.value }],
  }));

  return (
    <Animated.View style={style}>
      <View
        style={{
          width: 40,
          height: 22,
          borderRadius: 5,
          borderWidth: 1.5,
          borderColor: colors.graphite,
          flexDirection: 'row',
          overflow: 'hidden',
          backgroundColor: alive ? colors.eraserRed : colors.eraserWorn,
        }}
      >
        <View style={{ flex: 1 }} />
        <View style={{ flex: 1, backgroundColor: alive ? colors.eraserBlue : '#E2E8F0' }} />
      </View>
      {!alive && (
        <View style={{ position: 'absolute', right: -6, bottom: -4, flexDirection: 'row', gap: 2 }}>
          <View style={{ width: 4, height: 3, borderRadius: 2, backgroundColor: '#94A3B8' }} />
          <View style={{ width: 3, height: 3, borderRadius: 2, backgroundColor: '#94A3B8' }} />
        </View>
      )}
    </Animated.View>
  );
}

/** As 3 chances do encontro, desenhadas como borrachas escolares (vermelha/azul). */
export function LivesIndicator({ lives, max = 3 }: Props) {
  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${lives} de ${max} chances restantes`}
      style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}
    >
      {Array.from({ length: max }, (_, i) => (
        <Eraser key={i} index={i} alive={i < lives} />
      ))}
    </View>
  );
}

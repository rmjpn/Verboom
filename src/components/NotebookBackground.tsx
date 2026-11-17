import { useState, type ReactNode } from 'react';
import { View, type LayoutChangeEvent, type ViewStyle, type StyleProp } from 'react-native';
import { colors, MARGIN_LEFT, RULE_HEIGHT } from '../theme/tokens';

type Props = {
  children?: ReactNode;
  lineHeight?: number;
  marginLeft?: number;
  /** Espaço sem pauta no topo (cabeçalho da folha). */
  topOffset?: number;
  /** Mostra os furos de fichário na borda esquerda. */
  holes?: boolean;
  style?: StyleProp<ViewStyle>;
  className?: string;
};

/**
 * Folha pautada: papel off-white, linhas azul-claras horizontais e margem vermelha.
 * Feita com Views absolutas — funciona igual em web, Android e iOS.
 */
export function NotebookBackground({
  children,
  lineHeight = RULE_HEIGHT,
  marginLeft = MARGIN_LEFT,
  topOffset = 0,
  holes = true,
  style,
  className,
}: Props) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (Math.abs(width - size.w) > 1 || Math.abs(height - size.h) > 1) setSize({ w: width, h: height });
  };
  const count = size.h > 0 ? Math.ceil((size.h - topOffset) / lineHeight) : 0;
  const holeCount = size.h > 0 ? Math.max(2, Math.floor(size.h / 180)) : 0;

  return (
    <View className={`flex-1 bg-paper ${className ?? ''}`} style={style} onLayout={onLayout}>
      <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        {Array.from({ length: count }, (_, i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: topOffset + (i + 1) * lineHeight,
              height: 1,
              backgroundColor: colors.rule,
            }}
          />
        ))}
        <View
          style={{ position: 'absolute', top: 0, bottom: 0, left: marginLeft, width: 1.5, backgroundColor: colors.margin }}
        />
        <View
          style={{ position: 'absolute', top: 0, bottom: 0, left: marginLeft + 4, width: 1, backgroundColor: colors.margin, opacity: 0.6 }}
        />
        {holes &&
          Array.from({ length: holeCount }, (_, i) => (
            <View
              key={`h${i}`}
              style={{
                position: 'absolute',
                left: 12,
                top: ((i + 0.5) * size.h) / holeCount - 8,
                width: 14,
                height: 14,
                borderRadius: 7,
                backgroundColor: '#EEF2F7',
                borderWidth: 1,
                borderColor: '#D5DEE9',
              }}
            />
          ))}
      </View>
      {children}
    </View>
  );
}

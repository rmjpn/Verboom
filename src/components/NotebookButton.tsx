import type { ReactNode } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, fonts } from '../theme/tokens';
import { Body } from './Typography';

type Variant = 'primary' | 'secondary' | 'success' | 'danger' | 'ghost';

const variants: Record<Variant, { bg: string; fg: string; border: string; shadow: string }> = {
  primary: { bg: colors.pen, fg: '#FFFFFF', border: '#1E3A8A', shadow: '#1E3A8A' },
  secondary: { bg: '#FFFFFF', fg: colors.graphite, border: colors.graphite, shadow: colors.graphite },
  success: { bg: colors.pencilInk, fg: '#FFFFFF', border: '#14532D', shadow: '#14532D' },
  danger: { bg: colors.correction, fg: '#FFFFFF', border: '#7F1D1D', shadow: '#7F1D1D' },
  ghost: { bg: 'transparent', fg: colors.pen, border: 'transparent', shadow: 'transparent' },
};

type Props = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  icon?: ReactNode;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  className?: string;
  size?: 'md' | 'lg';
};

/** Botão com cara de etiqueta recortada: borda grafite e "sombra" deslocada de papel. */
export function NotebookButton({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  accessibilityLabel,
  accessibilityHint,
  style,
  className,
  size = 'md',
}: Props) {
  const v = variants[variant];
  const ghost = variant === 'ghost';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled }}
      hitSlop={6}
      className={className}
      style={style}
    >
      {({ pressed }) => (
        <View
          style={{
            minHeight: size === 'lg' ? 56 : 48,
            paddingHorizontal: 12,
            borderRadius: 14,
            borderWidth: ghost ? 0 : 2,
            borderColor: v.border,
            backgroundColor: disabled ? '#E2E8F0' : v.bg,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            opacity: disabled ? 0.75 : 1,
            transform: [{ translateY: pressed && !disabled ? 2 : 0 }],
            boxShadow: ghost || disabled || pressed ? undefined : `0px 3px 0px ${v.shadow}`,
          }}
        >
          {icon}
          <Body
            weight="heavy"
            numberOfLines={1}
            style={{
              flexShrink: 1,
              color: disabled ? colors.inkSoft : v.fg,
              fontSize: size === 'lg' ? 18 : 15,
              fontFamily: fonts.bodyHeavy,
              letterSpacing: 0.2,
            }}
          >
            {label}
          </Body>
        </View>
      )}
    </Pressable>
  );
}

/** Fita adesiva translúcida para "colar" fichas na página. */
export function Tape({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          width: 86,
          height: 24,
          backgroundColor: colors.tape,
          borderWidth: 1,
          borderColor: 'rgba(148,163,184,0.35)',
          borderRadius: 2,
        },
        style,
      ]}
    />
  );
}

import { useEffect } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import type { BlockAnswer, SlotKind } from '../engine/morphemeParser';
import type { Challenge } from '../types/grammar';
import { hapticTap } from '../lib/haptics';
import { colors, fonts, morphemeColors } from '../theme/tokens';
import { ZERO } from './MorphemeChip';
import { Body, Hand } from './Typography';

export const SLOT_KINDS: SlotKind[] = ['VT', 'DMT', 'DNP'];

type Props = {
  challenge: Challenge;
  value: BlockAnswer;
  onChange: (next: BlockAnswer) => void;
  typed: string;
  onChangeTyped: (t: string) => void;
  wrongSlots: SlotKind[];
  /** Muda a cada tentativa errada para disparar o "tremido". */
  shakeKey: number;
  /** Erro no modo digitação. */
  typedWrong?: boolean;
  disabled?: boolean;
  onSubmitTyped?: () => void;
};

/** Slots sem opções vêm pré-preenchidos com o morfema correto (fixos). */
export function fixedSlots(challenge: Challenge): Partial<Record<SlotKind, string>> {
  const out: Partial<Record<SlotKind, string>> = {};
  for (const k of SLOT_KINDS) {
    const opts = challenge.options[k];
    if (!opts || opts.length === 0) out[k] = challenge.form.morphemes.find((m) => m.kind === k)?.text ?? '';
  }
  return out;
}

export function radicalOf(challenge: Challenge): string {
  return challenge.form.morphemes.find((m) => m.kind === 'RAD')?.text ?? '';
}

function useShake(trigger: number, active: boolean) {
  const x = useSharedValue(0);
  useEffect(() => {
    if (trigger > 0 && active) {
      x.value = withSequence(
        withTiming(-8, { duration: 50 }),
        withTiming(8, { duration: 60 }),
        withTiming(-6, { duration: 60 }),
        withTiming(6, { duration: 60 }),
        withTiming(0, { duration: 50 }),
      );
    }
  }, [trigger, active, x]);
  return useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
}

function Slot({
  kind,
  text,
  fixed,
  wrong,
  shakeKey,
  onClear,
  disabled,
}: {
  kind: SlotKind;
  text: string | undefined;
  fixed: boolean;
  wrong: boolean;
  shakeKey: number;
  onClear: () => void;
  disabled?: boolean;
}) {
  const t = morphemeColors[kind];
  const shake = useShake(shakeKey, wrong);
  const filled = text !== undefined;
  const border = wrong ? colors.correction : t.color;
  return (
    <Animated.View style={[{ alignItems: 'center', gap: 2 }, shake]}>
      <Pressable
        onPress={() => {
          if (!filled || fixed || disabled) return;
          hapticTap();
          onClear();
        }}
        disabled={!filled || fixed || disabled}
        accessibilityRole="button"
        accessibilityLabel={
          filled
            ? `${t.name}: ${text === '' ? 'desinência zero' : text}${fixed ? ', fixo' : ''}${wrong ? ', incorreto' : ''}. ${fixed ? '' : 'Toque para limpar.'}`
            : `${t.name}: vazio`
        }
        style={{
          minWidth: 58,
          height: 58,
          paddingHorizontal: 8,
          borderRadius: 10,
          borderWidth: 2.5,
          borderStyle: filled ? 'solid' : 'dashed',
          borderColor: border,
          backgroundColor: wrong ? '#FEE2E2' : filled ? t.tint : 'rgba(255,255,255,0.7)',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: fixed ? 0.8 : 1,
        }}
      >
        <Hand style={{ fontSize: 30, lineHeight: 36, color: wrong ? colors.correction : t.ink }}>
          {filled ? (text === '' ? ZERO : text) : ' '}
        </Hand>
        {wrong && (
          <View style={{ position: 'absolute', top: -9, right: -9, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.correction, alignItems: 'center', justifyContent: 'center' }}>
            <Body weight="heavy" style={{ color: '#FFFFFF', fontSize: 12, lineHeight: 14 }}>
              ✗
            </Body>
          </View>
        )}
      </Pressable>
      <Body weight="heavy" style={{ fontSize: 11, letterSpacing: 1, color: wrong ? colors.correction : t.ink }}>
        {t.short}
      </Body>
    </Animated.View>
  );
}

/**
 * Encaixe morfológico: RAD fixo na linha do caderno + slots VT / DMT / DNP.
 * Toque num bloco para preencher o slot correspondente; toque no slot para limpar.
 */
export function MorphemeSlots({
  challenge,
  value,
  onChange,
  typed,
  onChangeTyped,
  wrongSlots,
  shakeKey,
  typedWrong,
  disabled,
  onSubmitTyped,
}: Props) {
  const rad = radicalOf(challenge);
  const fixed = fixedSlots(challenge);
  const negative = challenge.tense === 'imp_neg';
  const radSize = rad.length > 9 ? 28 : rad.length > 6 ? 34 : 40;
  const typeShake = useShake(shakeKey, !!typedWrong);

  if (challenge.mode === 'type') {
    const whole = !challenge.form.segmentable || !rad;
    return (
      <View style={{ gap: 10 }}>
        <Body weight="semibold" style={{ fontSize: 14, color: colors.inkSoft }}>
          {whole ? 'Escreva a forma verbal completa:' : 'Escreva a terminação depois do radical:'}
        </Body>
        <Animated.View style={[{ flexDirection: 'row', alignItems: 'flex-end', flexWrap: 'wrap', gap: 4 }, typeShake]}>
          {negative && <Hand style={{ fontSize: 30, color: colors.inkSoft, marginRight: 6 }}>não</Hand>}
          {!whole && <Hand style={{ fontSize: radSize, color: colors.graphite }}>{rad}</Hand>}
          <TextInput
            value={typed}
            onChangeText={onChangeTyped}
            editable={!disabled}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            autoComplete="off"
            returnKeyType="done"
            onSubmitEditing={onSubmitTyped}
            placeholder={whole ? 'forma completa' : 'terminação'}
            placeholderTextColor="#64748B"
            accessibilityLabel={whole ? 'Forma verbal completa' : `Terminação depois de ${rad}`}
            style={{
              flexGrow: 1,
              flexBasis: 120,
              minWidth: 120,
              width: 120,
              minHeight: 52,
              fontFamily: fonts.hand,
              fontSize: 30,
              color: typedWrong ? colors.correction : colors.pen,
              borderBottomWidth: 2.5,
              borderBottomColor: typedWrong ? colors.correction : colors.pen,
              paddingHorizontal: 6,
              paddingVertical: 4,
              backgroundColor: typedWrong ? '#FEE2E2' : 'rgba(255,255,255,0.6)',
            }}
          />
        </Animated.View>
      </View>
    );
  }

  const setSlot = (k: SlotKind, text: string | undefined) => {
    const next = { ...value };
    if (text === undefined) delete next[k];
    else next[k] = text;
    onChange(next);
  };

  return (
    <View style={{ gap: 18 }}>
      {/* linha do caderno */}
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'flex-end',
          gap: 8,
          paddingBottom: 6,
          borderBottomWidth: 2,
          borderBottomColor: colors.rule,
        }}
      >
        {negative && <Hand style={{ fontSize: 28, color: colors.inkSoft, marginBottom: 22 }}>não</Hand>}
        <View style={{ alignItems: 'center', gap: 2 }} accessible accessibilityLabel={`Radical fixo: ${rad}`}>
          <Hand style={{ fontSize: radSize, lineHeight: radSize * 1.25, color: colors.graphite }}>{rad}</Hand>
          <Body weight="heavy" style={{ fontSize: 11, letterSpacing: 1, color: colors.graphite }}>
            RAD
          </Body>
        </View>
        {SLOT_KINDS.map((k) => (
          <Slot
            key={k}
            kind={k}
            text={fixed[k] !== undefined ? fixed[k] : value[k]}
            fixed={fixed[k] !== undefined}
            wrong={wrongSlots.includes(k)}
            shakeKey={shakeKey}
            onClear={() => setSlot(k, undefined)}
            disabled={disabled}
          />
        ))}
      </View>

      {/* bandeja de blocos */}
      {SLOT_KINDS.filter((k) => fixed[k] === undefined).map((k) => {
        const t = morphemeColors[k];
        const opts = challenge.options[k] ?? [];
        return (
          <View key={k} style={{ gap: 6 }}>
            <Body weight="bold" style={{ fontSize: 13, color: t.ink }}>
              {t.short} · {t.name}
            </Body>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {opts.map((o, i) => {
                const selected = value[k] === o;
                return (
                  <Pressable
                    key={`${o}-${i}`}
                    disabled={disabled}
                    onPress={() => {
                      hapticTap();
                      setSlot(k, selected ? undefined : o);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`Bloco ${t.short} ${o === '' ? 'desinência zero' : o}`}
                    style={({ pressed }) => ({
                      minWidth: 52,
                      minHeight: 46,
                      paddingHorizontal: 14,
                      borderRadius: 10,
                      borderWidth: selected ? 3 : 1.5,
                      borderColor: t.color,
                      backgroundColor: selected ? t.tint : '#FFFFFF',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transform: [{ translateY: pressed ? 1 : 0 }, { rotate: `${((i % 3) - 1) * 1.2}deg` }],
                      boxShadow: selected ? undefined : `0px 2px 0px ${t.color}`,
                    })}
                  >
                    <Hand style={{ fontSize: 26, lineHeight: 32, color: t.ink }}>{o === '' ? ZERO : o}</Hand>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
}

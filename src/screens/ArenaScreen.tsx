import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGame } from '../state/GameProvider';
import type { EncounterOutcome } from '../state/types';
import type { Challenge } from '../types/grammar';
import { checkAttempt, type BlockAnswer, type SlotKind } from '../engine/morphemeParser';
import { CaptureResultModal } from '../components/CaptureResultModal';
import { EscapeOverlay } from '../components/EscapeOverlay';
import { LivesIndicator } from '../components/LivesIndicator';
import { MeaningPopover } from '../components/MeaningPopover';
import { fixedSlots, MorphemeSlots, radicalOf, SLOT_KINDS } from '../components/MorphemeSlots';
import { NotebookBackground } from '../components/NotebookBackground';
import { NotebookButton } from '../components/NotebookButton';
import { RarityBadge } from '../components/RarityBadge';
import { Body, Hand } from '../components/Typography';
import { hapticError, hapticSuccess } from '../lib/haptics';
import { personLabel, tenseLabel } from '../lib/labels';
import { colors } from '../theme/tokens';

const MAX_LIVES = 3;
type Phase = 'loading' | 'empty' | 'playing' | 'captured' | 'escaped';

export function ArenaScreen() {
  const game = useGame();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [phase, setPhase] = useState<Phase>('loading');
  const [lives, setLives] = useState(MAX_LIVES);
  const [answer, setAnswer] = useState<BlockAnswer>({});
  const [typed, setTyped] = useState('');
  const [wrongSlots, setWrongSlots] = useState<SlotKind[]>([]);
  const [typedWrong, setTypedWrong] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [outcome, setOutcome] = useState<EncounterOutcome | null>(null);
  const [meaningOpen, setMeaningOpen] = useState(false);
  const [engineError, setEngineError] = useState<string | null>(null);

  // Garante uma única chamada a startEncounter (StrictMode monta efeitos 2x em dev).
  const startedRef = useRef(false);
  const finishedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current || !game.ready) return;
    startedRef.current = true;
    try {
      const c = game.startEncounter({ advanced: game.settings.advancedMode });
      // Inicialização única (guardada por ref) que depende do provider estar pronto.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setChallenge(c);
      setPhase(c ? 'playing' : 'empty');
    } catch (e) {
      setEngineError(e instanceof Error ? e.message : String(e));
      setPhase('empty');
    }
  }, [game]);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  if (phase === 'loading' || phase === 'empty' || !challenge) {
    return (
      <NotebookBackground>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingLeft: 56, paddingRight: 20 }}>
          {phase === 'loading' ? (
            <>
              <ActivityIndicator color={colors.pen} size="large" />
              <Hand style={{ fontSize: 24, color: colors.inkSoft }}>Preparando a arena…</Hand>
            </>
          ) : (
            <>
              <Hand style={{ fontSize: 28, color: colors.ink, textAlign: 'center' }}>Nenhum verbo na arena</Hand>
              <Body style={{ fontSize: 15, color: colors.inkSoft, textAlign: 'center' }}>
                {engineError || game.deck.length > 0
                  ? 'Não foi possível montar o desafio deste verbo agora. Tente de novo em instantes.'
                  : 'O baralho está vazio por enquanto.'}
              </Body>
              <NotebookButton label="Voltar à caça" onPress={goBack} />
            </>
          )}
        </View>
      </NotebookBackground>
    );
  }

  const fixed = fixedSlots(challenge);
  const needed = SLOT_KINDS.filter((k) => fixed[k] === undefined);
  const complete =
    challenge.mode === 'type' ? typed.trim().length > 0 : needed.every((k) => answer[k] !== undefined);
  const person = personLabel(challenge.tense, challenge.person);
  const playing = phase === 'playing';

  const submit = () => {
    if (!complete || !playing || finishedRef.current) return;
    let payload: BlockAnswer | string;
    if (challenge.mode === 'type') {
      const rad = radicalOf(challenge);
      const whole = !challenge.form.segmentable || !rad;
      payload = whole ? typed.trim() : rad + typed.trim();
    } else {
      payload = { ...answer, ...fixed };
    }
    let res;
    try {
      res = checkAttempt(challenge, payload);
    } catch {
      setHint('Não foi possível conferir agora. Tente novamente.');
      return;
    }
    if (res.correct) {
      finishedRef.current = true;
      hapticSuccess();
      setWrongSlots([]);
      setTypedWrong(false);
      setHint(null);
      setOutcome(game.finishEncounter(challenge, true));
      setPhase('captured');
      return;
    }
    hapticError();
    const left = lives - 1;
    setLives(left);
    setWrongSlots(res.wrongSlots);
    setTypedWrong(challenge.mode === 'type');
    setHint(res.hint ?? 'Algo não encaixou. Observe as posições marcadas em vermelho.');
    setShakeKey((k) => k + 1);
    if (left <= 0) {
      finishedRef.current = true;
      setTimeout(() => {
        game.finishEncounter(challenge, false);
        setPhase('escaped');
      }, 650);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <NotebookBackground>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              paddingTop: insets.top + 10,
              paddingBottom: insets.bottom + 28,
              paddingLeft: 56,
              paddingRight: 18,
              gap: 18,
            }}
          >
            {/* topo: fechar + vidas */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Pressable
                onPress={() => {
                  // Recuar no meio do encontro conta como "deixar passar": evita re-sortear o tempo verbal.
                  if (playing && !finishedRef.current) {
                    finishedRef.current = true;
                    game.skip();
                  }
                  goBack();
                }}
                accessibilityRole="button"
                accessibilityLabel="Recuar e voltar à caça"
                hitSlop={6}
                style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.graphite, backgroundColor: '#FFFFFF' }}
              >
                <MaterialCommunityIcons name="close" size={22} color={colors.graphite} />
              </Pressable>
              <LivesIndicator lives={lives} max={MAX_LIVES} />
            </View>

            {/* ficha do desafio */}
            <Animated.View entering={FadeInDown.duration(350)}>
            <View
              style={{ backgroundColor: '#FFFFFF', borderRadius: 6, padding: 16, gap: 8, boxShadow: '0px 6px 16px rgba(51,65,85,0.12)', transform: [{ rotate: '-0.6deg' }] }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <Pressable
                  onPress={() => setMeaningOpen(true)}
                  accessibilityRole="button"
                  accessibilityLabel={`${challenge.verb.infinitive}. Toque para ver o significado.`}
                  style={{ minHeight: 44, justifyContent: 'center', flexShrink: 1 }}
                >
                  <Hand style={{ fontSize: 36, lineHeight: 42, color: colors.ink }} numberOfLines={1}>
                    {challenge.verb.infinitive.toLocaleUpperCase('pt-BR')}
                  </Hand>
                </Pressable>
                <RarityBadge rarity={challenge.verb.rarity} size="sm" />
              </View>
              <View style={{ alignSelf: 'flex-start', backgroundColor: colors.highlighter, paddingHorizontal: 8, paddingVertical: 2, transform: [{ rotate: '-0.8deg' }] }}>
                <Body weight="heavy" style={{ fontSize: 16, color: colors.ink }} accessibilityRole="header">
                  {tenseLabel(challenge.tense)}
                </Body>
              </View>
              {person && (
                <Body weight="semibold" style={{ fontSize: 16, color: colors.pen }}>
                  {person}
                </Body>
              )}
              <Body style={{ fontSize: 13, color: colors.inkSoft }}>
                {challenge.mode === 'blocks'
                  ? 'Encaixe os blocos que completam a palavra.'
                  : 'Modo escrita: complete a forma verbal.'}
              </Body>
            </View>
            </Animated.View>

            <MorphemeSlots
              challenge={challenge}
              value={answer}
              onChange={(next) => {
                setAnswer(next);
                setWrongSlots((w) => w.filter((k) => next[k] === answer[k]));
              }}
              typed={typed}
              onChangeTyped={(t) => {
                setTyped(t);
                setTypedWrong(false);
              }}
              wrongSlots={wrongSlots}
              shakeKey={shakeKey}
              typedWrong={typedWrong}
              disabled={!playing}
              onSubmitTyped={submit}
            />

            {hint && playing && (
              <Animated.View
                entering={FadeIn}
                accessibilityLiveRegion="polite"
                style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start', padding: 12, borderRadius: 8, borderWidth: 1.5, borderColor: colors.correction, backgroundColor: '#FEF2F2' }}
              >
                <MaterialCommunityIcons name="pencil" size={18} color={colors.correction} style={{ marginTop: 2 }} />
                <Body weight="semibold" style={{ flex: 1, fontSize: 15, lineHeight: 21, color: '#991B1B' }}>
                  {hint}
                </Body>
              </Animated.View>
            )}

            <NotebookButton
              label={lives < MAX_LIVES ? `Conferir (${lives} ${lives === 1 ? 'chance' : 'chances'})` : 'Conferir'}
              size="lg"
              variant="success"
              onPress={submit}
              disabled={!complete || !playing}
              accessibilityHint="Confere se os morfemas estão nas posições certas"
              icon={<MaterialCommunityIcons name="check-bold" size={22} color={complete && playing ? '#FFFFFF' : colors.inkSoft} />}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </NotebookBackground>

      {phase === 'captured' && (
        <CaptureResultModal challenge={challenge} outcome={outcome} autoSpeak={game.settings.autoSpeak} onContinue={goBack} />
      )}
      {phase === 'escaped' && <EscapeOverlay challenge={challenge} onDone={goBack} />}
      <MeaningPopover verb={challenge.verb} visible={meaningOpen} onClose={() => setMeaningOpen(false)} />
    </View>
  );
}

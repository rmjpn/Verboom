import { useCallback, useState } from 'react';
import { ActivityIndicator, useWindowDimensions, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGame } from '../state/GameProvider';
import { CARD_HEIGHT, VerbSwipeCard } from '../components/VerbSwipeCard';
import { NotebookBackground } from '../components/NotebookBackground';
import { XpBar } from '../components/XpBar';
import { Body, Hand } from '../components/Typography';
import { colors } from '../theme/tokens';

function StackShadowCard({ offset, rotate, width }: { offset: number; rotate: number; width: number }) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: offset,
        width,
        alignSelf: 'center',
        height: CARD_HEIGHT,
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        transform: [{ rotate: `${rotate}deg` }],
        boxShadow: '0px 4px 10px rgba(51,65,85,0.10)',
      }}
    />
  );
}

export function HuntScreen() {
  const game = useGame();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();
  const cardW = Math.min(screenW - 56, 340);
  // remonta a ficha ao voltar da Arena (ela saiu voando para a direita)
  const [nonce, setNonce] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setNonce((n) => n + 1);
    }, []),
  );

  const top = game.deck[0];
  const verb = top ? game.getVerb(top.verbId) : undefined;
  const capturedCount = Object.values(game.records).filter((r) => r.status === 'capturado').length;
  const reviewsInDeck = game.deck.filter((d) => d.kind === 'revisao').length;

  return (
    <NotebookBackground>
      <View style={{ flex: 1, paddingTop: insets.top + 12, paddingLeft: 56, paddingRight: 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Hand style={{ fontSize: 40, color: colors.pen, lineHeight: 46 }} accessibilityRole="header">
            Verboom
          </Hand>
          <View
            accessible
            accessibilityLabel={`${capturedCount} verbos capturados`}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.postit, paddingHorizontal: 10, paddingVertical: 4, transform: [{ rotate: '2deg' }], boxShadow: '1px 2px 4px rgba(51,65,85,0.18)' }}
          >
            <MaterialCommunityIcons name="bookmark-check" size={16} color={colors.pencilInk} />
            <Body weight="heavy" style={{ fontSize: 14, color: colors.ink }}>
              {capturedCount}
            </Body>
          </View>
        </View>
        <Body style={{ fontSize: 15, color: colors.inkSoft, marginTop: -2 }}>Caça aos verbos</Body>
        <View style={{ marginTop: 12 }}>
          <XpBar xp={game.player.xp} level={game.player.level} compact />
        </View>
      </View>

      <View style={{ flex: 4, alignItems: 'center', justifyContent: 'center', paddingBottom: 16 }}>
        {!game.ready ? (
          <View style={{ alignItems: 'center', gap: 10 }}>
            <ActivityIndicator color={colors.pen} size="large" />
            <Hand style={{ fontSize: 22, color: colors.inkSoft }}>Apontando os lápis…</Hand>
          </View>
        ) : !top || !verb ? (
          <View style={{ alignItems: 'center', gap: 8, paddingHorizontal: 40 }}>
            <MaterialCommunityIcons name="leaf" size={48} color={colors.pencilInk} />
            <Hand style={{ fontSize: 28, color: colors.ink, textAlign: 'center' }}>Floresta silenciosa…</Hand>
            <Body style={{ fontSize: 15, color: colors.inkSoft, textAlign: 'center' }}>
              Nenhum verbo à vista agora. Volte daqui a pouco para novas revisões.
            </Body>
          </View>
        ) : (
          <View style={{ width: '100%', alignItems: 'center' }}>
            <View style={{ width: '100%', height: CARD_HEIGHT, position: 'absolute', top: 0 }}>
              {game.deck.length > 2 && <StackShadowCard offset={10} rotate={4} width={cardW} />}
              {game.deck.length > 1 && <StackShadowCard offset={5} rotate={-3} width={cardW} />}
            </View>
            <VerbSwipeCard
              key={`${top.verbId}-${nonce}`}
              verb={verb}
              isReview={top.kind === 'revisao'}
              onSwipeLeft={() => {
                game.skip();
                setNonce((n) => n + 1);
              }}
              onSwipeRight={() => router.push('/arena')}
            />
          </View>
        )}
      </View>

      {game.ready && reviewsInDeck > 0 && (
        <Body style={{ textAlign: 'center', fontSize: 13, color: colors.inkSoft, paddingBottom: 10 }}>
          {reviewsInDeck === 1 ? '1 revisão no baralho' : `${reviewsInDeck} revisões no baralho`}
        </Body>
      )}
    </NotebookBackground>
  );
}

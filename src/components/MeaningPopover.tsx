import { Modal, Pressable, ScrollView, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { VerbEntry } from '../types/grammar';
import { speakPtBR } from '../lib/speech';
import { colors } from '../theme/tokens';
import { Tape } from './NotebookButton';
import { RarityBadge } from './RarityBadge';
import { Body, Hand } from './Typography';

type Props = {
  verb: VerbEntry | null | undefined;
  visible: boolean;
  onClose: () => void;
};

/** Post-it amarelo com o significado do verbo (PRD §3.1 — "Significado Rápido"). */
export function MeaningPopover({ verb, visible, onClose }: Props) {
  return (
    <Modal visible={visible && !!verb} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Fechar significado"
        style={{ flex: 1, backgroundColor: 'rgba(30,41,59,0.35)', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      >
        {verb && (
          <Animated.View entering={ZoomIn.springify().damping(14)} style={{ width: '100%', maxWidth: 380 }}>
            <Pressable
              onPress={() => undefined}
              accessibilityViewIsModal
              accessible={false}
              style={{
                backgroundColor: colors.postit,
                padding: 22,
                paddingTop: 28,
                borderRadius: 4,
                transform: [{ rotate: '-1.5deg' }],
                boxShadow: '2px 8px 18px rgba(51,65,85,0.28)',
                maxHeight: 560,
              }}
            >
              <Tape style={{ top: -12, alignSelf: 'center', left: '38%', transform: [{ rotate: '3deg' }] }} />
              <ScrollView contentContainerStyle={{ gap: 10 }} showsVerticalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <Hand style={{ fontSize: 34, color: colors.ink }} accessibilityRole="header">
                    {verb.infinitive}
                  </Hand>
                  <Pressable
                    onPress={() => speakPtBR(verb.infinitive)}
                    accessibilityRole="button"
                    accessibilityLabel={`Ouvir a pronúncia de ${verb.infinitive}`}
                    hitSlop={8}
                    style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.graphite }}
                  >
                    <MaterialCommunityIcons name="volume-high" size={22} color={colors.graphite} />
                  </Pressable>
                </View>
                <RarityBadge rarity={verb.rarity} size="sm" />
                <Body style={{ fontSize: 17, lineHeight: 25, color: colors.ink }}>{verb.definition}</Body>
                <View style={{ gap: 2 }}>
                  <Body weight="heavy" style={{ fontSize: 12, letterSpacing: 1, color: colors.inkSoft }}>
                    TRANSITIVIDADE
                  </Body>
                  <Body weight="semibold" style={{ fontSize: 15, color: colors.ink }}>
                    {verb.transitivity}
                  </Body>
                </View>
                {verb.synonyms.length > 0 && (
                  <View style={{ gap: 6 }}>
                    <Body weight="heavy" style={{ fontSize: 12, letterSpacing: 1, color: colors.inkSoft }}>
                      SINÔNIMOS
                    </Body>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {verb.synonyms.map((s) => (
                        <View
                          key={s}
                          style={{ paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, borderWidth: 1.5, borderColor: colors.graphite, backgroundColor: 'rgba(255,255,255,0.55)' }}
                        >
                          <Body weight="semibold" style={{ fontSize: 14, color: colors.ink }}>
                            {s}
                          </Body>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </ScrollView>
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Fechar post-it"
                style={{ alignSelf: 'flex-end', marginTop: 12, minHeight: 44, minWidth: 44, paddingHorizontal: 12, justifyContent: 'center' }}
              >
                <Hand style={{ fontSize: 20, color: colors.pen }}>fechar ✕</Hand>
              </Pressable>
            </Pressable>
          </Animated.View>
        )}
      </Pressable>
    </Modal>
  );
}

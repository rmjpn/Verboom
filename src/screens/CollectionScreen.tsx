import { useMemo, useState } from 'react';
import { FlatList, Pressable, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGame } from '../state/GameProvider';
import type { CaptureRecord, Rarity, VerbEntry } from '../types/grammar';
import { MeaningPopover } from '../components/MeaningPopover';
import { NotebookBackground } from '../components/NotebookBackground';
import { NotebookButton } from '../components/NotebookButton';
import { RarityBadge } from '../components/RarityBadge';
import { Body, Hand } from '../components/Typography';
import { fold } from '../lib/labels';
import { colors, fonts, RARITY_ORDER, rarityTokens } from '../theme/tokens';

type Filter = 'todos' | Rarity | 'capturado' | 'arisco';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'capturado', label: 'Capturados' },
  { id: 'arisco', label: 'Precisa de revisão' },
  ...RARITY_ORDER.map((r) => ({ id: r as Filter, label: rarityTokens[r].label })),
];

type Row = { verb: VerbEntry; record: CaptureRecord };

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`Filtro ${label}`}
      style={{
        minHeight: 44,
        justifyContent: 'center',
        paddingHorizontal: 14,
        borderRadius: 999,
        borderWidth: 1.5,
        borderColor: active ? colors.pen : colors.graphite,
        backgroundColor: active ? colors.pen : '#FFFFFF',
      }}
    >
      <Body weight="bold" style={{ fontSize: 14, color: active ? '#FFFFFF' : colors.graphite }}>
        {label}
      </Body>
    </Pressable>
  );
}

function RarityProgress({ rarity, have, total }: { rarity: Rarity; have: number; total: number }) {
  const t = rarityTokens[rarity];
  const ratio = total > 0 ? have / total : 0;
  return (
    <View style={{ flex: 1, gap: 3 }} accessible accessibilityLabel={`${t.label}: ${have} de ${total}`}>
      <Body weight="bold" style={{ fontSize: 12, color: t.color }} numberOfLines={1}>
        {t.label}
      </Body>
      <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.rule, overflow: 'hidden' }}>
        <View style={{ width: `${ratio * 100}%`, height: '100%', backgroundColor: t.color }} />
      </View>
      <Body style={{ fontSize: 11, color: colors.inkSoft }}>
        {have}/{total}
      </Body>
    </View>
  );
}

export function CollectionScreen() {
  const game = useGame();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('todos');
  const [selected, setSelected] = useState<VerbEntry | null>(null);

  const rows: Row[] = useMemo(() => {
    const out: Row[] = [];
    for (const rec of Object.values(game.records)) {
      const verb = game.getVerb(rec.verbId);
      if (verb) out.push({ verb, record: rec });
    }
    return out.sort((a, b) => a.verb.infinitive.localeCompare(b.verb.infinitive, 'pt-BR'));
  }, [game]);

  const perRarity = useMemo(() => {
    const total: Record<Rarity, number> = { comum: 0, incomum: 0, raro: 0, lendario: 0 };
    const have: Record<Rarity, number> = { comum: 0, incomum: 0, raro: 0, lendario: 0 };
    for (const v of game.lexicon) total[v.rarity] += 1;
    for (const r of rows) have[r.verb.rarity] += 1;
    return { total, have };
  }, [game.lexicon, rows]);

  const filtered = useMemo(() => {
    const q = fold(query.trim());
    return rows.filter(({ verb, record }) => {
      if (q && !fold(verb.infinitive).includes(q) && !fold(verb.definition).includes(q)) return false;
      if (filter === 'todos') return true;
      if (filter === 'capturado' || filter === 'arisco') return record.status === filter;
      return verb.rarity === filter;
    });
  }, [rows, query, filter]);

  const total = game.lexicon.length;

  const header = (
    <View style={{ gap: 14, paddingBottom: 8 }}>
      <View>
        <Hand style={{ fontSize: 40, lineHeight: 46, color: colors.pen }} accessibilityRole="header">
          Coleção
        </Hand>
        <Body weight="semibold" style={{ fontSize: 15, color: colors.inkSoft }}>
          {rows.length} de {total} verbos
        </Body>
      </View>
      <View style={{ flexDirection: 'row', gap: 8, backgroundColor: '#FFFFFF', padding: 12, borderRadius: 8, boxShadow: '0px 3px 10px rgba(51,65,85,0.10)' }}>
        {RARITY_ORDER.map((r) => (
          <RarityProgress key={r} rarity={r} have={perRarity.have[r]} total={perRarity.total[r]} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 2, borderBottomColor: colors.pen, paddingBottom: 2 }}>
        <MaterialCommunityIcons name="magnify" size={22} color={colors.pen} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar verbo ou significado"
          placeholderTextColor="#64748B"
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Buscar na coleção"
          style={{ flex: 1, minHeight: 44, fontFamily: fonts.hand, fontSize: 22, color: colors.ink }}
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery('')} accessibilityRole="button" accessibilityLabel="Limpar busca" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
            <MaterialCommunityIcons name="close-circle" size={20} color={colors.inkSoft} />
          </Pressable>
        )}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {FILTERS.map((f) => (
          <Chip key={f.id} label={f.label} active={filter === f.id} onPress={() => setFilter(f.id)} />
        ))}
      </View>
    </View>
  );

  return (
    <NotebookBackground>
      <FlatList
        data={filtered}
        keyExtractor={(r) => r.verb.id}
        ListHeaderComponent={header}
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 32, paddingLeft: 56, paddingRight: 18, gap: 10 }}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={{ alignItems: 'center', gap: 10, paddingVertical: 32 }}>
            <MaterialCommunityIcons name="notebook-outline" size={44} color={colors.inkSoft} />
            <Hand style={{ fontSize: 26, color: colors.ink, textAlign: 'center' }}>
              {rows.length === 0 ? 'Sua coleção está em branco' : 'Nada encontrado'}
            </Hand>
            <Body style={{ fontSize: 15, color: colors.inkSoft, textAlign: 'center' }}>
              {rows.length === 0 ? 'Capture seu primeiro verbo na aba Caçar.' : 'Tente outra busca ou outro filtro.'}
            </Body>
            {rows.length === 0 && <NotebookButton label="Ir caçar" onPress={() => router.navigate('/')} />}
          </View>
        }
        renderItem={({ item, index }) => {
          const arisco = item.record.status === 'arisco';
          return (
            <Pressable
              onPress={() => setSelected(item.verb)}
              accessibilityRole="button"
              accessibilityLabel={`${item.verb.infinitive}, ${rarityTokens[item.verb.rarity].label}${arisco ? ', precisa de revisão' : ', capturado'}. Toque para ver o significado.`}
              style={({ pressed }) => ({
                backgroundColor: '#FFFFFF',
                borderRadius: 6,
                paddingVertical: 10,
                paddingHorizontal: 14,
                gap: 4,
                borderLeftWidth: 4,
                borderLeftColor: arisco ? colors.correction : rarityTokens[item.verb.rarity].color,
                boxShadow: '0px 2px 6px rgba(51,65,85,0.10)',
                transform: [{ rotate: `${index % 2 === 0 ? -0.4 : 0.4}deg` }, { scale: pressed ? 0.98 : 1 }],
              })}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <Hand style={{ fontSize: 26, lineHeight: 30, color: colors.ink, flexShrink: 1 }} numberOfLines={1}>
                  {item.verb.infinitive}
                </Hand>
                <RarityBadge rarity={item.verb.rarity} size="sm" />
              </View>
              <Body style={{ fontSize: 14, color: colors.inkSoft }} numberOfLines={2}>
                {item.verb.definition}
              </Body>
              {arisco && (
                <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2, borderWidth: 1.5, borderColor: colors.correction, borderRadius: 4, paddingHorizontal: 6, transform: [{ rotate: '-2deg' }] }}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={14} color={colors.correction} />
                  <Body weight="heavy" style={{ fontSize: 12, color: colors.correction }}>
                    Arisco · Precisa de revisão
                  </Body>
                </View>
              )}
            </Pressable>
          );
        }}
      />
      <MeaningPopover verb={selected} visible={!!selected} onClose={() => setSelected(null)} />
    </NotebookBackground>
  );
}

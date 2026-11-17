import { useState } from 'react';
import { ScrollView, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGame } from '../state/GameProvider';
import { NotebookBackground } from '../components/NotebookBackground';
import { NotebookButton, Tape } from '../components/NotebookButton';
import { XpBar } from '../components/XpBar';
import { Body, Hand } from '../components/Typography';
import { colors } from '../theme/tokens';

function Stat({ icon, value, label, color }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; value: number; label: string; color: string }) {
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}`}
      style={{ flexBasis: '46%', flexGrow: 1, backgroundColor: '#FFFFFF', borderRadius: 6, padding: 12, gap: 2, borderTopWidth: 4, borderTopColor: color, boxShadow: '0px 2px 8px rgba(51,65,85,0.10)' }}
    >
      <MaterialCommunityIcons name={icon} size={20} color={color} />
      <Hand style={{ fontSize: 34, lineHeight: 38, color: colors.ink }}>{value}</Hand>
      <Body weight="bold" style={{ fontSize: 13, color: colors.inkSoft }}>
        {label}
      </Body>
    </View>
  );
}

function SettingRow({ title, desc, value, onChange }: { title: string; desc: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56 }}>
      <View style={{ flex: 1 }}>
        <Body weight="bold" style={{ fontSize: 16, color: colors.ink }}>
          {title}
        </Body>
        <Body style={{ fontSize: 13, color: colors.inkSoft }}>{desc}</Body>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={title}
        trackColor={{ false: '#CBD5E1', true: colors.pen }}
        thumbColor="#FFFFFF"
        {...({ activeThumbColor: '#FFFFFF' } as object)}
      />
    </View>
  );
}

export function ProfileScreen() {
  const game = useGame();
  const insets = useSafeAreaInsets();
  const [confirming, setConfirming] = useState(false);
  const [resetting, setResetting] = useState(false);

  const recs = Object.values(game.records);
  const captured = recs.filter((r) => r.status === 'capturado').length;
  const ariscos = recs.filter((r) => r.status === 'arisco').length;

  const doReset = async () => {
    setResetting(true);
    try {
      await game.resetProgress();
    } finally {
      setResetting(false);
      setConfirming(false);
    }
  };

  return (
    <NotebookBackground>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 40, paddingLeft: 56, paddingRight: 18, gap: 18 }}>
        <View>
          <Hand style={{ fontSize: 40, lineHeight: 46, color: colors.pen }} accessibilityRole="header">
            Meu caderno
          </Hand>
          <Body style={{ fontSize: 15, color: colors.inkSoft }}>Seu progresso de caçador de verbos</Body>
        </View>

        {/* capa do caderno */}
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 8, padding: 16, gap: 10, boxShadow: '0px 6px 16px rgba(51,65,85,0.12)' }}>
          <Tape style={{ top: -12, left: 20, transform: [{ rotate: '-5deg' }] }} />
          <XpBar xp={game.player.xp} level={game.player.level} />
          <Body style={{ fontSize: 13, color: colors.inkSoft }}>
            Capture verbos e mantenha as revisões em dia para evoluir do Caderno de Caligrafia ao Grimório do Léxico.
          </Body>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <Stat icon="bookmark-check" value={captured} label="Capturados" color={colors.pencilInk} />
          <Stat icon="alert-circle-outline" value={ariscos} label="Ariscos" color={colors.sharpenerInk} />
          <Stat icon="run-fast" value={game.player.escapes} label="Fugas" color={colors.correction} />
          <Stat icon="star-four-points" value={game.player.xp} label="XP total" color={colors.gel} />
        </View>

        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8, boxShadow: '0px 2px 8px rgba(51,65,85,0.10)' }}>
          <Hand style={{ fontSize: 24, color: colors.pen, marginTop: 4 }} accessibilityRole="header">
            Preferências
          </Hand>
          <SettingRow
            title="Modo avançado"
            desc="Digitar as terminações em vez de encaixar blocos."
            value={game.settings.advancedMode}
            onChange={(v) => game.setSettings({ advancedMode: v })}
          />
          <View style={{ height: 1, backgroundColor: colors.rule }} />
          <SettingRow
            title="Pronúncia automática"
            desc="Ouvir a forma conjugada logo após a captura."
            value={game.settings.autoSpeak}
            onChange={(v) => game.setSettings({ autoSpeak: v })}
          />
        </View>

        <View style={{ gap: 10 }}>
          {!confirming ? (
            <NotebookButton
              label="Apagar progresso"
              variant="secondary"
              onPress={() => setConfirming(true)}
              icon={<MaterialCommunityIcons name="eraser" size={20} color={colors.graphite} />}
            />
          ) : (
            <View
              accessibilityLiveRegion="polite"
              style={{ borderWidth: 2, borderColor: colors.correction, borderRadius: 8, padding: 14, gap: 10, backgroundColor: '#FEF2F2' }}
            >
              <Body weight="heavy" style={{ fontSize: 16, color: '#991B1B' }}>
                Tem certeza?
              </Body>
              <Body style={{ fontSize: 14, color: '#7F1D1D' }}>
                Isso apaga todas as capturas, o XP e as estatísticas. Não dá para desfazer.
              </Body>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <NotebookButton label="Cancelar" variant="secondary" onPress={() => setConfirming(false)} style={{ flex: 1 }} />
                <NotebookButton
                  label={resetting ? 'Apagando…' : 'Sim, apagar'}
                  variant="danger"
                  onPress={doReset}
                  disabled={resetting}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </NotebookBackground>
  );
}

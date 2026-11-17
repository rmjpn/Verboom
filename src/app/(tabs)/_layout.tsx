import { Tabs } from 'expo-router/js-tabs';
import type { ColorValue } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fonts } from '../../theme/tokens';

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

function icon(name: IconName, focusedName: IconName) {
  function TabIcon({ color, focused, size }: { color: ColorValue; focused: boolean; size: number }) {
    return (
      <MaterialCommunityIcons name={focused ? focusedName : name} size={size} color={typeof color === 'string' ? color : colors.inkSoft} />
    );
  }
  return TabIcon;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.pen,
        tabBarInactiveTintColor: colors.inkSoft,
        tabBarStyle: {
          backgroundColor: colors.paper,
          borderTopColor: colors.margin,
          borderTopWidth: 2,
          minHeight: 64,
        },
        tabBarLabelStyle: { fontFamily: fonts.hand, fontSize: 17 },
        sceneStyle: { backgroundColor: colors.paper },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Caçar', tabBarAccessibilityLabel: 'Caçar verbos', tabBarIcon: icon('cards-outline', 'cards') }}
      />
      <Tabs.Screen
        name="colecao"
        options={{ title: 'Coleção', tabBarAccessibilityLabel: 'Coleção de verbos', tabBarIcon: icon('bookshelf', 'bookshelf') }}
      />
      <Tabs.Screen
        name="caderno"
        options={{ title: 'Caderno', tabBarAccessibilityLabel: 'Meu caderno', tabBarIcon: icon('notebook-outline', 'notebook') }}
      />
    </Tabs>
  );
}

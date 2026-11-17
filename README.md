# Verboom

Caça, treino morfológico e coleção de verbos da língua portuguesa — um app gamificado com estética de **caderno escolar**, mecânica de **cartões deslizáveis** e **captura por morfemas** (RAD + VT + DMT + DNP).

Plataformas: **Android (APK)**, iOS e **Web** — um único código em Expo + React Native.

> Especificação completa: [`docs/PRD-VerboDex.pdf`](docs/PRD-VerboDex.pdf)

## Como funciona

1. **Caçar** — o baralho mostra só o infinitivo (ex.: `CANTAR`). Arraste para a direita para encarar, para a esquerda para deixar passar, toque para ver o significado.
2. **Arena** — o app sorteia modo, tempo e pessoa. Com o radical fixo na linha do caderno, encaixe a **vogal temática**, a **desinência modo-temporal** e a **desinência número-pessoal**. Você tem **3 borrachas**: no terceiro erro, o verbo foge.
3. **Captura** — carimbo "CAPTURADO ✓", pronúncia em voz alta (pt-BR, 1.0x / 0.7x), frases com marca-texto e dissecação colorida dos morfemas.
4. **Revisão espaçada** — 70% verbos novos, 30% revisões (1, 3, 7, 15 e 30 dias). Errou 3 vezes numa revisão? O verbo fica **arisco** até ser reconquistado.
5. **Evolução** — Caderno de Caligrafia → Brochura → Universitário → Grimório do Léxico.

## Stack

| Camada | Tecnologia |
|---|---|
| App | Expo SDK 58, React Native 0.88, TypeScript, Expo Router |
| Estilo | NativeWind 4 (Tailwind) com tokens do caderno |
| Gestos/animação | react-native-gesture-handler + Reanimated 4 |
| Voz | expo-speech (pt-BR) |
| Progresso | expo-sqlite (nativo) · localStorage (web) |
| Léxico | JSON curado em `src/data/` + motor de paradigmas em `src/engine/` |
| APK | EAS Build (`preview` / `production` com `buildType: apk`) |

## Rodando

```bash
npm install
npm start            # Expo Dev Server (a = Android, w = web)
npm test             # testes do motor morfológico, SRS e léxico
npm run typecheck
npm run export:web   # site estático em dist/
```

### Gerar o APK

```bash
npx eas-cli@latest login
npx eas-cli@latest build --platform android --profile preview
```

## Estrutura

```
src/
├── app/          # rotas (Expo Router): (tabs)/ caçar · coleção · caderno, arena
├── screens/      # HuntScreen, ArenaScreen, CollectionScreen, ProfileScreen
├── components/   # NotebookBackground, VerbSwipeCard, MorphemeSlots, CaptureResultModal…
├── engine/       # conjugator, morphemeParser, spacedRepetition (TS puro + testes)
├── data/         # léxico curado (verbs.level1-4.json)
├── storage/      # progressRepo (SQLite) / progressRepo.web (localStorage)
├── state/        # GameProvider + useGame()
├── lib/          # speech (TTS)
└── theme/        # tokens do caderno
```

## Roadmap

- [x] Fase 2 — Motor gramatical, SRS e base offline (léxico semente)
- [x] Fase 3 — Telas mobile/web, gestos, TTS e significado ao toque
- [ ] Fase 1 — Refinar o visual com protótipos do Google Stitch
- [ ] Expandir o léxico para ~11.000 verbos a partir de uma fonte com licença compatível
- [ ] Fase 4 — Build do APK via EAS e validação em dispositivos

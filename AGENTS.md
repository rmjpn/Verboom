This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

---

# Verboom — convenções do projeto

App gamificado de conjugação verbal do português (PRD em `docs/PRD-VerboDex.pdf`). Alvos: Android APK (EAS), iOS e Web (Expo Router + react-native-web). Toda a interface em **português do Brasil**.

## Arquitetura e donos de módulo

| Pasta | Conteúdo | Regras |
|---|---|---|
| `src/types/grammar.ts` | Contrato central de tipos | Mudanças precisam ser coordenadas |
| `src/engine/` | Motor puro TS: `conjugator`, `morphemeParser`, `spacedRepetition` | **Sem imports de React/React Native/Expo.** Testes com `node:test` (`*.test.ts`) |
| `src/data/` | Léxico curado (`verbs.json` + `lexicon.ts`) | Definições e frases **originais** (nunca copiar dicionários protegidos) |
| `src/storage/` | Persistência de progresso: `progressRepo.ts` (SQLite nativo) e `progressRepo.web.ts` (localStorage) | Mesma interface nas duas plataformas |
| `src/state/` | `GameProvider` + `useGame()` (contrato em `state/types.ts`) | |
| `src/components/`, `src/screens/`, `src/app/` | UI (NativeWind) — rotas em `src/app/` | Telas grandes ficam em `src/screens/`, rotas só as importam |

## Design system "caderno escolar" (PRD §1 e §5)

Tokens em `tailwind.config.js` e `src/theme/tokens.ts`: papel `#FDFCF8`, pauta `#DCE8F5`, margem `#F4B8B8`, grafite `#334155` (RAD), lápis verde `#16A34A` (VT), caneta azul `#1D4ED8` (TEM), apontador laranja `#EA580C` (DMT), caneta gel roxa `#7C3AED` (DNP), correção `#DC2626`, marca-texto `#FDE047`.

## Comandos

```bash
npm test             # testes do motor (node:test + tsx)
npm run typecheck    # tsc --noEmit
npm run export:web   # build web estático em dist/
```

Nesta sandbox `api.expo.dev` está bloqueado: use `EXPO_OFFLINE=1` antes de `npx expo ...`.

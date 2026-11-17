// OWNER: agente srs-state. Estado global do jogo (contrato em ./types.ts). Sem UI.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { LEXICON } from '../data/lexicon';
import { buildChallenge } from '../engine/morphemeParser';
import { progressRepo } from '../storage/progressRepo';
import { DEFAULT_SETTINGS, defaultPlayer, type GameSettings, type ProgressRepo } from '../storage/types';
import type { CaptureRecord, Challenge, VerbEntry } from '../types/grammar';
import { applyEncounter, applySkip, refillDeck, type CoreState } from './gameLogic';
import type { EncounterOutcome, GameContextValue } from './types';

const now = () => Date.now();

const GameContext = createContext<GameContextValue | null>(null);

function initialCore(): CoreState {
  return { player: defaultPlayer(), records: {}, deck: [] };
}

export interface GameProviderProps {
  children: ReactNode;
  /** Injeção opcional (testes/storybook). Padrão: repositório da plataforma. */
  repo?: ProgressRepo;
  /** Injeção opcional do léxico. Padrão: LEXICON de src/data. */
  lexicon?: VerbEntry[];
}

export function GameProvider({ children, repo = progressRepo, lexicon = LEXICON }: GameProviderProps) {
  const [ready, setReady] = useState(false);
  const [core, setCore] = useState<CoreState>(initialCore);
  const [settings, setSettingsState] = useState<GameSettings>(DEFAULT_SETTINGS);

  // Espelho síncrono do estado: permite chamadas encadeadas no mesmo tick sem closures obsoletas.
  const coreRef = useRef(core);
  const settingsRef = useRef(settings);
  const lexiconRef = useRef(lexicon);
  useEffect(() => {
    lexiconRef.current = lexicon;
  }, [lexicon]);

  const verbMap = useMemo(() => new Map(lexicon.map((v) => [v.id, v])), [lexicon]);

  // Fila de gravação: preserva a ordem das escritas e nunca rejeita.
  const writeQueue = useRef<Promise<void>>(Promise.resolve());
  const persist = useCallback(
    (task: () => Promise<void>) => {
      writeQueue.current = writeQueue.current
        .then(task)
        .catch((e) => console.warn('[verboom] Falha ao salvar progresso.', e));
    },
    [],
  );

  const commit = useCallback((next: CoreState) => {
    const filled = refillDeck(next, lexiconRef.current, now());
    coreRef.current = filled;
    setCore(filled);
    return filled;
  }, []);

  // Carrega o progresso salvo.
  useEffect(() => {
    let alive = true;
    repo
      .load()
      .catch((e) => {
        console.warn('[verboom] Falha ao carregar progresso; iniciando do zero.', e);
        return null;
      })
      .then((snap) => {
        if (!alive) return;
        const s = snap?.settings ? { ...DEFAULT_SETTINGS, ...snap.settings } : DEFAULT_SETTINGS;
        settingsRef.current = s;
        setSettingsState(s);
        commit({
          player: snap?.player ?? defaultPlayer(),
          records: snap?.records ?? {},
          deck: [],
        });
        setReady(true);
      });
    return () => {
      alive = false;
    };
  }, [repo, commit]);

  // Se o léxico mudar (ex.: hot reload / carregamento tardio), remove itens órfãos e reabastece.
  useEffect(() => {
    if (!ready) return;
    const c = coreRef.current;
    const deck = c.deck.filter((d) => verbMap.has(d.verbId));
    commit(deck.length === c.deck.length ? c : { ...c, deck });
  }, [ready, verbMap, commit]);

  const getVerb = useCallback((id: string) => verbMap.get(id), [verbMap]);

  const skip = useCallback(() => {
    const c = coreRef.current;
    if (c.deck.length === 0) return;
    const next = commit(applySkip(c));
    persist(() => repo.savePlayer(next.player));
  }, [commit, persist, repo]);

  const startEncounter = useCallback(
    (opts?: { advanced?: boolean }): Challenge | null => {
      const top = coreRef.current.deck[0];
      if (!top) return null;
      const verb = verbMap.get(top.verbId);
      if (!verb) return null;
      const advanced = opts?.advanced ?? settingsRef.current.advancedMode;
      try {
        return buildChallenge(verb, coreRef.current.player.level, { advanced });
      } catch (e) {
        console.error(`[verboom] buildChallenge falhou para "${verb.id}".`, e);
        return null;
      }
    },
    [verbMap],
  );

  const finishEncounter = useCallback(
    (challenge: Challenge, success: boolean): EncounterOutcome => {
      const { state, outcome } = applyEncounter(coreRef.current, challenge, success, now());
      const next = commit(state);
      const record = outcome.record;
      persist(async () => {
        if (record) await repo.saveRecord(record);
        await repo.savePlayer(next.player);
      });
      return outcome;
    },
    [commit, persist, repo],
  );

  const setSettings = useCallback(
    (patch: Partial<GameSettings>) => {
      const s = { ...settingsRef.current, ...patch };
      settingsRef.current = s;
      setSettingsState(s);
      persist(() => repo.saveSettings(s));
    },
    [persist, repo],
  );

  const resetProgress = useCallback(async () => {
    // Aguarda escritas pendentes para que não sobrescrevam o reset.
    // Preferências (modo avançado, voz) são mantidas: o reset apaga apenas o progresso.
    await writeQueue.current;
    await repo.reset();
    await repo.saveSettings(settingsRef.current).catch(() => {});
    commit(initialCore());
  }, [commit, repo]);

  const value = useMemo<GameContextValue>(
    () => ({
      ready,
      player: core.player,
      records: core.records,
      lexicon,
      deck: core.deck,
      getVerb,
      skip,
      startEncounter,
      finishEncounter,
      settings,
      setSettings,
      resetProgress,
    }),
    [ready, core, lexicon, getVerb, skip, startEncounter, finishEncounter, settings, setSettings, resetProgress],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame() precisa estar dentro de <GameProvider>.');
  return ctx;
}

/** Registro de captura de um verbo (undefined se nunca capturado). */
export function useVerbRecord(verbId: string | undefined): CaptureRecord | undefined {
  const { records } = useGame();
  return verbId ? records[verbId] : undefined;
}

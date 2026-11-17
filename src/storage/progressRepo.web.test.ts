/// <reference types="node" />
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { CaptureRecord } from '../types/grammar';
import { createKeyValueProgressRepo, createMemoryStorage, type KeyValueStorage } from './progressRepo.web';

const rec: CaptureRecord = {
  verbId: 'cantar',
  status: 'capturado',
  capturedAt: 1,
  stage: 2,
  dueAt: 100,
  lapses: 1,
  masteredTenses: ['pres_ind'],
};

describe('progressRepo.web', () => {
  it('load vazio retorna padrões', async () => {
    const repo = createKeyValueProgressRepo(createMemoryStorage());
    const s = await repo.load();
    assert.deepEqual(s.records, {});
    assert.deepEqual(s.player, { xp: 0, level: 1, escapes: 0, recentlySkipped: [] });
    assert.equal(s.settings, null);
  });

  it('persiste e recarrega no mesmo storage', async () => {
    const storage = createMemoryStorage();
    const repo = createKeyValueProgressRepo(storage);
    await repo.saveRecord(rec);
    await repo.saveRecord({ ...rec, verbId: 'vender' });
    await repo.savePlayer({ xp: 300, level: 2, escapes: 3, recentlySkipped: ['partir'] });
    await repo.saveSettings({ advancedMode: true, autoSpeak: false });

    const again = await createKeyValueProgressRepo(storage).load();
    assert.deepEqual(Object.keys(again.records).sort(), ['cantar', 'vender']);
    assert.deepEqual(again.records.cantar, rec);
    assert.equal(again.player.xp, 300);
    assert.deepEqual(again.settings, { advancedMode: true, autoSpeak: false });

    await repo.reset();
    const empty = await repo.load();
    assert.deepEqual(empty.records, {});
    assert.equal(empty.player.xp, 0);
  });

  it('cai para memória quando o storage falha ou não existe', async () => {
    const broken: KeyValueStorage = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('quota');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    };
    for (const storage of [broken, null]) {
      const repo = createKeyValueProgressRepo(storage);
      const origWarn = console.warn;
      console.warn = () => {};
      try {
        await repo.saveRecord(rec);
      } finally {
        console.warn = origWarn;
      }
      assert.deepEqual((await repo.load()).records.cantar, rec);
    }
  });

  it('ignora dados corrompidos', async () => {
    const storage = createMemoryStorage();
    storage.setItem('verboom:v1:records', '{not json');
    storage.setItem('verboom:v1:player', '{"xp":"x","level":9}');
    const s = await createKeyValueProgressRepo(storage).load();
    assert.deepEqual(s.records, {});
    assert.deepEqual(s.player, { xp: 0, level: 1, escapes: 0, recentlySkipped: [] });
  });
});

/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  FIELDS_CHUNK_SAVED_OBJECT_TYPE,
  SavedObjectsClientWithFieldsChunks,
} from './fields_chunks_client';
import { SavedObject, SavedObjectsClientCommon } from '../types';

const createStore = () => {
  const objects = new Map<string, SavedObject<any>>();
  let nextId = 0;
  const key = (type: string, id: string) => `${type}:${id}`;
  const client = {
    find: jest.fn(),
    get: jest.fn(async (type: string, id: string) => objects.get(key(type, id))!),
    bulkGet: jest.fn(async (requested: Array<{ type: string; id: string }>) => ({
      savedObjects: requested.map(
        ({ type, id }) => objects.get(key(type, id)) ?? { id, type, error: { statusCode: 404 } }
      ),
    })),
    create: jest.fn(async (type: string, attributes: any, options: any) => {
      const savedObject = { id: options.id ?? `${nextId++}`, type, attributes, version: 'v0' };
      objects.set(key(type, savedObject.id), savedObject as SavedObject<any>);
      return savedObject;
    }),
    update: jest.fn(async (type: string, id: string, attributes: any, options: any) => {
      const current = objects.get(key(type, id))!;
      if (options.version && options.version !== current.version) {
        throw Object.assign(new Error('conflict'), { res: { status: 409 } });
      }
      const updated = {
        ...current,
        attributes: { ...current.attributes, ...attributes },
        version: `v${Number(current.version!.slice(1)) + 1}`,
      };
      objects.set(key(type, id), updated);
      return updated;
    }),
    delete: jest.fn(async (type: string, id: string) => objects.delete(key(type, id))),
  };
  const chunks = () =>
    Array.from(objects.values()).filter((object) => object.type === FIELDS_CHUNK_SAVED_OBJECT_TYPE);
  return {
    client,
    chunks,
    wrapped: new SavedObjectsClientWithFieldsChunks(client as unknown as SavedObjectsClientCommon),
  };
};

const fieldsJson = (count: number, scripted = false) =>
  JSON.stringify(
    Array.from({ length: count }, (_, i) => ({ name: `field_${i}`, type: 'string', scripted }))
  );
const largeFields = fieldsJson(20000);

describe('SavedObjectsClientWithFieldsChunks', () => {
  test('keeps small field lists inline', async () => {
    const { wrapped, chunks } = createStore();
    await wrapped.create('index-pattern', { title: 'logs-*', fields: '[]' }, { id: 'ip' });

    expect(chunks()).toHaveLength(0);
    expect((await wrapped.get<any>('index-pattern', 'ip')).attributes.fields).toBe('[]');
  });

  test('splits large field lists into chunks and joins them on read', async () => {
    const { wrapped, client, chunks } = createStore();
    const scripted = fieldsJson(1, true);
    const fields = `${largeFields.slice(0, -1)},${scripted.slice(1)}`;
    await wrapped.create('index-pattern', { title: 'logs-*', fields }, { id: 'ip' });

    const parent = await client.get('index-pattern', 'ip');
    expect(parent.attributes.fields).toBe(scripted);
    expect(parent.attributes.fieldsChunks).toEqual(chunks().map((chunk) => chunk.id));
    expect(chunks().length).toBeGreaterThan(1);
    expect((await wrapped.get<any>('index-pattern', 'ip')).attributes.fields).toBe(fields);
    expect(
      (await wrapped.bulkGet<any>([{ type: 'index-pattern', id: 'ip' }])).savedObjects[0]
    ).toHaveProperty('attributes.fields', fields);
  });

  test('does not split surrogate pairs', async () => {
    const { wrapped, chunks } = createStore();
    const fields = JSON.stringify([{ name: `a${'😀'.repeat(140000)}` }]);
    await wrapped.create('index-pattern', { fields }, { id: 'ip' });

    chunks().forEach(({ attributes }) =>
      expect(() => encodeURIComponent(attributes.fields)).not.toThrow()
    );
    expect((await wrapped.get<any>('index-pattern', 'ip')).attributes.fields).toBe(fields);
  });

  test('replaces chunks on update and removes them when the fields shrink', async () => {
    const { wrapped, chunks } = createStore();
    const created = await wrapped.create('index-pattern', { fields: largeFields }, { id: 'ip' });
    const oldChunkIds = chunks().map((chunk) => chunk.id);

    const updated = await wrapped.update(
      'index-pattern',
      'ip',
      { fields: fieldsJson(19000) },
      {
        version: created.version,
      }
    );
    expect(chunks().map((chunk) => chunk.id)).not.toContain(oldChunkIds[0]);

    await wrapped.update('index-pattern', 'ip', { fields: '[]' }, { version: updated.version });
    expect(chunks()).toHaveLength(0);
    const parent = await wrapped.get<any>('index-pattern', 'ip');
    expect(parent.attributes).toMatchObject({ fields: '[]', fieldsChunks: [] });
  });

  test('keeps the old chunks when the update fails', async () => {
    const { wrapped, chunks } = createStore();
    await wrapped.create('index-pattern', { fields: largeFields }, { id: 'ip' });
    const oldChunks = chunks();

    await expect(
      wrapped.update('index-pattern', 'ip', { fields: largeFields }, { version: 'stale' })
    ).rejects.toMatchObject({ res: { status: 409 } });
    expect(chunks()).toEqual(oldChunks);
  });

  test('re-reads the index pattern when its chunks were replaced concurrently', async () => {
    const { wrapped, client } = createStore();
    const created = await wrapped.create('index-pattern', { fields: largeFields }, { id: 'ip' });
    const stale = await client.get('index-pattern', 'ip');
    const fields = fieldsJson(19000);
    await wrapped.update('index-pattern', 'ip', { fields }, { version: created.version });

    client.get.mockResolvedValueOnce(stale);
    expect((await wrapped.get<any>('index-pattern', 'ip')).attributes.fields).toBe(fields);
  });

  test('deletes the chunks with the index pattern', async () => {
    const { wrapped, chunks } = createStore();
    await wrapped.create('index-pattern', { fields: largeFields }, { id: 'ip' });
    await wrapped.delete('index-pattern', 'ip');

    expect(chunks()).toHaveLength(0);
  });
});

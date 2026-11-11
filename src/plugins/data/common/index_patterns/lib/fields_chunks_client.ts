/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { v4 as uuidv4 } from 'uuid';
import type { FieldSpec, SavedObject, SavedObjectsClientCommon } from '../types';

export const FIELDS_CHUNK_SAVED_OBJECT_TYPE = 'index-pattern-fields';
const INDEX_PATTERN_SAVED_OBJECT_TYPE = 'index-pattern';
// Each chunk is saved in its own request, which has to fit the default server.maxPayloadBytes
// (1mb) after JSON escaping and UTF-8 encoding.
const CHUNK_LENGTH = 256 * 1024;
const CONCURRENCY = 8;

const splitFields = (fields: string) => {
  const chunks: string[] = [];
  for (let start = 0, end = 0; start < fields.length; start = end) {
    end = Math.min(start + CHUNK_LENGTH, fields.length);
    if (end < fields.length && /[\ud800-\udbff]/.test(fields[end - 1])) end--;
    chunks.push(fields.slice(start, end));
  }
  return chunks;
};

const inBatches = async <T, R>(items: T[], run: (batch: T[]) => Promise<R[]>) => {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += CONCURRENCY) {
    results.push(...(await run(items.slice(i, i + CONCURRENCY))));
  }
  return results;
};

/**
 * Stores the `fields` of large index patterns in `index-pattern-fields` saved objects, so that no
 * single request or document holds the whole field list. The index pattern lists the chunk ids in
 * `fieldsChunks` and keeps its scripted fields in `fields`.
 */
export class SavedObjectsClientWithFieldsChunks implements SavedObjectsClientCommon {
  private chunkIdsByIndexPattern = new Map<string, { version?: string; chunkIds: string[] }>();

  constructor(private readonly client: SavedObjectsClientCommon) {}

  find: SavedObjectsClientCommon['find'] = (options) => this.client.find(options);

  get = async <T = unknown>(type: string, id: string) =>
    this.joinChunks(await this.client.get<T>(type, id));

  bulkGet = async <T = unknown>(objects: Array<{ id: string; type: string }>) => {
    const { savedObjects } = await this.client.bulkGet<T>(objects);
    return { savedObjects: await Promise.all(savedObjects.map((so) => this.joinChunks(so))) };
  };

  create = (type: string, attributes: Record<string, any>, options: Record<string, any>) =>
    type !== INDEX_PATTERN_SAVED_OBJECT_TYPE
      ? this.client.create(type, attributes, options)
      : this.save(attributes, [], (chunked) => this.client.create(type, chunked, options));

  update = async <T = unknown>(
    type: string,
    id: string,
    attributes: Record<string, any>,
    options: Record<string, any>
  ) => {
    if (type !== INDEX_PATTERN_SAVED_OBJECT_TYPE || attributes.fields === undefined) {
      return this.client.update<T>(type, id, attributes, options);
    }
    return this.save(attributes, await this.getChunkIds(id, options.version), (chunked) =>
      this.client.update<T>(type, id, chunked, options)
    );
  };

  delete = async (type: string, id: string) => {
    if (type !== INDEX_PATTERN_SAVED_OBJECT_TYPE) return this.client.delete(type, id);
    const chunkIds = await this.getChunkIds(id);
    const result = await this.client.delete(type, id);
    this.chunkIdsByIndexPattern.delete(id);
    await this.deleteChunks(chunkIds);
    return result;
  };

  private async getChunkIds(id: string, version?: string): Promise<string[]> {
    const known = this.chunkIdsByIndexPattern.get(id);
    if (known && (!version || known.version === version)) return known.chunkIds;
    const { attributes } = await this.client.get<any>(INDEX_PATTERN_SAVED_OBJECT_TYPE, id);
    return attributes.fieldsChunks ?? [];
  }

  private async joinChunks<T>(savedObject: SavedObject<T>, retry = true): Promise<SavedObject<T>> {
    if (savedObject.type !== INDEX_PATTERN_SAVED_OBJECT_TYPE) return savedObject;
    const chunkIds: string[] = (savedObject.attributes as any)?.fieldsChunks ?? [];
    if (savedObject.version) {
      this.chunkIdsByIndexPattern.set(savedObject.id, { version: savedObject.version, chunkIds });
    }
    if (chunkIds.length === 0) return savedObject;

    const chunks = await inBatches(chunkIds, async (ids) => {
      const objects = ids.map((id) => ({ id, type: FIELDS_CHUNK_SAVED_OBJECT_TYPE }));
      return (await this.client.bulkGet<{ fields: string }>(objects)).savedObjects;
    });
    if (chunks.some((chunk) => chunk.error)) {
      // A concurrent save deletes the chunks this index pattern was read with
      return retry
        ? this.joinChunks(await this.client.get<T>(savedObject.type, savedObject.id), false)
        : savedObject;
    }
    const fields = chunks.map((chunk) => chunk.attributes.fields).join('');
    return { ...savedObject, attributes: { ...savedObject.attributes, fields } };
  }

  private async save<T>(
    attributes: Record<string, any>,
    oldChunkIds: string[],
    write: (attributes: Record<string, any>) => Promise<SavedObject<T>>
  ) {
    const { fields } = attributes;
    const chunks =
      typeof fields === 'string' && fields.length > CHUNK_LENGTH
        ? splitFields(fields).map((chunk) => ({ id: uuidv4(), fields: chunk }))
        : [];
    const chunkIds = chunks.map(({ id }) => id);

    let savedObject: SavedObject<T>;
    try {
      await inBatches(chunks, (batch) =>
        Promise.all(
          batch.map(({ id, fields: chunk }) =>
            this.client.create(FIELDS_CHUNK_SAVED_OBJECT_TYPE, { fields: chunk }, { id })
          )
        )
      );
      savedObject = await write({
        ...attributes,
        ...(chunks.length > 0 && {
          fields: JSON.stringify(JSON.parse(fields).filter((field: FieldSpec) => field.scripted)),
        }),
        fieldsChunks: chunkIds,
      });
    } catch (err) {
      await this.deleteChunks(chunkIds);
      throw err;
    }
    this.chunkIdsByIndexPattern.set(savedObject.id, { version: savedObject.version, chunkIds });
    await this.deleteChunks(oldChunkIds);
    return savedObject;
  }

  private deleteChunks(chunkIds: string[]) {
    return inBatches(chunkIds, (ids) =>
      Promise.all(
        ids.map((id) => this.client.delete(FIELDS_CHUNK_SAVED_OBJECT_TYPE, id).catch(() => {}))
      )
    );
  }
}

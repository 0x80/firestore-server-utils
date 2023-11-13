import type {
  DocumentData,
  Query,
  QueryDocumentSnapshot,
} from "firebase-admin/firestore";
import { DEFAULT_CHUNK_SIZE } from "./constants";
import type { FsDocument } from "./document";
import { getSomeDocuments } from "./documents";
import {
  getErrorMessage,
  isDefined,
  isEmpty,
  verboseCount,
  verboseLog,
} from "./utils";
import { makeWait } from "./utils/make-wait";

type QueryAndProcessOptions = {
  batchSize?: number;
  limitToFirstBatch?: boolean;
  throttleSecs?: number;
};

const optionsDefaults: Required<QueryAndProcessOptions> = {
  batchSize: DEFAULT_CHUNK_SIZE,
  limitToFirstBatch: false,
  throttleSecs: 0,
};

export async function queryAndProcess<T extends Record<string, unknown>>(
  query: Query<DocumentData>,
  callback: (document: FsDocument<T>) => Promise<void>,
  options: QueryAndProcessOptions = {}
) {
  const { throttleSecs, limitToFirstBatch } = Object.assign(
    {},
    optionsDefaults,
    options
  );
  let lastDocumentSnapshot: QueryDocumentSnapshot | undefined;
  let count = 0;

  const errors: { id: string; message: string }[] = [];

  do {
    verboseCount("Processing chunk");

    const [documents, _lastDocumentSnapshot] = await getSomeDocuments<T>(
      query,
      lastDocumentSnapshot,
      options
    );

    await Promise.all([
      ...documents.map((doc) =>
        callback(doc).catch((err) => {
          errors.push({ id: doc.id, message: getErrorMessage(err) });
        })
      ),
      makeWait(throttleSecs),
    ]);

    count += documents.length;

    lastDocumentSnapshot = _lastDocumentSnapshot;
  } while (isDefined(lastDocumentSnapshot) && !limitToFirstBatch);

  verboseLog(`Processed ${count} documents`);

  if (errors.length > 0) {
    errors.forEach(({ id, message }) => {
      console.error(`${id}: ${message}`);
    });
  }
}

export async function queryAndProcessByChunk<T extends Record<string, unknown>>(
  query: Query<DocumentData>,
  callback: (documents: FsDocument<T>[]) => Promise<unknown>,
  options: QueryAndProcessOptions = {}
) {
  const { throttleSecs, limitToFirstBatch } = Object.assign(
    {},
    optionsDefaults,
    options
  );

  let lastDocumentSnapshot: QueryDocumentSnapshot | undefined;
  let count = 0;

  const errors: string[] = [];

  do {
    verboseCount("Processing chunk");

    const [documents, _lastDocumentSnapshot] = await getSomeDocuments<T>(
      query,
      lastDocumentSnapshot,
      options
    );

    if (isEmpty(documents)) {
      continue;
    }

    await Promise.all([
      callback(documents).catch((err) => errors.push(getErrorMessage(err))),
      makeWait(throttleSecs),
    ]);

    count += documents.length;

    lastDocumentSnapshot = _lastDocumentSnapshot;
  } while (isDefined(lastDocumentSnapshot) && !limitToFirstBatch);

  verboseLog("Processed", count);

  if (errors.length > 0) {
    errors.forEach((message) => {
      console.error(message);
    });
  }
}

import type {
  DocumentData,
  Query,
  QueryDocumentSnapshot,
} from "firebase-admin/firestore";
import { MAX_BATCH_SIZE } from "./constants";
import { makeFsDocument, type FsDocument } from "./document";
import { get, last, verboseLog } from "./utils";

export type QueryOptions = {
  useBatching?: boolean;
  batchSize?: number;
  limitToFirstBatch?: boolean;
};

const optionsDefaults: Required<QueryOptions> = {
  useBatching: true,
  batchSize: MAX_BATCH_SIZE,
  limitToFirstBatch: false,
};

/**
 * Getting all documents from a collection becomes problematic once the
 * collection grows over 500. Requests might time out. This function differs
 * from the equally named function in the client app because there you would not
 * fetch this many documents at once without pagination.
 *
 * Options limitToFirstBatch is mainly used for backend scripts test runs where
 * you want to validate logic without having to fetch all documents of a
 * collection which can be painfully slow.
 *
 * Enable batching by default, because it is quite dangerous to forget it.
 * Firestore will not return an error if you're trying to fetch too many
 * documents but just return an incomplete snapshot.
 */
export async function getDocuments<T>(
  query: Query<DocumentData>,
  options: QueryOptions = {}
): Promise<FsDocument<T>[]> {
  const { useBatching, batchSize, limitToFirstBatch } = Object.assign(
    {},
    optionsDefaults,
    options
  );

  if (!useBatching) {
    return (await query.get()).docs.map(makeFsDocument<T>);
  } else {
    const limitedQuery = query.limit(batchSize);

    return getDocumentsBatch<T>(limitedQuery, {
      limitToFirstBatch,
    });
  }
}

/**
 * Returns [documents, lastDocumentSnapshot], so that the last document snapshot
 * can be passed in as the "startAfter" argument.
 */
export async function getSomeDocuments<T>(
  query: Query<DocumentData>,
  startAfterSnapshot: QueryDocumentSnapshot | undefined,
  options: QueryOptions = {}
): Promise<[FsDocument<T>[], QueryDocumentSnapshot | undefined]> {
  const { batchSize, limitToFirstBatch } = Object.assign(
    {},
    optionsDefaults,
    options
  );

  const limitedQuery = query.limit(batchSize);

  const pagedQuery = startAfterSnapshot
    ? limitedQuery.startAfter(startAfterSnapshot)
    : limitedQuery;

  const snapshot = await pagedQuery.get();

  if (snapshot.empty) {
    return [[], undefined];
  }

  const documents = snapshot.docs.map(makeFsDocument<T>);

  /** Do not return the last snapshot if this batch was the last batch */
  const lastDocumentSnapshot =
    documents.length === batchSize ? last(snapshot.docs) : undefined;

  return [documents, limitToFirstBatch ? undefined : lastDocumentSnapshot];
}

async function getDocumentsBatch<T>(
  query: Query,
  options: {
    orderByField?: string;
    limitToFirstBatch?: boolean;
  }
): Promise<FsDocument<T>[]> {
  const { orderByField, limitToFirstBatch } = options;

  /**
   * For easy testing we sometimes need to run an algorithm on only a part of a
   * collection (like cities). This boolean makes that easy but it should never
   * be used in production so we log it with a warning.
   */
  if (limitToFirstBatch) {
    console.warn(
      "Returning only the first batch of documents (limitToFirstBatch = true)"
    );
  }

  const snapshot = await query.get();

  if (snapshot.empty) {
    return [];
  }

  const lastDoc = last(snapshot.docs) as QueryDocumentSnapshot;

  /** Map the results to documents */
  const results = snapshot.docs.map(makeFsDocument<T>);

  /** Log some information about count and pagination */
  const numRead = snapshot.size;
  const lastPageLog = orderByField && get(lastDoc.data(), orderByField);

  verboseLog(`Read ${numRead} records, until ${lastPageLog ?? lastDoc.id}`);

  if (numRead < MAX_BATCH_SIZE || limitToFirstBatch === true) {
    return results;
  } else {
    const pagedQuery = query.startAfter(lastDoc);
    return results.concat(await getDocumentsBatch<T>(pagedQuery, options));
  }
}

export async function getDocumentsFromTransaction<T>(
  transaction: FirebaseFirestore.Transaction,
  query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData>
) {
  const snapshot = await transaction.get(query);

  if (snapshot.empty) return [];

  return snapshot.docs.map(makeFsDocument<T>);
}

export async function getFirstDocument<T>(query: Query<DocumentData>) {
  const snapshot = await query.limit(1).get();

  if (snapshot.empty) {
    return;
  }

  return makeFsDocument<T>(snapshot.docs[0]);
}

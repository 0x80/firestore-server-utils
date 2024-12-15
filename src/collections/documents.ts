import type {
  DocumentData,
  Query,
  QueryDocumentSnapshot,
} from "firebase-admin/firestore";
import { MAX_BATCH_SIZE } from "~/constants";
import { makeFsDocument } from "~/documents";
import { last } from "~/helpers";
import type { FsDocument } from "~/types";
import { getDocumentsBatch } from "./helpers/get-documents-batch";

export type QueryOptions = {
  disableBatching?: boolean;
  batchSize?: number;
  limitToFirstBatch?: boolean;
};

const optionsDefaults: Required<QueryOptions> = {
  disableBatching: false,
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
  const { disableBatching, batchSize, limitToFirstBatch } = Object.assign(
    {},
    optionsDefaults,
    options
  );

  if (disableBatching) {
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

export async function getDocumentsFromTransaction<T>(
  transaction: FirebaseFirestore.Transaction,
  query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData>
) {
  const snapshot = await transaction.get(query);

  if (snapshot.empty) return [];

  return snapshot.docs.map(makeFsDocument<T>);
}

/**
 * Because getDocuments overwrites any query limit with the batchSize, this
 * function is useful for when you just want to get the first document from a
 * sorted query.
 *
 * Alternatively, you can use getDocuments with options `{ disableBatching: true
 * }`, which would preserve the limit you set on the query.
 */
export async function getFirstDocument<T>(query: Query<DocumentData>) {
  const snapshot = await query.limit(1).get();

  if (snapshot.empty) {
    return;
  }

  return makeFsDocument<T>(snapshot.docs[0]!);
}

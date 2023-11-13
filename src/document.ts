import type {
  DocumentReference,
  Firestore,
  Transaction,
} from "firebase-admin/lib/firestore";
import { invariant } from "./utils";

/**
 * A simple serialize-able document type.
 *
 * Utility methods typically return an FsDocument, but sometimes you might want
 * to construct a document from an API payload, or be able to serialize it. For
 * those cases the PlainDocument type can be useful as a subset of FsDocument.
 */
export type PlainDocument<T> = {
  id: string;
  data: T;
};

export type FsDocument<T> = {
  ref: DocumentReference;
} & PlainDocument<T>;

export async function getDocument<T>(
  db: Firestore,
  collectionName: string,
  documentId: string
): Promise<FsDocument<T>> {
  const doc = await db.collection(collectionName).doc(documentId).get();

  invariant(
    doc.exists,
    `No document ${documentId} available in collection ${collectionName}`
  );

  return { id: doc.id, data: doc.data() as T, ref: doc.ref };
}

export async function getDocumentMaybe<T>(
  db: Firestore,
  collectionName: string,
  documentId: string
): Promise<FsDocument<T> | undefined> {
  const doc = await db.collection(collectionName).doc(documentId).get();

  if (!doc.exists) return;

  return { id: doc.id, data: doc.data() as T, ref: doc.ref };
}

export async function getDocumentFromTransaction<T>(
  transaction: Transaction,
  ref: DocumentReference
) {
  const doc = await transaction.get(ref);

  invariant(doc.exists, `No document available at path ${ref.path}`);

  return { id: doc.id, data: doc.data() as T, ref: doc.ref };
}

export async function getDocumentFromTransactionMaybe<T>(
  transaction: Transaction,
  ref: DocumentReference
): Promise<FsDocument<T> | undefined> {
  const doc = await transaction.get(ref);

  if (!doc.exists) {
    return;
  }

  return {
    id: doc.id,
    data: doc.data() as T,
    ref: doc.ref,
  };
}

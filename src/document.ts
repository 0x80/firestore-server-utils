import type {
  CollectionReference,
  DocumentReference,
  DocumentSnapshot,
  Transaction,
} from "firebase-admin/firestore";
import { invariant } from "./utils";

/**
 * A simple serialize-able document type. All utility methods return an
 * FsDocument, but sometimes you might want to construct a document from an API
 * payload, or be able to serialize it. For those cases the PlainDocument type
 * can be useful as a subset of FsDocument.
 */
export type PlainDocument<T> = {
  readonly id: string;
  readonly data: T;
};

export type FsDocument<T> = {
  readonly ref: DocumentReference;
} & PlainDocument<T>;

export function makeFsDocument<T>(
  doc: DocumentSnapshot<FirebaseFirestore.DocumentData>
): FsDocument<T> {
  return {
    id: doc.id,
    data: doc.data() as T,
    ref: doc.ref,
  };
}

export async function getDocument<T>(
  collectionRef: CollectionReference,
  documentId: string
) {
  const doc = await collectionRef.doc(documentId).get();

  invariant(
    doc.exists,
    `No document available at ${collectionRef.path}/${documentId}`
  );

  return makeFsDocument<T>(doc);
}

export async function getDocumentMaybe<T>(
  collectionRef: CollectionReference,
  documentId?: string | null
) {
  if (!documentId) return;

  const doc = await collectionRef.doc(documentId).get();

  if (!doc.exists) return;

  return makeFsDocument<T>(doc);
}

export async function getDocumentFromTransaction<T>(
  transaction: Transaction,
  collectionRef: CollectionReference,
  documentId: string
) {
  const doc = await transaction.get(collectionRef.doc(documentId));

  invariant(
    doc.exists,
    `No document available at ${collectionRef.path}/${documentId}`
  );

  return makeFsDocument<T>(doc);
}

export async function getDocumentFromTransactionMaybe<T>(
  transaction: Transaction,
  collectionRef: CollectionReference,
  documentId?: string | null
) {
  if (!documentId) return;

  const doc = await transaction.get(collectionRef.doc(documentId));

  if (!doc.exists) {
    return;
  }

  return makeFsDocument<T>(doc);
}

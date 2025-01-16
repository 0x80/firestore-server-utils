import type { DocumentReference } from "firebase-admin/firestore";

/**
 * A simple serialize-able document type. All methods return an FsDocument, but
 * sometimes you might want to construct a document from an API payload, or be
 * able to serialize it. For those cases the PlainDocument type can be useful as
 * a subset of FsDocument, by dropping the `ref` property.
 */
export type PlainDocument<T> = {
  readonly id: string;
  readonly data: T;
};

export type FsDocument<T> = {
  readonly ref: DocumentReference<T>;
} & PlainDocument<T>;

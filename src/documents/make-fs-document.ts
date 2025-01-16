import type { DocumentSnapshot } from "firebase-admin/firestore";
import type { FsDocument } from "~/types";

export function makeFsDocument<T>(doc: DocumentSnapshot<T>): FsDocument<T> {
  return {
    id: doc.id,
    data: doc.data() as T,
    ref: doc.ref,
  };
}

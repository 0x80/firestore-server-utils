import type { Timestamp } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";

export function serverTimestamp(): Timestamp {
  return FieldValue.serverTimestamp() as Timestamp;
}

export function incrementField(value: number) {
  return FieldValue.increment(value) as unknown as number;
}

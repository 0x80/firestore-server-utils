# Firestore Server Utils

Elegant, typed, zero-dependency abstractions for handling Firestore documents in
server environments.

For client-side see [firestore-hooks](https://github.com/0x80/firestore-hooks)
which provides similar abstractions.

All functions are designed to take a typed collection reference as their first
argument. The various functions can infer their return type from it, which can
greatly reduces boilerplate as well as the risk of mistakes.

## Installation

`pnpm i firestore-server-utils`

## Example Usage

Create a single file in which you define re-usable refs for all of your database
collections, and map each to the appropriate type, as shown below.

```ts
// db-refs.ts
import { CollectionReference } from "firebase-admin/firestore";
import { db } from "./firestore";
import { User, UserEvent } from "./types";

export const refs = {
  /** For top-level collections it's easy */
  users: db.collection("users") as CollectionReference<User>,
  /** For sub-collections you could use a function that returns the reference. */
  userEvents: (userId: string) =>
    db
      .collection("users")
      .doc(userId)
      .collection("events") as CollectionReference<UserEvent>,
};
```

The various functions in this library will be able to infer the type from the
collection reference.

```ts
import { refs } from "./db-refs";

/** User will be typed to FsMutableDocument<User> here */
const user = await getDocument(refs.users, "123");

/**
 * This fetches and processes a query in batches, and userEvent will be typed to
 * FsMutableDocument<UserEvent> here
 */
await queryAndProcess(
  refs.userEvents(user.id).where("type", "==", "like"),
  async (userEvent) => {
    console.log(userEvent);

    /** The returned document has a typed update function */
    await userEvent.update({
      is_processed: true,
    });
  }
);
```

## API

All functions use `FsDocument<T>` or `FsMutableDocument<T>` in their return
type. This is a type that conveniently combines the data and id together with
the document reference. The mutable type also provides a `ref` and a typed
`update` function.

### Single Document

| Function                              | Description                                                                          |
| ------------------------------------- | ------------------------------------------------------------------------------------ |
| `getDocument`                         | Fetch a document                                                                     |
| `getDocumentData`                     | Fetch only the data part of a document                                               |
| `getDocumentMaybe`                    | Fetch a document that might not exist                                                |
| `getDocumentDataMaybe`                | Fetch only the data part of a that might not exist                                   |
| `getDocumentFromTransaction`          | Fetch a document as part of a transaction                                            |
| `getDocumentDataFromTransaction`      | Fetch only the data part of a document as part of a transaction                      |
| `getDocumentFromTransactionMaybe`     | Fetch a document that might not exist as part of a transaction                       |
| `getDocumentDataFromTransactionMaybe` | Fetch only the data part of a document that might not exist as part of a transaction |

### Collection Query

| Function                 | Description                                                                      |
| ------------------------ | -------------------------------------------------------------------------------- |
| `getDocuments`           | Fetch a number of documents or a full collection (no limit available)            |
| `getFirstDocument`       | Fetch a single document using a query                                            |
| `queryAndProcess`        | Query a collection and process the results using a handler for a single document |
| `queryAndProcessByChunk` | Query a collection and process the results using a handler for each chunk        |

More detailed documentation will follow, but I think the function signatures are
pretty self-explanatory.

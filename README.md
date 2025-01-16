# Firestore Server Utils

Clean zero-dependency abstractions for handling Firestore documents in server
environments.

All functions are designed to take a collection reference as their first
argument. If you type those references, the functions can infer their return
type from it, which can greatly reduce boilerplate and improve type safety.

For client-side usage in React apps there is the
[firestore-hooks](https://github.com/0x80/firestore-hooks) package which uses
similar abstractions.

## Installation

`pnpm i firestore-server-utils`

## ExampleUsage

It is recommended to create a single file where you define all of your database
collection references for re-use, and map each to the appropriate type, as shown
below.

```ts
// db-refs.ts
import { CollectionReference } from "firebase-admin/firestore";
import { db } from "./firestore";
import { User, UserEvent } from "./types";

/**
 * Define all of your database collection types here. For sub-collections you
 * can use a function to create a reference.
 */
export const refs = {
  users: db.collection("users") as CollectionReference<User>,
  userEvents: (userId: string) =>
    db
      .collection("users")
      .doc(userId)
      .collection("events") as CollectionReference<UserEvent>,
};
```

Now the various functions in this library will be able to infer the type from
the collection reference.

```ts
import { refs } from "./db-refs";

/** User will be typed to FsDocument<User> here */
const user = await getDocument(refs.users, "123");

/**
 * This fetches and processes a query in batches, and userEvent will be typed to
 * FsDocument<UserEvent> here
 */
await queryAndProcess(
  refs.userEvents(user.id).where("type", "==", "like"),
  async (userEvent) => {
    console.log(userEvent);

    /**
     * The ref property allows you to update the data of the document.
     *
     * @todo We plan to add a typed update function in the near future.
     */
    await userEvent.ref.update({
      is_processed: true,
    } satisfies UpdateData<UserEvent>);
  }
);
```

## API

All functions use `FsDocument<T>` in their return type. This is a type that
conveniently combines the data and id together with the document reference.

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

More detailed documentation will follow, but I think you can easily figure it
out from the function signatures

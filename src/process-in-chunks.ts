import { chunk, getErrorMessage, isEmpty, take, verboseLog } from "./utils";

export type ChunkingOptions = {
  chunkSize?: number;
  throttleSecs?: number;
};

const optionsDefaults: Required<ChunkingOptions> = {
  chunkSize: 500,
  throttleSecs: 0,
};

/**
 * Iterate over a potentially large set of items and process them in chunks with
 * some optional CLI feedback on progress. If the process function returns a
 * value those values are aggregated in the final result.
 */
export async function processInChunks<T>(
  allItems: T[],
  processFn: (value: T, index?: number) => Promise<unknown>,
  options: ChunkingOptions = {}
): Promise<void> {
  const { chunkSize } = Object.assign({}, optionsDefaults, options);

  const chunks = chunk(allItems, chunkSize);
  const overallIndex = 0;

  const errorMessages: string[] = [];

  for (const [index, items] of chunks.entries()) {
    verboseLog(`Processing chunk ${index + 1}/${chunks.length}`);

    try {
      await Promise.all(
        items.map((v, idx) => processFn(v, overallIndex + idx))
      );
    } catch (err) {
      errorMessages.push(getErrorMessage(err));
    }
  }

  if (!isEmpty(errorMessages)) {
    throw new Error(
      `Failed to process all chunks successfully. Error messages (limited to 10): ${JSON.stringify(
        take(errorMessages, 10)
      )}}`
    );
  }
}

/**
 * Same as processInChunks, but passing the whole chunk to the callback
 * function.
 */
export async function processInChunksByChunk<T>(
  allItems: T[],
  processFn: (chunk: T[], index?: number) => unknown | Promise<unknown>,
  options: ChunkingOptions = {}
) {
  const { chunkSize } = Object.assign({}, optionsDefaults, options);

  const chunks = chunk(allItems, chunkSize);
  const errorMessages: string[] = [];

  let overallIndex = 0;

  for (const [index, items] of chunks.entries()) {
    verboseLog(`Processing chunk ${index + 1}/${chunks.length}`);

    try {
      await processFn(items, overallIndex + index);
    } catch (err) {
      errorMessages.push(getErrorMessage(err));
    }

    overallIndex += chunkSize;
  }

  if (!isEmpty(errorMessages)) {
    throw new Error(
      `Failed to process all chunks successfully. Error messages (limited to 10): ${JSON.stringify(
        take(errorMessages, 10)
      )}}`
    );
  }
}

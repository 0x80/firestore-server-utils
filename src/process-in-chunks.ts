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
export async function processInChunks<Input, Result>(
  allItems: Input[],
  processFn: (value: Input) => Promise<Result>,
  options: ChunkingOptions = {}
): Promise<Result[]> {
  const { chunkSize } = Object.assign({}, optionsDefaults, options);

  const chunks = chunk(allItems, chunkSize);
  const allResults: Result[] = [];

  for (const [index, items] of chunks.entries()) {
    verboseLog(`Processing chunk ${index + 1}/${chunks.length}`);

    const results = await Promise.all(items.map((v) => processFn(v)));

    allResults.push(...results);
  }

  return allResults;
}

/**
 * Same as processInChunks, but passing the whole chunk to the callback
 * function.
 */
export async function processInChunksByChunk<T, Result>(
  allItems: T[],
  processFn: (chunk: T[]) => Promise<Result[]>,
  options: ChunkingOptions = {}
) {
  const { chunkSize } = Object.assign({}, optionsDefaults, options);

  const chunks = chunk(allItems, chunkSize);
  const errorMessages: string[] = [];
  const allResults: Result[] = [];

  for (const [index, items] of chunks.entries()) {
    verboseLog(`Processing chunk ${index + 1}/${chunks.length}`);

    try {
      const results = await processFn(items);
      allResults.push(...results);
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

  return allResults;
}

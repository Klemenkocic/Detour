// src/test/setup.ts
globalThis.google = {
  maps: {
    places: {
      AutocompleteService: class {
        getQueryPredictions(_: any, cb: any) {
          // Default implementation - tests will override this
          cb([], 'OK');
        }
      },
    },
  },
} as any;

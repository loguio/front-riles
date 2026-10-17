// Jest setup shared across the suite.
// The AsyncStorage native module is unavailable under Jest, so provide an
// in-memory mock. This keeps i18n language-persistence tests quiet and green.
jest.mock("@react-native-async-storage/async-storage", () => {
  const store = {};
  const asyncStorageMock = {
    getItem: jest.fn((key) => Promise.resolve(store[key] ?? null)),
    setItem: jest.fn((key, value) => {
      store[key] = value;
      return Promise.resolve();
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
      return Promise.resolve();
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach((key) => delete store[key]);
      return Promise.resolve();
    }),
  };
  return { __esModule: true, default: asyncStorageMock, ...asyncStorageMock };
});

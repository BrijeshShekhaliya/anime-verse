// Marks work that nobody is waiting for (startup warm-up, background cache
// refreshes) so rate-limited API queues can serve visitors' requests first.
const { AsyncLocalStorage } = require('async_hooks');

const store = new AsyncLocalStorage();

// Runs `fn` (and everything it awaits) as background work.
const inBackground = (fn) => store.run({ background: true }, fn);
const isBackground = () => Boolean(store.getStore()?.background);

module.exports = { inBackground, isBackground };

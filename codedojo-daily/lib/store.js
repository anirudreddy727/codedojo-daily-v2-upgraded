'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');

const EMPTY = () => ({ teams: [], submissions: [] });
function validDatabase(value) {
  return value && Array.isArray(value.teams) && Array.isArray(value.submissions);
}

function createStore(file) {
  let queue = Promise.resolve();
  async function read() {
    try {
      const parsed = JSON.parse(await fs.readFile(file, 'utf8'));
      return validDatabase(parsed) ? parsed : EMPTY();
    } catch (error) {
      if (error.code === 'ENOENT') return EMPTY();
      throw new Error(`Database could not be read: ${error.message}`);
    }
  }
  async function write(data) {
    const dir = path.dirname(file);
    await fs.mkdir(dir, { recursive: true });
    const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
    const handle = await fs.open(temp, 'w', 0o600);
    try {
      await handle.writeFile(`${JSON.stringify(data, null, 2)}\n`, 'utf8');
      await handle.sync();
    } finally { await handle.close(); }
    await fs.rename(temp, file);
  }
  function transact(mutator) {
    const operation = queue.then(async () => {
      const data = await read();
      const result = await mutator(data);
      await write(data);
      return result;
    });
    queue = operation.catch(() => {});
    return operation;
  }
  return { read, transact };
}
module.exports = { createStore, validDatabase };

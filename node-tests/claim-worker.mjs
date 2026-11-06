import { parentPort, workerData } from 'node:worker_threads';
import { Store, ContextError } from '../src/store.mjs';
const store = new Store(workerData.database);
try { parentPort.postMessage(store.claimTask({ project_id: 'demo', task_id: workerData.taskId, agent_id: workerData.agent, expected_version: 1 }).owner); }
catch (error) { if (error instanceof ContextError) parentPort.postMessage(null); else throw error; }
finally { store.close(); }

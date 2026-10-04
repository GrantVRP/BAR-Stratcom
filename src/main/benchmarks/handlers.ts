import { handle } from '../ipc/register';
import { loadBenchmark } from './loader';

export function registerBenchmarkHandlers(): void {
  handle('benchmarks:get', (req) => loadBenchmark(req));
}

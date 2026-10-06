/**
 * coach.json `seq` for every writer (coach runner, radar runner). The widget ignores a doc whose seq is
 * not above the last one it read and keeps that number while BAR runs, through coaching restarts and
 * app restarts; a counter that started at 1 again was ignored until it caught up (T09.6). So the next
 * number is above the last one and never below the wall clock in milliseconds.
 */
let last = 0;

export function nextCoachSeq(now = Date.now()): number {
  last = Math.max(last + 1, Math.floor(now));
  return last;
}

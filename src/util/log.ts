/** Minimal leveled console logger. */

let verbose = false;

export function setVerbose(v: boolean): void {
  verbose = v;
}

export function info(msg: string): void {
  console.log(msg);
}

export function debug(msg: string): void {
  if (verbose) console.log(`  ${msg}`);
}

export function warn(msg: string): void {
  console.warn(`! ${msg}`);
}

export function error(msg: string): void {
  console.error(`x ${msg}`);
}

/**
 * Returns true if a process with the given PID appears to be running.
 * Uses signal 0 (existence check) — no signal is actually delivered.
 */
export function isProcessAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code === "ESRCH") return false;
    // EPERM or other: process exists but we can't signal it
    if (code === "EPERM") return true;
    return false;
  }
}

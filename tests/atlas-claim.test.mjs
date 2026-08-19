import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('Atlas claim authority passes its Python concurrency and failure suite', () => {
  const candidates = [process.env.PYTHON, 'python3', 'python'].filter(Boolean);
  let result;
  for (const executable of candidates) {
    result = spawnSync(
      executable,
      ['-m', 'unittest', 'discover', '-s', 'tests', '-p', 'atlas_claim_test.py', '-v'],
      { cwd: new URL('..', import.meta.url), encoding: 'utf8' }
    );
    if (result.error?.code !== 'ENOENT') break;
  }

  assert.equal(
    result.status,
    0,
    `Atlas Python tests failed.\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`
  );
});

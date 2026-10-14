import type { Reporter, TestCase, TestResult, FullResult } from '@playwright/test/reporter';
import { mkdirSync, writeFileSync } from 'node:fs';
// Keep passwords, provider callback tokens and request bodies out of terminal diagnostics.
export default class SafeReporter implements Reporter {
  onStdOut(chunk: string | Buffer) {
    const text = chunk.toString();
    if (
      /^(Heart preview mode:|Browser motion query:|Heart console category:|Heart browser runtime error:|Heart synthetic letter cleanup pending|Heart diagnostic:)/.test(
        text,
      )
    )
      process.stdout.write(text);
  }
  passed = 0;
  skipped = 0;
  failed = 0;
  onTestEnd(test: TestCase, result: TestResult) {
    if (result.status === 'passed') this.passed++;
    else if (result.status === 'skipped') this.skipped++;
    else this.failed++;
    console.log(`${result.status}: ${test.title}`);
    for (const error of result.errors)
      if (error.location)
        console.log(`Failure location: ${error.location.file}:${error.location.line}`);
  }
  onEnd(result: FullResult) {
    mkdirSync('test-results', { recursive: true });
    writeFileSync(
      'test-results/secretlove-summary.json',
      JSON.stringify({
        status: result.status,
        passed: this.passed,
        skipped: this.skipped,
        failed: this.failed,
      }),
    );
    console.log(
      `Browser result: ${result.status}; ${this.passed} passed, ${this.skipped} skipped, ${this.failed} failed.`,
    );
  }
}

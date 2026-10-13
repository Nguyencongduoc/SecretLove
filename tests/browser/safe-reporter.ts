import type { Reporter, TestCase, TestResult, FullResult } from '@playwright/test/reporter';
// Keep passwords, provider callback tokens and request bodies out of terminal diagnostics.
export default class SafeReporter implements Reporter {
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
    console.log(
      `Browser result: ${result.status}; ${this.passed} passed, ${this.skipped} skipped, ${this.failed} failed.`,
    );
  }
}

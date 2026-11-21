import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import {
  HttpResponse,
  RunnerOptions,
  RunnerSummary,
  SkipException,
  TestContext,
  TestResult,
  TestSuite,
  Tier,
  TierStats,
} from './harness/types';
import { createHttpClient, HttpClient } from './harness/client';

// Global test registry
const registeredSuites: TestSuite[] = [];

export function registerSuite(suite: TestSuite): void {
  registeredSuites.push(suite);
}

export const registerTestSuite = registerSuite;

export function clearSuites(): void {
  registeredSuites.length = 0;
}

export function getRegisteredTestSuites(): TestSuite[] {
  return [...registeredSuites];
}

// ─── CLI Argument Parser ─────────────────────────────────────────
export function parseArgs(args: string[]): RunnerOptions {
  const options: RunnerOptions = {
    baseUrl: process.env.E2E_BASE_URL || 'http://localhost:4000/api/v1',
    verbose: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--tier' && i + 1 < args.length) {
      const parsedTier = parseInt(args[++i], 10);
      if ([1, 2, 3, 4].includes(parsedTier)) {
        options.tier = parsedTier as Tier;
      } else {
        console.error(`Invalid tier: ${args[i]}. Must be 1, 2, 3, or 4.`);
        process.exit(1);
      }
    } else if (arg === '--file' && i + 1 < args.length) {
      options.filePattern = args[++i];
    } else if (arg === '--url' && i + 1 < args.length) {
      options.baseUrl = args[++i];
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  return options;
}

function printHelp(): void {
  console.log(`
Lammart E2E Test Suite Runner
Usage:
  tsx tests/e2e/runner.ts [options]
  npm run test:e2e [-- options]

Options:
  --tier <1|2|3|4>     Run tests only for the specified Tier
  --file <pattern>     Run test files matching the substring pattern
  --url <baseUrl>      Target API base URL (default: http://localhost:4000/api/v1)
  --verbose, -v        Enable detailed assertion and request logging
  --help, -h           Show this help message
`);
}

// ─── Server Connectivity Probe ───────────────────────────────────
export async function checkServerConnectivity(baseUrl: string): Promise<boolean> {
  const probeClient = createHttpClient(baseUrl);
  try {
    // Attempt a lightweight request to the base URL
    await probeClient.get('', { timeoutMs: 2500 });
    return true;
  } catch {
    return false;
  }
}

// ─── Test File Discovery ─────────────────────────────────────────
export function discoverTestFiles(
  rootDir: string,
  selectedTier?: Tier,
  filePattern?: string
): string[] {
  const discovered: string[] = [];
  const tierDirs: { tier: Tier; dirName: string }[] = [
    { tier: 1, dirName: 'tier1' },
    { tier: 2, dirName: 'tier2' },
    { tier: 3, dirName: 'tier3' },
    { tier: 4, dirName: 'tier4' },
  ];

  for (const { tier, dirName } of tierDirs) {
    if (selectedTier && selectedTier !== tier) {
      continue;
    }

    const tierPath = path.join(rootDir, dirName);
    if (!fs.existsSync(tierPath)) {
      continue;
    }

    const files = fs.readdirSync(tierPath);
    for (const file of files) {
      if (!file.endsWith('.test.ts') && !file.endsWith('.test.js')) {
        continue;
      }

      if (filePattern && !file.toLowerCase().includes(filePattern.toLowerCase())) {
        continue;
      }

      discovered.push(path.join(tierPath, file));
    }
  }

  return discovered.sort();
}

// ─── Test Execution Engine ───────────────────────────────────────
export async function runSuite(
  suite: TestSuite,
  options: RunnerOptions,
  onResult: (result: TestResult, testIndex: number) => void
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const client = new HttpClient(options.baseUrl);

  // Run beforeAll hook
  if (suite.beforeAll) {
    try {
      await suite.beforeAll({ baseUrl: options.baseUrl, client });
    } catch (err: any) {
      console.error(`[ERROR] beforeAll failed for suite "${suite.name}":`, err.message);
      // Mark all tests as failed
      for (const test of suite.tests) {
        const res: TestResult = {
          name: test.name,
          suiteName: suite.name,
          tier: suite.tier,
          status: 'failed',
          durationMs: 0,
          error: err,
        };
        results.push(res);
        onResult(res, results.length);
      }
      return results;
    }
  }

  const hasOnly = suite.tests.some((t) => t.only);

  for (let i = 0; i < suite.tests.length; i++) {
    const test = suite.tests[i];

    if (test.skip || (hasOnly && !test.only)) {
      const res: TestResult = {
        name: test.name,
        suiteName: suite.name,
        tier: suite.tier,
        status: 'skipped',
        durationMs: 0,
      };
      results.push(res);
      onResult(res, results.length);
      continue;
    }

    const startTime = Date.now();
    const testContext: TestContext = {
      client: new HttpClient(options.baseUrl),
      baseUrl: options.baseUrl,
      isServerUp: options.isServerUp ?? false,
      tier: suite.tier,
      suiteName: suite.name,
      testName: test.name,
      skip: (reason?: string) => {
        throw new SkipException(reason);
      },
      log: (msg: string) => {
        if (options.verbose) {
          console.log(`    [LOG] ${msg}`);
        }
      },
    };

    let status: 'passed' | 'failed' | 'skipped' = 'passed';
    let skipReason: string | undefined = undefined;
    let error: any = undefined;
    let timerHandle: NodeJS.Timeout | undefined;

    try {
      if (suite.beforeEach) {
        await suite.beforeEach(testContext);
      }

      // Execute test function with optional timeout
      const timeoutMs = test.timeoutMs ?? 30000;
      await Promise.race([
        test.fn(testContext),
        new Promise((_, reject) => {
          timerHandle = setTimeout(
            () => reject(new Error(`Test timed out after ${timeoutMs}ms`)),
            timeoutMs
          );
        }),
      ]);

      if (suite.afterEach) {
        await suite.afterEach(testContext);
      }
    } catch (err: any) {
      if (err instanceof SkipException || err?.isSkip) {
        status = 'skipped';
        skipReason = err.reason;
      } else {
        status = 'failed';
        error = err;
      }
    } finally {
      if (timerHandle) {
        clearTimeout(timerHandle);
      }
    }

    const durationMs = Date.now() - startTime;
    const res: TestResult = {
      name: test.name,
      suiteName: suite.name,
      tier: suite.tier,
      status,
      skipReason,
      durationMs,
      error,
    };

    results.push(res);
    onResult(res, results.length);
  }

  // Run afterAll hook
  if (suite.afterAll) {
    try {
      await suite.afterAll({ baseUrl: options.baseUrl, client });
    } catch (err: any) {
      console.error(`[ERROR] afterAll failed for suite "${suite.name}":`, err.message);
    }
  }

  return results;
}

// ─── Main Runner Entrypoint ──────────────────────────────────────
export async function main(): Promise<number> {
  const options = parseArgs(process.argv.slice(2));
  const startTime = Date.now();

  console.log('='.repeat(70));
  console.log(` LAMMART E2E TEST RUNNER`);
  console.log(` Target API Base URL : ${options.baseUrl}`);
  console.log(` Tier Filter         : ${options.tier ? `Tier ${options.tier}` : 'All Tiers (1-4)'}`);
  if (options.filePattern) {
    console.log(` File Pattern        : ${options.filePattern}`);
  }
  console.log('='.repeat(70));

  // Check server connectivity
  const isServerUp = await checkServerConnectivity(options.baseUrl);
  options.isServerUp = isServerUp;
  if (!isServerUp) {
    console.log(`\n[NOTICE] Target server at "${options.baseUrl}" is currently unreachable.`);
    console.log(`If running tests requiring a live backend, ensure the server is running:`);
    console.log(`  npm run dev:api   (or npm run dev)\n`);
  } else {
    console.log(`[OK] Successfully connected to API server at ${options.baseUrl}\n`);
  }

  // Discover and load test suites
  const testsDir = __dirname;
  const testFiles = discoverTestFiles(testsDir, options.tier, options.filePattern);

  if (testFiles.length === 0) {
    console.log(`No test files found matching criteria.`);
    return 0;
  }

  console.log(`Discovered ${testFiles.length} test file(s):`);
  for (const file of testFiles) {
    const rel = path.relative(testsDir, file);
    console.log(`  - ${rel}`);
  }
  console.log('');

  // Dynamically import all matching test files to register suites
  clearSuites();
  for (const file of testFiles) {
    try {
      const fileUrl = pathToFileURL(file).href;
      await import(fileUrl);
    } catch (err: any) {
      console.error(`Failed to load test file "${file}":`, err);
      return 1;
    }
  }

  const suitesToRun = getRegisteredTestSuites().filter((s) => {
    if (options.tier && s.tier !== options.tier) return false;
    return true;
  });

  if (suitesToRun.length === 0) {
    console.log(`No test suites registered for the selected filters.`);
    return 0;
  }

  // Calculate total tests for TAP plan
  let totalTestsPlanned = 0;
  for (const suite of suitesToRun) {
    totalTestsPlanned += suite.tests.length;
  }

  console.log('TAP version 13');
  console.log(`1..${totalTestsPlanned}`);

  let globalTestNumber = 0;
  const allResults: TestResult[] = [];

  for (const suite of suitesToRun) {
    console.log(`\n# Suite: [Tier ${suite.tier}] ${suite.name}`);
    const results = await runSuite(suite, options, (res) => {
      globalTestNumber++;
      if (res.status === 'passed') {
        console.log(`ok ${globalTestNumber} - [Tier ${res.tier}] ${res.suiteName} > ${res.name} (${res.durationMs}ms)`);
      } else if (res.status === 'skipped') {
        const reasonText = res.skipReason ? ` ${res.skipReason}` : '';
        console.log(`ok ${globalTestNumber} - [Tier ${res.tier}] ${res.suiteName} > ${res.name} # SKIP${reasonText}`);
      } else {
        console.log(`not ok ${globalTestNumber} - [Tier ${res.tier}] ${res.suiteName} > ${res.name} (${res.durationMs}ms)`);
        console.log('  ---');
        console.log(`  message: ${JSON.stringify(res.error?.message || 'Unknown error')}`);
        if (res.error?.stack) {
          const stackLines = res.error.stack.split('\n').slice(0, 5).join('\n    ');
          console.log(`  stack: |\n    ${stackLines}`);
        }
        console.log('  ...');
      }
    });

    allResults.push(...results);
  }

  const totalDuration = Date.now() - startTime;

  // Build Summary
  const summary: RunnerSummary = {
    totalSuites: suitesToRun.length,
    totalTests: allResults.length,
    passed: allResults.filter((r) => r.status === 'passed').length,
    failed: allResults.filter((r) => r.status === 'failed').length,
    skipped: allResults.filter((r) => r.status === 'skipped').length,
    durationMs: totalDuration,
    tierBreakdown: {
      1: { total: 0, passed: 0, failed: 0, skipped: 0 },
      2: { total: 0, passed: 0, failed: 0, skipped: 0 },
      3: { total: 0, passed: 0, failed: 0, skipped: 0 },
      4: { total: 0, passed: 0, failed: 0, skipped: 0 },
    },
  };

  for (const r of allResults) {
    const tb = summary.tierBreakdown[r.tier];
    if (tb) {
      tb.total++;
      if (r.status === 'passed') tb.passed++;
      else if (r.status === 'failed') tb.failed++;
      else if (r.status === 'skipped') tb.skipped++;
    }
  }

  // Print Summary Table
  console.log('\n' + '='.repeat(70));
  console.log(' E2E TEST EXECUTION SUMMARY');
  console.log('='.repeat(70));
  console.log(` Total Suites  : ${summary.totalSuites}`);
  console.log(` Total Tests   : ${summary.totalTests}`);
  console.log(` Passed        : ${summary.passed}`);
  console.log(` Failed        : ${summary.failed}`);
  console.log(` Skipped       : ${summary.skipped}`);
  console.log(` Total Time    : ${(summary.durationMs / 1000).toFixed(2)}s`);
  console.log('-'.repeat(70));
  console.log(' TIER BREAKDOWN:');
  for (const t of [1, 2, 3, 4] as Tier[]) {
    const stats = summary.tierBreakdown[t];
    if (stats.total > 0) {
      console.log(
        `   Tier ${t}: ${stats.passed}/${stats.total} passed (${stats.failed} failed, ${stats.skipped} skipped)`
      );
    }
  }
  console.log('='.repeat(70));

  if (summary.failed > 0) {
    console.log(`\n❌ TEST RUN FAILED (${summary.failed} failure(s))\n`);
    return 1;
  } else {
    console.log(`\n✅ ALL TESTS PASSED (${summary.passed}/${summary.totalTests})\n`);
    return 0;
  }
}

// Auto-run when executed directly via CLI
if (
  process.argv[1] &&
  (process.argv[1].endsWith('runner.ts') || process.argv[1].endsWith('runner.js'))
) {
  main()
    .then((code) => {
      process.exit(code);
    })
    .catch((err) => {
      console.error('Fatal error in test runner:', err);
      process.exit(1);
    });
}

/**
 * Performance Testing Helper
 *
 * @remarks
 * Utilities for measuring and asserting performance characteristics.
 * Provides benchmarking, latency tracking, and throughput measurement.
 *
 * @packageDocumentation
 */

/**
 * Performance measurement result
 */
export interface PerformanceMeasurement {
  name: string;
  duration: number;
  operations: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

/**
 * Performance statistics
 */
export interface PerformanceStats {
  name: string;
  count: number;
  min: number;
  max: number;
  mean: number;
  median: number;
  p95: number;
  p99: number;
  stdDev: number;
  measurements: number[];
}

/**
 * Performance timer
 */
export class PerformanceTimer {
  private startTime: number = 0;
  private measurements: PerformanceMeasurement[] = [];

  /**
   * Start timer
   */
  start(): void {
    this.startTime = performance.now();
  }

  /**
   * Stop timer and record measurement
   */
  stop(name: string, operations = 1, metadata?: Record<string, any>): number {
    const duration = performance.now() - this.startTime;
    this.measurements.push({
      name,
      duration,
      operations,
      timestamp: Date.now(),
      metadata,
    });
    return duration;
  }

  /**
   * Measure function execution time
   */
  async measure<T>(
    name: string,
    fn: () => T | Promise<T>,
    metadata?: Record<string, any>
  ): Promise<{ result: T; duration: number }> {
    this.start();
    const result = await fn();
    const duration = this.stop(name, 1, metadata);
    return { result, duration };
  }

  /**
   * Get all measurements
   */
  getMeasurements(): readonly PerformanceMeasurement[] {
    return [...this.measurements];
  }

  /**
   * Get measurements by name
   */
  getMeasurementsByName(name: string): PerformanceMeasurement[] {
    return this.measurements.filter((m) => m.name === name);
  }

  /**
   * Clear all measurements
   */
  clear(): void {
    this.measurements = [];
  }
}

/**
 * Calculate performance statistics
 */
export function calculateStats(durations: number[], name: string): PerformanceStats {
  if (durations.length === 0) {
    throw new Error('Cannot calculate statistics for empty array');
  }

  const sorted = [...durations].sort((a, b) => a - b);
  const count = sorted.length;

  const sum = sorted.reduce((a, b) => a + b, 0);
  const mean = sum / count;

  const variance = sorted.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / count;
  const stdDev = Math.sqrt(variance);

  const median = sorted[Math.floor(count / 2)];
  const p95 = sorted[Math.floor(count * 0.95)];
  const p99 = sorted[Math.floor(count * 0.99)];

  return {
    name,
    count,
    min: sorted[0],
    max: sorted[count - 1],
    mean,
    median,
    p95,
    p99,
    stdDev,
    measurements: sorted,
  };
}

/**
 * Performance benchmark configuration
 */
export interface BenchmarkConfig {
  name: string;
  iterations: number;
  warmupIterations?: number;
  parallel?: boolean;
  concurrency?: number;
}

/**
 * Benchmark result
 */
export interface BenchmarkResult {
  name: string;
  iterations: number;
  stats: PerformanceStats;
  throughput: number; // operations per second
}

/**
 * Run performance benchmark
 */
export async function benchmark<T>(
  config: BenchmarkConfig,
  fn: () => T | Promise<T>
): Promise<BenchmarkResult> {
  const { name, iterations, warmupIterations = 5, parallel = false, concurrency = 10 } = config;

  // Warmup
  for (let i = 0; i < warmupIterations; i++) {
    await fn();
  }

  // Measure
  const durations: number[] = [];

  if (parallel && concurrency > 1) {
    // Run in parallel batches
    const batches = Math.ceil(iterations / concurrency);
    for (let batch = 0; batch < batches; batch++) {
      const batchSize = Math.min(concurrency, iterations - batch * concurrency);
      const promises = Array.from({ length: batchSize }, async () => {
        const start = performance.now();
        await fn();
        return performance.now() - start;
      });
      const batchDurations = await Promise.all(promises);
      durations.push(...batchDurations);
    }
  } else {
    // Run sequentially
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await fn();
      const duration = performance.now() - start;
      durations.push(duration);
    }
  }

  const stats = calculateStats(durations, name);
  const totalTime = durations.reduce((a, b) => a + b, 0) / 1000; // Convert to seconds
  const throughput = iterations / totalTime;

  return {
    name,
    iterations,
    stats,
    throughput,
  };
}

/**
 * Performance assertions
 */
export class PerformanceAssertions {
  /**
   * Assert that operation completes within time limit
   */
  static assertLatency(duration: number, maxLatencyMs: number, operation: string): void {
    if (duration > maxLatencyMs) {
      throw new Error(
        `${operation} exceeded maximum latency. Expected: <${maxLatencyMs}ms, Actual: ${duration.toFixed(2)}ms`
      );
    }
  }

  /**
   * Assert that p95 latency is within limit
   */
  static assertP95Latency(stats: PerformanceStats, maxLatencyMs: number): void {
    if (stats.p95 > maxLatencyMs) {
      throw new Error(
        `p95 latency exceeded maximum for "${stats.name}". Expected: <${maxLatencyMs}ms, Actual: ${stats.p95.toFixed(2)}ms`
      );
    }
  }

  /**
   * Assert that p99 latency is within limit
   */
  static assertP99Latency(stats: PerformanceStats, maxLatencyMs: number): void {
    if (stats.p99 > maxLatencyMs) {
      throw new Error(
        `p99 latency exceeded maximum for "${stats.name}". Expected: <${maxLatencyMs}ms, Actual: ${stats.p99.toFixed(2)}ms`
      );
    }
  }

  /**
   * Assert that mean latency is within limit
   */
  static assertMeanLatency(stats: PerformanceStats, maxLatencyMs: number): void {
    if (stats.mean > maxLatencyMs) {
      throw new Error(
        `Mean latency exceeded maximum for "${stats.name}". Expected: <${maxLatencyMs}ms, Actual: ${stats.mean.toFixed(2)}ms`
      );
    }
  }

  /**
   * Assert minimum throughput
   */
  static assertThroughput(throughput: number, minOpsPerSecond: number, operation: string): void {
    if (throughput < minOpsPerSecond) {
      throw new Error(
        `${operation} throughput below minimum. Expected: >${minOpsPerSecond} ops/s, Actual: ${throughput.toFixed(2)} ops/s`
      );
    }
  }
}

/**
 * Format benchmark results for display
 */
export function formatBenchmarkResult(result: BenchmarkResult): string {
  const { name, iterations, stats, throughput } = result;
  return `
Benchmark: ${name}
Iterations: ${iterations}
Duration:
  - Min: ${stats.min.toFixed(2)}ms
  - Max: ${stats.max.toFixed(2)}ms
  - Mean: ${stats.mean.toFixed(2)}ms
  - Median: ${stats.median.toFixed(2)}ms
  - p95: ${stats.p95.toFixed(2)}ms
  - p99: ${stats.p99.toFixed(2)}ms
  - StdDev: ${stats.stdDev.toFixed(2)}ms
Throughput: ${throughput.toFixed(2)} ops/s
  `.trim();
}

/**
 * Memory usage snapshot
 */
export interface MemorySnapshot {
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
  timestamp: number;
}

/**
 * Take memory snapshot
 */
export function takeMemorySnapshot(): MemorySnapshot {
  const mem = process.memoryUsage();
  return {
    heapUsed: mem.heapUsed,
    heapTotal: mem.heapTotal,
    external: mem.external,
    arrayBuffers: mem.arrayBuffers,
    timestamp: Date.now(),
  };
}

/**
 * Calculate memory delta
 */
export function calculateMemoryDelta(
  before: MemorySnapshot,
  after: MemorySnapshot
): MemorySnapshot {
  return {
    heapUsed: after.heapUsed - before.heapUsed,
    heapTotal: after.heapTotal - before.heapTotal,
    external: after.external - before.external,
    arrayBuffers: after.arrayBuffers - before.arrayBuffers,
    timestamp: after.timestamp,
  };
}

/**
 * Format memory snapshot for display
 */
export function formatMemorySnapshot(snapshot: MemorySnapshot): string {
  const formatBytes = (bytes: number): string => {
    const mb = bytes / 1024 / 1024;
    return `${mb.toFixed(2)} MB`;
  };

  return `
Memory Usage:
  - Heap Used: ${formatBytes(snapshot.heapUsed)}
  - Heap Total: ${formatBytes(snapshot.heapTotal)}
  - External: ${formatBytes(snapshot.external)}
  - Array Buffers: ${formatBytes(snapshot.arrayBuffers)}
  `.trim();
}

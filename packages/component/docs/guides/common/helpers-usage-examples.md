# Helper Utilities Usage Examples

This document demonstrates how to use the helper utilities from `@atakora/component/common` for creating readable and type-safe configurations.

## Available Helper Utilities

### Duration Helpers

- `milliseconds(value)` - Create duration in milliseconds
- `seconds(value)` - Create duration in seconds
- `minutes(value)` - Create duration in minutes
- `hours(value)` - Create duration in hours
- `days(value)` - Create duration in days

### Threshold Builders

- `greaterThan(value)` - Create "greater than" threshold
- `lessThan(value)` - Create "less than" threshold
- `between(min, max)` - Create "between" threshold (inclusive)
- `equals(value)` - Create "equals" threshold
- `olderThan(duration)` - Create "older than" threshold for age-based comparisons

### Size Utilities

- `bytes(value)` - Create size in bytes
- `kilobytes(value)` - Create size in kilobytes (1024 bytes)
- `megabytes(value)` - Create size in megabytes
- `gigabytes(value)` - Create size in gigabytes
- `terabytes(value)` - Create size in terabytes

## Usage Examples

### Basic Duration Usage

```typescript
import { seconds, minutes, hours, days } from '@atakora/component/common';

// Create durations
const timeout = seconds(30);
const interval = minutes(5);
const retention = days(7);

// Convert to different units
console.log(timeout.toMilliseconds()); // 30000
console.log(interval.toSeconds()); // 300
console.log(retention.toHours()); // 168

// Format as ISO 8601
console.log(timeout.toISOString()); // PT30S
console.log(interval.toISOString()); // PT5M
console.log(retention.toISOString()); // P7D

// Format as ARM template duration
console.log(timeout.toArmDuration()); // 0.00:00:30
console.log(interval.toArmDuration()); // 0.00:05:00
console.log(retention.toArmDuration()); // 7.00:00:00

// Human-readable string
console.log(timeout.toString()); // "30 seconds"
console.log(interval.toString()); // "5 minutes"
```

### Threshold Usage

```typescript
import {
  greaterThan,
  lessThan,
  between,
  equals,
  olderThan,
  minutes,
  days,
} from '@atakora/component/common';

// Numeric thresholds
const cpuAlert = greaterThan(80);
const lowMemory = lessThan(10);
const normalRange = between(20, 80);
const exactMatch = equals(100);

// Evaluate thresholds
console.log(cpuAlert.evaluate(85)); // true
console.log(lowMemory.evaluate(5)); // true
console.log(normalRange.evaluate(50)); // true
console.log(exactMatch.evaluate(100)); // true

// Duration thresholds
const longRunning = greaterThan(minutes(5));
const quickResponse = lessThan(minutes(1));

console.log(longRunning.evaluate(minutes(6))); // true
console.log(quickResponse.evaluate(seconds(30))); // true

// Age-based thresholds
const staleData = olderThan(days(30));
const dataAge = days(45);

console.log(staleData.evaluate(dataAge)); // true
```

### Size Usage

```typescript
import { bytes, kilobytes, megabytes, gigabytes, terabytes } from '@atakora/component/common';

// Create sizes
const cacheSize = megabytes(512);
const diskSpace = gigabytes(100);
const backup = terabytes(5);

// Convert between units
console.log(cacheSize.toBytes()); // 536870912
console.log(diskSpace.toMegabytes()); // 102400
console.log(backup.toGigabytes()); // 5120

// Human-readable string
console.log(cacheSize.toString()); // "512 MB"
console.log(diskSpace.toString()); // "100 GB"
console.log(backup.toString()); // "5 TB"

// Binary units (1024-based)
const oneKB = kilobytes(1);
console.log(oneKB.toBytes()); // 1024 (not 1000)
```

## Function Configuration Examples

### Timeout Configuration

```typescript
import { minutes, hours } from '@atakora/component/common';

// Simple timeout
const quickFunction = {
  timeout: minutes(5),
};

// Long-running function
const reportGenerator = {
  timeout: hours(2),
};
```

### Memory Configuration

```typescript
import { megabytes, gigabytes } from '@atakora/component/common';

// Standard function
const standardFunction = {
  memory: megabytes(256),
};

// Memory-intensive function
const dataProcessor = {
  memory: gigabytes(4),
};
```

### Monitoring with Thresholds

```typescript
import { minutes, gigabytes, greaterThan, lessThan } from '@atakora/component/common';

const monitoredFunction = {
  timeout: minutes(10),
  memory: gigabytes(2),
  monitoring: {
    executionTime: greaterThan(minutes(8)), // Warn if > 8 minutes
    memoryUsage: greaterThan(megabytes(1800)), // Warn if > 1.8 GB
    errorRate: greaterThan(5), // Warn if > 5%
    successRate: lessThan(95), // Warn if < 95%
  },
};
```

### Complete Function Configuration

```typescript
import {
  seconds,
  minutes,
  hours,
  days,
  megabytes,
  gigabytes,
  greaterThan,
  lessThan,
  between,
  olderThan,
} from '@atakora/component/common';

const processingFunction = {
  // Basic configuration
  timeout: minutes(15),
  memory: gigabytes(2),

  // Retry policy
  retry: {
    maxAttempts: 3,
    backoff: seconds(30),
    maxBackoff: minutes(5),
  },

  // Monitoring thresholds
  monitoring: {
    executionTime: greaterThan(minutes(12)),
    memoryUsage: greaterThan(megabytes(1800)),
    errorRate: greaterThan(5),
    coldStartTime: greaterThan(seconds(10)),
  },

  // Cache configuration
  cache: {
    ttl: hours(24),
    maxSize: megabytes(100),
    staleAfter: days(7),
  },

  // Data retention
  retention: {
    logs: days(30),
    metrics: days(90),
    alerts: days(180),
  },
};
```

### Real-World Use Cases

#### API Gateway Function

```typescript
import { seconds, milliseconds, megabytes, greaterThan, lessThan } from '@atakora/component/common';

const apiHandler = {
  timeout: seconds(30),
  memory: megabytes(512),
  monitoring: {
    responseTime: greaterThan(milliseconds(500)),
    errorRate: greaterThan(1),
    requestCount: lessThan(10), // Alert if traffic drops
  },
};
```

#### Background Job Processor

```typescript
import { minutes, hours, gigabytes, greaterThan, between } from '@atakora/component/common';

const jobProcessor = {
  timeout: hours(1),
  memory: gigabytes(4),
  retry: {
    maxAttempts: 5,
    backoff: minutes(5),
    maxBackoff: hours(1),
  },
  monitoring: {
    executionTime: greaterThan(minutes(55)),
    memoryUsage: between(gigabytes(2), gigabytes(3.5)),
    queueDepth: greaterThan(1000),
  },
};
```

#### Data Cleanup Function

```typescript
import { days, hours, gigabytes, olderThan, greaterThan } from '@atakora/component/common';

const cleanupFunction = {
  timeout: hours(4),
  memory: gigabytes(1),
  schedule: days(1), // Run daily

  // Cleanup criteria
  dataRetention: {
    logs: olderThan(days(90)),
    tempFiles: olderThan(days(7)),
    cacheEntries: olderThan(hours(24)),
  },

  monitoring: {
    deletedItems: greaterThan(10000), // Alert if many items deleted
    executionTime: greaterThan(hours(3)),
  },
};
```

## Advanced Patterns

### Combining Helpers

```typescript
import { minutes, megabytes, greaterThan } from '@atakora/component/common';

// Duration with threshold
const timeoutAlert = greaterThan(minutes(5));

// Size with threshold
const memoryAlert = greaterThan(megabytes(500));

// Complex evaluation
const executionTime = minutes(6);
const memoryUsage = megabytes(600);

if (timeoutAlert.evaluate(executionTime)) {
  console.log('Function is taking too long!');
}

if (memoryAlert.evaluate(memoryUsage)) {
  console.log('Function is using too much memory!');
}
```

### Type Safety

```typescript
import type { Duration, Size, Threshold } from '@atakora/component/common';
import { minutes, megabytes, greaterThan } from '@atakora/component/common';

// Type-safe function configuration
interface FunctionConfig {
  timeout: Duration;
  memory: Size;
  alerts: {
    executionTime: Threshold<Duration>;
    memoryUsage: Threshold<Size>;
  };
}

const config: FunctionConfig = {
  timeout: minutes(10),
  memory: megabytes(512),
  alerts: {
    executionTime: greaterThan(minutes(8)),
    memoryUsage: greaterThan(megabytes(400)),
  },
};
```

### Conversion Examples

```typescript
import { minutes, hours, megabytes, gigabytes } from '@atakora/component/common';

// Duration conversions
const timespan = hours(2);
console.log(timespan.toMinutes()); // 120
console.log(timespan.toSeconds()); // 7200
console.log(timespan.toMilliseconds()); // 7200000
console.log(timespan.toISOString()); // PT2H
console.log(timespan.toArmDuration()); // 0.02:00:00

// Size conversions
const storage = gigabytes(10);
console.log(storage.toMegabytes()); // 10240
console.log(storage.toKilobytes()); // 10485760
console.log(storage.toBytes()); // 10737418240
```

## Best Practices

### 1. Use Named Constants

```typescript
import { minutes, megabytes } from '@atakora/component/common';

// Good: Named constants
const FUNCTION_TIMEOUT = minutes(5);
const FUNCTION_MEMORY = megabytes(512);

const config = {
  timeout: FUNCTION_TIMEOUT,
  memory: FUNCTION_MEMORY,
};

// Avoid: Magic numbers
const badConfig = {
  timeout: 300000, // What unit is this?
  memory: 536870912, // Hard to read
};
```

### 2. Use Thresholds for Clarity

```typescript
import { greaterThan, lessThan } from '@atakora/component/common';

// Good: Explicit threshold
const highCpuAlert = greaterThan(80);
if (highCpuAlert.evaluate(currentCpu)) {
  // Handle alert
}

// Avoid: Direct comparison
if (currentCpu > 80) {
  // Less declarative
}
```

### 3. Leverage Type Safety

```typescript
import type { Duration, Size } from '@atakora/component/common';

// Good: Typed configuration
function configureFunction(timeout: Duration, memory: Size) {
  // Compiler ensures correct types
}

// Avoid: Untyped configuration
function badConfigureFunction(timeout: number, memory: number) {
  // What units? Milliseconds? Seconds? Bytes?
}
```

### 4. Use Consistent Units

```typescript
import { minutes, megabytes } from '@atakora/component/common';

// Good: Consistent unit choice
const config = {
  timeout: minutes(5),
  retry: minutes(1),
  cache: minutes(60),
};

// Acceptable but less consistent
const mixedConfig = {
  timeout: seconds(300), // 5 minutes
  retry: milliseconds(60000), // 1 minute
  cache: hours(1), // 1 hour
};
```

## Summary

The helper utilities provide:

1. **Readability**: `minutes(5)` is clearer than `300000`
2. **Type Safety**: Compile-time validation of units
3. **Flexibility**: Easy conversion between units
4. **Consistency**: Uniform API across different value types
5. **Integration**: Works seamlessly with Duration, Size, and Threshold types

All helpers are exported from `@atakora/component/common` and are fully tested with 176 passing tests covering:

- Basic creation and conversion
- Edge cases (zero, negative, very large values)
- Type safety and immutability
- Performance benchmarks
- Real-world use cases

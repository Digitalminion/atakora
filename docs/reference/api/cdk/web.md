# Web & App Services API (@atakora/cdk/web)

**Navigation**: [Docs Home](../../../README.md) > [Reference](../../README.md) > [API Reference](../README.md) > Web

---

## Overview

The web namespace provides constructs for Azure App Services, Function Apps, and Static Web Apps.

## Installation

```bash
npm install @atakora/cdk
```

## Import

```typescript
import {
  AppServicePlan,
  WebApp,
  FunctionApp,
  StaticWebApp
} from '@atakora/cdk/web';
```

## Classes

### AppServicePlan

Creates an Azure App Service Plan.

####Class Signature

```typescript
class AppServicePlan extends Resource implements IAppServicePlan {
  constructor(scope: Construct, id: string, props?: AppServicePlanProps);
}
```

#### AppServicePlanProps

```typescript
interface AppServicePlanProps extends ResourceProps {
  readonly resourceGroup?: IResourceGroup;
  readonly sku: AppServicePlanSku;
  readonly kind?: 'Windows' | 'Linux' | 'FunctionApp';
  readonly reserved?: boolean;
}

interface AppServicePlanSku {
  readonly name: string;  // 'B1', 'P1v2', 'S1', etc.
  readonly tier?: string; // 'Basic', 'PremiumV2', 'Standard'
  readonly size?: string;
  readonly capacity?: number;
}
```

#### Examples

```typescript
import { AppServicePlan } from '@atakora/cdk/web';

const plan = new AppServicePlan(this, 'Plan', {
  sku: { name: 'P1v2', tier: 'PremiumV2' }
});
```

---

### WebApp

Creates an Azure Web App.

#### Class Signature

```typescript
class WebApp extends Resource implements IWebApp {
  constructor(scope: Construct, id: string, props: WebAppProps);
}
```

#### WebAppProps

```typescript
interface WebAppProps extends ResourceProps {
  readonly resourceGroup?: IResourceGroup;
  readonly serverFarmId: string;
  readonly httpsOnly?: boolean;
  readonly siteConfig?: SiteConfig;
}
```

#### Examples

```typescript
import { WebApp } from '@atakora/cdk/web';

const webapp = new WebApp(this, 'WebApp', {
  serverFarmId: plan.id,
  httpsOnly: true,
  siteConfig: {
    alwaysOn: true,
    minTlsVersion: '1.2'
  }
});
```

---

## See Also

- [Network Resources](./network.md)
- [Storage Resources](./storage.md)

---

**Last Updated**: 2025-10-08
**Version**: @atakora/cdk 1.0.0

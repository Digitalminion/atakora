# ADR-020: Networking and Security Strategy for Gen 2

## Context

Atakora Gen 2's `defineBackend()` function automatically provisions infrastructure, but we need to determine the networking and security strategy that balances:

1. **Developer Experience** - Developers shouldn't fight security during development
2. **Enterprise Security** - Production must meet enterprise security requirements
3. **Cost Management** - Security features can be expensive (private endpoints, WAF, DDoS)
4. **Compliance** - Many organizations require network isolation and private connectivity
5. **Simplicity** - Gen 2's philosophy is radical simplicity with zero configuration

The key tension is between making development easy (public endpoints, no VNets) and production secure (private endpoints, network isolation). Additionally, private endpoints alone add ~$35-50/month, and full security stack can cost $4,000+/month.

## Decision

We will implement an **environment-aware progressive security model** with these key decisions:

### 1. Environment-Based Defaults

- **Development**: Public endpoints by default, VNet optional
- **Staging**: VNet with service endpoints (free but secure)
- **Production**: VNet with private endpoints mandatory

### 2. Service Endpoints vs Private Endpoints

Use a smart selection strategy:
- **Service Endpoints** for cost-sensitive environments (free, Azure backbone)
- **Private Endpoints** for production and compliance scenarios (~$7/endpoint/month)

### 3. Three-Tier Security Architecture

All production deployments follow a three-tier model:
1. **Edge Security** - API Management/Application Gateway with WAF
2. **Network Isolation** - VNet with NSGs and subnet segmentation
3. **Resource Security** - Managed Identity, RBAC, Key Vault

### 4. Cost-Conscious Security Levels

Provide clear cost tiers:
- **Basic** (~$0): Public endpoints with IP restrictions
- **Standard** (~$50): Service endpoints + NSGs
- **Enhanced** (~$300): Private endpoints + basic WAF
- **Enterprise** (~$4,000+): Full security stack with Firewall + DDoS

### 5. Zero-Config with Progressive Enhancement

```typescript
// Zero config - smart defaults
const backend = defineBackend({ api });

// Progressive enhancement
const backend = defineBackend({ api }, {
  networking: { forcePrivate: true }  // Override defaults
});
```

## Alternatives Considered

### Alternative 1: Always Private (Security-First)

Force private endpoints in all environments.

**Pros:**
- Consistent security posture
- No accidental data exposure
- Simplified mental model

**Cons:**
- Development becomes painful (VPN required)
- Higher costs even for dev/test
- Slower onboarding for new developers

### Alternative 2: Always Public (Developer-First)

Use public endpoints with authentication/firewall rules.

**Pros:**
- Simple development experience
- Lower infrastructure costs
- Easy debugging and testing

**Cons:**
- Doesn't meet enterprise requirements
- Compliance violations
- Security relies solely on authentication

### Alternative 3: Manual Configuration

Require explicit network configuration for each environment.

**Pros:**
- Full control and flexibility
- No surprises
- Clear cost implications

**Cons:**
- Violates Gen 2's zero-config philosophy
- Boilerplate configuration
- Easy to misconfigure

## Consequences

### Positive Consequences

1. **Developer Velocity** - Developers can work without VPN in development
2. **Enterprise Ready** - Production meets security requirements automatically
3. **Cost Optimization** - Pay for security where it matters
4. **Compliance** - Supports SOC2, HIPAA, PCI requirements
5. **Progressive Enhancement** - Start simple, add security as needed

### Negative Consequences

1. **Environment Differences** - Dev and prod have different network topologies
2. **Testing Gaps** - Private endpoint issues might only surface in production
3. **Configuration Complexity** - More options mean more decisions
4. **Cost Surprises** - Security features can significantly increase costs

### Mitigation Strategies

1. **Clear Documentation** - Explain security levels and costs upfront
2. **Cost Calculator** - Provide tool to estimate security costs
3. **Staging Environment** - Use staging to test private endpoint configuration
4. **Sensible Defaults** - Most apps work with defaults, advanced users can customize

## Success Criteria

This decision will be successful if:

1. **80% of backends** work with zero network configuration
2. **Development setup** takes <5 minutes (no VPN required)
3. **Production deployments** pass security audits by default
4. **Network costs** are predictable and justified
5. **Migration path** exists from dev → staging → production

## Implementation Notes

### Phase 1: Core Networking
- VNet creation with smart subnet allocation
- NSG rules with least-privilege defaults
- Service endpoint configuration

### Phase 2: Private Endpoints
- Automatic private endpoint creation
- Private DNS zone management
- DNS resolution configuration

### Phase 3: Advanced Security
- WAF integration
- DDoS protection options
- Azure Firewall support

### Phase 4: Monitoring
- Network Watcher integration
- Connection troubleshooting
- Performance metrics

## Related Decisions

- ADR-016: Linked Templates Strategy (network resources in separate template)
- ADR-017: Backend API Design (networking configuration interface)
- Gen 2 Governance Design (security policies and compliance)
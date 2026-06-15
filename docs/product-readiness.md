# Radar Product Readiness Notes

## Current status

- UI Complete for MVP prototype flows
- Prototype Complete for local/mobile preview
- Signal model prepared for backend/live data
- Local storage persistence implemented for selected radars, statuses, alerts, settings, and locations
- Hidden subscription tier infrastructure prepared for future business logic; all development users default to `premium` so every feature remains unlocked

## Remaining work

- Backend API implementation
- Third-party API connectors
- Authentication and account sync
- Push notifications
- Email notifications and daily/weekly digests
- Database persistence
- Real calendar export service
- Provider ID matching and enrichment
- Monetization UI and billing integrations, intentionally deferred until product value is proven

## Suggested backend architecture

```text
User
  ↓
Interests
  ↓
Signal Engine
  ↓
API Connectors
  ↓
Signal Database
  ↓
Notifications
  ↓
Radar Dashboard
```

## Implementation notes

- Frontend must call Radar backend endpoints only.
- Third-party API keys must never be exposed in frontend code.
- Backend should store source IDs for interests and run scheduled provider checks.
- Backend should deduplicate provider results into Radar signals before returning them to the app.

## Future monetization integration points

Radar currently has no pricing pages, paywalls, purchase dialogs, subscription screens, billing providers, or upgrade prompts. Future monetization should be integrated behind product-ready feature flags only after the app is useful enough to justify it.

The current frontend supports a hidden `subscriptionTier` field:

- `free`
- `pro`
- `premium`

Development default:

- `premium`

Helper functions:

- `hasPro()`
- `hasPremium()`

Premium should include Pro-level access in future business logic. No user-facing monetization UI should be added until a later product/business phase.

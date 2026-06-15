# Radar Product Readiness Notes

## Current status

- UI Complete for MVP prototype flows
- Prototype Complete for local/mobile preview
- Signal model prepared for backend/live data
- Local storage persistence implemented for selected radars, statuses, alerts, settings, and locations

## Remaining work

- Backend API implementation
- Third-party API connectors
- Authentication and account sync
- Push notifications
- Email notifications and daily/weekly digests
- Database persistence
- Real calendar export service
- Provider ID matching and enrichment

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

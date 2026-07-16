# Naggy

An Expo Go-compatible personal secretary framework. It starts with a dashboard, a time-based planner, a decisive focus card, capture inbox, and flexible secretary-item model for tasks, appointments, calls, bills, and follow-ups.

## Run

```bash
npm install
npx expo start
```

Scan the QR code with Expo Go.

## Future capture integrations

`src/types.ts` includes `CaptureCandidate` and source metadata so email and notification imports can be connected later. These must be explicitly opt-in. Email can use a provider API; reading other apps' notifications requires Android-native permission work and a custom development build, not Expo Go.

# Mikke Privacy Notice

Last updated: 2026-10-01

Mikke's current shopping-monitoring MVP does not require a user account and does not intentionally collect payment data or a personal profile.

## Data processed by the app

- Watch text and structured conditions are stored in the browser using `localStorage`.
- Watch history and derived events are stored in browser `localStorage`.
- When a live shopping search is used, the Watch text and relevant structured search conditions are sent to Mikke's same-origin API route.
- The Mikke server sends the minimum search parameters needed to enabled official providers such as Rakuten Ichiba or Yahoo! Shopping.
- Hosting infrastructure may process technical request information such as IP address, user agent, timestamp, and requested route as part of normal service operation and security logging.
- Mikke operational telemetry is designed to contain metadata such as route/provider/outcome/status/duration, not raw Watch text, full provider request URLs, credentials, or localStorage contents.

## External providers

Live search data is obtained only through enabled official provider APIs. Provider terms and privacy practices are separate from Mikke. Production use requires the connector to be manually approved and explicitly enabled at runtime; credentials alone do not enable a provider.

## Retention

Browser-local Watch/history data remains on the device until the user removes it, browser storage is cleared, or the app's delete-all-data control is used. The current MVP does not intentionally persist Watch content in a Mikke cloud database.

Hosting/runtime logs may have their own retention behavior. Before PUBLIC_BETA, the actual host's **log retention period or policy, deletion behavior, and who can access those logs must be verified and recorded**. Until that deployment-specific review is complete, Mikke does not promise a specific infrastructure-log retention period.

## Access to operational logs

Operational logs should be accessible only to the operator(s) who need them for service operation, incident response, security, or compliance checks. Mikke does not intentionally expose those logs to end users, advertisers, or external merchants/providers.

## Deletion

The app provides a control to delete all Mikke-owned local Watch/history data. It is designed not to delete unrelated storage owned by other functionality on the same origin. This control does not itself delete hosting-provider infrastructure logs; those are governed by the verified hosting configuration and retention policy.

## Analytics and tracking

This MVP does not add an analytics or advertising tracking SDK as part of the public-release gate work.

## Contact

A working operator contact method must be configured and verified before general public release. Until that manual gate is complete, PUBLIC_BETA remains blocked.

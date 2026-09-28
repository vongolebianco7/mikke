# Mikke Privacy Notice

Last updated: 2026-09-29

Mikke's current shopping-monitoring MVP does not require a user account and does not intentionally collect payment data or a personal profile.

## Data processed by the app

- Watch text and structured conditions are stored in the browser using `localStorage`.
- Watch history and derived events are stored in browser `localStorage`.
- When a live shopping search is used, the Watch text and relevant structured search conditions are sent to Mikke's same-origin API route.
- The Mikke server sends the minimum search parameters needed to enabled official providers such as Rakuten Ichiba or Yahoo! Shopping.
- Hosting infrastructure may process technical request information such as IP address, user agent, timestamp, and requested route as part of normal service operation and security logging.

## External providers

Live search data is obtained only through enabled official provider APIs. Provider terms and privacy practices are separate from Mikke. The provider registry identifies which connectors may be enabled for production.

## Retention

Browser-local Watch/history data remains on the device until the user removes it, browser storage is cleared, or the app's delete-all-data control is used. The current MVP does not intentionally persist Watch content in a Mikke cloud database.

## Deletion

The app provides a control to delete all Mikke-owned local Watch/history data. It is designed not to delete unrelated storage owned by other functionality on the same origin.

## Analytics and tracking

This MVP does not add an analytics or advertising tracking SDK as part of the public-release gate work.

## Contact

A working operator contact method must be configured and verified before general public release. Until that manual gate is complete, PUBLIC_BETA remains blocked.

# Security Policy

## Supported version

Security fixes are applied to the latest release and the `main` branch.

## Reporting a vulnerability

Use GitHub private vulnerability reporting when it is enabled for this repository. Otherwise contact the maintainer privately through the address published on the GitHub profile. Do not open a public issue for a vulnerability that could expose imported Timeline data.

Include the affected version, reproduction steps using synthetic data, impact, and any suggested mitigation. Never send a real Timeline export or personal coordinates.

## Privacy boundary

Timeline files must remain in browser memory. Expected external requests are limited to application assets and the configured basemap provider. A change that uploads Timeline contents, adds telemetry, or persists location events is considered a security-sensitive architecture change and requires explicit review.

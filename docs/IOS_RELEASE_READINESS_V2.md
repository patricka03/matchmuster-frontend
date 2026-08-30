# MatchMuster iOS Release Readiness V2

## Locked commercial direction

Target UK customer pricing in App Store Connect:

- Monthly: **£5.99**
- Annual: **£49.99**

React does not hard-code store prices. The subscription page displays Apple's localized StoreKit `priceString`.

The pricing target assumes MatchMuster intends to apply for Apple's App Store Small Business Program if eligible. Actual proceeds depend on taxes, Apple commission, currency and App Store adjustments.

## Plus Preview

Normal first owner-created team:

- 30-day MatchMuster Plus Preview.
- No payment information required.
- No automatic conversion to a paid subscription.
- Monthly and annual purchase options visible from day one.
- Owner gets one reminder at 7 days remaining.
- Owner gets one reminder at 1 day remaining.
- No player or co-manager subscription reminders.
- If no purchase is made, the team safely becomes MatchMuster Free.
- Team, player and historical data are never deleted because the Preview ends.

## Launch Clubs

Launch Club is a permanent team identity, separate from the subscription entitlement.

- Manually selected by the MatchMuster developer.
- Approximate target: 20 clubs.
- The target is not enforced as a hard limit.
- Launch Club badge remains permanently.
- Launch Plus replaces the normal 30-day Plus Preview rather than stacking on top.
- If selected during an active Preview, the 8-week Launch Plus period uses the Preview's original start date.
- If the old Preview is already too old to provide remaining Launch Plus time, the 8 weeks starts when Launch Club status is granted.
- After complimentary access: `Launch Club · Free`.
- If the club later subscribes: `Launch Club · Plus`.
- Launch Plus has the same 7-day and 1-day owner reminders.

The existing internal Rails entitlement source `founder` remains unchanged for compatibility. User-facing wording is **Launch Club / Launch Plus**.

## Apple product IDs

- Monthly: `matchmuster_plus_monthly`
- Annual: `matchmuster_plus_annual`

Create these exact auto-renewable subscription product identifiers in App Store Connect.

## iOS identity

- Bundle ID: `uk.matchmuster.mobile`
- App name: `MatchMuster`

## Apple purchase verification

New purchase:

`POST /teams/:team_id/subscription/apple/claim`

Restore:

`POST /teams/:team_id/subscription/restore`

The client passes the Rails-generated team `billing_account_token` to StoreKit as `appAccountToken`.
Rails verifies Apple's signed StoreKit JWS before granting entitlement.

## App Store Server Notifications

Rails endpoint:

`POST /subscriptions/apple/notifications`

Configure the deployed HTTPS Rails URL in App Store Connect.

## Apple verification configuration on Heroku

Rails currently reads:

- `APPLE_BUNDLE_ID`
- `APPLE_STORE_ENVIRONMENT`
- `APPLE_APP_ID`
- `APPLE_ROOT_CERTIFICATES_BASE64`

Never commit Apple secrets/certificates to Git.

## Apple account-side work still required

- Finish the App Store Connect app record.
- Create monthly and annual auto-renewable subscriptions.
- Set UK pricing to the chosen £5.99 / £49.99 price points.
- Add subscription group/localisation/review metadata.
- Configure App Store Server Notifications.
- Add required Apple verification configuration to Heroku.
- Complete Agreements, Tax and Banking if required.
- Apply for Apple's App Store Small Business Program if eligible.
- Archive/upload an iOS build in Xcode.
- Test through StoreKit sandbox/TestFlight.
- Submit app + subscriptions for App Review.

## Remote testing from another location

If the iPhone is not physically with the Mac running Xcode, do not rely on Xcode's Run button.

Use:

1. Archive the app in Xcode.
2. Upload the archive to App Store Connect.
3. Make the build available in TestFlight.
4. Install/update the build from TestFlight on the iPhone from any internet connection.

Same Wi-Fi is not required for TestFlight.

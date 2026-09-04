# Grow Jewelry Twilio A2P 10DLC campaign answers

Use these answers for the Grow Jewelry sole-proprietor A2P 10DLC campaign. Twilio Verify handles user-requested signup and login verification codes separately. This campaign covers only recurring operational account and customer quote-request alerts sent through Programmable Messaging.

Do not resubmit the campaign until all four public URLs below are deployed, publicly accessible, and manually verified:

- https://growjewelry.io/onboarding
- https://growjewelry.io/privacy
- https://growjewelry.io/terms
- https://growjewelry.io/sms-consent

The public onboarding form and protected Settings form must display the exact consent language documented on `/sms-consent`, with an unchecked optional checkbox, and must allow the user to continue without opting in.

## Campaign use case

Select **Sole Proprietor** for a Sole Proprietor Brand. Do not include authentication or OTP traffic in this campaign; use Twilio Verify for those messages.

## Campaign description

> Grow Jewelry sends recurring non-marketing operational SMS notifications to jewelry-store owners who create a Grow Jewelry account, provide their mobile number, and explicitly opt in to SMS notifications. Messages notify enrolled users about activity on their own Grow Jewelry account and new or updated customer quote requests associated with their store. Message frequency varies based on account and quote activity. Recipients can reply STOP to opt out or HELP for help, and can also disable SMS notifications in account Settings.

## Message flow / How do end users consent?

> Store-account users opt in through one of two Grow Jewelry web flows. During public account onboarding at https://growjewelry.io/onboarding, a user enters a mobile number and may select a separate unchecked checkbox agreeing to receive recurring operational text messages from Grow Jewelry about their account and customer quote requests. A user can complete account creation without selecting the checkbox. A signed-in user may later opt in through Account Settings using the same separate, unchecked consent control; that protected flow is publicly documented at https://growjewelry.io/sms-consent. The disclosure states that message frequency varies, message and data rates may apply, users may reply STOP to opt out or HELP for help, and consent is optional and is not a condition of creating an account or using Grow Jewelry. Terms: https://growjewelry.io/terms. Privacy Policy: https://growjewelry.io/privacy. The Privacy Policy states that mobile numbers and SMS consent data are not sold or shared with third parties or affiliates for marketing or promotional purposes.

## Sample messages

Use square brackets for variable content, as Twilio requests.

1. `Grow Jewelry: You have a new [[product category]] Quote Request from [[customer name]], review it at https://growjewelry.io/owner/quotes/[quote ID]/prepare. Reply STOP to opt out.`
2. `Grow Jewelry: Customer quote request [request ID] has new activity. Sign in to review it at https://growjewelry.io/owner/quotes/[quote ID]/prepare. Reply STOP to opt out.`
3. `Grow Jewelry: An account alert needs your attention: [account alert summary]. Sign in at https://growjewelry.io/owner/settings. Reply HELP for help or STOP to opt out.`

Before submission, confirm these routes exactly match the routes used by production messages. Replace them in both the app and this document if the final quote-detail route differs.

## Campaign attributes

- Messages include embedded links: **Yes**
- Messages include phone numbers: **No**, unless production templates actually include one
- Messages include age-gated content: **No**
- Messages include lending or direct-lending content: **No**

## Opt-in keyword fields

Grow Jewelry does not enroll users by SMS keyword.

- Opt-in keywords: leave blank
- Opt-in message: leave blank

Do not enter `START` as an enrollment keyword unless the production system actually supports keyword enrollment and sends the required confirmation response. A user who previously opted out may use carrier/Twilio-supported resubscribe handling, but that is not one of the campaign's initial consent paths.

## Opt-out and help

Use Twilio's default or Advanced Opt-Out handling. If the Console requires custom samples, use:

**Opt-out message**

> Grow Jewelry: You have been unsubscribed and will receive no further operational text alerts. Reply START to resubscribe.

**Help message**

> Grow Jewelry support: Email support@growjewelry.io for help. Message and data rates may apply. Reply STOP to opt out.

Common supported keywords should include:

- Opt out: `STOP`, `STOPALL`, `UNSUBSCRIBE`, `CANCEL`, `END`, `QUIT`
- Help: `HELP`, `INFO`

## Exact website consent copy

> I agree to receive recurring operational text messages from Grow Jewelry about my account and customer quote requests. Message frequency varies. Message and data rates may apply. Reply STOP to opt out or HELP for help. Consent is optional and is not a condition of creating an account or using Grow Jewelry.

Place visible links to https://growjewelry.io/terms and https://growjewelry.io/privacy beside the consent control. Never preselect or require the checkbox.

## Pre-resubmission checklist

- The Twilio Brand and campaign identify **Grow Jewelry** consistently.
- `growjewelry.io` visibly identifies Grow Jewelry and is functional.
- Onboarding shows the exact optional disclosure and unchecked checkbox.
- Account Settings supports opt-in, opt-out, and number changes using the same disclosure.
- Consent status, timestamp, source, disclosure version, and notification phone number are stored.
- `/privacy`, `/terms`, and `/sms-consent` are public without authentication.
- The Privacy Policy contains the mobile-information and SMS-consent non-sharing statement.
- Every sample identifies Grow Jewelry, matches actual production traffic, includes STOP, and uses a real production URL.
- Embedded links is set to **Yes**.
- OTP messages use Twilio Verify rather than this campaign.
- STOP and HELP behavior has been tested end to end.
- The existing rejected campaign is edited and resubmitted after corrections; do not create a duplicate campaign solely to bypass the rejection.

## Official Twilio references

- https://www.twilio.com/docs/api/errors/30909
- https://www.twilio.com/docs/api/errors/30931
- https://www.twilio.com/docs/messaging/compliance/a2p-10dlc/collect-business-info
- https://www.twilio.com/docs/messaging/compliance/a2p-10dlc/direct-sole-proprietor-registration-overview
- https://www.twilio.com/docs/messaging/compliance/a2p-10dlc

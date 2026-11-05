# KhelGrid Help & Feedback Centre

**Route:** `/help-feedback`  
**Status:** Frontend implementation; email handoff only  
**Owner:** KhelGrid product team

## Purpose

Provide one clear destination for common product questions, suggestions, complaints, reports of incorrect information, technical issues, and direct contact with KhelGrid.

## User experience

- Searchable help articles for opportunities, venues, coaches, academies, listing submissions, trust information, and Sports CV.
- Four entry cards for getting started, sharing feedback, reporting a problem, and contacting KhelGrid.
- A structured feedback form with category, message, optional page/listing reference, and optional reply email.
- A direct email link for users who prefer their own email client.

## Submission and privacy behavior

The form validates a minimum 10-character message and builds a `mailto:` URL addressed to `khelgrid@gmail.com`. It does **not** submit data to a KhelGrid server, store feedback, or confirm that an email was sent. The user's email application opens and the user must review and send the message.

No support response-time commitment is made. No new backend, database table, third-party form service, or paid dependency is introduced.

## Navigation

The desktop sidebar and mobile drawer both navigate to `/help-feedback`. The icon and anchored bottom placement are preserved.

## Content and trust

Help copy must not imply that KhelGrid guarantees listing accuracy, independent verification, booking availability, live feeds, or provider credentials. Users are instructed to confirm changeable details directly with the organiser/provider.

## Future enhancements (separate approval required)

- Persist feedback through a reviewed backend with spam controls, privacy notice, access controls, and retention policy.
- Add a maintained FAQ knowledge base and Hindi translations.
- Add a private support triage workflow and published response-time policy only after staffing/ownership is established.

## Verification checklist

- [ ] Route opens directly and through desktop/mobile sidebar links.
- [ ] Search filters the help article list and has a useful empty state.
- [ ] Feedback form requires a valid message and builds the expected email subject/body.
- [ ] No server submission or success claim is displayed.
- [ ] Keyboard focus, labels, and responsive layouts are reviewed.
- [ ] Typecheck, lint, tests, and production build pass.

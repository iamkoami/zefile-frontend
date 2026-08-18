# Changelog

All notable changes to the ZeFile Frontend will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.67.2] - 2026-08-17

### Changed

- The check added in 1.67.1 can now tell the difference between "this link kept its capital letters" and "nothing is checking this link at all". It was possible to switch the routing rules off for one kind of link and still have the check report everything fine — because a page nobody is checking never fails a check. It now confirms the rules actually ran on each kind of link, rather than only that nothing went wrong. Found during review of 1.67.1. (`scripts/check-route-casing.sh`)

## [1.67.1] - 2026-08-17

### Fixed

- **French download links work again.** Opening a transfer from a `/fr` link told you the transfer had vanished, even when it was sitting right there. The address was being tidied into lowercase on the way through, and short codes care about capital letters — so `jT6Qx4VLRQ` was arriving as `jt6qx4vlrq`, which matches nothing. Practically every code has a capital letter in it, so this affected practically every French link, for as long as `/fr` has existed. Links themselves never changed and nothing was lost; the ones you already sent now open. (`middleware.ts`)
- **File request links work again too, in both languages.** The same tidying hit `/deliver` links — the ones you send when you are asking someone else for files — in English as well as French. Anyone who followed one saw "request not found" instead of your request. (`middleware.ts`)

### Added

- A check that runs on every push and refuses to let this come back. It loads the real site and confirms that links carrying a code keep their capital letters, while ordinary pages still tidy theirs. That second half matters as much as the first: it is what stops a future fix from quietly switching off address tidying across the whole French site. (`scripts/check-route-casing.sh`, `.github/workflows/ci.yml`)

## [1.67.0] - 2026-08-17

### Added

- **The film you paid for now plays on the page.** Until now, buying a film took you to a screen that confirmed the purchase and then offered you nothing to watch — the film was yours and there was nowhere to see it. The player sits on that same page, below the confirmation, and starts on its own without sending you anywhere else. There is no "Watch" button to press, because the film is there rather than one click away. (`features/transfer/components/StreamPlayer.tsx`, `app/downloads/[transferId]/[shortCode]/page.tsx`)
- **A quality setting, for anyone paying for their own data.** You can cap how sharp the picture is, and the choice sticks for the rest of your visit. It only appears when the film actually offers more than one quality, so it is never a control that does nothing. Playback deliberately starts at a lower quality and climbs, so the film begins quickly on a slow connection instead of stalling while it tries for the best possible picture first.
- **The player says what is happening, instead of showing a frozen frame.** If the film pauses to catch up, it says so after a couple of seconds; if it is still struggling fifteen seconds later, it stops implying it will sort itself out and offers you a retry. If the same purchase is already playing on the maximum number of devices, it tells you that, and how long until you can try again. Every one of these is read aloud to anyone using a screen reader rather than only drawn on screen, and every one is written in both English and French.
- **Buying a file to download is completely unchanged.** Same screen, same button, same wording. The player only appears for films.

### Changed

- Downloads and previews of purchased films are fetched rather than embedded, so the page's security policy now needs to know where they come from. Deployments using Cloudflare Stream must set `NEXT_PUBLIC_CLOUDFLARE_STREAM_ORIGIN` to the matching `https://customer-<subdomain>.cloudflarestream.com`; without it playback stops at a black frame with a single message in the browser console and nothing else reports a problem. Self-hosted delivery needs no new setting.

## [1.66.1] - 2026-08-15

### Fixed

- **The wrong-code message was translated; most of the others were not.** The previous release fixed the two failures people hit most often when confirming their email to buy a film, and left four behind. Running out of attempts, asking for a code when none was waiting, and the app failing to check a code at all were all still explained in English to someone reading in French — as was every way that asking for a code in the first place can be refused. All of them now read in the language the visitor chose. "You have tried too many times" and "that code did not work" stay separate messages, because one asks you to start again with a fresh code and the other asks you to retype the one you have.
- **Pressing "Send my code" and being turned down showed nothing at all.** The button un-pressed and the page sat there. The only place this screen could show a message was inside the code box, which does not exist until a code has actually been sent — so every refusal at the email step was invisible, including the common one where you have asked for codes too quickly. There is now a message under the button, and it is announced to anyone using a screen reader rather than only painted on screen.
- **"Wait a moment, then ask again" can now name the number of seconds in French.** The count previously lived inside the English sentence, so translating it meant losing it.

## [1.66.0] - 2026-08-13

### Added

- **Someone buying a film is now asked to confirm their email before the buy button appears.** Only for films — buying a file to download stays anonymous and that screen is unchanged, down to the same wording and layout it had before. The ask is deliberately framed as what the buyer gets rather than as a check on them: confirm your address and the film follows you to any device you sign in from. It is one sentence, it appears once, and it does not mention security or verification, because being made to feel suspected at the moment you are about to pay is its own kind of failure. (`app/downloads/[transferId]/[shortCode]/page.tsx`, `i18n/messages/`)
- **If a session expires between confirming and paying, the buyer is taken back to the code step rather than left on a checkout that cannot work.** (`features/payment/components/SaleCheckoutPanel.tsx`)

### Fixed

- **The button under the six-digit code did nothing when clicked.** The code is displayed as "123 456" so it can be read back easily, and the form was quietly refusing to submit because of that space — no request, no error message, nothing. Anyone who pressed Enter never saw it, which is why it survived every check. The same fault still exists on two older code screens elsewhere in the app and has been written up separately rather than fixed quietly alongside this. (`app/downloads/[transferId]/[shortCode]/page.tsx`)
- **A screen reader announced "code sent to" with no address, before any code had been sent.** The code step was hidden visually but still present for anyone not using their eyes to read the page. It is now genuinely absent until a code has actually been sent.
- **A wrong or expired code was explained in English to people reading the site in French.** The message came straight from the server, which only speaks English. The app now writes its own wording in the reader's language, and keeps "that code did not work" and "that code has expired" as two different messages, because they ask the reader to do two different things.

## [1.65.7] - 2026-08-10

### Fixed

- **Dates across the whole app followed the visitor's computer instead of the language they picked.** Twenty-five places — subscription and billing screens, account settings, file requests, payment screens, the support chat — showed dates in whatever language the visitor's device happened to be set to, regardless of whether they were reading the site in English or French. So a French visitor on an English laptop got "Envoyé le August 4, 2026": a French sentence with an English date sitting in the middle of it. It also meant two people reading the same page in the same language could see different dates, which is why nobody had ever reported it. Dates now follow the language chosen on the site, the same way prices already do since the previous two releases. (`features/subscription/`, `features/account/`, `features/file-request/`, `features/payment/`, `components/shared/`, `app/deliver/`, `app/review/`, `app/payment/success/`)

## [1.65.6] - 2026-08-10

### Changed

- **CFA francs are now called the same thing on every screen, including the last three that disagreed.** The previous release unified most of them; three were left. The screen shown when a payment fails, the withdrawal screen a creator confirms a payout from, and the link preview that appears when a paid transfer is shared all still said `Fr CFA` while everything else said `XOF`. All three now read from the same list, so there is no longer anywhere in the app that can name this currency differently. The link preview also stopped formatting its price the French way for every reader regardless of language. (`app/payment/failed/`, `features/account/components/WithdrawalRequestPanel.tsx`, `app/downloads/[transferId]/[shortCode]/layout.tsx`)

### Removed

- **Three payment screens that nothing could open.** A payment status card, a mobile-money waiting prompt and a payment-method chooser — around 1,600 lines including their tests. Nothing in the app linked to any of them; the real payment flow uses a different set of screens entirely. This is the fourth time this year that finished, tested-looking code has turned out to be reachable by nobody, so it goes rather than sits there looking maintained. One piece of them was genuinely in use — a small definition listing the mobile-money networks, which five live screens depend on — and that was moved somewhere sensible before the rest was removed. (`features/payment/components/`)
- **Three money-formatting helpers no screen called.** They were the only place a zero price would have been written as the English word "Free" rather than the reader's own language, which is why the previous release could not demonstrate that fix working: there was no screen it could happen on. The one helper of that family that is actually used keeps the behaviour. (`lib/currency.ts`)

## [1.65.5] - 2026-08-10

### Fixed

- **French visitors were shown prices written the English way, where the comma means the opposite thing.** A five-thousand-franc film read `5,151.99 XOF` on a French screen. In French, the comma is the decimal mark — so that price can be read as five francs and change, on the screen where someone decides whether to pay. It now reads `5 151,99 XOF` in French and `5,151.99 XOF` in English, checked in a browser in both languages. This got riskier with the previous release, not safer: that one restored the last two digits of the price, and those are exactly the digits a French reader misreads. (`lib/currency.ts`, `lib/locale.ts`, and every screen that shows an amount)
- **Payment screens followed the visitor's computer language instead of the site's.** Someone reading the site in French on an English laptop saw English formatting; someone reading it in English on a French laptop saw French formatting — and, because different parts of the same screen worked differently, could see both at once for the same purchase. Two people looking at the same page could honestly disagree about what it said, which is why nobody had reported it. Every amount now follows the language chosen on the site, and nothing else. (`features/payment/`, `app/payment/success/`, `app/deliver/`)
- **Dates stayed in English on French screens.** The transfer summary read "Envoyé le August 4, 2026" — a French sentence with an English date in the middle of it. Now "Envoyé le 4 août 2026". (`components/shared/TransferSummaryCard.tsx`)

### Changed

- **CFA francs are called the same thing everywhere now.** Some screens said `Fr CFA` and others said `XOF`, occasionally within inches of each other on the same payment screen for the same purchase. Four copies of the same currency list were behind this, and two of them had quietly drifted and lost South African rand along the way. All four are gone; there is one list now, so the labels cannot disagree again. (`features/payment/components/PaymentPanels.tsx`, `app/payment/success/page.tsx`)
- **Amounts show the same number of decimal places wherever they appear.** A price of 1,000.10 could show as `1,000.1` in one panel and `1,000.10` in the panel beside it. Affected roughly one amount in ten — any price ending in a round number of centimes. (`lib/currency.ts`)
- **The link preview for a paid transfer no longer prices everything in French.** Share a paid transfer and the preview card that appears in WhatsApp or on social media formatted the price in French regardless of who was reading. It now follows the reader's language. (`app/downloads/[transferId]/[shortCode]/layout.tsx`)

## [1.65.4] - 2026-08-10

### Removed

- **The last block of admin translations, which nothing could reach.** A review of the previous release went looking for whatever the previous cleanup had missed and found one more: text for an admin notification centre, in both languages, referenced nowhere in the app. It came from the same commit as the admin screens removed in 1.65.3, and it survived that pass because the sweep had looked for text belonging to the screens being deleted — this block belonged to no screen at all. The check is now the right one: does any part of the app actually ask for this text. Nothing admin-related is left in the translation files, which is correct, because this app has no admin area. (`i18n/messages/en.json`, `i18n/messages/fr.json`)

## [1.65.3] - 2026-08-10

### Removed

- **An entire admin panel that was sitting in the customer app, connected to nothing.** Four admin screens — payout settings, the refunds queue, the transactions list and the withdrawals queue — plus a refund request form and the three API clients behind them. All of it finished, all of it written against real endpoints, and none of it reachable: this app has no admin area at all, and nothing has ever linked to any of these screens. They arrived together in one commit in January and had been dead ever since. Around 4,000 lines gone, with no change to anything anyone can see. Admin work belongs in the separate admin app, which is where it lives. (`features/admin/`, `features/refunds/`, `services/admin-transactions-api.ts`, `services/admin-payouts-api.ts`, `services/refunds-api.ts`)
- **Six blocks of translations that nothing could display.** Each one belonged to a screen removed above, so they were text no visitor could ever reach, in two languages, sitting in the file translators work from. One of them existed only in English and was the reason the two language files had drifted apart — they now hold exactly the same set of sections, in the same order. (`i18n/messages/en.json`, `i18n/messages/fr.json`)
- **A money-formatting helper that no screen called.** It lived on the withdrawals API client and would have shown every currency with two decimal places and English number formatting — wrong for CFA francs on both counts. Nothing used it: the payouts and withdrawal screens each format their own amounts. Leaving a broken formatter in place makes it look maintained, and a fixed bug in code nothing runs is indistinguishable from a fixed bug in code that ships. The rest of that client is untouched and still in use. (`services/withdrawals-api.ts`)

## [1.65.2] - 2026-08-10

### Added

- **The build that actually publishes this site is now checked on every push.** The automated checks built the site one way; the publishing service builds it another. Those two had never been compared, and the admin app just spent months proving why that matters — seventeen consecutive failed publishes there, every one of them invisible to checks that stayed green the whole time. This site does not have that fault, and was confirmed clean before this change. The new check is what keeps it that way: it builds exactly the way the publishing service does, on a clean machine, so a break shows up before anyone merges. (`.github/workflows/ci.yml`)

### Changed

- **The build step will no longer quietly download a missing tool.** It used to fetch anything it could not find locally, which works fine on a laptop that already has a copy and is exactly how the admin app's breakage stayed hidden — the command "worked" for everyone who ran it and had never once worked on a clean machine. It now refuses to fetch and stops with the name of what is missing. (`package.json`)

## [1.65.1] - 2026-08-06

### Removed

- **An unused upload method that pointed at a route the backend no longer has.** It sent a whole transfer — details and files together — in a single request, which is how uploads worked before the current chunked flow replaced them. No screen had called it since, but it stayed in the API client, and the README presented it as *the* way to upload a file. Anyone following that example would have written code against a route that skipped the minimum price, stored prices at one hundredth of their value, and recorded no platform fee. The method, its type, and its export are gone. (`services/transfer-api.ts`, `services/index.ts`)

### Changed

- **The README's upload example now shows how uploading actually works.** Three steps — create the transfer, send the files in chunks, then finalize, which is what notifies the sender and recipients — checked against the real function signatures rather than written from memory. It also notes that the amount a person types goes in as a plain amount, with the server doing the conversion, so an example can no longer imply a price one hundredth of what was meant. (`README.md`)

## [1.65.0] - 2026-08-05

### Changed

- **The checkout now asks about the payment method the buyer actually chose.** When a buyer picked bank transfer or USSD, the fee breakdown was worked out as though they had chosen a card — deliberately so, because that is what the charge itself did, and the one rule this panel must never break is that the total shown matches the total charged. Both sides have now been corrected together, so the breakdown describes the method in front of the buyer. **The figure on screen does not change**: no rate has been set for either method yet, so both still resolve to the card rate exactly as before. What changes is that correcting them later becomes a settings change rather than a code release. (`features/payment/components/SaleCheckoutPanel.tsx`, `services/platform-api.ts`)

## [1.64.0] - 2026-08-04

### Fixed

- **The earnings line under the price box overstated what a creator would be paid, by a factor of a hundred.** It worked out her share from the number she had typed, while the service stored that number as a count of centimes — so a creator asking three thousand francs was told she would receive two thousand seven hundred and ninety, against the twenty-seven francs and ninety centimes that would actually reach her. The figure now describes the money she will be credited. (`features/home/components/UploadPanel.tsx`)
- **The smallest price the form would accept was a hundredth of the intended one.** The minimum is held as a sum in whole francs and was compared against a typed price the service counted in centimes. Both sides of that comparison are now on the same footing, and the form accepts and refuses exactly the same prices the service does, so a price is never taken here and rejected there. The same fault, and the same fix, on the budget field when commissioning work. (`features/home/components/UploadPanel.tsx`, `features/file-request/components/FileRequestPanel.tsx`)
- **Several screens showed stored amounts a hundred times too large.** Money is kept by the service in the smallest unit a currency has, but a number of screens handed those amounts to a formatter that expects whole francs and does no conversion. The price and the sales total in the transfer drawer, the amount on a delivery receipt, the price advertised on the link preview that social sites and search engines read, the price on the button a buyer pays from, and every revenue figure in the analytics panel — the headline, the chart, the period total and each row — were all affected. All of them now convert before they display. (`features/transfer/components/TransferDetailsPanel.tsx`, `features/transfer/components/DeliveryProofCard.tsx`, `features/analytics/components/AnalyticsPanel.tsx`, `app/downloads/[transferId]/[shortCode]/layout.tsx`, `app/downloads/[transferId]/[shortCode]/page.tsx`)

### Changed

- **The price and the budget are now sent as the person wrote them**, and the service converts. Nothing in the browser needs to know how finely a currency is counted, which is the point: the same list kept in two places is the kind of thing that drifts. (`features/home/components/UploadPanel.tsx`, `features/file-request/components/FileRequestPanel.tsx`, `services/transfer-api.ts`, `services/file-request-api.ts`)
- **The conversion between stored amounts and readable ones lives in one place.** Five separate copies of it had grown up across the payment screens, the download page and the checkout, each written out by hand. They now share a single pair of helpers, and one leftover function that nothing called at all has been removed. (`lib/currency.ts`, `features/payment/components/PaymentPanels.tsx`, `features/payment/components/SaleCheckoutPanel.tsx`, `features/transfer/components/TransferPreviewPanel.tsx`)

## [1.63.2] - 2026-08-03

### Fixed

- **A buyer waiting on a mobile money prompt was shown no price at all.** On a public sale, the screen that asks you to approve the payment on your phone is handed only the payment's reference — never the price, the fee or the total — so its money breakdown rendered an empty "Amount" row beside an otherwise complete summary. It now carries the figures from the payment that was actually created, rather than from the estimate shown a moment earlier, which could still be describing the previous country if the buyer changed it just before paying. (`app/downloads/[transferId]/[shortCode]/page.tsx`, `features/payment/components/SaleCheckoutPanel.tsx`)
- **Where a purchase is converted before it is charged, only one of the two panels said so.** Buyers in Togo, Benin and Senegal are charged in another currency, and the summary card showed the converted amount only when a processing fee also happened to be present — so on a sale with no fee, the panel on the left disclosed the conversion and the card on the right did not, for the same purchase. The line is no longer tied to the fee. (`components/shared/TransferSummaryCard.tsx`, `app/downloads/[transferId]/[shortCode]/page.tsx`)
- **Amounts on the payment screen were converted twice over.** The summary beside a payment in progress showed the total in whichever currency the viewer had selected for browsing, using approximate rates, while the panel next to it showed the currency actually being charged — two different figures for one purchase. The charged currency is now the headline on that screen, with the viewer's own currency beneath it as a clearly marked approximation, matching the checkout. (`app/downloads/[transferId]/[shortCode]/page.tsx`)

### Changed

- Converted amounts are now displayed exactly as the server formats them, instead of being divided by a hundred on the page. That division is only correct for currencies that have a smaller unit, and several of the ones ZeFile handles do not. (`components/shared/TransferSummaryCard.tsx`, `features/payment/components/SaleCheckoutPanel.tsx`, `services/payment-api.ts`, `services/platform-api.ts`)
- Prices on the payment screen are formatted by the same shared helper as the rest of the checkout, so a CFA amount reads the same way there as it does on the invoice and in the emails. (`app/downloads/[transferId]/[shortCode]/page.tsx`)

## [1.63.1] - 2026-08-02

### Fixed

- **A buyer who had paid could still be refused their download, by three separate routes.** Mobile money never leaves the page — it waits and checks — so it never reached the step that exchanges a settled payment for the permission to download, and its success button asked for the file the ordinary way, which a paid sale does not accept. The receipt email links back with the payment reference under one name and the page only read the two others, so the single recovery link every paying buyer is guaranteed to have was ignored, and the short-link hop in front of it dropped the parameter on the way past in any case. All three names are now read, the parameter survives the redirect, and both ways back — waiting on the page, or returning from the payment provider — ask for the download the same way instead of by two separate pieces of code, only one of which was ever exercised. Permission is granted by a message from the payment provider that can arrive a moment after the payment itself, so the page now waits through that gap and tells the difference between "not ready yet" and "no such sale", rather than showing someone who has just paid that their purchase expired. (`app/downloads/[transferId]/[shortCode]/page.tsx`, `app/downloads/page.tsx`)
- **A download button that did nothing when pressed.** On a paid sale the button appeared as soon as the payment succeeded, but the permission it needs can arrive slightly later; pressed in that window it returned silently. It is now disabled until the download is genuinely ready and says what it is waiting for. The waiting message deliberately does not offer to buy again — this buyer has already paid, and inviting a second payment is the failure the rest of this work exists to prevent. (`app/downloads/[transferId]/[shortCode]/page.tsx`)
- **The page a payment provider returns to verified against an address that no longer exists.** It posted to a first-generation endpoint removed long ago, so the request failed, and every buyer who came back that way was shown the failure page although their payment had succeeded. That page is reached more often than it appears: a payment started without an explicit, approved return address falls back to it. Three further faults in the same request — no security token, a response shape the API does not send, and a comparison against differently-cased text — are fixed by routing it through the shared payment client, which also means a wrong address stops the build rather than reaching a buyer. A payment still in progress when the checks run out is no longer called failed: the page says so and offers to check again, which previously required reloading. (`app/payment/processing/page.tsx`)

## [1.63.0] - 2026-08-02

### Added

- **A stream-only sale page now says what the buyer is actually getting.** The page offered a title, a file count and a green button, and mentioned nowhere that the film could never be downloaded. Buyers in these markets learn video from WhatsApp, where you download it and then it is yours — offline, permanently — and stream-only inverts that expectation rather than merely failing to meet it. Four plain sentences now sit above the email field: you watch it here and there is no download, access lasts as long as the film is published and the creator's subscription does not affect it, buying it and not watching is not refundable but a failure on our side is, and a payment fee is added at checkout. What the page deliberately does **not** say is anything about access ending — that mechanism ships later, and describing it now would be a promise with nothing behind it. (`app/downloads/[transferId]/[shortCode]/page.tsx`)
- **The free trailer plays on the page instead of in a side panel.** The 20-second preview opened the drawer, a surface meant for signed-in creators — and one that would have left the free trailer and the purchased film in two different places once playback ships. It now plays where the buyer is reading, from a watermarked clip fetched at view time, and it does not download a single byte until play is pressed. Mobile data costs real money here; a trailer that helps itself to it before being asked is not a preview, it is a charge. (`app/downloads/[transferId]/[shortCode]/page.tsx`)
- **The checkout shows the total before the pay button, not after.** Price, payment fee and total now appear once a country and a payment method are chosen — including for card, bank transfer and USSD, none of which previously showed a fee anywhere. Where the buyer's provider settles in a different currency, the panel says so and names the amount. (`features/payment/components/SaleCheckoutPanel.tsx`)

### Fixed

- **Two totals in two currencies on the same screen.** The summary card converted the price into whichever currency the header was set to, using approximate rates, while the checkout showed the real amount — so one purchase read `$8.26` in one panel and `5,208.34 Fr CFA` in the other, with the less reliable of the two rendered larger and closer to the pay button. Both panels now read from the same quote and the same formatter. The amount that will be debited leads; the viewer's own currency sits beneath it, clearly marked as an approximation, because a total an international buyer cannot interpret is not one they can agree to. (`components/shared/TransferSummaryCard.tsx`, `features/payment/components/SaleCheckoutPanel.tsx`)

## [1.62.0] - 2026-08-01

### Fixed

- **A sold film is no longer shown to its buyer as expired.** The public download page decides expiry in the browser, comparing the transfer's date against the clock rather than asking the server. With stream-only films now exempt from expiry on the backend, that comparison would still have shown a buyer the expired page for a film sitting intact in storage that the API would have served happily — no player, no purchase, no explanation, and the server never consulted. The date is now skipped for stream-only transfers. An explicitly expired **status** is still honoured exactly as before: the exemption is on the clock, never on the state, so a film revoked on purpose still reads as gone. (`app/downloads/[transferId]/[shortCode]/page.tsx`)
- **A creator's own list no longer marks a live film as expired, or hides its preview.** Every row in the transfers list computed its own countdown from the same date, so a stream-only film older than its nominal window showed a red "Expired" badge beside the title and "Expired" as its metadata line — and, because the preview action was hidden on anything the row believed to be expired, the creator lost the ability to preview a film that was still on sale. Both now read the delivery mode. A cancelled or genuinely expired film still hides its preview, unchanged. (`features/transfer/components/TransferItem.tsx`)
- **The transfer details panel no longer counts down to a date that will not arrive.** The expiry line and its status dot are driven by the same comparison, so a stream-only film showed an amber "expires soon" or a red expired indicator on the way to a deletion that no longer happens. It now shows that there is no expiry, reusing the wording the panel already had for transfers without one. (`features/transfer/components/TransferDetailsPanel.tsx`)

## [1.61.0] - 2026-08-01

### Added

- **A film that is not ready to watch is no longer offered for sale.** The sale page now shows a prepared state instead of a buy button while a stream-only film is still being packaged, and the backend refuses the purchase in the same case, so the page and the API agree. The buy action is removed rather than greyed out, because a disabled call to action reads as a broken page. The price stays visible — it previously lived inside the buy button, so hiding the button hid the price and made a film look unavailable rather than imminent. Preparing, processing and failed all read as one state to a buyer: there is nothing they can do about a packaging failure, and naming it would hand a stranger the creator's operational trouble. Refreshing goes around the edge cache, so a buyer who has just heard from the creator is not told to wait another minute. (`app/downloads/[transferId]/[shortCode]/page.tsx`, `features/payment/components/SaleCheckoutPanel.tsx`, `i18n/messages/en.json`, `i18n/messages/fr.json`)

### Fixed

- **The purchase recovery message shows the buyer's email again.** A buyer recovering an earlier purchase saw a raw translation key where the confirmation should have been, in both languages. The message carries the email as a placeholder and the translator fills placeholders as it resolves the string, but the call site asked for the string first and tried to substitute afterwards — so it failed before the substitution could run and returned the key. Its sibling message had the same shape and is fixed too. (`app/downloads/[transferId]/[shortCode]/page.tsx`)

## [1.60.1] - 2026-08-01

### Fixed

- **Clearer wording when a retry is refused.** The messages now say how long the wait actually is instead of promising a moment, and the retry-limit message explains that a film failing repeatedly is unlikely to be fixed by retrying it again. (`i18n/messages/en.json`, `i18n/messages/fr.json`)

## [1.60.0] - 2026-08-01

### Added

- **A Pro creator can mark a video transfer as stream-only.** Story 134.4's interface, which had been sitting uncommitted while its backend already shipped — meaning the feature existed server-side and could not be reached by anyone. The toggle appears only when the creator's plan carries the streaming feature, public sales is on, and every selected file is video. Whether the plan carries it is answered by the server rather than by a hardcoded plan comparison, so granting streaming to another plan makes the toggle appear without a deploy. The interface is not the control: the backend refuses the same combinations independently. (`features/home/components/UploadPanel.tsx`)

- **The creator can see a film being prepared, and retry it when preparation fails.** The first creator-facing surface for stream delivery. The state was already arriving in the browser and being discarded — the fields were simply never declared — so a film that failed preparation looked identical to one still in progress, with nothing to click. Preparing and queued are presented as a single "preparing" state, since the distinction is ours and not the creator's. Failure offers a retry; no technical reason is shown, because the underlying tooling writes decryption key material into its own error output. The view refreshes itself every ten seconds while preparation is in flight and stops as soon as it finishes, when the panel closes, or after ten minutes — and its refresh state resets between films, so one long preparation cannot silently stop the next film from updating. Copy is EN and FR. (`features/transfer/components/TransferDetailsPanel.tsx`, `features/transfer/components/TransferItem.tsx`)

## [1.59.0] - 2026-07-31

### Added

- **Shaka Player, and a loader that keeps it out of the Cloudflare worker bundle.** Groundwork for streaming playback (Epic 135); nothing renders it yet — `StreamPlayer.tsx` arrives in Story 135.6 — so this ships as a dependency and a loading helper, stated here rather than left to be rediscovered as an orphan. Pinned to **5.1.17**, not the 5.1.4 the architecture recorded: 5.1.4 was already 13 patches behind its own line on the day it was written down. 5.2.x was deliberately not taken, because it disables HLS `sequenceMode` by default — a playback behaviour change on exactly the format this feature delivers — and there is no working player yet to debug that against. `next` is unchanged at 15.3.6; `@cloudflare/next-on-pages` requires `<= 15.5.2`, and an incidental bump during install breaks the deploy rather than the build. (`lib/stream/shaka-loader.ts`)
- **The loader documents a requirement measured rather than assumed.** A dynamic `import()` inside a `'use client'` module is *not* enough to keep the library out of the edge bundle: the component is still server-rendered for the initial HTML, so webpack keeps the chunk in the server graph and `next-on-pages` copies it into the worker. Measured against a probe route — a plain client import produced a 1140 KB edge function carrying the whole player, while mounting through `next/dynamic` with `ssr: false` produced 376 KB with the library absent; an ordinary route's edge function is ~480 KB for scale. Both numbers are recorded at the top of the loader, so Story 135.6 inherits the constraint instead of rediscovering it against a hard worker size limit. The 748 KB client chunk is unaffected, which is where the library belongs. (`lib/stream/shaka-loader.ts`)

## [1.58.3] - 2026-07-31

### Fixed

- **Five more places gave the logo a box built for the artwork it replaced.** v1.58.2 corrected the header; the maintenance page, the waitlist page, the footer, the mobile menu and the download page's "powered by" mark were all still declaring the old proportions. Four of them set no rendered size at all, so the declared box *was* the box — the artwork was fitted inside proportions that are not its own and never filled them, with the maintenance and waitlist pages furthest off at a box a quarter wider in proportion than the logo actually is. The fifth was already sized in CSS and only reserved the wrong space before loading. All now declare the artwork's own 371x90 viewBox and set one dimension in CSS, letting the other follow; the effective size is unchanged at every site (24px tall on maintenance and waitlist, 90px wide in the footer, 120px wide in the mobile menu, 14px tall on the download page). That accounts for all nine logo images in this repo — the two remaining fixed-dimension images in the header are avatars, square by design. (`components/MaintenancePage.tsx`, `components/WaitlistPage.tsx`, `components/shared/Footer.tsx`, `components/shared/MobileMenu.tsx`, `app/downloads/[transferId]/[shortCode]/page.tsx`)

## [1.58.2] - 2026-07-31

### Fixed

- **The header drew the logo about 5% taller than it is.** Both dimensions were pinned in CSS at 130x33, a box built for the previous artwork; the current mark is 371x90, a slightly wider proportion, so forcing it into the old box stretched it vertically. Height is now automatic and only width is set, so the artwork keeps its own proportions, and the declared intrinsic dimensions are the real viewBox rather than the rendered size — those are what reserve space before the image loads, and they described artwork that is no longer there. The mark renders slightly smaller as a result, 100px wide rather than 130. (`components/shared/Header.tsx`)

## [1.58.1] - 2026-07-31

### Fixed

- **The blocked-payout banner told creators a verification deadline had passed when they never had one.** `KycVerificationBanner` inferred expiry from the payout block code alone, but a block code says a payout was refused — it says nothing about whether there was ever a deadline to miss. That inference is already wrong today for a creator whose verification was rejected at the maximum number of attempts, which clears their deadline and leaves the gate refusing them with no date at all; the stricter gate policy now available in the admin panel (backend Story 137.5) would have made it the common case, since that policy refuses creators who were never asked to verify. The banner now requires a deadline before claiming one expired, and a refusal under the stricter policy carries no deadline, so the two halves are one mechanism rather than two guesses. (`components/shared/KycVerificationBanner.tsx`)
- **"0 days remaining" was shown to creators who were never given a date.** Correcting the expiry inference exposed a fallback underneath it: with no deadline and no countdown, the copy fell through to a message that rendered a confident, invented number. The fallback is gone and the no-countdown case has its own line, which simply asks the creator to verify. It reads `kyc.verifyToWithdraw` — "Verify your identity to withdraw" / "Vérifiez votre identité pour retirer vos fonds" — a key that shipped in v1.58.0 and had nothing referencing it until now.

## [1.58.0] - 2026-07-31

### Changed

- **The header and hero CTAs were the same words and the same action, 400px apart.** Both rendered `header.signupBold` + `signupSuffix` and both dispatched `open-auth-panel`, so the hero was structurally incapable of differing — editing the header silently edited the hero. The hero now reads its own `hero.getStartedButton` key (which already existed, unused, in both locales) and says **"Start getting paid"** / **"Commencez à être payé"**, finishing the sentence the headline above it starts instead of restarting with "Get Started". The header is unchanged. (`components/shared/HeroText.tsx`)
- **The transfer landing page no longer pitches a signup while the recipient still has something to do.** A creator CTA in the preview, password, email, payment and ready states competed with "Pay and download" — the one action on that page that produces revenue — and duplicated the post-download state, which already makes the same pitch at the moment it lands ("Want to send files like this?"). The hero CTA now appears only in the unavailable state, where the link is dead and it competes with nothing. Free transfers are unaffected: the post-download pitch fires from the download action, not from payment. (`app/downloads/[transferId]/[shortCode]/page.tsx`)
- The unavailable-state CTA now reads **"Start free on ZeFile"** / **"Commencer gratuitement sur ZeFile"**, reusing the wording the post-download state already uses, rather than introducing a third phrasing of the same idea.

### Removed

- **"Take a look before you pay." on the download card.** The spacer beneath it was conditional on the exact complement of the line's own condition, so it is now unconditional — otherwise unpaid paid transfers, the only case that ever showed the line, would have been left with no gap between the title and the file row. The orphaned `transferLanding.previewBeforeYouPay` key is deleted from both locales; `testResult.previewBeforeYouPay` stays, still used by the test-file simulation.

### Fixed

- **A branded transfer could show ZeFile marketing on a paying customer's link.** Custom branding is a Pro feature that swaps in `BrandedHeader` and already skips the post-download CTA via `!isBranded`, but the unavailable state had no such guard — an expired or cancelled branded transfer would have rendered "Start free on ZeFile" on a white-labelled page. The signup CTA is now suppressed for branded transfers in every state.

## [1.57.2] - 2026-07-30

### Fixed

- **The geo cookie's cache guard did not actually exist.** A response carrying a country-specific `Set-Cookie` must never be reusable by anyone else, or a shared cache could hand one country's cookie to every cookie-less visitor behind it. That was guarded with `Vary: CF-IPCountry` — but the header does not survive to the client on Cloudflare Pages. Confirmed on `demo.zefile.io`: responses arrive with Next.js's own `vary: RSC, Next-Router-State-Tree, …, accept-encoding`, while `Content-Language` set in the same middleware block does survive, so the adapter overwrites `Vary` after middleware runs. The guarantee is now made by the response itself — when the geo cookie is written, that single response is marked `private, no-store`; every other response keeps the normal cacheable header. `Vary` is retained as belt-and-braces. This was latent rather than live, since Cloudflare currently returns `cf-cache-status: DYNAMIC` for these routes and caches nothing, but it would have opened the moment HTML edge caching was enabled. (`middleware.ts`)

## [1.57.0] - 2026-07-30

### Added

- **Currency now follows where the visitor actually is.** There was no detection of any kind — `getStoredCountryCode()` read localStorage and fell back to International, so every first-time visitor saw USD wherever they were, including the West African creators the product is built for. Middleware now maps Cloudflare's `CF-IPCountry` to a supported country (or `DEFAULT` for anywhere ZeFile cannot charge in local currency) and writes a client-readable cookie that the currency store reads on hydrate. Resolution order is: explicit choice in localStorage, then geo, then International. (`middleware.ts`, `stores/currency-store.ts`, `services/subscription-api.ts`)
- **An explicit choice is never overridden by geo.** `getStoredCountryCode()` returned `DEFAULT` both for "chose International" and for "never chose anything", which are not the same thing. `hasStoredCountryCode()` separates them, so someone who deliberately selects International is not re-detected back to their own country on every page load. Geo is deliberately not written back to localStorage — that would freeze a guess into a stated preference and stop it re-detecting after travel.
- **Four more markets in the hero animation** — Ghana, Kenya, Togo and Benin join Nigeria and Côte d'Ivoire, each with its own currency, flag, dial code and mobile-money providers. (`components/shared/HeroProcessLoop.tsx`)
- **A left-rail alignment variant for the hero**, where the trust strip, headline, subtitle and CTA all start on one shared axis instead of each line floating on its own centre. Overridable per-visit with `?hero=left` / `?hero=center` so both versions can be shown side by side. Left is the default pending the creator preference test. (`components/shared/HeroText.tsx`, `components/shared/CreatorsTrustStrip.tsx`)

### Changed

- **The hero animation's market is no longer derived from the UI language.** French forced Côte d'Ivoire/XOF and English forced Nigeria/NGN, so an Ivorian reading the site in English was shown Naira. It now follows the header's currency switcher.
- **International shows no provider it cannot route to.** Outside the six supported countries the payment beat shows the generic Mobile Money / Card choice with no provider chips, and drops the flag and dial prefix entirely rather than inventing a `+1` that would claim a money rail that does not exist there.
- Hero headline `text-4xl` → `text-3xl` and subtitle `text-lg` → `text-base`. At 1280 this takes the headline from three lines to two.
- Updated logo assets — new wordmark and mark. (`public/zefile-logo.svg`, `public/zefile-logo-white.svg`, `public/zefile-logo.png`)
- `CF-IPCountry` added to `Vary` on responses that set the geo cookie. Without it the cookie-less edge-cache bucket would hand one country's `Set-Cookie` to every other country's first-time visitor. The cookie is only re-sent when its value changes, mirroring the existing `NEXT_LOCALE` rule, so steady-state responses stay cacheable.

### Fixed

- **A recipient hitting a dead link was told their files were ready.** The transfer landing page rendered the hero with no guard on transfer state, so "Your files are ready." sat next to a card saying the transfer had vanished into thin air — on not-found, expired, cancelled and not-ready links alike. The hero now carries state-appropriate copy and its own call to action, distinct from the card's. (`app/downloads/[transferId]/[shortCode]/page.tsx`)
- **"Mobile Money" was a hardcoded English string** in the hero animation, rendering untranslated for French visitors. It is now a translation key in both locales.
- Togo's mobile-money providers corrected to Mixx by Yas and Moov Flooz — T-Money is the pre-rebrand name.

## [1.56.7] - 2026-07-30

### Fixed

- **A blocked payout failed with no explanation and no way forward.** The payouts view had no awareness of identity verification at all, and the withdrawal panel rendered only the backend's raw English error string — the machine-readable reason arrived in the API client and was discarded. The payouts view now shows the block above the balance, driven by the balance response so it can never disagree with the server, and the withdrawal panel branches on the error code to show localised copy plus a route into verification. Every other error keeps the existing generic treatment. (`features/account/components/PayoutsPanel.tsx`, `features/account/components/WithdrawalRequestPanel.tsx`)
- **Verification links from email appeared to go nowhere.** `?account=verification` was not in the deep-link allow-list, so the parameter was silently ignored — even though the account menu type already contained `verification` and the account panel already routed it. One missing string was the whole reason those links looked broken. `?account=payouts` is accepted for the same reason. (`features/home/components/HomeClient.tsx`)
- **A creator who had merely crossed an earnings threshold was shown a red alarm.** A gate block on REQUIRED is factually "grace period expired", which selects the right wording but was also selecting red-alert styling — and REQUIRED is by far the most common block. Visual severity is now separate from the wording: pending reads blue, required amber, rejected red. The reassurance that the balance is untouched is rendered in neutral grey in every state, rather than inheriting the panel's alert colour and fighting the message it carries. (`components/shared/KycVerificationBanner.tsx`)
- **A rejected creator was told to verify, which sends them back into the flow that just refused them.** Rejection was folded in with "verification required". It now has its own wording pointing at support, and no call to action, consistently across all three banner variants — previously each variant derived its own copy and only one had been corrected.
- The reason a disabled withdraw button is disabled is now visible text referenced by `aria-describedby` rather than a `title` tooltip, which is unreliable for screen readers and invisible on touch.

### Added

- **The identity-verification notice now appears where a creator will actually see it.** `KycVerificationBanner` existed as a finished, localised, three-variant component that nothing in the app rendered. It is now shown on the payouts view, in the withdrawal flow, and at the top of the home page — so a creator learns that payouts are held before they attempt one, not after. The home-page placement is gated on being signed in, so no anonymous visitor triggers a verification-status request, and the component renders nothing for anyone who is verified or unaffected.
- The banner accepts an optional payout-gate decision (`payoutBlockCode`, `gracePeriodEnds`, `footnote`) and renders from it instead of fetching status itself. This matters because the gate can refuse while a plain status read looks clean — above all on its fail-closed path, where it blocks precisely *because* the lookup failed. Left to its own fetch the banner would have rendered nothing at the exact moment it was most needed. Omit the props and every existing behaviour is unchanged.

### Changed

- New payout-block copy in English and French states plainly that the balance stays where it is and nothing is lost — the line that matters most to someone who has just discovered a payout will not arrive.

## [1.56.6] - 2026-07-30

### Fixed

- **"Total earned" shrank every time a seller got paid.** The card summed `available + pending + reserved`, but `available` already has completed withdrawals netted out of it, so the lifetime figure dropped by the value of each payout. It now reads `totalEarnedMinorUnits` from the balance response, which the backend computes gross of withdrawals; the old sum stays as a fallback so the card still renders against an API version that predates the field. (`features/account/components/PayoutsPanel.tsx`)

### Changed

- The held-funds notice now tells sellers how long the hold actually is, using the `payoutHoldDays` field the balance response started returning, instead of only saying the funds release "when the window closes". New `payouts.reservedHintDays` copy in `en` and `fr` (idiomatic French, "vous"), with the existing generic wording kept for older API versions. (`i18n/messages/{en,fr}.json`)
- The notice uses the documented warning colour (`#F59E0B`) rather than raw `amber-*` utilities, so it matches the rest of the design system in both light and dark mode. (`features/account/components/PayoutsPanel.tsx`)

### Notes

- Pairs with backend v1.57.6, which extends the payout reserve to file-request escrow earnings. Sellers with recent escrow releases will see those funds appear under the on-hold notice once that deploys — this banner is what explains it, so shipping the two together is preferable to shipping the backend alone.

## [1.56.5] - 2026-07-30

### Fixed

- **The sale gateway no longer reveals whether an email has bought a transfer.** Entering an email called `checkPurchase` first and branched the UI on the answer, which meant the page surfaced an unauthenticated "did this person buy this?" oracle. Signed-out buyers now go straight to `recoverPurchase` and are shown the OTP box **and** the Buy button together, because neither we nor they should be told which applies — a code only arrives if a purchase actually exists. Copy is conditional so it never asserts ownership: new `publicSale.alreadyBought` and `publicSale.otpSentIfPurchased` keys in `en` and `fr`, used whenever ownership is unknown, with the existing `alreadyOwned`/`otpSent` wording kept for the signed-in case where it is known. (`app/downloads/[transferId]/[shortCode]/page.tsx`)
- **`checkPurchase` no longer sends an email address.** The backend now reads it from the JWT, so the client argument is gone and the call is authenticated-only. The signed-in auto-detect path still uses it — that is the caller's own email and discloses nothing — while the signed-out path does not call it at all. (`services/transfer-api.ts`)

### Notes

- Requires zefile-backend **v1.57.5** or later. That release makes `POST /transfers/:shortCode/buy/check` authenticated and stops it accepting a body email, so the two must ship together: an older frontend against the new backend would get 401s on the signed-out path.

## [1.56.4] - 2026-07-29

### Changed

- **Hero loop preview shows real artwork instead of a gradient.** The preview stage rendered an abstract CSS gradient as the stand-in for the creator's work; it now uses an image, which sells "this is somebody's actual deliverable" in a way a gradient never did. One per variant so the home page and the download page never show the same file: pink for `creator`, orange for `buyer`. Sources were downscaled 3840x2160 → 900x506 (~40 KB each) — the stage renders at roughly 296 CSS px, so the originals carried about 100x more pixels than the slot needs, on the homepage's critical path. (`components/shared/HeroProcessLoop.tsx`, `public/images/hero-preview-creator.jpg`, `public/images/hero-preview-buyer.jpg`)

### Fixed

- **"Payment complete" no longer sits flush against the bottom of the sheet.** The confirmation block used `marginTop`/`marginBottom`, but neither the beat wrapper nor the `ResizeObserver`-measured content div establishes a block formatting context, so both margins **collapsed out** and never reached the height the sheet is sized from — leaving only the 22px card padding on each side. It read as bottom-tight because a text baseline sits closer to an edge than a 60px circle does. Both are now padding, which cannot collapse and therefore counts toward the measured height. Most visible in the `buyer` variant, where the block is the first child and so had no effective top margin either. (`components/shared/HeroProcessLoop.tsx`)

### Notes

- On this component, outer spacing must use **padding, not margin**. The sheet's auto-height is derived from a measured element, so any collapsing margin is silently discarded.

## [1.56.3] - 2026-07-29

### Fixed

- **The header tier now refreshes after an in-session plan change.** `Header` has always listened for a `subscription-changed` event to refetch the tier badge, but **nothing in the codebase ever dispatched it** — so upgrading, cancelling, resuming, starting a trial or toggling auto-renew left the header (and the cached subscription) showing the old plan until a full reload. Added `notifySubscriptionChanged()`, wired into every point where the plan actually changes: the direct mutations (`cancel`, `resume`, `change-tier`, `downgrade/cancel`, `trial/start`, `auto-renew`) on success, and the checkout payment poll the moment it reports `SUCCESS` — which is when a paid upgrade truly lands. The poll announces once per payment reference, since callers poll on an interval and re-announcing would make every listener refetch on each tick. Invalidation runs before the dispatch, because listeners refetch synchronously and would otherwise read the stale record they were being told to replace. (`services/subscription-api.ts`)

## [1.56.2] - 2026-07-29

### Fixed

- **`GET /subscriptions/current` no longer fans out into 429s.** Nine components fetch the endpoint independently on mount — `Header`, `RenewalNotificationBanner`, and seven account/subscription panels — with no shared cache, so opening the drawer or moving between panels fired the same request several times over. Its budget is 60/min, which was being exhausted in normal use. The failure was silent but wrong: on a 429 `Header` falls back to the `free` tier, so a paying user is shown a free-tier UI. `getCurrentSubscription()` now shares one in-flight request between concurrent callers and reuses the result for 15s — comfortably under `subscription-store`'s 60s poll interval, so polling still refreshes. Failures are never cached (caching a 429 would pin every consumer to the free fallback for the whole TTL), and login/logout plus the global store reset invalidate it. Fixed at the service layer so all callers benefit without touching nine components; `{ force: true }` is available for read-your-own-write. (`services/subscription-api.ts`)

### Notes

- `subscription-store` already owns a single shared subscription state, but those nine call sites bypass it. Routing them through the store is the better long-term fix; the service-layer de-duplication is the low-risk version.
- Nothing in the codebase dispatches the `subscription-changed` event, so `Header`'s listener for it is currently dead code — meaning the header tier is not refreshed after an in-session plan change. Left as-is here, but worth wiring up.

## [1.56.1] - 2026-07-29

### Fixed

- **Short codes are no longer lowercased, which 404'd every mixed-case transfer.** Short codes are case-sensitive — the DB stores `HkGXm2GHhB` and `findByShortCode` looks it up with `=` — but the case-insensitive redirect added for SEO only exempted `/z-AbC` at the **root**. Any route carrying the code in a later segment was 308'd to a code that cannot exist: `/downloads/<uuid>/z-HkGXm2GHhB`, `/r/AbC`, `/review/AbC`. The short link itself survived (because `/z-CODE` redirects to `/downloads?code=…` and query strings are not lowercased), so the failure surfaced one hop later on the canonical download URL as "This transfer has vanished into thin air" — on a perfectly valid transfer. Every transfer whose code contains an uppercase letter was affected, which is the large majority. Exempting the `z-` prefix alone is insufficient, since `/review/<code>` and `/r/<code>` can carry a bare code with no prefix, so the code-bearing route families are exempted too. Marketing routes still lowercase, preserving the original SEO behaviour (`/About` → `/about`). (`middleware.ts`)
- **Buyer hero no longer repeats a line already on the page.** `downloadHero.subtitlePaid` opened with the same sentence as `transferLanding.previewBeforeYouPay` ("Take a look before you pay."), which the download card renders a few lines below — so the buyer read it twice on one screen. The hero now carries the guarantee ("Your originals unlock the moment payment clears.") while the card keeps the instruction. (`i18n/messages/en.json`, `i18n/messages/fr.json`)

## [1.56.0] - 2026-07-29

### Added

- **Animated hero process loop (`HeroProcessLoop`).** A looping product tour that *shows* the delivery flow instead of describing it, replacing the paper-plane Lottie in the hero. Ported from the Claude Design project "ZeFile Pitch Deck" (`hero-loop.jsx`): one soft white sheet on transparent ground — no shell, no outline, no browser chrome, no rotation, auto height (chrome and tilt were tried in the design and rejected, as they made the loop read as a second upload widget). Two variants share the component: `creator` (home, 40s — upload, price, link, preview, pay, download) and `buyer` (download page, 20.5s — preview, pay, download). Beats crossfade rather than cut: content fades out, the sheet resizes under a `ResizeObserver`-driven CSS transition while nothing is visible, then the new beat fades in — fading fully to zero so two layouts never superimpose, which lets the sheet keep `overflow: visible` for the dragged-file ghost. Decorative (`aria-hidden`, `pointer-events: none`), pauses off-screen and on tab switch, honours `prefers-reduced-motion`, throttled to 30fps. Desktop-only from `lg`, scaling 0.72/0.85/1.0 across `lg`/`xl`/`2xl` to reach the design's native 340px. (`components/shared/HeroProcessLoop.tsx`, `features/home/components/HomeClient.tsx`, `app/downloads/[transferId]/[shortCode]/page.tsx`, `i18n/messages/en.json`, `i18n/messages/fr.json`)
- **Buyer-facing hero on the download page (`downloadHero`).** The download page previously rendered the creator hero, so a recipient deciding whether to pay a stranger was told to "send your work" and "get paid" — the wrong side of the transaction. It now has its own copy, and because that page also serves free transfers, the subtitle is conditional on price: paid recipients get "Take a look before you pay. They unlock the moment payment clears.", free recipients get "Have a look, then download." — so nobody is warned about a charge that isn't coming. Idiomatic EN + FR ("vous"). (`app/downloads/[transferId]/[shortCode]/page.tsx`, `i18n/messages/en.json`, `i18n/messages/fr.json`)
- **`HeroText` props `copy` and `reserveRightGutter`.** `copy` overrides the headline/subtitle for non-creator audiences; `reserveRightGutter` pins the headline into the gap between the upload panel and the loop's column so it wraps instead of running underneath. Both are opt-in, leaving the review page and `/downloads` redirect shim unaffected. (`components/shared/HeroText.tsx`)

### Changed

- **Hero copy no longer narrates the process.** The old subtitle ("Drop in your files, set a price, share the link. Your client previews, pays, then downloads…") was a caption for the six beats the animation now performs, spending the page's most valuable text on redundancy. It is replaced with the positioning the hero was missing — mobile money in the first fold, per the messaging guidelines: *"Send your work. Get paid before they download." / "Your client pays with Mobile Money, card, or bank transfer." / "No credit card required."* Headline also changed from "the moment they download" to "**before** they download", which is what the product actually does — download is gated on payment. (`i18n/messages/en.json`, `i18n/messages/fr.json`)

### Notes

- `PaperPlaneAnimation` is intentionally untouched and still used by the review page and the `/downloads` redirect shim.
- Deliberate deviations from the design source: copy lives in next-intl rather than inline ternaries; the platform fee is read from `PlatformConfigs` instead of being hardcoded to 7%; the voice guide is applied (no ellipsis, fees framed as "you keep"); the short link uses the brand domain rather than `NEXT_PUBLIC_SHORT_LINK_DOMAIN`, which renders `localhost:3000` in dev; and French formats money as "25 000 CFA" with the symbol after the amount.

## [1.55.0] - 2026-07-01

### Added

- **Reserved (on-hold) funds surfaced to sellers (Story 133-2, AC3).** Pairs with the backend payout-reserve policy: earnings still inside the buyer refund window are held out of the withdrawable balance. `BalanceResponse` now carries `reservedMinorUnits` / `reservedFormatted`, and `PayoutsPanel` shows a reassuring, on-brand banner whenever funds are on hold — explaining why and that they release automatically — with idiomatic EN + FR copy ("vous"). (`services/withdrawals-api.ts`, `features/account/components/PayoutsPanel.tsx`, `i18n/messages/en.json`, `i18n/messages/fr.json`)

### Fixed

- **"Total earned" no longer undercounts held funds.** The payouts summary now adds the reserved amount alongside available and pending; once the reserve shipped, reserved earnings were excluded from the displayed total. (`features/account/components/PayoutsPanel.tsx`)

## [1.54.4] - 2026-07-01

### Added

- **Graceful handling of strict paid-download email verification (HIGH-2).** Pairs with the backend `PAID_DOWNLOAD_STRICT_EMAIL_OTP` gate. When a paid download is refused for lack of a proven email (`401 { code: 'EMAIL_VERIFICATION_REQUIRED' }`, e.g. an expired session), the download page now routes the buyer back through the email OTP step and returns them to the paid download screen once re-verified — instead of showing a dead-end download error. Applies to both the ZIP (`handleDownload`) and per-file (`PerFileDownloadList`) paths via a shared `routeToEmailVerification()` helper, and adds `transferLanding.verifyEmailToDownload` copy (EN/FR). (`app/downloads/[transferId]/[shortCode]/page.tsx`, `features/transfer/components/PerFileDownloadList.tsx`, `i18n/messages/en.json`, `i18n/messages/fr.json`)

## [1.54.3] - 2026-07-01

### Fixed

- **Paid per-file downloads for non-logged-in buyers.** The backend download endpoint now enforces the payment gate, so a buyer on the public download page must supply their payer email (as the ZIP download already does). Threaded `customerEmail` through `PerFileDownloadList` into the download request and added the optional `email` field to `PresignedUrlRequestDto`. Without this, per-file downloads of paid transfers would fail for recipients who are not signed in. (`features/transfer/components/PerFileDownloadList.tsx`, `services/storage-api.ts`, `app/downloads/[transferId]/[shortCode]/page.tsx`)

## [1.54.2] - 2026-05-15

### Fixed

- **SideDrawer no longer leaks into the accessibility tree when closed.** The "Transfers" SideDrawer panel was always rendered in the DOM (slid off via `translate-x-full`), which meant screen readers and keyboard users saw a phantom modal on every initial page load. Added `inert={!isOpen}` (React 19 boolean attribute) to the panel — removes it from the focus + a11y tree when closed while preserving the existing slide animation. Also made `aria-modal` conditional on `isOpen` and added `aria-hidden={!isOpen}` for older AT compatibility. Verified: `dialog "Transfers" modal` no longer appears in the accessibility-tree snapshot when the drawer is closed. (`features/drawer/components/SideDrawer.tsx`)
- **Earnings calculator now reflects the pass-through PSP fee model.** The Pricing-page calculator previously framed all fees as deducted from the creator's earnings (creator absorbs everything), which contradicted the BP claim of pass-through processing fees (Stripe-style buyer surcharge). Added `processingFeePercent` per country (4% for NGN/GHS/KES, 3.5% for XOF, per the BP processing-fee rates of 2.95-4.6%) and a new "Buyer pays" line at the top of the breakdown showing `price / (1 - processing_rate)` with subtitle `"includes ~{amount} processing fee (~{percent}%, passed through)"`. Worked example: NGN 10,000 on Basic 7% now reads "Buyer pays 10,417 ₦ (incl. ~417 ₦ processing) → Your price 10,000 → -700 platform fee → -50 payout fee → You earn 9,250 ₦". Story now matches the BP. (`features/subscription/components/TransactionFeesSection.tsx`)

### Changed

- **"Request files" tab renamed to "Receive files".** The previous "Send files" / "Request files" tab labels created cognitive overlap with the "Add files" action button inside the active Send tab — three similar verbs in close proximity. "Receive files" is now parallel to "Send files" and reads as the inverse flow (clients send to me) rather than an active request action. EN: "Request files" → "Receive files". FR (idiomatic): "Demander des fichiers" → "Recevoir des fichiers". (`i18n/messages/en.json`, `i18n/messages/fr.json`)

### Added

- `i18n/messages/en.json` + `fr.json` — new `subscriptions.calcBuyerPays` and `subscriptions.calcIncludesProcessing` keys (with `{amount}` + `{percent}` interpolation).

### Notes

- These three fixes resolve P1 #4, P1 #5, and P2 #7 from the Day-Zero onboarding walkthrough findings (`zefile-backend/_bmad-output/planning-artifacts/zefile-day-zero-walkthrough-findings.md`). Total effort ~2 hours per the walkthrough estimate. The remaining items in the walkthrough findings are either out-of-scope by founder decision (P1 #6 dedupe language switcher, P2 #8 surface tier limit on homepage) or require a real human / Android phone (the end-to-end paid-transfer flow walkthrough).

## [1.54.1] - 2026-05-15

### Fixed

- **Homepage upload widget no longer contradicts the "5 GB free" marketing claim.** The anonymous upload widget previously displayed only `"Up to 2 GB"`, which clashed with the hero copy and FAQ promising "Send files up to 5 GB free." It now shows a two-line hint: `"Up to 2 GB"` + `"5 GB with a free account"` — communicating the anonymous-vs-Basic-tier gating without changing the underlying 2 GB anonymous cap. (`features/home/components/UploadPanel.tsx`)
- **Signup placeholder typo fixed.** Email field placeholder changed from `"cemail@gmail.com"` (read as a typo of "email" and could be mistaken for pre-filled content) to `"yourname@gmail.com"`. (`features/auth/components/EmailAuthForm.tsx`)
- **Signup placeholder visual hierarchy.** Email + Phone form placeholders previously inherited the input's full bold weight at the same large size, making the placeholder hint visually competitive with real typed content. Added `placeholder:opacity-25` so the placeholder reads as a clearly ghosted hint while preserving the input's bold + large clamp(2.5rem, 6vw, 5rem) font for typed text — same height, same weight, ghosted via opacity alone. (`features/auth/components/EmailAuthForm.tsx`, `features/auth/components/PhoneAuthForm.tsx`)

### Added

- **Wedge-aligned signup guidance under the anonymous upload widget.** New copy line `"Want to set a price and get paid? Sign up free."` (FR: `"Envie de fixer un prix et d'être payé ? Inscrivez-vous, c'est gratuit."`) appears above the existing `"Just exploring?"` text, only in real-send mode (not test mode). The `"Sign up free."` button dispatches a `CustomEvent("open-auth-signup")` which `Header.tsx` listens for via a new `useEffect`, opening the AuthPanel in signup mode. Uses the established cross-component CustomEvent pattern documented in CLAUDE.md (no new global store needed). (`features/home/components/UploadPanel.tsx`, `components/shared/Header.tsx`)
- `i18n/messages/en.json` + `fr.json` — new `upload.upToWithSignup`, `upload.toSetPriceTitle`, `upload.toSetPriceCta` keys (FR is idiomatic, not literal translation).

### Notes

- These three P0 fixes resolve the friction points identified in the Day-Zero onboarding walkthrough (`zefile-backend/_bmad-output/planning-artifacts/zefile-day-zero-walkthrough-findings.md`). Total effort to clear the P0 list was ~1.5 hours per the walkthrough estimate.
- Verified end-to-end on `localhost:3000`: clicking the new "Sign up free." button correctly opens the signup modal, and the modal's email field shows the new `"yourname@gmail.com"` placeholder at the proper ghosted-hint visual treatment.

## [1.54.0] - 2026-05-05

### Added

- **Help center routes (H2 scaffolding).** Public `/help/<category>` and `/help/<category>/<slug>` routes consume the new backend `/help/*` endpoints (built on the existing `SupportArticle` data). Both EN and FR variants — the route file pattern mirrors the locale-bound blog post architecture from v1.53.2 (locale-mismatch redirects to canonical, self-only hreflang on individual articles, cross-locale alternates in sitemap because each row has both `slug_en` and `slug_fr`).
  - `app/help/[category]/page.tsx` — category index with article cards (title + tags). Empty state if no published articles yet.
  - `app/help/[category]/[slug]/page.tsx` — single article view with `Article` + `BreadcrumbList` JSON-LD. 308-redirects to canonical locale URL when accessed via the wrong slug or category.
  - `services/help-articles-types.ts` — types + `HELP_CATEGORIES` + `localizeArticle()` utility, separated from the API client wrapper so edge route files can import without pulling Sentry/Node-only deps.
  - `services/help-articles-api.ts` — `apiClient`-backed methods for non-edge contexts.
  - `app/sitemap.ts` — emits one `<url>` per article per locale plus a category index URL for each category that has at least one published article.
- **Pricing payment-processor trust strip.** New `PaymentProcessorStrip` component listing supported processors (Paystack, Wave, MTN MoMo, Orange Money, Moov Money, Visa, Mastercard) with a brief PCI-DSS reassurance line. Wired into `PricingClient` between the existing `TransactionFeesSection` and FAQ. Dropped a planned `ProcessingFeeExplainer` since `TransactionFeesSection` already does that better.
- `i18n/messages/en.json` + `fr.json` — new `pricing.processors` namespace.

### Notes

- Existing `/help` static FAQ page stays as the landing for now — articles are additive, not replacing it.
- Backend half ships in `zefile-backend` v1.54.0.

## [1.53.5] - 2026-05-05

### Fixed

- **`/fr/*` responses are now edge-cacheable for returning FR visitors.** The middleware was emitting `Set-Cookie: NEXT_LOCALE=fr` on every `/fr/*` response, which caused Cloudflare to bypass the new HTML cache rule (Set-Cookie defaults to user-specific content). The cookie is now only set when the existing request cookie value isn't already `fr`. Returning FR visitors with the cookie already present get cached responses; first-time visitors and crawlers still get the cookie set on first hit and bypass cache for that one request. Pairs with the Cloudflare Cache Rule on the `zefile.io` zone deployed on the same day.

## [1.53.4] - 2026-05-05

### Fixed

- **Case-insensitive URLs now 308-redirect to lowercase.** `/About`, `/Pricing`, etc. previously returned 200 with the page rendering, creating a duplicate-URL surface for every static route. The middleware now redirects any pathname containing uppercase characters to its lowercase equivalent. Skips `/@handle` (creator profiles legitimately mixed-case), `/z-AbC` (short links), and paths with file extensions (a typo on a real asset still 404s).
- **`/security` FR description trimmed to 134 chars** (was 170+, exceeded the SERP cutoff). Also fixed the typo "protegeon" → "protégeons" and added missing accents throughout. Title also got proper accents.

### Added

- **`AboutPage` JSON-LD on `/about`** — references the existing `Organization` `@id` and declares `inLanguage: ["en", "fr"]`. Helps AI engines and Google Knowledge Graph link the page to the entity.
- **`/security` OG and Twitter `images`** — social previews now show the brand image instead of a bare card.

### Changed

- **`/press` and `/jobs` are now `noindex`** and removed from `sitemap.xml` (along with their `/fr/` mirrors). Both pages still render publicly but won't accumulate in Google's index until real content ships. Frees crawl budget for valuable pages.

## [1.53.3] - 2026-05-05

### Fixed

- **Homepage and `/about` meta descriptions trimmed to fit the ~155-char SERP cutoff.** Homepage went from 191 → 145 chars and the copy switched to the African-creators positioning (matches the homepage body). `/about` went 137 → 152 chars. Also fixed a `2 GB` vs `5 GB` discrepancy between the homepage description and the visible body copy / `llms.txt`.
- **FR homepage description rewritten idiomatically** per the ZeFile FR messaging guide ("plateforme de livraison de fichiers pour créatifs africains" — never "transfert" or "vente" framings).
- **Sitemap now emits 12 standalone `/fr/*` `<url>` entries** (one per static EN page). Previously the FR variants only appeared as `xhtml:link` children of the EN URLs, which several crawlers treat as weaker than independent `<url>` entries. Each FR entry preserves the full EN/FR/x-default `xhtml:link` set so the pair cross-references itself.

### Added

- **`theme-color: #5E53E0`** via Next.js `Viewport` export in `app/layout.tsx`. Matches the existing manifest `theme_color` so installable PWA and Android browser address bar share the same brand accent.

## [1.53.2] - 2026-05-05

### Fixed

- **Blog post URLs now bind to the post's actual locale, not the URL prefix.** EN and FR translations live at different slugs, so the previous logic produced duplicate URLs (`/blog/<fr-slug>` rendered FR content with `<html lang="en">`, `/fr/blog/<en-slug>` rendered EN content with `<html lang="fr">`), false sitemap hreflang claims, and missing on-page hreflang for blog posts. Closes audit findings C1–C4.
  - `app/blog/[slug]/page.tsx`: 308-redirect when URL locale doesn't match `post.locale`; `ArticleJsonLd` URL uses the locale-correct path.
  - `app/blog/[slug]/layout.tsx`: canonical and self-referencing hreflang built from `post.locale`; breadcrumb URLs and OG `locale` follow the post's actual language.
  - `app/sitemap.ts`: blog entries listed once at their locale-correct URL with self-only `xhtml:link`. The data model has no translation FK yet, so we cannot honestly claim cross-locale alternates for blog posts. Static pages keep their EN/FR/x-default pairing unchanged.
  - `components/blog/PostCard.tsx`, `components/blog/BlogPostClient.tsx`, `app/blog/page.tsx`: internal links, share URLs, and breadcrumbs use the locale-correct path so users skip the redirect hop.

## [1.53.1] - 2026-05-04

### Fixed

- **Hreflang and canonical URLs now point to the real `/fr/*` routes.** Sitemap and all page metadata previously declared `en` and `fr` alternates as the same URL (the EN one), and FR pages set their canonical to the EN URL. The middleware actually serves `/fr/*` as a distinct path (rewriting to `/*` with `NEXT_LOCALE=fr` cookie), so the metadata was contradicting the routing — Google was likely consolidating FR variants into their EN counterparts and not indexing the French pages independently.
  - `app/sitemap.ts`: `withAlternates` rewritten to take a path and emit `{ en: /path, fr: /fr/path, x-default: /path }` for the 12 static URLs plus blog posts and creator profiles.
  - `app/layout.tsx`: canonical is now self-referencing — `/fr/*` pages canonicalize to themselves instead of the EN page.
  - 11 per-page layouts updated to the same pattern: `about`, `pricing`, `how-it-works`, `help`, `privacy`, `terms`, `contact-us`, `security`, `press`, `jobs`, `blog`.

## [1.53.0] - 2026-05-04

### Added

- **`public/llms.txt`** — Structured site description for AI search crawlers (ChatGPT, Claude, Perplexity). Includes product summary, key facts (plans, fees, file types, payout methods), top-level page map, FR mirror, and licensing posture (`search=yes, ai-train=no`). Addresses the previous 404 where `https://zefile.io/llms.txt` returned the Next.js HTML shell.

### Changed

- **`app/robots.ts` — explicit allow rules for AI search crawlers.** Previously relied on Cloudflare Pages' managed Scrape Shield, which blocked `GPTBot`, `ClaudeBot`, `Google-Extended` site-wide with `Disallow: /`. New explicit `User-agent` blocks for `GPTBot`, `OAI-SearchBot`, `ChatGPT-User`, `ClaudeBot`, `Claude-Web`, `PerplexityBot`, and `Google-Extended` allow them on the public surface (`/`, `/about`, `/pricing`, `/blog`, `/help`, `/how-it-works`, `/privacy`, `/terms`, `/contact-us`, `/security`, `/press`) while still blocking download/transfer/dashboard/account/admin paths. Per RFC 9309 most-specific-UA-wins, these override Cloudflare's wildcard. Training-only crawlers (`anthropic-ai`, `CCBot`, `Bytespider`, `cohere-ai`) remain fully disallowed. `PUBLIC_PATHS` and `PRIVATE_PATHS` extracted as constants.

### Operational

- **Cloudflare Pages dashboard step required** to fully deploy the change: disable **Bots → Block AI bots** (currently "Block on all pages") and disable **Bots → Instruct AI bot traffic with robots.txt**. With those on, Cloudflare returns 403 to GPTBot/ClaudeBot at the edge before the request reaches the page, neutralising the `robots.txt` allow rules.

## [1.52.3] - 2026-04-23

### Changed

- **Rewrote home hero copy for first-time visitor clarity.** Old headline ("Send files. Get paid before they download.") + subtitle (channels/tiers list) only landed for readers who already knew ZeFile — first-timers couldn't tell what the product actually did. New hero walks a stranger through the full loop in two beats: headline "Send your work. Get paid the moment they download." (the outcome) + split subtitle "Drop in your files, set a price, share the link. / Your client previews, pays, then downloads — money straight to your account." (the flow). EN + FR updated together; FR follows the brand voice guide (vous, no literal idiom translations).

## [1.52.2] - 2026-04-18

### Fixed

- **Upload-flow OTP verify now sends a fresh Turnstile token.** `UploadPanel.handleOTPVerify` was calling `authApi.verifyOTP` without requesting a new captcha token first. Since Turnstile tokens are single-use, the one issued for `requestOTP` had already been consumed, and on environments with `CAPTCHA_REQUIRED=true` (staging/production) the backend rejected `/auth/verify-otp` with `400 "CAPTCHA verification required"`. Matches the existing pattern in `EmailAuthForm.tsx:142` and `PhoneAuthForm.tsx:151`.

## [1.52.1] - 2026-04-18

### Fixed

- `components/shared/HeroText.tsx`: tightened hero title from `text-5xl` to `text-4xl` so the call-to-action button sits higher on first paint.

## [1.52.0] - 2026-04-18

### Added

- **Epic 132 — Hurt moments & trust recovery (frontend).** Paired with `zefile-backend@1.53.0`. Four recipient- and subscriber-facing recovery flows from the 2026-04-17 UX audit.
  - **Story 132.1 — Forgot password on protected transfers.** New `features/transfer/components/PasswordHelpPanel.tsx` lets a stuck recipient ping the sender without leaving the download page. Calls `POST /transfers/:shortCode/password-help-request`.
  - **Story 132.2 — Preview-generating state on receiver side.** New `hooks/usePreviewStatus.ts` polls preview status; `components/shared/PreviewPlaceholder.tsx` renders an honest "we're getting this ready" state. Wired into `TransferPreviewPanel`, `TransferPreviewModal`, and `FilePreviewView` so receivers see status instead of a dead placeholder.
  - **Story 132.3 — Download-failed recovery card.** New `features/transfer/components/DownloadRecoveryCard.tsx` surfaces after a failed download; one click reports to the sender via `POST /transfers/:shortCode/download-failed-report`. New `PerFileDownloadList.tsx` gives each file its own retry/report affordance.
  - **Story 132.4b — Subscription billing grace period (frontend).** Legacy `features/subscription/components/PaymentIssueBar.tsx` replaced by `components/shared/PaymentIssueBar.tsx` with widened DTO coverage for grace fields. New `stores/subscription-store.ts` polls subscription state. `stores/drawer-store.ts` gains serialize/hydrate so drawer state survives the Paystack redirect during "update payment method". `app/payment/processing/page.tsx` wired to the new update-payment-method endpoint.
- **PostHog event helpers** in `lib/posthog.ts`: `password_help_requested`, `download_failed_reported`, `preview_pending_shown`, `billing_grace_*` — matches backend event names.
- **Typed API clients** for the new backend endpoints: `services/storage-api.ts` (preview status), `services/transfer-api.ts` (password-help-request, download-failed-report), `services/subscription-api.ts` (update-payment-method).
- **i18n:** new keys in `i18n/messages/{en,fr}.json` for all four stories. Brand-voice reviewed (contractions, "Heads up" not "WARNING", `vous` in French, no emojis).

### Migration notes

- Must be deployed alongside `zefile-backend@1.53.0`. Frontend is forward-compatible with older backends (new panels gracefully hide when the corresponding endpoints 404), but the grace-period bar and preview-pending state are inert without backend 1.53.0.
- Story 132.4b still has two human gates: Sally voice review + Paystack dogfood. Feature flag not required — empty-state fallbacks are safe.

## [1.51.1] - 2026-04-17

### Fixed

- **Epic 131.8 code review follow-ups** (paired with `zefile-backend@1.52.1`):
  - `services/payouts-api.ts`: `SenderPayoutsResponse` migrated to `{ payouts, meta }` — the legacy flat shape compatibility shim that preserved `{ total, page, limit, totalPages }` as siblings of `payouts` has been removed. Platform-wide "no flat pagination siblings" contract now holds at every mapping boundary.
  - `features/account/components/PayoutsPanel.tsx`: reads `payoutsData.meta.totalPages` instead of `payoutsData.totalPages`.
  - `services/file-request-api.ts`: `getMyRequests()` and `getMyDeliveries()` return types migrated to `{ data, meta }` matching the backend file-requests shape migration (missed in original 131.8 survey because that backend DTO lacked `totalPages`).

## [1.51.0] - 2026-04-17

### Changed

- **BREAKING: Consume `{ data, meta }` pagination shape from backend `zefile-backend@1.52.0` (Epic 131 Story 131.8).** All paginated API reads now access `response.data.meta.{total, page, limit, totalPages}` instead of the flat `response.data.{total, page, limit, totalPages}`. Consumers of `items:` arrays migrated to `data:` where the backend renamed the field.
  - `services/blog-api.ts` — `BlogListResponseDto` now `{ data, meta }` with `items:` renamed to `data:`.
  - `services/payouts-api.ts` — internal `BackendWithdrawalResponse` type aligned; legacy `SenderPayoutsResponse` shape preserved for UI compatibility.
  - `services/referrals-api.ts` — `ReferralHistoryResponse` aligned.
  - `services/subscription-api.ts` — `PaginatedRenewalHistory` `items:` renamed to `data:`.
  - UI consumers: `app/blog/page.tsx`, `components/blog/BlogListClient.tsx`, `components/blog/BlogPostClient.tsx`, `features/account/components/ReferralsPanel.tsx`, `features/account/components/SubscriptionSettingsPanel.tsx`.

### Migration notes

- Must be deployed alongside `zefile-backend@1.52.0` and `zefile-admin@1.23.0`. Backward-incompatible with backend <1.52.0 — the new read paths produce `undefined` against the old response shape.

## [1.50.0] - 2026-04-17

### Added

- **Story 130.3 — End-of-conversation feedback prompt (Chat Widget)**
  - When a support conversation transitions to `resolved` or `closed`, the widget now asks "Did we solve your issue?" with thumbs-up / thumbs-down / "Not yet" actions.
  - Feedback posts to the backend `POST /support/conversations/:id/feedback` endpoint, forwarding the visitor's `accessToken` for unauthenticated sessions.
  - Result persists: on next conversation load, if the backend has recorded a `feedbackVerdict` on the conversation metadata, the widget shows "Thanks. We'll keep getting smarter." instead of re-prompting.
  - "Not yet" re-opens the conversation (reopen verdict) and clears the resolved state so the visitor can keep chatting.
- `supportApi.submitFeedback(conversationId, verdict, accessToken?)` service helper.
- `chatStore` now tracks `accessToken` and `feedbackSubmitted`, plus `setIsResolved` / `setFeedbackSubmitted` actions.

### Fixed

- File remove (X) button in `FilePreviewPanel` now has a visible icon color in dark mode (previously rendered as a near-invisible `currentColor` on a dim background).

## [1.49.2] - 2026-04-13

### Fixed

- Sender's own visits to the download page no longer inflate view counts in transfer analytics

## [1.49.1] - 2026-04-13

### Removed

- WhatsApp number prompt from Transfer Complete screen -- redundant now that recipients can enter phone numbers during transfer creation

## [1.49.0] - 2026-04-13

### Added

- Multi-recipient download page with WhatsApp + email auth routing (Epic 124)
- MultiRecipientInput component for mixed email/phone recipient entry
- Waitlist page for pre-launch signups
- Maintenance page for scheduled downtime
- Recipient OTP and WhatsApp verify methods in auth-api
- Public transfer info endpoint for recipient type detection

### Changed

- Middleware extended with new route matchers for waitlist/maintenance
- PlatformStatusGate supports waitlist and maintenance modes

## [1.48.1] - 2026-04-09

### Fixed

- Prevent merged headers from being overwritten by spread options in fetch requests
- Handle array error messages from backend validation (join with period separator)

## [1.48.0] - 2026-04-09

### Added

- Cloudflare Turnstile invisible CAPTCHA on OTP and payment forms
- Device fingerprint collection on authentication (FingerprintJS)
- Analytics free-tier limited view with upgrade prompts
- Analytics contextual tip banners
- Creator profile primary service selector
- Public profile services section

### Changed

- CSP: added challenges.cloudflare.com to frame-src for Turnstile
- API client sends X-Captcha-Token and X-Device-Fingerprint headers
- Auth forms integrated with Turnstile widget
- Analytics panel enhanced with tips and free-tier view

### Removed

- Legacy useCaptcha hook (replaced by useTurnstile)

## [1.47.3] - 2026-04-04

### Fixed

- Resolve CSP `unsafe-eval` violation from PostHog surveys module in production
- Filter browser extension noise (Backpack, chrome-extension, moz-extension) from Sentry error reports

## [1.47.2] - 2026-04-04

### Changed

- Pin Node to 22.16.0 via .nvmrc and add engines constraint

## [1.47.1] - 2026-04-04

### Fixed

- Update contact page content and layout

## [1.47.0] - 2026-03-27

### Added

- PresignedUrlPool class with batch fetching (10 URLs/batch) and automatic fallback
- Sliding window upload concurrency (4 concurrent chunks) replacing batch-then-wait
- Presigned URL prefetching when pool drops below threshold
- Multi-file parallel upload support (2 files concurrently)

### Fixed

- Replace hardcoded payment error strings with i18n translation keys
- Remove fallback string in ProfileSection sessionExpired toast

## [1.46.0] - 2026-03-25

### Added

- Phone/email tab switcher on AuthPanel with supported country codes (TG, BJ, CI, GH, NG, KE)

### Fixed

- SideDrawer slide-in/out animation not working (Tailwind v4 translate transition)
- Drawer content disappearing before slide-out animation completes

## [1.45.0] - 2026-03-23

### Added

- Public creator profile page (`/@handle`) with identity block, bio, social links, services, and stats
- Profile settings panel in account with social links editor and services selector
- Creator strip component on download page showing sender profile info
- WhatsApp prompt component for post-transfer contact saving
- Creator profiles API service (`creators-api.ts`)
- Dynamic sitemap generation for creator profiles
- Middleware routing for profile pages
- Phone auth form improvements for WhatsApp login flow
- i18n translations for all new profile and WhatsApp features (en/fr)

### Changed

- Updated OG image

## [1.44.0] - 2026-03-21

### Added

- DeliveryProofCard component showing certificate details for paid file transfers
- Delivery proof fetch and display in TransferDetailsPanel (sender view, public sales)
- Invoices API: `getDeliveryProofForTransfer()` and `verifyDeliveryProof()` methods
- DELIVERY_PROOF invoice type and transferId filter support
- PostHog session replay toggle driven by platform config (`sessionReplayEnabled`)
- EN/FR translations for delivery proof card and session replay

## [1.43.0] - 2026-03-21

### Added

- HandlePanel: claim and manage your `amara.zefile.io` subdomain (STARTER+ only)
- Real-time handle availability check with 500ms debounce
- Active handle card with copy-to-clipboard button
- Handle menu item in AccountPanel sidebar, filtered to STARTER/PRO tiers
- `updateHandle()` and `checkHandle()` methods in UsersApi
- Full EN/FR translations for handle feature
- `NEXT_PUBLIC_ZEFILE_SUBDOMAIN_BASE` env var for configurable subdomain base

## [1.42.1] - 2026-03-20

### Fixed

- Add `/fr` locale routing via middleware rewrite so French pages are indexable by Google
- Add page-specific hreflang tags (`en`/`fr`/`x-default`) generated from `x-canonical-path` header
- Remove `isLoading` gate in `HowItWorksClient` that caused Google to see a loading screen instead of page content

## [1.41.1] - 2026-03-20

### Fixed

- Add ThemeToggle to WaitlistPage header so dark mode can be toggled during waitlist

## [1.41.0] - 2026-03-20

### Added

- Dark mode: ThemeToggle component, theme-store (Zustand), FOWT prevention
- Dark palette CSS variables and transition rules across all components
- SaleCheckoutPanel for public sales buyer purchase flow
- Download page layout with sale-aware routing
- ReferralsPanel in account section with referral API client
- Public sales endpoints in transfer-api

### Changed

- All components updated with dark mode class variants
- Removed axios dependency (using native fetch)

### Fixed

- Updated EN/FR translations for dark mode and sales features

## [1.40.0] - 2026-03-17

### Added

- Referral landing page at /r/[code] with code validation and intent capture
- ReferralsPanel in account settings with stats, history, and share functionality
- Post-OTP referral application (silent code capture)
- Referral API client (services/referrals-api.ts)
- Growth prompts for referral nudges
- EN/FR translations for referral system

### Changed

- Updated favicon and logo assets
- Updated WaitlistPage, AccountPanel, PayoutsPanel, auth forms for referral integration

## [1.39.0] - 2026-03-16

### Changed

- Rename Free tier to Basic (EN) / Essentiel (FR) across all user-facing text
- Disable signup submit button until terms are accepted

## [1.38.0] - 2026-03-15

### Added

- Invoice download buttons in TransactionsPanel and PayoutsPanel (Epic 72)
- Transfer cover image and details media support in TransferDetailsPanel and UploadPanel
- invoices-api service for invoice list and download endpoints
- Download page improvements for transfer cover display
- Updated translations (EN/FR) for invoice and cover media features

## [1.37.1] - 2026-03-14

### Fixed

- Added missing CAPTCHA token to upload OTP flow (caused 400 errors for non-logged-in users)
- Added null-token guards to all OTP call sites (EmailAuthForm, download page, UploadPanel)
- Added `captchaNotReady` translation keys (EN/FR) for graceful error messaging

## [1.37.0] - 2026-03-11

### Added

- File request delivery and review pages with dedicated panels
- Contact page FAQ component and OpenGraph image

### Changed

- Reworked payment panels for gateway-agnostic checkout flow
- Updated download page with improved payment and file request flows
- Updated transfers panel with file requests tab

### Fixed

- Restored missing French accents across legal, contact, how-it-works, branding, waitlist, and crossLinks sections
- Replaced double dashes with em dashes in EN and FR copy
- Fixed typo in French FAQ (n'aceedons -> n'accédons)

### Removed

- Unused short-link-redirect.html

## [1.36.0] - 2026-03-09

### Added

- Major rework of FileRequestPanel with improved UX flow
- Congrats lottie animation and new About page image assets
- New marketing images for About page sections

### Changed

- Payment checkout updated to support multiple gateways (PhoneNumberInput, payment API)
- Refreshed About, How It Works, and Pricing pages with updated components
- Updated TransferCompletePanel and SubscriptionPanel
- Updated EN/FR translations for new features

## [1.35.0] - 2026-03-06

### Added

- Gateway-agnostic payment checkout flow supporting StartButton and Paystack
- KYC flow panels for BVN verification (Togo and Benin)
- Suggestion/idea conversation starter in support chat widget (EN + FR)

### Fixed

- Subscription price display for all XOF-zone countries (TG, BJ, SN, ML, BF, NE, GW)
- Trust strip rendered once at bottom of upload panel (was duplicated per auth state)

## [1.34.0] - 2026-03-06

### Added

- Free transfer toggle for STARTER and PRO tiers (send files without requiring payment)
- Minimum transfer price validation with automatic currency conversion from NGN base rate
- Price input placeholder shows minimum amount per selected currency

## [1.33.0] - 2026-03-06

### Changed

- Convert 10 public pages from client-side to server-rendered for SEO crawlability (about, pricing, how-it-works, contact-us, help, security, press, jobs, terms, privacy)
- Extract client interactivity into separate Client components (AboutClient, PricingClient, HowItWorksClient, ContactForm, HelpContent, ChatButton)
- Server-render sr-only SEO text blocks for complex pages (about, pricing, how-it-works)
- Header "Pricing" link now opens SubscriptionPanel drawer instead of navigating to /pricing

## [1.32.0] - 2026-03-06

### Added

- Convert blog post page to SSR for search engine crawlability
- Dynamic OG images for /pricing, /about, /how-it-works pages
- Hreflang alternates in sitemap.xml for all pages (EN/FR)
- Metadata (generateMetadata, OG tags, breadcrumbs) for /security, /press, /jobs
- CrossLinks component for internal page navigation on pricing, how-it-works, about, help
- Core Web Vitals monitoring via PostHog (LCP, CLS, INP, FCP, TTFB)
- manifest.json for PWA support
- FAQ schema on /help layout
- Blog post breadcrumb now includes post title

### Changed

- Blog post page split into server component + client interactive parts
- Pricing header link now crawlable (href="/pricing" instead of drawer action)
- Press and Jobs layouts upgraded from static metadata to dynamic generateMetadata

### Fixed

- Contact page title duplication ("ZeFile" appeared twice)

## [1.31.1] - 2026-03-05

### Fixed

- Align all user-facing translations with ZeFile Voice Guide
- Remove "successfully" from 14 EN success toasts
- Replace 42 French "Veuillez" instances with direct imperatives
- Fix missing French accents in security content
- Update OG image

## [1.31.0] - 2026-03-05

### Added

- BrandingPanel in account settings: logo/favicon upload, color theming, company name (STARTER+)
- Unified branding hook: custom domain cookie > API senderBranding > default
- Download page renders sender branding from BrandingProfile API
- FileRequestPanel on home page with send/request tab stack UI
- /deliver/[shortCode] page for creative file delivery
- /review/[shortCode] page for client review and approval
- File request API service for all CRUD operations
- Tab stack animation (WeTransfer-style inactive pill peek)
- Analytics moved from standalone drawer to account panel (STARTER+)
- AccountPanel filters menu items by user tier (hides branding/analytics for FREE)
- EN/FR translations for file requests, branding, analytics upgrade prompt
- TransferPreviewPanel passes recipientEmail for preview access

### Changed

- Free tier limits: 5GB storage (was 2GB), 10 transfers/month (was 5), 14-day expiry (was 7)
- Starter tier storage: 20GB (was 10GB)
- Pricing page updated with new tier limits

## [1.30.2] - 2026-03-04

### Fixed

- Clear all Zustand stores on logout via `clear-all-stores` event dispatch
- Fix logo Image dimensions warning (set explicit height in CSS)
- Fix FOUC: add fade-in animation to content panel to prevent beige flash on page refresh

## [1.30.1] - 2026-03-04

### Changed

- Updated OG image assets

## [1.30.0] - 2026-03-04

### Added

- Security policy page (`/security`) with vulnerability disclosure, scope, rules, and safe harbor sections

## [1.29.0] - 2026-03-04

### Changed

- Security page: replace infrastructure URLs with security feature descriptions
- Security page: remove third-party service names from out-of-scope section
- Security contact email updated to hello@zefile.io

## [1.28.0] - 2026-03-04

### Added

- Post-download CTA page for unauthenticated recipients with back-to-transfer link
- New user welcome banner on download page after OTP verification (auto-dismisses after 5s)
- Inline upsell hints on gated features (wallpaper, size limit) for free-tier authenticated users
- Onboarding checklist card in Transfers drawer with per-user localStorage dismiss
- Transfer list empty state redesign with icons and CTAs per tab (Sent, Received, Paid)
- Onboarding status API integration (`GET /users/me/onboarding-status`)

### Changed

- Checkbox style consistency: green bg with dark check icon, dark hover border
- WaitlistPage checkbox hover border updated to match design system

### Fixed

- Bulk action bar now hides when drawer closes (transfers selection cleared on close)
- CSS injection protection for wallpaper URL in download page background
- Onboarding checklist dismiss key is now per-user (prevents cross-account dismissal)

## [1.27.0] - 2026-03-03

### Added

- Staggered entrance animations on home and download pages (waitlist-style reveal)
- Upload panel slides up, hero title slides up, subtitle fades in
- Paper plane Lottie scales in with custom revealPlane keyframe
- Creator avatars pop in with staggered scaleIn, trust text fades in

## [1.26.0] - 2026-03-03

### Added

- Time-of-day Lottie logo colorization: white (day), green (evening), cream (night)
- Night mode subtitle now renders in white for better contrast

## [1.25.0] - 2026-03-03

### Added

- CreatorsTrustStrip component on homepage hero (overlapping creator avatars with social proof text)
- Auth-aware header navigation and mobile menu updates

### Changed

- Trust strip copy: confident statement instead of question ("Trusted by creators who don't compromise")
- Download page: simplified "Preview before you pay" to "Take a look before you pay" (EN/FR)
- About page trust pills: warmer passwordless auth copy
- Footer trust features: shorter, more personal copy
- FR translations: natural French equivalents instead of literal translations

## [1.24.0] - 2026-03-03

### Added

- Auth-aware HeroText CTA on download page: hides "Get started" for logged-in users, shows upgrade CTA for free-tier users
- Trust strip on upload panel (secure transfer, auto-expiry, paywall badges)
- Metropolis ExtraBold (800) and Black (900) font weights
- Rich text highlight support on legal page titles (Terms, Privacy)

### Changed

- Updated logo assets (SVG, PNG) with new design including icon + wordmark
- Logo size increased across Header, WaitlistPage, and MaintenancePage
- HeroText redesigned: centered layout, larger title (font-black), auth-aware CTAs replacing proof stats
- PaperPlaneAnimation replaced with logo watermark animation (decorative background)
- MaintenancePage background uses logo animation instead of paper plane
- WaitlistPage removed duplicate favicon from header
- Stars opacity reduced in night mode TimeOfDayBackground
- Blog reading progress bar repositioned to top of viewport
- Panel pointer-events adjustments for proper click-through on download and home pages

### Fixed

- Waitlist mode now blocks download pages (previously exempted)
- Download page HeroText CTA now correctly adapts to authentication state

## [1.23.0] - 2026-03-02

### Added

- ContactPage JSON-LD schema on contact-us page
- SoftwareApplication type to WebApplication JSON-LD for broader search coverage
- AI crawler policy: allow ChatGPT-User and PerplexityBot on public marketing pages
- Image entries (og-image.png) in sitemap for Google Image Search indexing
- CDN domain and Wasabi endpoint as configurable CSP env vars

### Changed

- Blog title tag: "Blog - Tips & Guides for Creatives" (EN/FR) to avoid redundant "ZeFile | ZeFile"
- Reduced Metropolis font from 9 weights to 5 (removed unused 100, 200, 800, 900)
- CSP: removed Wasabi S3 endpoint from img-src/media-src, added CDN domain instead
- CSP: Wasabi endpoint kept only in connect-src (required for direct uploads)
- Removed deprecated X-XSS-Protection header from middleware and next.config
- Maintenance page: white logo variant for night mode, larger background element

### Fixed

- Hreflang: added explicit en/fr alternates alongside x-default in root layout

## [1.22.0] - 2026-03-02

### Added

- Maintenance page with Lottie animation, logo, and estimated downtime display
- Waitlist page with email signup form, styled checkbox, and consent flow
- PlatformStatusGate provider for automatic maintenance/waitlist redirection
- `usePlatformStatus` hook with polling for real-time platform status
- `platform-api` service for status checks and waitlist signup
- EN/FR translations for maintenance and waitlist pages

## [1.21.0] - 2026-03-02

### Added

- Server-rendered sr-only SEO content section for search engine crawlers (What is ZeFile, How it works, Why creatives choose ZeFile)
- FAQ schema (FAQJsonLd) on homepage with 6 Q&A items for Google rich snippets
- Keyword-rich sr-only description block for improved search indexation
- `homeSeo` translation namespace with 20 keys (EN + FR)

### Changed

- Homepage title tag: "ZeFile -- Send Files & Get Paid Before Download"
- Meta description rewritten for freelancer/creative keyword targeting
- Expanded keyword meta tags for niche positioning
- Fixed hreflang: removed duplicate en/fr alternates pointing to same URL, kept x-default only
- Homepage wrapped in `<main>` landmark for semantic HTML

## [1.20.2] - 2026-03-02

### Fixed

- Upgrade Next.js from 15.3.4 to 15.3.6 (CVE-2025-66478 RCE fix)
- Add `rel="noopener noreferrer"` to download link in FilePreviewView
- Restrict DOMPurify URI protocols in blog post renderer (block javascript:/data: URIs)
- Add email format validation to CustomEvent recipient listener in UploadPanel

### Added

- ESLint `no-console` rule (warns on `console.log`, allows `warn`/`error`)
- PDF iframe title attribute for accessibility
- Encryption fallback logging in multipart upload service
- Dependency override for tar (>=7.5.8)

## [1.20.1] - 2026-03-01

### Fixed

- Currency display now uses shared `formatCurrencyAmount` utility for correct symbol positioning (e.g., `₦ 9,300` not `9,300 ₦`)
- Added XAF (Central African CFA franc) as supported currency
- CFA currencies now display as `9,300 XOF` / `9,300 XAF` (ISO code after amount)
- Earnings inline text bolds the amount and fee percentage for readability

## [1.20.0] - 2026-03-01

### Added

- Unified upload area with trust strip (secure, expiry, paywall indicators)
- Context-aware transfer button labels: "Send test" / "Send & get paid" / "Send files"
- Inline service charge display when setting a price
- Progressive disclosure on upload form ("Add title & options" toggle)
- Monthly equivalent line under annual prices ("That's X/month")
- Test mode toggle: users can switch back to real mode after entering test mode

### Changed

- Pricing cards now bold tier-unique features and summarize shared features
- Annual toggle shows real savings amount ("Save up to X") using highest tier savings
- Selected country in all currency dropdowns now uses bold instead of purple
- Removed International (USD) from the earnings calculator
- Updated brand assets, logos, favicons, and styling

## [1.19.0] - 2026-02-28

### Added

- Display server-generated watermarked preview in test transfer simulation (tamper-proof)

### Changed

- Replace `--` with em dashes in English and French translations

### Fixed

- Cookie consent banner no longer blocks interaction with page elements behind it

## [1.18.1] - 2026-02-28

### Fixed

- Default earnings calculator country set to Nigeria (NGN)

## [1.18.0] - 2026-02-28

### Added

- Interactive earnings calculator replacing static transaction fees table on pricing page
- Auto-skip choice blocks after 3 completed test transfers (localStorage-based)
- Test download simulation component for test transfer flow

### Changed

- Choice blocks modernized: "Try it first" / "Send for real" with NavArrowRight icon
- Processing fee removed from pricing page (buyer's cost, not relevant to creators)
- Choice block hover/active animations (scale 1.02 / 0.98)
- Test transfer panel widths adjusted (420px main, 444px side offset)

## [1.17.0] - 2026-02-28

### Added

- Unified test transfer upload flow with same progress bar as real transfers
- Test simulation views (sender/recipient) matching actual email template format
- Featured creators section on download page for social proof
- "Preview before you pay" messaging on download page for paid transfers
- First free transfer banner and tracking in TransferCompletePanel
- Payment page analytics (view/abandon tracking)
- Choice block styles for visitor upload mode selection
- New API methods: testUpload, createTestSession, getFeaturedCreators
- Extended PostHog tracking for test transfer and payment funnels
- EN/FR translations for all new features

### Changed

- Header auth check shows loading overlay until resolved (prevents flash)

## [1.16.3] - 2026-02-27

### Fixed

- Add edge runtime export to manifest.ts for Cloudflare Pages compatibility

## [1.16.2] - 2026-02-27

### Fixed

- Sitemap hardcoded lastModified dates replaced with dynamic timestamps
- Homepage double h1 issue (HeroText ARIA heading marked as aria-hidden)
- OfferCatalog structured data using proper UnitPriceSpecification for pricing schema
- Blog index converted from client-side to server-side rendering for search engine crawlability

### Added

- Vary (Accept-Language, Cookie) and Content-Language response headers for i18n SEO
- Dynamic locale-aware manifest.ts replacing static manifest.json
- Dynamic OG image generation for blog posts (opengraph-image.tsx)

## [1.16.1] - 2026-02-26

### Fixed

- Pricing page auto-scrolling to fees section on load (scrollIntoView replaced with container-only scroll)

## [1.16.0] - 2026-02-26

### Added

- CTA sections on pricing and help pages
- TransactionFeesSection component showing processing, platform, and payout fees
- Regional flag SVGs for BF, BJ, CM, GN, ML, RW, TG, TZ, UG
- Country code and payout method params in withdrawal fee calculation

### Fixed

- Header scroll glitch: 8px delta threshold prevents flicker on trackpad micro-movements
- Header layout shift between hidden/floating states (spacer present in both)
- Header flash on initial hide (CSS transition only on slide-in, instant slide-out)

### Changed

- How-it-works CTA subtext styling alignment with other pages

## [1.15.0] - 2026-02-25

### Added

- Processing fee breakdown in buyer checkout (file price + processing fee + total)
- Fee breakdown props in TransferSummaryCard component
- countryCode parameter in payment initialization request
- Payout fee percentage display in withdrawal panel
- Fee-related i18n keys for EN and FR (filePrice, processingFee, totalCharged, withdrawalFeePercent)

### Changed

- Tier limit fallback defaults updated: FREE 7%, STARTER 5%, PRO 3% (matching backend pass-through model)

## [1.14.4] - 2026-02-25

### Fixed

- Improve text readability on About and How It Works pages (darker text color, font-medium weight, consistent text-base sizing)
- Change toggle buttons from rounded-full to rounded-md on How It Works page

## [1.14.3] - 2026-02-24

### Fixed

- Poll store Zustand persist middleware accessing localStorage during SSR, causing 500 on all routes

## [1.14.2] - 2026-02-24

### Fixed

- Trimmed 8 meta descriptions exceeding 160 characters to comply with SEO best practices (About EN/FR, Blog FR, Help FR, How It Works FR, Pricing FR, Terms EN/FR)

## [1.14.1] - 2026-02-24

### Added

- Hreflang alternate language tags (en, fr, x-default) on all 10 public page layouts for multi-language SEO
- Bing Webmaster Tools meta verification support via `NEXT_PUBLIC_BING_VERIFICATION` env var

## [1.14.0] - 2026-02-24

### Changed

- Homepage converted from client component to Server Component for SSR — H1 and subtitle now in initial HTML response for crawlers
- Homepage client logic extracted to `HomeClient.tsx` (no visual change)
- HeroText `<h1>` changed to `<div role="heading">` to avoid duplicate H1s with server-rendered heading
- Removed duplicate AI bot rules from `robots.ts` (Cloudflare managed section already handles GPTBot, CCBot, ClaudeBot, Amazonbot, Google-Extended, Bytespider)

### Removed

- Broken hreflang language alternate tags from all 12 layout files — EN and FR pointed to same URL without URL-based i18n routing

## [1.13.0] - 2026-02-24

### Added

- PageHero component on pricing page with gradient background and slide-up animation
- Modern CSS Grid feature comparison table with highlighted Pro column
- BrandCross decorative shapes and gradient section on pricing page
- Green highlight text on pricing section headings (plan, features, Questions)
- Highlight text on SubscriptionPanel drawer header
- Hreflang language alternates on all page layouts

### Changed

- Pricing page background from warm gray to white
- Tier cards container widened from max-w-5xl to max-w-6xl
- FAQ section restyled to match how-it-works page (warm gray bg, larger padding, SVG chevron)
- HeroText proof stats text colors adjusted for better contrast

## [1.12.1] - 2026-02-24

### Fixed

- Add Google reCAPTCHA domains to CSP policy (connect-src, script-src) to unblock CAPTCHA on staging

## [1.12.0] - 2026-02-24

### Added

- Wire all 9 frontend-only PostHog events for 100% analytics coverage
- FILES_SELECTED tracking on file drop and file picker selection
- TRANSFER_STARTED tracking when user initiates transfer
- FILE_UPLOADED tracking per-file after successful multipart upload
- UPLOAD_FAILED tracking on upload finalization failure
- PRICING_VIEWED tracking on pricing page load
- PLAN_SELECTED tracking when user selects a subscription plan
- FILE_UPLOADED and UPLOAD_FAILED enum values and convenience functions in posthog lib

## [1.11.0] - 2026-02-24

### Added

- Inline transfer options within UploadPanel (removed separate TransferOptionsPanel)
- StepIndicator for download page multi-gate progress (Email > Code > Password)
- OfferCatalogJsonLd structured data on pricing page for SEO
- Onboarding tooltip sequence after first transfer completion
- Mobile upgrade banner in Header for free-tier authenticated users
- Searchable FAQ accordion in AccountPanel help section
- Blog related articles section and CTA on post detail pages
- SectionIndicator, StepIndicator, AccordionItem, OnboardingTooltip shared components
- Slide animations for form view transitions
- Social proof stats bar on hero section

### Changed

- Merged email + OTP into single inline flow on download page
- Removed phone auth tab from AuthPanel (email-only)
- Rewrote hero copy targeting freelancers
- Extracted blog PostCard into reusable component
- Updated about page with animated counters, how-it-works carousel with drag support

### Fixed

- Chat store false unread count on cold start, persist badge to localStorage

## [1.10.0] - 2026-02-23

### Added

- Blog table of contents navigation and social share buttons (LinkedIn, Facebook, WhatsApp, Email, Copy Link)
- AES-GCM encryption for multipart upload state in sessionStorage
- Session token authentication for password-protected transfers (replaces plain password passing)
- `/jobs` and `/press` pages with layout components
- `LegalPageLayout`, `TableOfContents`, and `MobileTocButton` shared components
- DOMPurify integration for XSS protection on HTML content
- `security.txt` at `/.well-known/security.txt`
- Dynamic `robots.ts` (replaces static `robots.txt`)
- Cache control headers for HTML pages in middleware
- Metropolis Black and ExtraBold font weights

### Changed

- Migrated `payment-api` from raw axios to centralized `apiClient` wrapper
- Refactored `streamZipDownload()` and `getFilePreviewUrl()` to accept options objects
- Renamed `transferPassword` to `passwordSessionToken` throughout drawer store
- Tightened CSP: specific Wasabi region URLs instead of wildcards, deduplicated PostHog domains
- Added `upgrade-insecure-requests` CSP directive
- Middleware route matcher changed to catch-all for broader coverage
- Blog pagination reduced from 10 to 5 posts per page
- Blog post cards use side-by-side image/content layout

### Removed

- `/advertisers` page and all related translations
- `public/OG-IMAGE-README.md`
- `<SentryProvider>` wrapper (simplified Sentry integration)

## [1.9.0] - 2026-02-22

### Added

- Cookie consent banner with analytics opt-in/opt-out
- Legal consent modal for terms and privacy acceptance on auth flows
- EU Representative section placeholder in privacy policy
- Marketing consent toggle in Data & Privacy account settings
- Analytics cookie consent toggle in Data & Privacy account settings
- Legal terms acceptance status display in account settings
- PostHog consent-aware initialization (respects cookie preferences)
- New `usersApi` methods: `getLegalConsent`, `acceptLegalTerms`, `updateCookieConsent`

### Changed

- Legal entity updated to "Infobulle, registered in Togo" across terms and privacy
- Governing law changed from French law / Paris courts to Togolese Republic / Lome courts
- Removed CNIL-specific references (complaint authority, 13-month cookie rule attribution)
- Tax law retention reference changed from "French tax law" to "applicable tax and commercial law"
- International data transfers section reframed for non-EU entity operating with EU providers
- Complaint section now references generic local data protection authority with EDPB link
- About page redesigned with dark fan capability cards
- How It Works page fully redesigned with expanded content
- Help page layout improvements
- Footer redesigned
- Auth panels updated with legal consent checkboxes
- OTP verification flow updated with consent integration
- Subscription panel updated

## [1.8.0] - 2026-02-21

### Added

- Shared `PageHero` component for consistent page headers across static pages
- About page: scroll-reveal animations, capabilities slideshow, trust carousel, brand cross decorations

### Changed

- About page hero title: "Get paid before they download" (more active, specific)
- About page Africa section: "Built where it matters" with tighter, non-repetitive body copy
- About page trust pill: "No passwords needed" instead of jargon "Passwordless auth"
- About page value title: "Getting you paid comes first" for clarity
- About page CTA button: "Send your first file" (more personal)
- Replaced all double-hyphen (--) with proper em dashes in EN translations
- Refreshed copy across blog, contact, help, how-it-works, jobs, press, privacy, and terms pages
- Updated SEO metadata for About page
- All copy changes applied to both EN and FR translations

## [1.7.0] - 2026-02-20

### Added

- Contact Us page (`/contact-us`) with form submission (name, email, message, category checkboxes)
- Chat widget integration on contact page (opens AI support chat)
- Threads and X (Twitter) social media links across Footer, DrawerFooter, contact page, and JSON-LD
- `/contact-us` route added to middleware matcher

### Changed

- Social media handles unified to @zefilehq across all locations
- EN/FR translations: removed robotic copy ("successfully", "Veuillez"), fixed French accents, humanized wording per voice guide
- Updated OG image

## [1.6.2] - 2026-02-19

### Fixed

- Header blank flash fully eliminated using `useLayoutEffect` for sync auth state initialization (fires before browser paint)

## [1.6.1] - 2026-02-19

### Fixed

- Blank header flash on page load — auth state now set immediately from localStorage before async server verification
- Help Center page redesigned with search, accordion FAQs, and 2-column grid layout

### Changed

- Contact email updated from `support@zefile.io` to `hello@zefile.io` across Footer, Subscription, Terms, and Privacy pages

## [1.6.0] - 2026-02-19

### Added

- Real content for About, How It Works, Help Center, and Advertisers pages (EN/FR)
- Security headers in middleware (HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy)
- WebApplicationJsonLd with AggregateOffer and @id graph linking
- Footer on pricing and blog pages

### Changed

- Rewrote JSON-LD schema: SoftwareApplication → WebApplication, removed deprecated HowTo and conflicting Product schemas
- Fixed title duplication across 6 layouts (removed "ZeFile" from sub-page titles to avoid double with template)
- Fixed robots.txt broken regex patterns with simple prefix-based rules
- Fixed `_headers` removing x-robots-tag: noindex from OG images and favicons
- Sitemap uses static lastModified dates instead of dynamic `new Date()`
- Removed noindex from about, how-it-works, help, advertisers pages
- Disabled X-Powered-By header in next.config.ts

## [1.5.0] - 2026-02-19

### Added

- Blog list page (`/blog`) with responsive 2-column grid, pagination, skeleton loading, and error retry
- Blog post page (`/blog/[slug]`) with cover image, prose-styled HTML content, and alternate locale link
- Blog API service (`services/blog-api.ts`) for public blog endpoints
- ArticleJsonLd and BreadcrumbJsonLd structured data components for SEO
- Dynamic sitemap integration for published blog posts by locale
- Blog translations (EN/FR) for all UI text
- `/blog` and `/blog/*` routes in middleware matcher

### Changed

- JsonLd ArticleJsonLd image uses ImageObject format with dimensions for rich results
- Existing page layouts updated with hreflang alternate links

## [1.4.0] - 2026-02-18

### Added
- Custom branding, custom domain, custom wallpaper features in subscription tier system
- Dynamic tier feature display in SubscriptionPanel, PlanCard, and FeatureComparisonTable
- Jobs page (`/jobs`) with EN/FR translations
- Press page (`/press`) with EN/FR translations
- `/jobs` and `/press` routes in middleware matcher

### Changed
- DrawerFooter links now close the SideDrawer before navigating
- PostHogProvider uses `window.location.search` instead of `useSearchParams()` hook
- Home page uses `URLSearchParams` in mount effect instead of `useSearchParams()`
- Static pages (terms, privacy, about, help, how-it-works, advertisers) no longer use fake loading pattern
- JSON-LD script tags include `suppressHydrationWarning` for PostHog compatibility

### Fixed
- Hydration mismatch caused by PostHog injecting scripts before React hydration
- `useParams` typed destructuring in download page to avoid proxy enumeration warning
- PostHog `disable_external_dependency_loading` prevents DOM mutation before hydration

## [1.3.0] - 2026-02-18

### Added
- Custom Domain settings panel in Account page (STARTER/PRO tiers)
- `useCustomBranding` hook: reads branding cookie, applies white-label styling to download page
- `BrandedHeader` component for custom-domain download pages
- `custom-domain-api.ts` service for domain CRUD, branding, logo/favicon uploads
- Custom domain URL display in TransferDetailsPanel and TransfersPanel
- `buildCustomDomainUrl()` utility in clipboard utils
- i18n keys for custom domain panel (EN + FR)

### Changed
- Download page supports white-label rendering when accessed via custom domain
- AccountPanel sidebar includes Custom Domain section
- Drawer store supports `custom-domain` view
- Updated OG image

### Fixed
- CSS injection prevention: hex color validation on branding cookie values
- URL injection prevention: domain allowlist for logo/favicon URLs from cookie
- Company name sanitization (HTML tag stripping)
- Favicon cleanup on unmount (restores original favicon)
- Domain input validation with real-time error feedback
- SVG removed from logo uploads (XSS prevention)
- File upload input positioning (label wrapper pattern)
- ARIA attributes on toggle switches and icon buttons
- `ConfirmationModal` props (`isOpen`, `type` instead of `variant`)
- `toast.error()` calls now use `response.error.message` (type safety)

## [1.2.0] - 2026-02-17

### Added
- Privacy and terms pages
- Dynamic sitemap generation (`app/sitemap.ts`)
- OG image for social sharing
- SoftwareApplication JSON-LD structured data
- Google/Yandex verification meta tags support

### Changed
- Rewrite all UI translations (EN + FR) with ZeFile brand voice
- Update SEO meta tags and layout across all pages
- Adjust HeroText font sizes for consistency

### Fixed
- Loading screen z-index now covers chat widget during page load

## [1.1.0] - 2026-02-17

### Added
- AI support chat widget with context-aware conversation starters, escalation to human agents, and satisfaction rating
- Support API service (`support-api.ts`) and chat store (`chat-store.ts`) for conversation state management
- Country flag SVGs (CI, GH, KE, NG, SN, ZA) in small/medium/large sizes for currency switcher
- `react-flagpack` dependency for flag rendering
- Support chat translations (en/fr)
- Transfer context injection into chat widget on download page

### Changed
- Moved poll widget and chat button to bottom-right with coordination: poll auto-hides when chat opens, reappears 2s after chat closes
- Updated LoadingFullscreen and LoadingPanel with improved animations
- Updated KYC, payment, and subscription panels with currency flag integration
- Improved multipart upload chunk handling in `multipart-upload.service.ts`
- Updated currency switcher with flag icon display

## [1.0.2] - 2026-02-14

### Changed
- Platform fee fallback defaults: FREE 15% → 10%, STARTER 10% → 7% (Epic 37)
- Updated comments in platform-api.ts to reflect new fee percentages

### Fixed
- Charge info tooltip on upload form now dismisses on click-outside

## [1.0.1] - 2026-02-12

### Fixed
- Download pages and preview components updated for CDN streaming (Epic 31)

## [1.0.0] - 2026-02-12

### Added
- Semantic versioning infrastructure
- npm version lifecycle scripts (`preversion`, `postversion`)
- This CHANGELOG file

### Changed
- Bumped package version from `0.1.0` to `1.0.0`

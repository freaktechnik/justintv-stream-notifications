---
  title: Allow cookies for extension
  permalink: /help/accept-cookies/
  layout: page
---
When storing cookies is disallowed, the extension can not edit and read the channel list anymore. There are two ways to fix this: either generally enable cookies or explicitly allow the extension to store cookies. See the following two sections for instructions.

## Generally enabling cookies
Go to the browser preferences, select the <samp>Privacy & Security</samp> section and ensure the History settings either are on <samp>Remember history</samp> or <samp>Use custom settings for history</samp> and <samp>Accept cookies from websites</samp> is checked.

## Explicitly allowing the extension
Go to the browser preferences, select the <samp>Privacy & Security</samp> section and select <samp>Use custom settings for history</samp> for the History settings. Nothing has to be checked. Click the <samp>Exceptions…</samp>, open the channel manager in a new tab and copy the URL up until <samp>/manager/index.html</samp>. Paste the moz-extension:// URI into the <samp>Address of website</samp> field and click on the <samp>Allow</samp> button, to permanently let the extension store and access information in the database.

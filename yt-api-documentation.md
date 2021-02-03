Live Stream Notifier YT Client Documentation
============================================
Live Stream Notifier informs the user about live streams. To do so it requests
data from the YouTube Data API.

The Client has a couple of entry points:
 - User adds a single channel to the list of monitored channels
 - User wants to add all followed channels by a YT user to their local list
 - Extension checks live state of channels in the list
 - User wants a list of popular YouTube streams
 - User searches for YouTube streams

All these interactions happen in HTML files included with the extensions and
requests to the YT API are made directly from the user's machine.

Following is a run down of the individual API Endpoints the client uses and why
they are called.

Users can override the API Key used by the client manually in the graphical
configuration interface of the extension ("options").

This document is vastly based on the source code at https://github.com/freaktechnik/justintv-stream-notifications/blob/master/src/background/providers/youtube.js

and that is the actual source of truth how the client behaves and not this document.
This document was solely created to fill out the form I was urged to complete within 3 days.

API interactions
----------------

/videoCategories with the parameters:
 - part: snippet
 - id: ID of the category that was requested, usually from the details of a video/stream object
 - hl: the user's current language of the browser UI
 - key: the API key of the client

This endpoint is primarily called to translate category IDs into human readable
strings that are then displayed to the end user. The category names are hard
cached during the whole browser session.

/channels with the parameters:
 - part: id,snippet
 - forUsername: username to load favorites for
 - fields: items(id,snippet/title,snippet/thumbnails,snippet/defaultLanguage)
 - key: the API key of the client

Used to retrieve the YouTube user ID based on a username when the user wants to
get all followers of a channel. Avatar and title for the user are saved to the
database from this call.

Alternatively used to retrieve data on a channel to just store the fields listed
above in the database, without retrieving subscriptions after that. In this case
the defaultLanguage and channel URLs based on the login are also saved.

with parameters:
 - identical, except instead of forUsername the id field is set to a channel ID.

Used to refresh information of an already stored channel or user (users have
subscriptions, channels can be live).

/subscriptions with the parameters:
 - part: snippet
 - channelId: channel ID from /channels call above
 - maxResults: 50
 - key: the API key of the client
 - pageToken: as appropriate

Used to retrieve the subscriptions of a user. If the subscriptions are private,
the user is rejected, since the client offers no authentication.

The results are used to save the subscription's usernames with the subscribing
user in the database and individual subscription's username, avatars and defaultLanguage
are saved to the database, along with URLs to the profile, based on the login value.

/search with the parameters:
 - part: id
 - channelID: channel ID of one of the monitored channels
 - fields: items(id/videoId)
 - maxResults: 1
 - eventType: live
 - type: video
 - key: the API key of the client

Used to check for currently running livestreams of individual channels. If there
is a better way to do that, I'm all ears, but that's all I could find based on
the API documentation. The results are then used to retrieve details on a stream
if one is present and else the channel is marked as offline.

with parameters:
 - part: id
 - fields: items(id/videoId)
 - eventType: live
 - type: video
 - order: relevance
 - relevanceLanguage: user's browser display langauge
 - safeSearch: defaults to moderate, can be changed to strict by not allowing mature content in the settings of the extension.
 - q: query string, empty when retrieving popular streams
 - key: the API key of the client

When the user wants to see popular youtube livestreams or searches for a live
stream on YouTube. No data returned by this API, nor the successive /videos call
to get the same details as would normally be retained in the database are saved
in the database. It is sent to the view and rendered and discarded as soon as
soon as it is no longer visible (and GC collects it).

/videos with the parameters:
 - part: id,snippet,liveStreamingDetails
 - id: video ID(s) as returned by /search
 - fields: items(id,snippet(channelId,title,thumbnails/medium/url,categoryId,defaultLanguage),liveStreamingDetails(concurrentViewers,actualStartTime))
 - key: the API key of the client
 - hl: browser display language of the user's browser

Returned data is used to get the name of the category of the livestream, start time,
URLs to watch the stream, title, thumbnail, concurrent view count and language.
This data is stored in the database until newer information was retrieved or
the livestream is over.

Data display
------------
Data that is not immediately sent to the front end for display and never stored
in the database is always loaded from the database when displayed.

There are three primary ways the data gets exposed to the user:

 - Stream status changes and user has notifications enabled for the status
   transition: desktop notification with avatar, stream title and username is
   shown to the user.
 - User adds or removes channels that should be watched, avatar and username of
   channels currently in the database are displayed.
 - User checks the status of all watched channels, all applicable data is shown,
   so for offline channels, only username and avatar are shown, while for
   channels with an ongoing live stream all data configured to be shown by the
   user is displayed. This ranges from username, title and avatar and
   username, avatar, title and thumbnail to either of the ones before plus
   concurrent view count, category and start time (displayed as hours and minutes
   the stream has been live for). The content language is used for hyphenation
   preferences of metadata.

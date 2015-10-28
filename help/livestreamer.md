---
  title: Livestreamer Integration Help
  permalink: /help/livestreamer/
  layout: page
---
# What is Livestreamer?
[Livestreamer](http://livestreamer.io) is a command-line programm that opens
streams with a native video player like VLC.

# What does the integration do?
By default it just displays a context menu for streams in the panel if
Livestreamer was found in a default installation location on your computer.
Else you will not see any signs of Livestreamer except for the extension
settings.

# Livestreamer is installed the extension doesn't realize that
Either you installed Livestreamer while your browser was open - in which case
the add-on doesn't know about it yet, or it can't find Livestreamer.

If your browser was open during the installation, just restart it.

If the extension can't find Livestreamer (the livestreamer path setting is empty),
you will have to manually specify the full path to the Livestreamer executable
(`livestreamer.exe` on Windows, `livestreamer` everywhere else).

# "Open with Livestreamer" is not working
This means either Livestreamer can't find VLC or the player you specified in the
extension settings or the quality defined in the settings is not available for
that stream.

The player path should be an absolute path to the executable of the player.
Livestreamer will then try to open the stream with that player.

# I want to watch all streams with Livestreamer
Just toggle the "Always use Livestreamer" setting.

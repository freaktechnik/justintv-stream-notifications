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
(`livestreamer.exe` on Windows, `livestreamer.app` on Mac OS, `livestreamer` everywhere else).

# <samp>Open with Livestreamer</samp> is not working
This means either Livestreamer can't find VLC or the player you specified in the
extension settings or the quality defined in the settings is not available for
that stream.

The player path should be an absolute path to the executable of the player.
Livestreamer will then try to open the stream with that player.

# I want to watch all streams with Livestreamer
Just toggle the <samp>Always use Livestreamer</samp> setting.

# Advanced quality control
The default behaviour of the quality selection is to first try with the user-set
quality in the add-on preferences and then fall back to a fail-safe quality.
The fail-save quality is always passed as `--default-stream` argument.

You can exploit this to for example use `--stream-sorting-exlude` as your
default quality to watch lower quality streams if available, but the argument
gets dismissed if there's no stream of the given filter available.

# Passing arbitrary arguments
You can pass any argument by setting the [about:config](/aboutconfig) preference
`livestreamer_extraArguments` to a comma separated list of arguments. The extra
arguments should not have any extra white space separating them for the comma
and a comma should always be between two arguments, else the extension might
break. See the [Livestreamer documentation](http://docs.livestreamer.io/cli.html#command-line-usage)
for all possible arguments.

# Generated livestreamer commands
`{name}` is the value of an [about:config](/aboutconfig) preference with the
indicated name. Some of them are exposed in the extension preferences.

`[url]` is the url of the livestream to open.

Note that `{livestreamer_quality}` is replaced with `{livestreamer_fallbackQuality}`
if the command failed (see [Advanced quality control](#advanced-quality-control)).

`{livestreamer_extraArguments}` get split up by each comma and appended as an
argument each (see [Passing arbitrary arguments](#passing-arbitrary-arguments))

## Normal without player set

```sh
{livestreamer_path} --default-stream={livestreamer_fallbackQuality} [url] {livestreamer_quality}
```

## Normal with player set

```sh
{livestreamer_path} --default-stream={livestreamer_fallbackQuality} [url] {livestreamer_quality} --player={livestreamer_player}
```

## With extra arguments and player set

```sh
{livestreamer_path} --default-stream={livestreamer_fallbackQuality} [url] {livestreamer_quality} --player={livestreamer_player} {livestreamer_extraArguments}
```



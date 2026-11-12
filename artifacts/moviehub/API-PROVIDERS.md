# Moviehub content providers

Moviehub uses the same content catalog and live-TV services as the Nabees Stream
website. Provider errors are surfaced in the app rather than replaced with sample
content.

| Source | App features | Notes |
| --- | --- | --- |
| Nabees rapid-function movie API | Home rails, all catalog categories, genre search, search suggestions, details, cast and recommendations | The title-details response supplies trailer and staff metadata when available. |
| `movieapi.freesrv.com/moviebox/sources` | Movie and series playback and supported file downloads | This is the only movie-stream source configured in the app. Results vary by title and episode. |
| `movieapi.freesrv.com/moviebox/sports` | Dedicated live, upcoming and completed sports fixtures | Match playback is shown when a playable URL is provided. |
| Pluto TV | Dedicated Pluto live-channel list and verified playback | The channel is verified when selected; availability varies by channel and region. |
| IPTV directory and stream proxy | IPTV channel search and playback | Uses the existing public Supabase function and header-aware stream URLs. |
| GlobeTV | Additional international channels within the IPTV tab | Closed, adult, or unstreamable channels are excluded. |
| Subtitle API | Captions returned with movie playback sources | Subtitle playback depends on support in the stream and Android video player. |
| Staff filmography | Related-title metadata | Retained as an imported provider; current movie detail pages prioritize cast and recommendations. |

The app does not include alternate Moviebox v1/v3 providers or a WWE section.
Movie sources are requested from the single `movieapi.freesrv.com` endpoint; a
successful API response may still contain no playable source for a specific title.

## Local files and offline playback

Opening a local video uses Android's document picker, so the user selects the
specific files to play. Moviehub does not request broad “all files” access.
Download progress and pause/resume state are stored locally. If a provider does
not support resumable transfers, Android or the provider may refuse to continue.
Completed downloads can be explicitly copied to Android's video library after
the user grants media-library permission. An HLS `.m3u8` stream is a playlist,
not a single offline movie file, so it is not marked as a completed download.

# Moviehub content providers

Moviehub uses the same content catalog and live-TV services as the Nabees Stream
website. Provider errors are surfaced in the app rather than replaced with sample
content.

| Source | App features | Notes |
| --- | --- | --- |
| Nabees rapid-function movie API | Home rails, all catalog categories, genre search, search suggestions, details, cast and recommendations | The title-details response supplies trailer and staff metadata when available. |
| MovieBox upstream (`h5-api.aoneroom.com`, `netnaija.film`) | Direct source lookup, movie and series playback, and supported file downloads | The app requests source and caption metadata directly and sends the upstream's required playback headers. Results vary by title and episode. |
| `movieapi.freesrv.com/moviebox/sports` | Dedicated live, upcoming and completed sports fixtures | Match playback is shown when a playable URL is provided. |
| Pluto TV | Dedicated Pluto live-channel list and verified playback | The channel is verified when selected; availability varies by channel and region. |
| IPTV directory and stream proxy | IPTV channel search and playback | Uses the existing public Supabase function and header-aware stream URLs. |
| GlobeTV | Additional international channels within the IPTV tab | Closed, adult, or unstreamable channels are excluded. |
| MovieBox caption endpoint | Caption lookup for supported streams | Subtitle playback depends on the caption format and Android video player. |
| Staff filmography | Related-title metadata | Retained as an imported provider; current movie detail pages prioritize cast and recommendations. |

The app does not include alternate Moviebox v1/v3 providers or a WWE section.
Movie source and caption metadata are requested directly from the MovieBox
upstream. A successful source response may still contain URLs that the upstream
CDN refuses to serve to a particular network or player.

## Local files and offline playback

Opening a local video uses Android's document picker, so the user selects the
specific files to play. Moviehub does not request broad “all files” access.
Download progress and pause/resume state are stored locally. If a provider does
not support resumable transfers, Android or the provider may refuse to continue.
Completed downloads can be explicitly copied to Android's video library after
the user grants media-library permission. An HLS `.m3u8` stream is a playlist,
not a single offline movie file, so it is not marked as a completed download.

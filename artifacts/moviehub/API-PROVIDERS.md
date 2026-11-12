# Moviehub content providers

The Android app keeps the imported content-source services and calls them directly.
The app does not replace provider failures with sample data.

| Imported source | Mobile use | Current notes |
| --- | --- | --- |
| Nabees rapid-function movie API | Home rails, categories, search, suggestions, title details and recommendations | The app uses the imported search, popular movie, new TV, top-list, and detail requests. |
| Moviebox v2 (`movieapi.freesrv.com`) | Preferred playback and download source | A successful source request may still return no streams for individual titles. Download accepts direct files only; HLS manifests are refused. |
| Moviebox v1 Worker | Optional alternate movie source | Preserved as a selector. The upstream sometimes returns a provider error and is not assumed to be available. |
| Movie3 v3 Worker | Optional alternate source and caption-compatible responses | Preserved as a selector. Availability and current response shape are provider-controlled. |
| Movie search suggestions | Search-as-you-type suggestions | Calls the imported suggestions endpoint. |
| Pluto TV | Live channel catalogue and verified HLS playback | The app resolves each selected channel with the provider's verification endpoint. Live HLS is streamed, not treated as a downloadable movie. |
| IPTV directory and stream proxy | Channel directory and header-aware stream URLs | Uses the imported Supabase IPTV functions and the original public anon key. The Android app asks the user to select content; it does not request unrestricted file access. |
| GlobeTV | International channel list and live streams | The app joins the provider's channel and stream lists and omits closed, adult, or unstreamable channels as in the website. |
| Sports API | Match/event listing | Match playback is only available when the provider supplies a directly playable media URL. |
| WWE API | WWE events and videos | The endpoint returned HTTP 401 during port validation. The app reports that failure; the API owner must restore access for this feed. |
| Subtitle API | Subtitle URLs returned with movie playback sources | Subtitle metadata is retained in the source response. Platform track support depends on the video format and provider URL. |

## Provider validation snapshot

The catalogue, Pluto channel list, GlobeTV country list, and sports endpoint responded
successfully during development. The WWE API returned HTTP 401. A Moviebox v2 source
request for a currently popular title returned no streams; this is a title/provider
availability result, not evidence that the endpoint is down. The optional v1 and v3
services responded with upstream errors on the same check. These services are external
to this app, so their future availability cannot be guaranteed by the APK.

## File access and offline playback

Choosing a video uses Android's document picker so the user selects individual files.
It does not request broad “all files” access. Selected videos are copied into the app's
private documents area and stay in the library until removed. Download progress and
pause/resume state are stored locally. If a source doesn't support a resumable transfer,
Android or the provider may refuse to continue it.

Completed video downloads can be explicitly copied to Android's video library after
the user grants media-library permission. An HLS `.m3u8` stream is a playlist rather
than a single offline movie file, so Moviehub will not falsely mark it as downloaded.

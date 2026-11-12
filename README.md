# Movieeapk

## Nabees Moviehub

Android-first movie streaming, live television, downloads, and local video playback.
The app lives in `artifacts/moviehub` in this pnpm workspace. The imported website
remains in the original Replit workspace and is separate from this Android app.

### Preview

Use the managed **artifacts/moviehub: expo** workflow in Replit. Native file
permissions, downloads and local playback need an Android device; browser preview
does not prove those capabilities.

### Get an APK

An automatic-build workflow is provided as `workflow-template/android-apk.yml`.
The GitHub connection used for this push does not have permission to add files in
`.github/workflows`, so the template must first be copied to
`.github/workflows/android-apk.yml` in the repository. Until then, this repo will
not compile an APK automatically.

Once enabled, each relevant push to `main` builds an APK. After a successful run,
download the `Nabees-Moviehub-Android-…` artifact, extract the ZIP, and install
`Nabees-Moviehub.apk` on an Android device. A SHA-256 checksum is included.
GitHub retains the artifact for 14 days.

The workflow generates native Android files only on the GitHub runner and builds
a universal, standalone release-mode APK with bundled JavaScript. There is no
requirement to run a development server for the installed APK.

**Signing:** the initial workflow uses the Expo Android template's debug key for
an evaluation APK. This is not private production signing and is not ready for
Play Store submission. Configure a private stable signing key in GitHub Actions
secrets before distributing production releases. Never commit signing keys.

### Content and device compatibility

- Uses the original site's external providers, not an invented movie catalogue.
- Provider availability, regional restrictions, codec support, and permission to
  download determine what can play or be saved. A listed provider is not a
  guarantee of uptime.
- Direct video file downloads and HLS live streams are different: saving a
  playlist is not an offline movie. Unsupported downloads must be shown honestly.
- Android support is bounded by the installed Expo/React Native minimum Android
  version and device codec support, not every historical Android device.
- Use content you own or are authorized to stream and download.

### Development

```sh
pnpm install --frozen-lockfile
pnpm --filter @workspace/moviehub typecheck
```

Do not run a root `pnpm dev`; Replit's managed workflow supplies Expo's preview
configuration. The GitHub workflow is separate from Replit preview.

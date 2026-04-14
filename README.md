# Rewritten implementation of [Chris Titus' Streamerbot Chat](https://github.com/ChrisTitusTech/remote-streamerbot-chat) using Nuxt

[![Nuxt UI](https://img.shields.io/badge/Made%20with-Nuxt%20UI-00DC82?logo=nuxt&labelColor=020420)](https://ui.nuxt.com)

## Main diffrerences from the original implementation:
- Logic written in TypeScript
- Built-in library instead of JS WebSocket client(which means easier development)
- UI using Vue + Tailwind(at some point Tailwind sucks, but let's ignore that elephant in the room for now)
- Settings window for setting up the connection to Streamerbot
- Dynamic streamer mentioning in chat messages(Twitch only, Youtube has no support for now)
- Chat overlay as a separate page
- Independent WebSocket(support for hosting it headless)

## Future support capabilities:
- i18n support (module is present for Nuxt)

## Running the application

The only prerequisite is Node.js 18 or higher. You can use any framework for running the application, but I recommend using [Bun](https://bun.sh/) for better performance and faster startup times.

Download the release from the [releases page](https://github.com/FluffyPunk/streamerbot-ctt-nuxt/releases), edit .env and run:

```bash
node server/index.mjs
```

Main chat is available at http://localhost:3000 and overlay is available at http://localhost:3000/overlay

## Building/running from source

Clone the repository and install dependencies:

```bash
bun install
```

Then, run the development server:

```bash
bun run dev
```

Build the application for production:

```bash
bun run build
```

Locally preview production build:

```bash
bun run preview
```

## Known issues
- WebSocket implementation for Bun is bugged with default build. If using Bun for running, you need to rebuild the application with `NITRO_PRESET=node-server` environment variable, which will make it use Node's WebSocket implementation instead of Bun's. This is not needed for development, but for production builds. I have no idea when this will be fixed, so for now just add `NITRO_PRESET=node-server` to your build scripts.

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.

# Credits
- [Chris Titus](https://github.com/ChrisTitusTech) for the original implementation and fixing my fixes
- Me for bumping his OG repository with all the major updates and fixes
- [Streamer.bot](https://streamer.bot/) for providing all the original APIs, libraries etc. All the assets taken from their service belong to Streamer.bot 
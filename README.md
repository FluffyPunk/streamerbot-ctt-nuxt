# Rewritten implementation of [Chris Titus' Streamerbot Chat](https://github.com/ChrisTitusTech/remote-streamerbot-chat) using Nuxt

[![Nuxt UI](https://img.shields.io/badge/Made%20with-Nuxt%20UI-00DC82?logo=nuxt&labelColor=020420)](https://ui.nuxt.com)

## Main diffrerences from the original implementation:
- Logic written in TypeScript
- Built-in library instead of JS WebSocket client(which means easier development)
- UI using Vue + Tailwind(at some point Tailwind sucks, but let's ignore that elephant in the room for now)
- Settings window for setting up the connection to Streamerbot
- Dynamic streamer mentioning in chat messages(Twitch only, Youtube has no support for now)

## Future support capabilities:
- i18n support (module is present for Nuxt)
- Building chat overlay as a separate page

## Running the application

The only prerequisite is Node.js 18 or higher. You can use any framework for running the application, but I recommend using [Bun](https://bun.sh/) for better performance and faster startup times.

Download the release from the [releases page](https://github.com/FluffyPunk/streamerbot-ctt-nuxt/releases) and run:

```bash
node server/index.mjs
```

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

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.

# Credits
- [Chris Titus](https://github.com/ChrisTitusTech) for the original implementation and fixing my fixes
- Me for bumping his OG repository with all the major updates and fixes
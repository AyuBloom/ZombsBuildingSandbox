# ZombsBuildingSandbox

A website that takes available environments in the real game - zombs.io - and lets players find ideal spots and build sketches of a base.

## Tech Stack

- [pnpm](https://pnpm.io/)
- [Prettier](https://prettier.io/)
- [webpack](https://webpack.js.org/)
- [babel](https://babeljs.io/): for library conversions.

## Project Structure

A high-level overview of the project structure and key components of the codebase:

```
.
├── .github/                # GitHub configurations and workflows
├── dist/                   # Production build outputs (ignored in git)
├── release/                # Release files (ignored in git)
├── scripts/                # Helper utility scripts
│   └── rewrite-asset-paths.js # Utility to rewrite asset paths for build
├── src/                    # Source directory
│   ├── app.css             # Main stylesheet for the application layout and UI
│   ├── favicon.ico         # Website favicon
│   ├── index.html          # Main HTML entrypoint for the website
│   ├── image/              # Assets for map, UI components, entities, etc.
│   │   ├── entity/         # Sprites and visual assets for all entities (towers, zombies, players)
│   │   ├── map/            # Map background, textures, tree/stone SVG shapes
│   │   ├── misc/           # Miscellaneous images (e.g. Discord icon)
│   │   └── ui/             # Game UI textures and icons (inventory, toolbar, indicators)
│   └── app/                # Main frontend application logic
│       ├── serverspots.js  # Predefined server positions and data representing map environments
│       ├── Engine/         # Core game and rendering engine
│       │   ├── Asset/      # Asset and resource loading (AssetManager.js)
│       │   ├── Entity/     # Base classes and components for game entities (Entity.js, DrawEntity.js, SpriteEntity.js, etc.)
│       │   ├── Game/       # Core game loop and world orchestration (Game.js, World.js, Debug.js)
│       │   ├── Input/      # User input handling (InputManager.js, InputPacketCreator.js)
│       │   ├── Metrics/    # Performance auditing (Metrics.js)
│       │   ├── Network/    # Networking simulation layer (NetworkAdapter.js, LocalNetworkAdapter.js, LocalEntityManager.js, replication, etc.)
│       │   ├── Renderer/   # Canvas rendering engine and layer organization (Renderer.js, RendererLayer.js)
│       │   └── Util/       # General-purpose utilities (Util.js)
│       └── Game/           # Gameplay layer, structures, UI, and model definitions
│           ├── app.js      # Bootstraps the game within the frontend
│           ├── buildings.js# Configurations for game buildings
│           ├── entities.js # Game-specific entity classifications and configs
│           ├── items.js    # In-game item definitions and settings
│           ├── spells.js   # Spell configurations
│           ├── Entity/     # Concrete entities like player class (LocalPlayer.js)
│           ├── Models/     # Model/logical implementations for buildings, entities, indicators, and bars (e.g. RangeIndicatorModel.js, WallModel.js, TowerModel.js)
│           └── Ui/         # User interface overlays, components, toolbar, and screens (Ui.js, UiPlacementOverlay.js, UiBuildingOverlay.js)
├── babel.config.json       # Babel configuration
├── package.json            # NPM package configuration & scripts
├── pnpm-lock.yaml          # Pnpm lock file
├── webpack.config.js       # Base Webpack configuration for local dev and build
├── webpack.ghpages.js      # Webpack configuration for GitHub Pages deployment
└── webpack.prod.js         # Webpack configuration for optimized production builds
```

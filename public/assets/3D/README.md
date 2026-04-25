# Hero 3D assets

The hero section loads **one random model per session** from the folders listed here.

**Convention:** Each subfolder should contain a **`scene.gltf`** (or `scene.glb`) file.

**When you add a new folder** (e.g. `my-model`):
1. Put your `scene.gltf` (or `scene.glb`) inside `public/assets/3D/my-model/`.
2. Add the folder name to the **`ASSET_FOLDERS`** array in `components/PendantFBX.tsx`.

Example: after adding `public/assets/3D/sphere/`, add `'sphere'` to `ASSET_FOLDERS`.

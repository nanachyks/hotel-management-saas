# Skills catalog

This folder is an [OpenCode skills HTTP catalog](https://opencode.ai/v2/docs/skills)
and a plain download source. It contains the **Flyer to PSD** skill, which
converts raw JPEG/PNG/TIFF artwork (flyers, posters) into layered,
DPI-annotated, optionally-CMKY Photoshop PSD files.

Contents:

```text
skills-catalog/
├── index.json                 # OpenCode catalog manifest
├── flyer-to-psd.zip           # portable copy — unzip to install manually
└── flyer-to-psd/              # catalog payload served to OpenCode
    ├── SKILL.md
    └── scripts/jpeg2psd.py
```

## Install options

### 1. Add as an HTTP catalog (auto-updating)

Add the GitHub raw catalog URL to your `opencode.jsonc`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "skills": [
    "https://raw.githubusercontent.com/nanachyks/hotel-management-saas/main/skills-catalog/"
  ]
}
```

OpenCode downloads `index.json` and fetches each listed file when needed.
Bump `version` in `index.json` whenever the skill changes so OpenCode
refreshes its cache.

### 2. Unzip into your skills directory (portable)

Download `flyer-to-psd.zip`, then drop the `flyer-to-psd/` folder it contains
into either:

- `<project>/.opencode/skills/` (this project only), or
- `~/.config/opencode/skills/` (all projects)

### 3. Clone/copy directly

Any of `~/.config/opencode/skills`, `~/.claude/skills`, `~/.agents/skills`, or
`.opencode/skills` accepts a folder containing `SKILL.md`.

## Using the skill

Once installed, OpenCode advertises it as `flyer-to-psd`. Ask the agent, e.g.:

> convert flyer.jpg to an editable psd at 300 dpi

or invoke it explicitly:

> @flyer-to-psd convert the raw flyer into a psd

Manual CLI use (no agent needed):

```sh
python flyer-to-psd/scripts/jpeg2psd.py flyer.jpg --dpi 300 --cmyk
```

Requires Python 3.10+ and `pip install pillow psd-tools`.

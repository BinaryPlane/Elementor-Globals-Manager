# Elementor Globals Manager

A WordPress admin utility for extracting, editing, importing, and exporting Elementor global fonts and colors. The plugin exposes responsive typography values for desktop, tablet, and mobile, and allows you to export the global settings as JSON or CSV.

## Features

- Adds an admin page under **Elementor Globals**
- Displays Elementor global typography and color settings
- Supports inline editing of global font and color values
- Exports typography and color data as **JSON** or **CSV**
- Supports importing JSON back into Elementor globals
- Loads grouped font lists for `custom`, `system`, and `google` fonts
- Includes responsive typography support for desktop/tablet/mobile
- Adds admin CSS and JavaScript for improved inline editing UX

## Installation

1. Copy the plugin folder to your WordPress `wp-content/plugins/` directory.
2. Activate the plugin from the WordPress admin Plugins screen.
3. Ensure Elementor is installed and a global kit is active.

## Usage

1. In WordPress admin, go to **Elementor Globals**.
2. View and edit global typography and color settings directly in the admin UI.
3. Use export controls to download the current settings as JSON or CSV.
4. Use the import feature to restore or apply settings from a JSON file.

## Export formats

- `JSON`: downloads a structured object of global `fonts` and `colors`
- `CSV`: downloads a flat table useful for spreadsheets and documentation

## Notes

- Only users with `manage_options` can access the admin page and export/import features.
- The plugin reads Elementor font definitions from the active Elementor environment and falls back to Elementor’s font registry or a hardcoded system font list if needed.

## Source

This plugin is implemented in `bnp-el-globals-manager.php`.

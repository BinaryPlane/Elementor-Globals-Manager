# Elementor Globals Manager

A WordPress admin utility for extracting, editing, importing, and exporting Elementor global typography and color settings. The plugin exposes responsive typography values for desktop, tablet, and mobile, and allows export/import of current Elementor global kit settings.

## Features

- Adds an admin page under **Elementor Globals**
- Typography and Colors tabs with live record counts
- Inline editing of font labels, family, weight, style, transform, decoration, and responsive values
- Responsive typography support for desktop, tablet, and mobile breakpoints
- Color editing with a popover picker supporting hex, RGBA, and alpha values
- Export current tab or all settings as **JSON** or **CSV**
- Import plugin-exported **JSON** or **CSV** files back into Elementor globals
- Supports grouped font listings for `custom`, `system`, and `google` fonts
- Google font preview and local font fallback support
- Saves directly to the active Elementor kit and refreshes Elementor cache where available

## Installation

1. Copy the plugin folder to your WordPress `wp-content/plugins/` directory.
2. Activate the plugin from the WordPress admin Plugins screen.
3. Ensure Elementor is installed and an active global kit is selected.

## Usage

1. In WordPress admin, go to **Elementor Globals**.
2. Switch between the **Typography** and **Colors** tabs.
3. Edit values inline in the table or use the controls to import/export data.
4. Export the current tab or all settings as JSON or CSV.
5. Use the Import button to load a JSON or CSV file, review the preview, and confirm import.

## Export formats

- `JSON`: downloads a structured payload with `fonts`, `colors`, and metadata.
- `CSV`: downloads a flat export suitable for spreadsheets with section markers for fonts and colors.

## Notes

- Only users with `manage_options` can access the admin page and export/import features.
- The plugin requires an active Elementor kit.
- CSV imports must use the plugin's export format with `bnp_type:fonts` and `bnp_type:colors` sections.
- The plugin reads Elementor fonts from the active environment and falls back to Elementor’s font registry or a hardcoded system font list.

## Source

This plugin is implemented in `bnp-el-globals-manager.php`.

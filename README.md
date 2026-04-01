# Globals Manager

A small WordPress plugin that extracts Elementor global typography and color settings from the active Elementor Kit, then exports them as JSON or CSV.

## Features

- Adds an admin page under **Globals Manager**
- Shows responsive typography tokens for desktop, tablet, and mobile
- Shows global colors with swatches and hex values
- Exports settings as **JSON** or **CSV**
- Supports Elementor active kit settings via `elementor_active_kit`

## Installation

1. Copy the plugin folder to your WordPress `wp-content/plugins/` directory.
2. Activate the plugin from the WordPress admin Plugins screen.
3. Ensure Elementor is installed and a global kit is active.

## Usage

1. In WordPress admin, go to **Globals Manager**.
2. Switch between the **Typography** and **Colors** tabs.
3. Click **Export JSON** or **Export CSV** to download the extracted globals.

## Export formats

- `JSON`: downloads a structured JSON object containing `fonts` and `colors`
- `CSV`: downloads a flat table with typography rows first, then colors

## Notes

- If no Elementor Kit is active, the admin page will show a warning.
- Only users with `manage_options` can access export functionality.

## Source

This plugin is implemented in `globals-manager.php`.

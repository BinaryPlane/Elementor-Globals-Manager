<?php
if (!defined('ABSPATH')) exit;

function bnp_format_value($value) {
    if (is_array($value)) {
        $size = $value['size'] ?? '';
        $unit = $value['unit'] ?? '';
        if ($size === '' || $size === null) return '—';
        return $size . $unit;
    }
    return ($value !== '' && $value !== null) ? $value : '—';
}

function bnp_get_kit_id() {
    return (int) get_option('elementor_active_kit');
}

function bnp_get_kit_settings() {
    $kit_id = bnp_get_kit_id();
    if (!$kit_id) return [];
    return get_post_meta($kit_id, '_elementor_page_settings', true) ?: [];
}

function bnp_get_fonts($settings) {
    return array_merge(
        $settings['system_typography'] ?? [],
        $settings['custom_typography'] ?? []
    );
}

function bnp_get_colors($settings) {
    return array_merge(
        $settings['system_colors'] ?? [],
        $settings['custom_colors'] ?? []
    );
}

/**
 * Map our internal field name + breakpoint to the Elementor meta key.
 */
function bnp_get_elementor_key($field, $bp) {
    $bp_suffix = ($bp === '' || $bp === 'desktop') ? '' : '_' . $bp;

    $map = [
        'size'           => 'typography_font_size',
        'weight'         => 'typography_font_weight',
        'line_height'    => 'typography_line_height',
        'letter_spacing' => 'typography_letter_spacing',
        'word_spacing'   => 'typography_word_spacing',
        'family'         => 'typography_font_family',
        'style'          => 'typography_font_style',
        'transform'      => 'typography_text_transform',
        'decoration'     => 'typography_text_decoration',
    ];

    $base = $map[$field] ?? '';
    if (!$base) return '';

    // These fields have no breakpoint variants in Elementor
    $flat_fields = ['family', 'style', 'transform', 'decoration'];
    if (in_array($field, $flat_fields, true)) return $base;

    return $base . $bp_suffix;
}

/**
 * Parse a user-typed value (e.g. "18px") back into Elementor's storage format.
 * Array fields: size, line_height, letter_spacing, word_spacing → ['size'=>n, 'unit'=>'px']
 * String fields: weight, family, style, transform, decoration → plain string
 */
/**
 * Save kit settings the way Elementor does — mirrors Kit::add_repeater_row().
 *
 * Key differences vs plain update_post_meta():
 *  1. Goes through PageManager::save_settings() which clears models_cache.
 *  2. Also writes to the kit autosave so the Site Settings editor picks it up.
 *  3. Forces a document-cache refresh.
 *  4. Clears the global CSS file cache.
 */
function bnp_save_kit_settings(array $settings, int $kit_id): void {
    if (
        class_exists('\Elementor\Core\Settings\Manager') &&
        class_exists('\Elementor\Plugin') &&
        isset(\Elementor\Plugin::$instance->documents)
    ) {
        $mgr = \Elementor\Core\Settings\Manager::get_settings_managers('page');

        // 1. Save to the published kit post (clears models_cache)
        $mgr->save_settings($settings, $kit_id);

        // 2. Save to the autosave so the live editor sees the change immediately
        $kit = \Elementor\Plugin::$instance->documents->get($kit_id);
        if ($kit) {
            $autosave = $kit->get_autosave();
            if ($autosave) {
                $mgr->save_settings($settings, $autosave->get_id());
            }
        }

        // 3. Force document-cache refresh
        \Elementor\Plugin::$instance->documents->get($kit_id, false);

    } else {
        // Fallback when Elementor classes are unavailable
        update_post_meta($kit_id, '_elementor_page_settings', $settings);
    }

    // 4. Clear compiled CSS cache
    if (isset(\Elementor\Plugin::$instance->files_manager)) {
        \Elementor\Plugin::$instance->files_manager->clear_cache();
    }
}

function bnp_parse_elementor_value($field, $raw) {
    $raw = trim($raw);

    $array_fields = ['size', 'line_height', 'letter_spacing', 'word_spacing'];

    if (!in_array($field, $array_fields, true)) {
        return ($raw === '—' || $raw === '') ? '' : $raw;
    }

    if ($raw === '' || $raw === '—') {
        return ['size' => '', 'unit' => 'px'];
    }

    if (preg_match('/^([\d.]+)\s*(px|em|rem|vh|vw|%|vmin|vmax)?$/i', $raw, $m)) {
        return ['size' => (float) $m[1], 'unit' => strtolower($m[2] ?: 'px')];
    }

    return ['size' => $raw, 'unit' => 'px'];
}

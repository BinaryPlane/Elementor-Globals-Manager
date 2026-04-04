<?php
if (!defined('ABSPATH')) exit;

add_action('wp_ajax_bnp_save_globals', function () {
    check_ajax_referer('bnp_save_globals', 'nonce');
    if (!current_user_can('manage_options')) wp_send_json_error('Unauthorized', 403);

    $raw     = isset($_POST['changes']) ? wp_unslash($_POST['changes']) : '{}';
    $changes = json_decode($raw, true);

    if (!is_array($changes)) {
        wp_send_json_error('Invalid payload');
    }

    $kit_id = bnp_get_kit_id();
    if (!$kit_id) wp_send_json_error('No active Elementor kit');

    $settings = get_post_meta($kit_id, '_elementor_page_settings', true) ?: [];

    /* ── Font changes ── */
    foreach ($changes['fonts'] ?? [] as $change) {
        $font_id = sanitize_text_field($change['id']    ?? '');
        $field   = sanitize_key($change['field']        ?? '');
        $bp      = sanitize_key($change['bp']           ?? 'desktop');
        $value   = sanitize_text_field($change['value'] ?? '');

        if ($field === 'name') {
            foreach (['system_typography', 'custom_typography'] as $group) {
                if (!isset($settings[$group])) continue;
                foreach ($settings[$group] as &$item) {
                    if (($item['_id'] ?? '') === $font_id) $item['title'] = $value;
                }
                unset($item);
            }
            continue;
        }

        $el_key = bnp_get_elementor_key($field, $bp);
        if (!$el_key) continue;

        $parsed = bnp_parse_elementor_value($field, $value);

        foreach (['system_typography', 'custom_typography'] as $group) {
            if (!isset($settings[$group])) continue;
            foreach ($settings[$group] as &$item) {
                if (($item['_id'] ?? '') === $font_id) {
                    $item[$el_key] = $parsed;
                    // Ensure the CSS-variable gate flag is present on every saved item
                    if (empty($item['typography_typography'])) {
                        $item['typography_typography'] = 'custom';
                    }
                }
            }
            unset($item);
        }
    }

    /* ── Color changes ── */
    foreach ($changes['colors'] ?? [] as $change) {
        $color_id = sanitize_text_field($change['id']    ?? '');
        $field    = sanitize_key($change['field']        ?? '');
        $value    = sanitize_text_field($change['value'] ?? '');

        foreach (['system_colors', 'custom_colors'] as $group) {
            if (!isset($settings[$group])) continue;
            foreach ($settings[$group] as &$item) {
                if (($item['_id'] ?? '') !== $color_id) continue;
                if ($field === 'name') {
                    $item['title'] = $value;
                } elseif ($field === 'value') {
                    $item['color'] = sanitize_hex_color($value) ?: $value;
                }
            }
            unset($item);
        }
    }

    bnp_save_kit_settings($settings, $kit_id);
    wp_send_json_success('Saved');
});

/* ── Duplicate global ── */
add_action('wp_ajax_bnp_duplicate_global', function () {
    check_ajax_referer('bnp_save_globals', 'nonce');
    if (!current_user_can('manage_options')) wp_send_json_error('Unauthorized', 403);

    $type = sanitize_key($_POST['type'] ?? '');
    $id   = sanitize_text_field($_POST['id'] ?? '');

    if (!in_array($type, ['font', 'color'], true) || !$id) wp_send_json_error('Invalid request.');

    $kit_id = bnp_get_kit_id();
    if (!$kit_id) wp_send_json_error('No active Elementor kit.');

    $settings = get_post_meta($kit_id, '_elementor_page_settings', true) ?: [];

    $groups = ($type === 'font')
        ? ['system_typography', 'custom_typography']
        : ['system_colors',    'custom_colors'];

    $source = null;
    foreach ($groups as $group) {
        if (!isset($settings[$group])) continue;
        foreach ($settings[$group] as $item) {
            if (($item['_id'] ?? '') === $id) { $source = $item; break 2; }
        }
    }

    if (!$source) wp_send_json_error('Source item not found.');

    $new_id        = dechex(rand());
    $copy          = $source;
    $copy['_id']   = $new_id;
    $copy['title'] = ($source['title'] ?? '') . ' (Copy)';

    $custom_group = ($type === 'font') ? 'custom_typography' : 'custom_colors';
    if (!isset($settings[$custom_group])) $settings[$custom_group] = [];
    $settings[$custom_group][] = $copy;

    bnp_save_kit_settings($settings, $kit_id);

    // Return normalized data so the client builds the row inline
    $temp = [$custom_group => [$copy]];
    $normalized_list = ($type === 'font')
        ? bnp_normalize_fonts(bnp_get_fonts($temp))
        : bnp_normalize_colors(bnp_get_colors($temp));
    $normalized = reset($normalized_list) ?: ['id' => $new_id, 'label' => $copy['title']];

    wp_send_json_success($normalized);
});

/* ── Add global (font or color) ── */
add_action('wp_ajax_bnp_add_global', function () {
    check_ajax_referer('bnp_save_globals', 'nonce');
    if (!current_user_can('manage_options')) wp_send_json_error('Unauthorized', 403);

    $type  = sanitize_key($_POST['type']  ?? '');
    $label = sanitize_text_field($_POST['label'] ?? '');

    if (!in_array($type, ['font', 'color'], true)) wp_send_json_error('Invalid type.');

    $kit_id = bnp_get_kit_id();
    if (!$kit_id) wp_send_json_error('No active Elementor kit.');

    $settings = get_post_meta($kit_id, '_elementor_page_settings', true) ?: [];
    $new_id   = dechex(rand());

    if ($type === 'font') {
        $settings['custom_typography'][] = [
            '_id'                    => $new_id,
            'title'                  => $label ?: 'New Font Style',
            // Required: without this Elementor skips CSS-variable output for this item
            // and the Site Settings popover toggle renders in its inactive state.
            'typography_typography'  => 'custom',
            // Elementor's own default; prevents overlap when no size is set yet.
            'typography_line_height' => [ 'size' => 1.5, 'unit' => 'em' ],
        ];
    } else {
        $settings['custom_colors'][] = [
            '_id'   => $new_id,
            'title' => $label ?: 'New Color',
            'color' => '',
        ];
    }

    bnp_save_kit_settings($settings, $kit_id);
    wp_send_json_success(['id' => $new_id]);
});

/* ── Delete global (font or color) ── */
add_action('wp_ajax_bnp_delete_global', function () {
    check_ajax_referer('bnp_save_globals', 'nonce');
    if (!current_user_can('manage_options')) wp_send_json_error('Unauthorized', 403);

    $type = sanitize_key($_POST['type'] ?? '');
    $id   = sanitize_text_field($_POST['id'] ?? '');

    if (!in_array($type, ['font', 'color'], true) || !$id) wp_send_json_error('Invalid request.');

    $kit_id = bnp_get_kit_id();
    if (!$kit_id) wp_send_json_error('No active Elementor kit.');

    $settings = get_post_meta($kit_id, '_elementor_page_settings', true) ?: [];

    $groups = ($type === 'font')
        ? ['system_typography', 'custom_typography']
        : ['system_colors',    'custom_colors'];

    $found = false;
    foreach ($groups as $group) {
        if (!isset($settings[$group])) continue;
        foreach ($settings[$group] as $k => $item) {
            if (($item['_id'] ?? '') === $id) {
                array_splice($settings[$group], $k, 1);
                $found = true;
                break 2;
            }
        }
    }

    if (!$found) wp_send_json_error('Item not found.');

    bnp_save_kit_settings($settings, $kit_id);
    wp_send_json_success('Deleted');
});

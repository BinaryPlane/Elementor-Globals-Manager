<?php
if (!defined('ABSPATH')) exit;

add_action('wp_ajax_bnp_import_globals', function () {
    check_ajax_referer('bnp_save_globals', 'nonce');
    if (!current_user_can('manage_options')) wp_send_json_error('Unauthorized', 403);

    $raw    = isset($_POST['content'])  ? wp_unslash($_POST['content'])  : '';
    $format = isset($_POST['format'])   ? sanitize_key($_POST['format']) : 'json';

    if (!$raw) wp_send_json_error('Empty file content.');

    /* ── Parse to a normalised array ── */
    $data = ($format === 'csv')
        ? bnp_import_parse_csv($raw)
        : bnp_import_parse_json($raw);

    if (is_wp_error($data)) wp_send_json_error($data->get_error_message());

    $kit_id = bnp_get_kit_id();
    if (!$kit_id) wp_send_json_error('No active Elementor kit.');

    $settings = get_post_meta($kit_id, '_elementor_page_settings', true) ?: [];

    $counts = ['fonts' => 0, 'colors' => 0];

    /* ── Apply fonts ── */
    foreach ($data['fonts'] ?? [] as $font) {
        $id = sanitize_text_field($font['id'] ?? '');
        if (!$id) continue;

        $updated = false;
        foreach (['system_typography', 'custom_typography'] as $group) {
            if (!isset($settings[$group])) continue;
            foreach ($settings[$group] as &$item) {
                if (($item['_id'] ?? '') !== $id) continue;
                bnp_apply_font_to_item($font, $item);
                $updated = true;
                $counts['fonts']++;
            }
            unset($item);
        }

        // Add as new custom font if not found
        if (!$updated) {
            $new = ['_id' => $id, 'title' => sanitize_text_field($font['label'] ?? '')];
            bnp_apply_font_to_item($font, $new);
            $settings['custom_typography'][] = $new;
            $counts['fonts']++;
        }
    }

    /* ── Apply colors ── */
    foreach ($data['colors'] ?? [] as $color) {
        $id = sanitize_text_field($color['id'] ?? '');
        if (!$id) continue;

        $updated = false;
        foreach (['system_colors', 'custom_colors'] as $group) {
            if (!isset($settings[$group])) continue;
            foreach ($settings[$group] as &$item) {
                if (($item['_id'] ?? '') !== $id) continue;
                if (!empty($color['label'])) $item['title'] = sanitize_text_field($color['label']);
                if (!empty($color['value'])) $item['color'] = sanitize_hex_color($color['value']) ?: $color['value'];
                $updated = true;
                $counts['colors']++;
            }
            unset($item);
        }

        if (!$updated) {
            $settings['custom_colors'][] = [
                '_id'   => $id,
                'title' => sanitize_text_field($color['label'] ?? ''),
                'color' => sanitize_hex_color($color['value'] ?? '') ?: ($color['value'] ?? ''),
            ];
            $counts['colors']++;
        }
    }

    bnp_save_kit_settings($settings, $kit_id);

    wp_send_json_success([
        'message' => sprintf(
            'Imported %d font style%s and %d color%s.',
            $counts['fonts'],  $counts['fonts']  !== 1 ? 's' : '',
            $counts['colors'], $counts['colors'] !== 1 ? 's' : ''
        ),
        'counts' => $counts,
    ]);
});

/* ──────────────────────────────────────────────────
   PARSERS
────────────────────────────────────────────────── */

function bnp_import_parse_json($raw) {
    $data = json_decode($raw, true);
    if (!is_array($data)) return new WP_Error('parse', 'Invalid JSON file.');

    $type = $data['bnp_type'] ?? 'all';

    $out = ['fonts' => [], 'colors' => []];

    if ($type !== 'colors' && isset($data['fonts'])) {
        foreach ($data['fonts'] as $font) {
            if (isset($font['id'])) $out['fonts'][] = $font;
        }
    }
    if ($type !== 'fonts' && isset($data['colors'])) {
        foreach ($data['colors'] as $color) {
            if (isset($color['id'])) $out['colors'][] = $color;
        }
    }

    if (empty($out['fonts']) && empty($out['colors'])) {
        return new WP_Error('empty', 'No importable data found in this file.');
    }

    return $out;
}

function bnp_import_parse_csv($raw) {
    $lines = array_filter(array_map('trim', explode("\n", str_replace("\r\n", "\n", $raw))));
    if (empty($lines)) return new WP_Error('parse', 'Empty CSV file.');

    $out         = ['fonts' => [], 'colors' => []];
    $current     = null;  // 'fonts' or 'colors'
    $headers     = [];

    foreach ($lines as $line) {
        if ($line === '') continue;

        $row = str_getcsv($line);
        if (empty($row)) continue;

        // Section markers
        if ($row[0] === 'bnp_type:fonts')  { $current = 'fonts';  $headers = []; continue; }
        if ($row[0] === 'bnp_type:colors') { $current = 'colors'; $headers = []; continue; }

        // Header row
        if (empty($headers)) { $headers = $row; continue; }

        $record = array_combine($headers, array_pad($row, count($headers), ''));

        if ($current === 'fonts') {
            $out['fonts'][] = [
                'id'         => $record['ID']         ?? '',
                'label'      => $record['Name']       ?? '',
                'family'     => $record['Family']     ?? '',
                'style'      => $record['Style']      ?? '',
                'transform'  => $record['Transform']  ?? '',
                'decoration' => $record['Decoration'] ?? '',
                'desktop' => [
                    'size'           => $record['Desktop Size']     ?? '',
                    'weight'         => $record['Desktop Weight']   ?? '',
                    'line_height'    => $record['Desktop Line-H']   ?? '',
                    'letter_spacing' => $record['Desktop Letter-S'] ?? '',
                    'word_spacing'   => $record['Desktop Word-S']   ?? '',
                ],
                'tablet' => [
                    'size'           => $record['Tablet Size']      ?? '',
                    'weight'         => $record['Tablet Weight']    ?? '',
                    'line_height'    => $record['Tablet Line-H']    ?? '',
                    'letter_spacing' => $record['Tablet Letter-S']  ?? '',
                    'word_spacing'   => $record['Tablet Word-S']    ?? '',
                ],
                'mobile' => [
                    'size'           => $record['Mobile Size']      ?? '',
                    'weight'         => $record['Mobile Weight']    ?? '',
                    'line_height'    => $record['Mobile Line-H']    ?? '',
                    'letter_spacing' => $record['Mobile Letter-S']  ?? '',
                    'word_spacing'   => $record['Mobile Word-S']    ?? '',
                ],
            ];
        }

        if ($current === 'colors') {
            $out['colors'][] = [
                'id'    => $record['ID']        ?? '',
                'label' => $record['Name']      ?? '',
                'value' => $record['Hex Value'] ?? '',
            ];
        }
    }

    if (empty($out['fonts']) && empty($out['colors'])) {
        return new WP_Error('empty', 'No importable data found. Make sure you\'re using a file exported by this plugin.');
    }

    return $out;
}

/* ──────────────────────────────────────────────────
   HELPER: write normalised font fields onto an item
────────────────────────────────────────────────── */
function bnp_apply_font_to_item($font, &$item) {
    if (!empty($font['label']))      $item['title'] = sanitize_text_field($font['label']);
    if (isset($font['family']))      $item['typography_font_family']    = sanitize_text_field($font['family']);
    if (isset($font['style']))       $item['typography_font_style']     = sanitize_text_field($font['style']);
    if (isset($font['transform']))   $item['typography_text_transform'] = sanitize_text_field($font['transform']);
    if (isset($font['decoration']))  $item['typography_text_decoration']= sanitize_text_field($font['decoration']);

    $bp_map = [
        'desktop' => '',
        'tablet'  => '_tablet',
        'mobile'  => '_mobile',
    ];

    foreach ($bp_map as $bp => $suffix) {
        if (!isset($font[$bp])) continue;
        $vals = $font[$bp];

        $scalar_fields = ['weight' => 'typography_font_weight'];
        $array_fields  = [
            'size'           => 'typography_font_size',
            'line_height'    => 'typography_line_height',
            'letter_spacing' => 'typography_letter_spacing',
            'word_spacing'   => 'typography_word_spacing',
        ];

        foreach ($scalar_fields as $key => $base_key) {
            if (!isset($vals[$key]) || $vals[$key] === '' || $vals[$key] === '—') continue;
            $item[$base_key . $suffix] = sanitize_text_field($vals[$key]);
        }

        foreach ($array_fields as $key => $base_key) {
            if (!isset($vals[$key]) || $vals[$key] === '' || $vals[$key] === '—') continue;
            $item[$base_key . $suffix] = bnp_parse_elementor_value($key, $vals[$key]);
        }
    }
}

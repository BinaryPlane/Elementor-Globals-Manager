<?php
/*
Plugin Name: Globals Manager
Description: Extract and export Elementor global fonts and colors with responsive typography
Version: 2.0
Author: BinaryPlane
*/

if (!defined('ABSPATH')) exit;

add_action('admin_menu', function () {
    add_menu_page(
        'Globals Manager',
        'Globals Manager',
        'manage_options',
        'bnp-elementor-globals',
        'bnp_render_page',
        'dashicons-art',
        25
    );
});

add_action('admin_enqueue_scripts', function ($hook) {
    if ($hook !== 'toplevel_page_bnp-elementor-globals') return;
    wp_enqueue_style('wp-color-picker');
});

/**
 * Helpers
 */
function bnp_format_value($value) {
    if (is_array($value)) {
        $size = $value['size'] ?? '';
        $unit = $value['unit'] ?? '';
        if ($size === '' || $size === null) return '—';
        return $size . $unit;
    }
    return ($value !== '' && $value !== null) ? $value : '—';
}

function bnp_get_kit_settings() {
    $kit_id = get_option('elementor_active_kit');
    if (!$kit_id) return [];
    return get_post_meta($kit_id, '_elementor_page_settings', true) ?: [];
}

function bnp_get_fonts($settings) {
    $fonts = [];
    if (!empty($settings['system_typography'])) {
        $fonts = array_merge($fonts, $settings['system_typography']);
    }
    if (!empty($settings['custom_typography'])) {
        $fonts = array_merge($fonts, $settings['custom_typography']);
    }
    return $fonts;
}

function bnp_get_colors($settings) {
    $colors = [];
    if (!empty($settings['system_colors'])) {
        $colors = array_merge($colors, $settings['system_colors']);
    }
    if (!empty($settings['custom_colors'])) {
        $colors = array_merge($colors, $settings['custom_colors']);
    }
    return $colors;
}

/**
 * Responsive Typography Normalization
 * Extracts desktop / tablet / mobile variants for every typographic axis.
 */
function bnp_normalize_fonts($fonts) {
    $output = [];

    foreach ($fonts as $font) {
        $id   = $font['_id']    ?? '';
        $name = sanitize_title($font['title'] ?? $id);

        $output[$name] = [
            'id'    => $id,
            'label' => $font['title'] ?? '',

            // Family (single value — Elementor doesn't vary family per breakpoint)
            'family' => $font['typography_font_family'] ?? '',

            // Style / transform / decoration
            'style'       => $font['typography_font_style']       ?? '',
            'transform'   => $font['typography_text_transform']    ?? '',
            'decoration'  => $font['typography_text_decoration']   ?? '',

            // Responsive axes: desktop / tablet / mobile
            'desktop' => [
                'size'           => bnp_format_value($font['typography_font_size']           ?? ''),
                'weight'         => bnp_format_value($font['typography_font_weight']         ?? ''),
                'line_height'    => bnp_format_value($font['typography_line_height']         ?? ''),
                'letter_spacing' => bnp_format_value($font['typography_letter_spacing']      ?? ''),
            ],
            'tablet' => [
                'size'           => bnp_format_value($font['typography_font_size_tablet']           ?? ''),
                'weight'         => bnp_format_value($font['typography_font_weight_tablet']         ?? ''),
                'line_height'    => bnp_format_value($font['typography_line_height_tablet']         ?? ''),
                'letter_spacing' => bnp_format_value($font['typography_letter_spacing_tablet']      ?? ''),
            ],
            'mobile' => [
                'size'           => bnp_format_value($font['typography_font_size_mobile']           ?? ''),
                'weight'         => bnp_format_value($font['typography_font_weight_mobile']         ?? ''),
                'line_height'    => bnp_format_value($font['typography_line_height_mobile']         ?? ''),
                'letter_spacing' => bnp_format_value($font['typography_letter_spacing_mobile']      ?? ''),
            ],
        ];
    }

    return $output;
}

function bnp_normalize_colors($colors) {
    $output = [];
    foreach ($colors as $color) {
        $id   = $color['_id']    ?? '';
        $name = sanitize_title($color['title'] ?? $id);
        $output[$name] = [
            'id'    => $id,
            'label' => $color['title'] ?? '',
            'value' => $color['color'] ?? '',
        ];
    }
    return $output;
}

/**
 * Export Handlers
 */
add_action('admin_init', function () {
    if (!isset($_GET['bnp_export'])) return;
    if (!current_user_can('manage_options')) wp_die('Unauthorized');

    $settings = bnp_get_kit_settings();
    $fonts    = bnp_normalize_fonts(bnp_get_fonts($settings));
    $colors   = bnp_normalize_colors(bnp_get_colors($settings));

    if ($_GET['bnp_export'] === 'json') {
        header('Content-Type: application/json');
        header('Content-Disposition: attachment; filename=elementor-globals.json');
        echo json_encode(['fonts' => $fonts, 'colors' => $colors], JSON_PRETTY_PRINT);
        exit;
    }

    if ($_GET['bnp_export'] === 'csv') {
        header('Content-Type: text/csv');
        header('Content-Disposition: attachment; filename=elementor-globals.csv');

        $out = fopen('php://output', 'w');

        // Fonts
        fputcsv($out, ['TYPE', 'Name', 'ID', 'Family', 'Style', 'Transform',
            'Desktop Size', 'Desktop Weight', 'Desktop Line-H', 'Desktop Letter-S',
            'Tablet Size',  'Tablet Weight',  'Tablet Line-H',  'Tablet Letter-S',
            'Mobile Size',  'Mobile Weight',  'Mobile Line-H',  'Mobile Letter-S',
        ]);

        foreach ($fonts as $font) {
            fputcsv($out, [
                'font',
                $font['label'], $font['id'], $font['family'],
                $font['style'], $font['transform'],
                $font['desktop']['size'],        $font['desktop']['weight'],
                $font['desktop']['line_height'], $font['desktop']['letter_spacing'],
                $font['tablet']['size'],         $font['tablet']['weight'],
                $font['tablet']['line_height'],  $font['tablet']['letter_spacing'],
                $font['mobile']['size'],         $font['mobile']['weight'],
                $font['mobile']['line_height'],  $font['mobile']['letter_spacing'],
            ]);
        }

        // Gap row then colors
        fputcsv($out, []);
        fputcsv($out, ['TYPE', 'Name', 'ID', 'Hex Value']);
        foreach ($colors as $color) {
            fputcsv($out, ['color', $color['label'], $color['id'], $color['value']]);
        }

        fclose($out);
        exit;
    }
});

/**
 * Admin UI
 */
function bnp_render_page() {
    $settings = bnp_get_kit_settings();

    if (!$settings) {
        echo '<div class="wrap"><div class="bnp-notice bnp-notice--warn">
            <span class="dashicons dashicons-warning"></span>
            No active Elementor Kit found.
        </div></div>';
        return;
    }

    $raw_fonts  = bnp_get_fonts($settings);
    $raw_colors = bnp_get_colors($settings);
    $fonts      = bnp_normalize_fonts($raw_fonts);
    $colors     = bnp_normalize_colors($raw_colors);

    $active_tab = isset($_GET['tab']) && $_GET['tab'] === 'colors' ? 'colors' : 'fonts';
    $base_url   = admin_url('admin.php?page=bnp-elementor-globals');

    ?>
    <style>
        /* ── Tokens ──────────────────────────────────────── */
        :root {
            --bnp-surface:  #ffffff;
            --bnp-border:   #dcdcde;
            --bnp-text:     #1d2327;
            --bnp-muted:    #646970;
            --bnp-accent:   #2271b1;
            --bnp-accent-h: #135e96;
            --bnp-radius:   8px;
            --bnp-shadow:   0 1px 3px rgba(0,0,0,.08);
            /* Breakpoint palette */
            --bnp-desk-head: #cce4f7;
            --bnp-desk-cell: #f0f7fd;
            --bnp-desk-txt:  #1a5f8a;
            --bnp-tab-head:  #c8ebd4;
            --bnp-tab-cell:  #f0f9f2;
            --bnp-tab-txt:   #1a6e3c;
            --bnp-mob-head:  #fde8b0;
            --bnp-mob-cell:  #fdf6e3;
            --bnp-mob-txt:   #7a4f00;
        }

        /* ── Layout ─────────────────────────────────────── */
        .bnp-wrap { max-width: 1400px; padding: 24px 20px 48px; }

        .bnp-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 12px;
            margin-bottom: 24px;
        }

        .bnp-header h1 {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 22px;
            font-weight: 600;
            color: var(--bnp-text);
            margin: 0;
        }

        .bnp-header h1 .dashicons {
            color: var(--bnp-accent);
            font-size: 24px;
            width: 24px;
            height: 24px;
        }

        /* ── Buttons ─────────────────────────────────────── */
        .bnp-actions { display: flex; gap: 8px; flex-wrap: wrap; }

        .bnp-btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 7px 14px;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 500;
            text-decoration: none;
            transition: background .15s, box-shadow .15s, transform .1s;
            line-height: 1.4;
        }

        .bnp-btn--primary {
            background: var(--bnp-accent);
            color: #fff;
            box-shadow: 0 1px 2px rgba(0,0,0,.15);
        }

        .bnp-btn--primary:hover {
            background: var(--bnp-accent-h);
            color: #fff;
            transform: translateY(-1px);
            box-shadow: 0 3px 8px rgba(0,0,0,.18);
        }

        .bnp-btn--secondary {
            background: var(--bnp-surface);
            color: var(--bnp-text);
            border: 1px solid var(--bnp-border);
            box-shadow: var(--bnp-shadow);
        }

        .bnp-btn--secondary:hover {
            background: #f6f7f7;
            color: var(--bnp-text);
            transform: translateY(-1px);
        }

        .bnp-btn .dashicons { font-size: 15px; width: 15px; height: 15px; }

        /* ── Tabs ────────────────────────────────────────── */
        .bnp-tabs {
            display: flex;
            border-bottom: 2px solid var(--bnp-border);
            margin-bottom: 24px;
        }

        .bnp-tab {
            display: inline-flex;
            align-items: center;
            gap: 7px;
            padding: 10px 18px;
            font-size: 13.5px;
            font-weight: 500;
            color: var(--bnp-muted);
            text-decoration: none;
            border-bottom: 2px solid transparent;
            margin-bottom: -2px;
            transition: color .15s, border-color .15s;
        }

        .bnp-tab:hover { color: var(--bnp-accent); }

        .bnp-tab.is-active {
            color: var(--bnp-accent);
            border-bottom-color: var(--bnp-accent);
        }

        .bnp-badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 20px;
            height: 20px;
            padding: 0 6px;
            background: #e8f3fb;
            color: var(--bnp-accent);
            border-radius: 10px;
            font-size: 11px;
            font-weight: 600;
        }

        .bnp-tab.is-active .bnp-badge {
            background: var(--bnp-accent);
            color: #fff;
        }

        /* ── Empty state ─────────────────────────────────── */
        .bnp-empty {
            text-align: center;
            padding: 48px 24px;
            color: var(--bnp-muted);
            background: var(--bnp-surface);
            border: 1px dashed var(--bnp-border);
            border-radius: var(--bnp-radius);
        }

        .bnp-empty .dashicons {
            font-size: 40px;
            width: 40px;
            height: 40px;
            display: block;
            margin: 0 auto 12px;
            color: #c0c4c8;
        }

        .bnp-empty p { margin: 4px 0; font-size: 14px; }

        /* ── Table wrapper ───────────────────────────────── */
        .bnp-table-wrap {
            overflow-x: auto;
            border-radius: var(--bnp-radius);
            box-shadow: var(--bnp-shadow);
            border: 1px solid var(--bnp-border);
        }

        /* ── Base table ──────────────────────────────────── */
        .bnp-table {
            border-collapse: collapse;
            width: 100%;
            font-size: 13px;
            background: var(--bnp-surface);
        }

        .bnp-table th,
        .bnp-table td {
            padding: 9px 12px;
            text-align: left;
            border-bottom: 1px solid var(--bnp-border);
            white-space: nowrap;
        }

        .bnp-table tbody tr:last-child td { border-bottom: none; }

        .bnp-table tbody tr:hover td { background: #f6f7f7 !important; }

        /* ── Sticky base columns ─────────────────────────── */
        .bnp-table .col-base {
            background: var(--bnp-surface);
            font-weight: 500;
            color: var(--bnp-text);
        }

        /* Group header row (row 1 of thead) */
        .bnp-table thead tr:first-child th {
            font-size: 11.5px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: .06em;
            text-align: center;
            border-bottom: 1px solid var(--bnp-border);
        }

        /* Sub-header row (row 2 of thead) */
        .bnp-table thead tr:last-child th {
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: .05em;
            color: var(--bnp-muted);
            border-bottom: 2px solid var(--bnp-border);
        }

        /* ── Breakpoint column coloring ──────────────────── */
        .bnp-th-desk { background: var(--bnp-desk-head) !important; color: var(--bnp-desk-txt) !important; }
        .bnp-th-tab  { background: var(--bnp-tab-head)  !important; color: var(--bnp-tab-txt)  !important; }
        .bnp-th-mob  { background: var(--bnp-mob-head)  !important; color: var(--bnp-mob-txt)  !important; }

        .bnp-td-desk { background: var(--bnp-desk-cell); color: var(--bnp-text); font-family: ui-monospace, monospace; }
        .bnp-td-tab  { background: var(--bnp-tab-cell);  color: var(--bnp-text); font-family: ui-monospace, monospace; }
        .bnp-td-mob  { background: var(--bnp-mob-cell);  color: var(--bnp-text); font-family: ui-monospace, monospace; }

        /* Left border to separate breakpoint groups */
        .bnp-td-desk:first-of-type,
        .bnp-th-desk:first-of-type { border-left: 2px solid #9ec9e8; }
        .bnp-td-tab:first-of-type,
        .bnp-th-tab:first-of-type  { border-left: 2px solid #8dcc8d; }
        .bnp-td-mob:first-of-type,
        .bnp-th-mob:first-of-type  { border-left: 2px solid #f0c060; }

        /* Muted "—" cells */
        .bnp-val-empty { color: #c8ccd0; }

        /* Family pill inline in table */
        .bnp-family {
            display: inline-block;
            background: #f3e8ff;
            color: #6b21a8;
            border: 1px solid #d8b4fe;
            border-radius: 4px;
            padding: 1px 7px;
            font-size: 12px;
            font-weight: 500;
        }

        /* ID chip */
        .bnp-id {
            font-family: ui-monospace, monospace;
            font-size: 11px;
            color: var(--bnp-muted);
            background: #f0f0f1;
            padding: 2px 6px;
            border-radius: 4px;
        }

        /* ── Colors table ────────────────────────────────── */
        .bnp-swatch {
            display: inline-block;
            width: 28px;
            height: 28px;
            border-radius: 4px;
            border: 1px solid rgba(0,0,0,.12);
            vertical-align: middle;
            flex-shrink: 0;
        }

        .bnp-color-row td { vertical-align: middle; }

        .bnp-hex {
            font-family: ui-monospace, monospace;
            font-size: 12.5px;
            color: var(--bnp-text);
        }
    </style>

    <div class="wrap bnp-wrap">

        <!-- Header -->
        <div class="bnp-header">
            <h1>
                <span class="dashicons dashicons-art"></span>
                Globals Manager
            </h1>
            <div class="bnp-actions">
                <a href="<?php echo esc_url(add_query_arg('bnp_export', 'json', $base_url)); ?>" class="bnp-btn bnp-btn--primary">
                    <span class="dashicons dashicons-download"></span> Export JSON
                </a>
                <a href="<?php echo esc_url(add_query_arg('bnp_export', 'csv', $base_url)); ?>" class="bnp-btn bnp-btn--secondary">
                    <span class="dashicons dashicons-media-spreadsheet"></span> Export CSV
                </a>
            </div>
        </div>

        <!-- Tabs -->
        <nav class="bnp-tabs">
            <a href="<?php echo esc_url(add_query_arg('tab', 'fonts', $base_url)); ?>"
               class="bnp-tab <?php echo $active_tab === 'fonts' ? 'is-active' : ''; ?>">
                <span class="dashicons dashicons-editor-textcolor" style="font-size:15px;width:15px;height:15px;"></span>
                Typography
                <span class="bnp-badge"><?php echo count($fonts); ?></span>
            </a>
            <a href="<?php echo esc_url(add_query_arg('tab', 'colors', $base_url)); ?>"
               class="bnp-tab <?php echo $active_tab === 'colors' ? 'is-active' : ''; ?>">
                <span class="dashicons dashicons-admin-appearance" style="font-size:15px;width:15px;height:15px;"></span>
                Colors
                <span class="bnp-badge"><?php echo count($colors); ?></span>
            </a>
        </nav>

        <!-- ── TYPOGRAPHY TAB ───────────────────────────── -->
        <?php if ($active_tab === 'fonts'): ?>

            <?php if (empty($fonts)): ?>
                <div class="bnp-empty">
                    <span class="dashicons dashicons-editor-textcolor"></span>
                    <p><strong>No typography styles found.</strong></p>
                    <p>Add global fonts in Elementor &rarr; Site Settings &rarr; Typography.</p>
                </div>
            <?php else: ?>
                <div class="bnp-table-wrap">
                    <table class="bnp-table">
                        <thead>
                            <!-- Row 1: breakpoint group labels -->
                            <tr>
                                <th rowspan="2" class="col-base" style="min-width:120px;">Name</th>
                                <th rowspan="2" class="col-base" style="min-width:90px;">ID</th>
                                <th rowspan="2" class="col-base" style="min-width:130px;">Family</th>
                                <th colspan="4" class="bnp-th-desk">
                                    <span class="dashicons dashicons-desktop" style="font-size:13px;width:13px;height:13px;vertical-align:middle;margin-right:4px;"></span>Desktop
                                </th>
                                <th colspan="4" class="bnp-th-tab">
                                    <span class="dashicons dashicons-tablet" style="font-size:13px;width:13px;height:13px;vertical-align:middle;margin-right:4px;"></span>Tablet
                                </th>
                                <th colspan="4" class="bnp-th-mob">
                                    <span class="dashicons dashicons-smartphone" style="font-size:13px;width:13px;height:13px;vertical-align:middle;margin-right:4px;"></span>Mobile
                                </th>
                            </tr>
                            <!-- Row 2: sub-column labels -->
                            <tr>
                                <th class="bnp-th-desk">Size</th>
                                <th class="bnp-th-desk">Weight</th>
                                <th class="bnp-th-desk">Line-H</th>
                                <th class="bnp-th-desk">Letter-S</th>

                                <th class="bnp-th-tab">Size</th>
                                <th class="bnp-th-tab">Weight</th>
                                <th class="bnp-th-tab">Line-H</th>
                                <th class="bnp-th-tab">Letter-S</th>

                                <th class="bnp-th-mob">Size</th>
                                <th class="bnp-th-mob">Weight</th>
                                <th class="bnp-th-mob">Line-H</th>
                                <th class="bnp-th-mob">Letter-S</th>
                            </tr>
                        </thead>
                        <tbody>
                        <?php foreach ($fonts as $font):
                            $d = $font['desktop'];
                            $t = $font['tablet'];
                            $m = $font['mobile'];
                            ?>
                            <tr>
                                <td class="col-base"><?php echo esc_html($font['label'] ?: '—'); ?></td>
                                <td class="col-base"><span class="bnp-id"><?php echo esc_html($font['id']); ?></span></td>
                                <td class="col-base">
                                    <?php if ($font['family'] && $font['family'] !== '—'): ?>
                                        <span class="bnp-family"><?php echo esc_html($font['family']); ?></span>
                                    <?php else: ?>
                                        <span class="bnp-val-empty">—</span>
                                    <?php endif; ?>
                                </td>

                                <?php foreach (['desktop' => $d, 'tablet' => $t, 'mobile' => $m] as $bp => $vals):
                                    $cls = 'bnp-td-' . substr($bp, 0, 3) . ($bp === 'desktop' ? 'sk' : ($bp === 'tablet' ? 'b' : 'b'));
                                    // simpler:
                                    $cls = ($bp === 'desktop') ? 'bnp-td-desk' : (($bp === 'tablet') ? 'bnp-td-tab' : 'bnp-td-mob');
                                    foreach (['size', 'weight', 'line_height', 'letter_spacing'] as $key):
                                        $v = $vals[$key] ?? '—';
                                        $empty = ($v === '—' || $v === '');
                                ?>
                                        <td class="<?php echo esc_attr($cls); ?>">
                                            <?php if ($empty): ?>
                                                <span class="bnp-val-empty">—</span>
                                            <?php else: ?>
                                                <?php echo esc_html($v); ?>
                                            <?php endif; ?>
                                        </td>
                                <?php   endforeach;
                                endforeach; ?>
                            </tr>
                        <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
            <?php endif; ?>

        <?php endif; ?>

        <!-- ── COLORS TAB ────────────────────────────────── -->
        <?php if ($active_tab === 'colors'): ?>

            <?php if (empty($colors)): ?>
                <div class="bnp-empty">
                    <span class="dashicons dashicons-admin-appearance"></span>
                    <p><strong>No colors found.</strong></p>
                    <p>Add global colors in Elementor &rarr; Site Settings &rarr; Global Colors.</p>
                </div>
            <?php else: ?>
                <div class="bnp-table-wrap">
                    <table class="bnp-table">
                        <thead>
                            <tr>
                                <th style="width:44px;">Swatch</th>
                                <th>Name</th>
                                <th>ID</th>
                                <th>Hex Value</th>
                            </tr>
                        </thead>
                        <tbody>
                        <?php foreach ($colors as $color):
                            $hex = $color['value'] ?: '';
                        ?>
                            <tr class="bnp-color-row">
                                <td>
                                    <span class="bnp-swatch"
                                          style="background:<?php echo esc_attr($hex); ?>;"
                                          title="<?php echo esc_attr($hex); ?>"></span>
                                </td>
                                <td class="col-base"><?php echo esc_html($color['label'] ?: '—'); ?></td>
                                <td><span class="bnp-id"><?php echo esc_html($color['id']); ?></span></td>
                                <td><span class="bnp-hex"><?php echo esc_html($hex ?: '—'); ?></span></td>
                            </tr>
                        <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
            <?php endif; ?>

        <?php endif; ?>

    </div>
    <?php
}

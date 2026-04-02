<?php
if (!defined('ABSPATH')) exit;

function bnp_render_page() {
    $settings = bnp_get_kit_settings();

    if (!$settings) {
        echo '<div class="wrap"><p style="color:#a15c00;background:#fff8e1;padding:12px 16px;border:1px solid #fdd87a;border-radius:6px;">
            No active Elementor Kit found. Please set an active kit in Elementor settings.</p></div>';
        return;
    }

    $fonts      = bnp_normalize_fonts(bnp_get_fonts($settings));
    $colors     = bnp_normalize_colors(bnp_get_colors($settings));
    $active_tab = isset($_GET['tab']) ? sanitize_key($_GET['tab']) : 'fonts';
    $base_url   = admin_url('admin.php?page=bnp-elementor-globals');
    ?>

    <div class="wrap bnp-wrap">

        <!-- Header -->
        <div class="bnp-header">
            <h1><span class="dashicons dashicons-art"></span> Elementor Globals</h1>
            <div class="bnp-actions">

                <!-- Tab-scoped export -->
                <a href="<?php echo esc_url(add_query_arg(['bnp_export' => 'json', 'export_scope' => $active_tab, 'tab' => $active_tab], $base_url)); ?>"
                   class="bnp-btn bnp-btn--secondary" title="Export current tab only">
                    <span class="dashicons dashicons-download"></span>
                    Export <?php echo $active_tab === 'fonts' ? 'Fonts' : 'Colors'; ?> JSON
                </a>
                <a href="<?php echo esc_url(add_query_arg(['bnp_export' => 'csv', 'export_scope' => $active_tab, 'tab' => $active_tab], $base_url)); ?>"
                   class="bnp-btn bnp-btn--secondary" title="Export current tab only">
                    <span class="dashicons dashicons-media-spreadsheet"></span> CSV
                </a>

                <!-- Export all -->
                <div class="bnp-dropdown-wrap">
                    <button class="bnp-btn bnp-btn--secondary bnp-dropdown-trigger" type="button">
                        <span class="dashicons dashicons-database-export"></span> Export All
                        <span class="dashicons dashicons-arrow-down-alt2" style="font-size:12px;width:12px;height:12px;margin-left:2px;"></span>
                    </button>
                    <div class="bnp-dropdown-menu">
                        <a href="<?php echo esc_url(add_query_arg(['bnp_export' => 'json', 'export_scope' => 'all', 'tab' => $active_tab], $base_url)); ?>" class="bnp-dropdown-item">
                            <span class="dashicons dashicons-media-code"></span> All as JSON
                        </a>
                        <a href="<?php echo esc_url(add_query_arg(['bnp_export' => 'csv', 'export_scope' => 'all', 'tab' => $active_tab], $base_url)); ?>" class="bnp-dropdown-item">
                            <span class="dashicons dashicons-media-spreadsheet"></span> All as CSV
                        </a>
                    </div>
                </div>

                <!-- Import -->
                <button class="bnp-btn bnp-btn--primary" id="bnp-import-btn" type="button">
                    <span class="dashicons dashicons-upload"></span> Import
                </button>
                <input type="file" id="bnp-import-file" accept=".json,.csv" style="display:none;">

            </div>
        </div>

        <!-- Import status bar -->
        <div id="bnp-import-bar" style="display:none;" class="bnp-import-bar">
            <span class="dashicons dashicons-media-document"></span>
            <span id="bnp-import-filename"></span>
            <span id="bnp-import-info" class="bnp-import-info"></span>
            <div style="margin-left:auto;display:flex;gap:8px;align-items:center;">
                <span id="bnp-import-status"></span>
                <button id="bnp-import-confirm" class="bnp-btn bnp-btn--success" type="button" style="display:none;">
                    <span class="dashicons dashicons-yes"></span> Confirm Import
                </button>
                <button id="bnp-import-cancel" class="bnp-btn bnp-btn--secondary" type="button">Cancel</button>
            </div>
        </div>

        <!-- Tabs -->
        <nav class="bnp-tabs">
            <a href="<?php echo esc_url(add_query_arg('tab', 'fonts', $base_url)); ?>"
               class="bnp-tab <?php echo $active_tab === 'fonts' ? 'is-active' : ''; ?>">
                <span class="dashicons dashicons-editor-textcolor" style="font-size:15px;width:15px;height:15px;"></span>
                Typography <span class="bnp-badge"><?php echo count($fonts); ?></span>
            </a>
            <a href="<?php echo esc_url(add_query_arg('tab', 'colors', $base_url)); ?>"
               class="bnp-tab <?php echo $active_tab === 'colors' ? 'is-active' : ''; ?>">
                <span class="dashicons dashicons-admin-appearance" style="font-size:15px;width:15px;height:15px;"></span>
                Colors <span class="bnp-badge"><?php echo count($colors); ?></span>
            </a>
            <?php do_action('bnp_globals_manager_tabs', $active_tab, $base_url); ?>
            <?php if ($active_tab === 'fonts'): ?>
            <button class="bnp-screen-opts-toggle" id="bnp-screen-opts-btn" type="button">
                <span class="dashicons dashicons-admin-settings"></span>
                Screen Options
                <span class="dashicons dashicons-arrow-down-alt2 bnp-so-arrow"></span>
            </button>
            <?php endif; ?>
        </nav>

        <?php if ($active_tab === 'fonts'): ?>
        <!-- Screen options panel -->
        <div class="bnp-screen-opts-panel" id="bnp-screen-opts-panel">
            <span class="bnp-so-label">Show columns:</span>
            <label class="bnp-so-check">
                <input type="checkbox" id="bnp-so-desk" checked>
                <span class="bnp-so-dot bnp-so-dot--desk"></span> Desktop
            </label>
            <label class="bnp-so-check">
                <input type="checkbox" id="bnp-so-tab" checked>
                <span class="bnp-so-dot bnp-so-dot--tab"></span> Tablet
            </label>
            <label class="bnp-so-check">
                <input type="checkbox" id="bnp-so-mob" checked>
                <span class="bnp-so-dot bnp-so-dot--mob"></span> Mobile
            </label>
        </div>
        <?php endif; ?>

        <!-- ── TYPOGRAPHY ── -->
        <?php if ($active_tab === 'fonts'): ?>
            <?php if (empty($fonts)): ?>
                <div class="bnp-empty">
                    <span class="dashicons dashicons-editor-textcolor"></span>
                    <p><strong>No typography styles found.</strong></p>
                    <p>Add global fonts in Elementor &rarr; Site Settings &rarr; Typography.</p>
                </div>
            <?php else: ?>
                <!-- Bulk action bar -->
                <div class="bnp-bulk-bar" id="bnp-bulk-bar">
                    <span class="dashicons dashicons-yes-alt" style="font-size:16px;width:16px;height:16px;color:rgba(255,255,255,.7);"></span>
                    <span id="bnp-bulk-count">0 selected</span>
                    <div class="bnp-bulk-actions">
                        <button class="bnp-btn bnp-btn--danger" id="bnp-bulk-delete" type="button">
                            <span class="dashicons dashicons-trash"></span> Delete Selected
                        </button>
                        <button class="bnp-btn bnp-btn--ghost-light" id="bnp-bulk-cancel" type="button">Cancel</button>
                    </div>
                </div>
                <div class="bnp-table-wrap">
                    <table class="bnp-table">
                        <thead>
                            <tr>
                                <th rowspan="2" class="col-check">
                                    <input type="checkbox" id="bnp-check-all" title="Select all">
                                </th>
                                <th rowspan="2">Preview</th>
                                <th rowspan="2" style="min-width:120px;">Name</th>
                                <th rowspan="2" class="col-id" style="min-width:80px;">ID</th>
                                <th rowspan="2" style="min-width:130px;">Family</th>
                                <th rowspan="2" style="min-width:70px;">Style</th>
                                <th rowspan="2" style="min-width:90px;">Transform</th>
                                <th rowspan="2" style="min-width:90px;">Decoration</th>
                                <th rowspan="2" style="min-width:70px;">Weight</th>
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
                            <tr>
                                <th class="bnp-th-desk">Size</th><th class="bnp-th-desk">Line-H</th><th class="bnp-th-desk">Letter-S</th><th class="bnp-th-desk">Word-S</th>
                                <th class="bnp-th-tab">Size</th><th class="bnp-th-tab">Line-H</th><th class="bnp-th-tab">Letter-S</th><th class="bnp-th-tab">Word-S</th>
                                <th class="bnp-th-mob">Size</th><th class="bnp-th-mob">Line-H</th><th class="bnp-th-mob">Letter-S</th><th class="bnp-th-mob">Word-S</th>
                            </tr>
                        </thead>
                        <tbody>
                        <?php foreach ($fonts as $font):
                            $fid        = esc_attr($font['id']);
                            $fam        = $font['family'];
                            $f_style    = $font['style']      ?? '';
                            $f_weight   = $font['desktop']['weight']     ?? '';
                            $f_transform  = $font['transform']  ?? '';
                            $f_decoration = $font['decoration'] ?? '';

                            // Build inline style for the table-cell preview chip
                            $preview_style  = 'font-family:'    . esc_attr(($fam && $fam !== '—') ? $fam : 'inherit') . ';';
                            if ($f_style    && $f_style    !== '—') $preview_style .= 'font-style:'      . esc_attr($f_style)      . ';';
                            if ($f_weight   && $f_weight   !== '—') $preview_style .= 'font-weight:'     . esc_attr($f_weight)     . ';';
                            if ($f_transform  && $f_transform  !== '—') $preview_style .= 'text-transform:'  . esc_attr($f_transform)  . ';';
                            if ($f_decoration && $f_decoration !== '—') $preview_style .= 'text-decoration:' . esc_attr($f_decoration) . ';';
                        ?>
                            <tr class="bnp-font-row">
                                <!-- Checkbox -->
                                <td class="col-check">
                                    <input type="checkbox" class="bnp-row-check" data-type="font" data-id="<?php echo $fid; ?>">
                                </td>
                                <!-- Preview -->
                                <td style="vertical-align:middle;">
                                    <button class="bnp-preview"
                                          type="button"
                                          title="Click to preview font"
                                          style="<?php echo $preview_style; ?>"
                                          data-font-family="<?php echo esc_attr(($fam && $fam !== '—') ? $fam : ''); ?>"
                                          data-font-label="<?php echo esc_attr($font['label'] ?: ''); ?>"
                                          data-font-style="<?php echo esc_attr($f_style); ?>"
                                          data-font-transform="<?php echo esc_attr($f_transform); ?>"
                                          data-font-decoration="<?php echo esc_attr($f_decoration); ?>"
                                          data-font-weight="<?php echo esc_attr($f_weight); ?>"
                                          data-font-size="<?php echo esc_attr($font['desktop']['size'] ?? ''); ?>"
                                    >Aa</button>
                                </td>
                                <!-- Name -->
                                <td><span contenteditable="true" spellcheck="false"
                                          data-type="font" data-id="<?php echo $fid; ?>" data-field="name" data-bp=""
                                    ><?php echo esc_html($font['label'] ?: '—'); ?></span></td>
                                <!-- ID (read-only) -->
                                <td class="col-id"><span class="bnp-id"><?php echo esc_html($font['id']); ?></span></td>
                                <!-- Family -->
                                <td><span contenteditable="true" spellcheck="false"
                                          data-type="font" data-id="<?php echo $fid; ?>" data-field="family" data-bp=""
                                    ><?php echo esc_html(($fam && $fam !== '—') ? $fam : '—'); ?></span></td>
                                <!-- Style / Transform / Decoration -->
                                <?php
                                $flat_options = [
                                    'style'      => [''  => '—', 'normal' => 'Normal', 'italic' => 'Italic', 'oblique' => 'Oblique'],
                                    'transform'  => [''  => '—', 'none' => 'None', 'capitalize' => 'Capitalize', 'uppercase' => 'Uppercase', 'lowercase' => 'Lowercase'],
                                    'decoration' => [''  => '—', 'none' => 'None', 'underline' => 'Underline', 'overline' => 'Overline', 'line-through' => 'Line-through'],
                                ];
                                foreach (['style', 'transform', 'decoration'] as $flat):
                                    $v = $font[$flat] ?? '';
                                    $v = ($v === '—') ? '' : $v;
                                ?>
                                <td>
                                    <?php $label = $flat_options[$flat][$v] ?? '—'; ?>
                                    <span class="bnp-select-trigger"
                                          data-type="font" data-id="<?php echo $fid; ?>" data-field="<?php echo esc_attr($flat); ?>" data-bp=""
                                          data-value="<?php echo esc_attr($v); ?>"><?php echo esc_html($label); ?></span>
                                </td>
                                <?php endforeach; ?>

                                <!-- Weight (flat — same value across all breakpoints) -->
                                <?php $fw = $font['desktop']['weight'] ?? ''; $fw_empty = (!$fw || $fw === '—'); ?>
                                <td><span contenteditable="true" spellcheck="false"
                                          data-type="font" data-id="<?php echo $fid; ?>" data-field="weight" data-bp=""
                                          <?php echo $fw_empty ? 'class="bnp-val-empty"' : ''; ?>
                                    ><?php echo esc_html($fw_empty ? '—' : $fw); ?></span></td>

                                <!-- Responsive columns (size, line-height, letter-spacing, word-spacing) -->
                                <?php
                                $bp_map = ['desktop' => 'desk', 'tablet' => 'tab', 'mobile' => 'mob'];
                                foreach ($bp_map as $bp => $cls_suffix):
                                    foreach (['size', 'line_height', 'letter_spacing', 'word_spacing'] as $key):
                                        $v     = $font[$bp][$key] ?? '—';
                                        $empty = ($v === '—' || $v === '');
                                ?>
                                    <td class="bnp-td-<?php echo $cls_suffix; ?>">
                                        <span contenteditable="true" spellcheck="false"
                                              data-type="font" data-id="<?php echo $fid; ?>"
                                              data-field="<?php echo esc_attr($key); ?>"
                                              data-bp="<?php echo esc_attr($bp); ?>"
                                              <?php echo $empty ? 'class="bnp-val-empty"' : ''; ?>
                                        ><?php echo esc_html($empty ? '—' : $v); ?></span>
                                    </td>
                                <?php   endforeach;
                                endforeach; ?>
                            </tr>
                        <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
                <div class="bnp-table-footer">
                    <button class="bnp-btn bnp-btn--secondary bnp-add-row" type="button" data-type="font">
                        <span class="dashicons dashicons-plus-alt2"></span> Add Font Style
                    </button>
                </div>
            <?php endif; ?>
        <?php endif; ?>

        <!-- ── COLORS ── -->
        <?php if ($active_tab === 'colors'): ?>
            <?php if (empty($colors)): ?>
                <div class="bnp-empty">
                    <span class="dashicons dashicons-admin-appearance"></span>
                    <p><strong>No colors found.</strong></p>
                    <p>Add global colors in Elementor &rarr; Site Settings &rarr; Global Colors.</p>
                </div>
            <?php else: ?>
                <!-- Bulk action bar -->
                <div class="bnp-bulk-bar" id="bnp-bulk-bar">
                    <span class="dashicons dashicons-yes-alt" style="font-size:16px;width:16px;height:16px;color:rgba(255,255,255,.7);"></span>
                    <span id="bnp-bulk-count">0 selected</span>
                    <div class="bnp-bulk-actions">
                        <button class="bnp-btn bnp-btn--danger" id="bnp-bulk-delete" type="button">
                            <span class="dashicons dashicons-trash"></span> Delete Selected
                        </button>
                        <button class="bnp-btn bnp-btn--ghost-light" id="bnp-bulk-cancel" type="button">Cancel</button>
                    </div>
                </div>
                <div class="bnp-table-wrap">
                    <table class="bnp-table">
                        <thead>
                            <tr>
                                <th class="col-check">
                                    <input type="checkbox" id="bnp-check-all" title="Select all">
                                </th>
                                <th>Name</th>
                                <th class="col-id">ID</th>
                                <th>Hex / RGBA</th>
                            </tr>
                        </thead>
                        <tbody>
                        <?php foreach ($colors as $color):
                            $cid = esc_attr($color['id']);
                            $hex = $color['value'] ?: '';
                        ?>
                            <tr>
                                <!-- Checkbox -->
                                <td class="col-check">
                                    <input type="checkbox" class="bnp-row-check" data-type="color" data-id="<?php echo $cid; ?>">
                                </td>
                                <!-- Name (editable) -->
                                <td><span contenteditable="true" spellcheck="false"
                                          data-type="color" data-id="<?php echo $cid; ?>" data-field="name" data-bp=""
                                    ><?php echo esc_html($color['label'] ?: '—'); ?></span></td>
                                <!-- ID (read-only) -->
                                <td class="col-id"><span class="bnp-id"><?php echo esc_html($color['id']); ?></span></td>
                                <!-- Swatch + Hex inline -->
                                <td>
                                    <div class="bnp-color-cell">
                                        <button class="bnp-swatch-wrap" title="Pick color" type="button">
                                            <span class="bnp-swatch-color"
                                                  style="display:block;width:24px;height:24px;border-radius:4px;border:1px solid rgba(0,0,0,.12);background:<?php echo esc_attr($hex); ?>;"></span>
                                        </button>
                                        <span contenteditable="true" spellcheck="false"
                                              class="bnp-hex"
                                              data-type="color" data-id="<?php echo $cid; ?>" data-field="value" data-bp=""
                                        ><?php echo esc_html($hex ?: '—'); ?></span>
                                    </div>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
                <div class="bnp-table-footer">
                    <button class="bnp-btn bnp-btn--secondary bnp-add-row" type="button" data-type="color">
                        <span class="dashicons dashicons-plus-alt2"></span> Add Color
                    </button>
                </div>
            <?php endif; ?>
        <?php endif; ?>

        <?php do_action('bnp_globals_manager_panels', $active_tab); ?>

    </div>

    <!-- Font Preview Modal -->
    <div id="bnp-font-modal" class="bnp-font-modal" role="dialog" aria-modal="true" aria-label="Font Preview" style="display:none;">
        <div class="bnp-font-modal-backdrop"></div>
        <div class="bnp-font-modal-box">

            <!-- Header -->
            <div class="bnp-font-modal-header">
                <div class="bnp-font-modal-title" id="bnp-font-modal-title">Font Preview</div>
                <button class="bnp-btn bnp-btn--secondary bnp-font-modal-close" id="bnp-font-modal-close" type="button">
                    <span class="dashicons dashicons-no-alt"></span>
                </button>
            </div>

            <!-- Body: two panels -->
            <div class="bnp-font-modal-body">

                <!-- LEFT: editable preview -->
                <div class="bnp-fmp-left">
                    <div id="bnp-fmp-preview" class="bnp-fmp-preview" contenteditable="true" spellcheck="false">The quick brown fox jumps over the lazy dog</div>
                </div>

                <!-- RIGHT: controls -->
                <div class="bnp-fmp-right">

                    <!-- Family -->
                    <div class="bnp-fmp-group">
                        <label class="bnp-fmp-label">Font Family</label>
                        <div class="bnp-fmp-family-wrap">
                            <input type="text" id="bnp-fmp-family" class="bnp-fmp-input" placeholder="Search fonts…" autocomplete="off" spellcheck="false">
                            <div id="bnp-fmp-family-list" class="bnp-fmp-family-list" style="display:none;"></div>
                        </div>
                    </div>

                    <!-- Style -->
                    <div class="bnp-fmp-group">
                        <label class="bnp-fmp-label">Style</label>
                        <div class="bnp-fmp-pills" data-fmp-field="style">
                            <button class="bnp-fmp-pill" data-value="" type="button">—</button>
                            <button class="bnp-fmp-pill" data-value="normal" type="button">Normal</button>
                            <button class="bnp-fmp-pill" data-value="italic" type="button"><em>Italic</em></button>
                            <button class="bnp-fmp-pill" data-value="oblique" type="button">Oblique</button>
                        </div>
                    </div>

                    <!-- Transform -->
                    <div class="bnp-fmp-group">
                        <label class="bnp-fmp-label">Transform</label>
                        <div class="bnp-fmp-pills" data-fmp-field="transform">
                            <button class="bnp-fmp-pill" data-value="" type="button">—</button>
                            <button class="bnp-fmp-pill" data-value="none" type="button">None</button>
                            <button class="bnp-fmp-pill" data-value="capitalize" type="button">Capitalize</button>
                            <button class="bnp-fmp-pill" data-value="uppercase" type="button">UPPER</button>
                            <button class="bnp-fmp-pill" data-value="lowercase" type="button">lower</button>
                        </div>
                    </div>

                    <!-- Decoration -->
                    <div class="bnp-fmp-group">
                        <label class="bnp-fmp-label">Decoration</label>
                        <div class="bnp-fmp-pills" data-fmp-field="decoration">
                            <button class="bnp-fmp-pill" data-value="" type="button">—</button>
                            <button class="bnp-fmp-pill" data-value="none" type="button">None</button>
                            <button class="bnp-fmp-pill" data-value="underline" type="button" style="text-decoration:underline;">Underline</button>
                            <button class="bnp-fmp-pill" data-value="overline" type="button" style="text-decoration:overline;">Overline</button>
                            <button class="bnp-fmp-pill" data-value="line-through" type="button" style="text-decoration:line-through;">Strike</button>
                        </div>
                    </div>

                    <!-- Weight (flat — applies to all breakpoints) -->
                    <div class="bnp-fmp-group">
                        <label class="bnp-fmp-label">Weight</label>
                        <div class="bnp-fmp-row">
                            <label class="bnp-fmp-row-label" style="color:var(--bnp-text);font-size:11px;">100 – 900</label>
                            <input type="text" id="bnp-fmp-weight" class="bnp-fmp-input" placeholder="400" spellcheck="false" style="grid-column: span 2;">
                            <input type="range" id="bnp-fmp-weight-slider" class="bnp-fmp-slider" min="100" max="900" step="100" value="400">
                        </div>
                    </div>

                    <!-- Breakpoint tabs + fields -->
                    <div class="bnp-fmp-group bnp-fmp-group--bp">
                        <div class="bnp-fmp-bp-tabs">
                            <button class="bnp-fmp-bp-tab is-active" data-bp="desktop" type="button">
                                <span class="dashicons dashicons-desktop"></span> Desktop
                            </button>
                            <button class="bnp-fmp-bp-tab" data-bp="tablet" type="button">
                                <span class="dashicons dashicons-tablet"></span> Tablet
                            </button>
                            <button class="bnp-fmp-bp-tab" data-bp="mobile" type="button">
                                <span class="dashicons dashicons-smartphone"></span> Mobile
                            </button>
                        </div>
                        <?php
                        // units: first entry is the default unit; '' = unitless (for line-height)
                        $bp_field_cfg = [
                            'size'           => ['label' => 'Size',           'min' => 8,   'max' => 120, 'step' => 1,    'units' => ['px','em','rem','vw','custom']],
                            'line_height'    => ['label' => 'Line Height',    'min' => 0.5, 'max' => 4,   'step' => 0.05, 'units' => ['','px','em','rem','custom']],
                            'letter_spacing' => ['label' => 'Letter Spacing', 'min' => -5,  'max' => 20,  'step' => 0.1,  'units' => ['px','em','rem','custom']],
                            'word_spacing'   => ['label' => 'Word Spacing',   'min' => -10, 'max' => 50,  'step' => 0.5,  'units' => ['px','em','rem','custom']],
                        ];
                        $unit_labels = ['' => 'unitless', 'px' => 'px', 'em' => 'em', 'rem' => 'rem', 'vw' => 'vw', 'custom' => '…'];
                        ?>
                        <?php foreach (['desktop' => 'desk', 'tablet' => 'tab', 'mobile' => 'mob'] as $bp => $bpcls): ?>
                        <div class="bnp-fmp-bp-panel bnp-fmp-bp-panel--<?php echo $bpcls; ?>" data-bp="<?php echo $bp; ?>" <?php echo $bp !== 'desktop' ? 'style="display:none;"' : ''; ?>>
                            <?php foreach ($bp_field_cfg as $field => $cfg): ?>
                            <div class="bnp-fmp-row">
                                <label class="bnp-fmp-row-label"><?php echo $cfg['label']; ?></label>
                                <input type="text" class="bnp-fmp-input bnp-fmp-bp-input"
                                       data-bp="<?php echo $bp; ?>"
                                       data-field="<?php echo $field; ?>"
                                       placeholder="—" spellcheck="false">
                                <select class="bnp-fmp-unit"
                                        data-bp="<?php echo $bp; ?>"
                                        data-field="<?php echo $field; ?>"
                                        data-default-unit="<?php echo esc_attr($cfg['units'][0]); ?>">
                                    <?php foreach ($cfg['units'] as $u): ?>
                                    <option value="<?php echo esc_attr($u); ?>"><?php echo esc_html($unit_labels[$u] ?? $u); ?></option>
                                    <?php endforeach; ?>
                                </select>
                                <input type="range" class="bnp-fmp-slider"
                                       data-bp="<?php echo $bp; ?>"
                                       data-field="<?php echo $field; ?>"
                                       min="<?php echo $cfg['min']; ?>"
                                       max="<?php echo $cfg['max']; ?>"
                                       step="<?php echo $cfg['step']; ?>"
                                       value="<?php echo $cfg['min']; ?>">
                            </div>
                            <?php endforeach; ?>
                        </div>
                        <?php endforeach; ?>
                    </div>

                </div><!-- /.bnp-fmp-right -->
            </div><!-- /.bnp-font-modal-body -->

            <!-- Footer -->
            <div class="bnp-font-modal-footer">
                <span class="bnp-fmp-footer-hint">
                    <span class="dashicons dashicons-info-outline"></span>
                    Apply stages changes to the table — use Save to persist.
                </span>
                <div class="bnp-fmp-footer-actions">
                    <button class="bnp-btn bnp-btn--secondary" id="bnp-font-modal-cancel" type="button">Cancel</button>
                    <button class="bnp-btn bnp-btn--success" id="bnp-font-modal-apply" type="button">
                        <span class="dashicons dashicons-yes"></span> Apply Changes
                    </button>
                </div>
            </div>

        </div><!-- /.bnp-font-modal-box -->
    </div>

    <!-- Sticky save bar -->
    <div id="bnp-save-bar">
        <span id="bnp-save-bar-msg">You have unsaved changes</span>
        <button id="bnp-save-btn"    class="bnp-btn bnp-btn--success">
            <span class="dashicons dashicons-saved"></span> Save Changes
        </button>
        <button id="bnp-discard-btn" class="bnp-btn bnp-btn--ghost">Discard</button>
        <span id="bnp-save-status"></span>
    </div>

    <?php
}

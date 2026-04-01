<?php
if (!defined('ABSPATH')) exit;

add_action('admin_init', function () {
    if (!isset($_GET['bnp_export'])) return;
    if (!current_user_can('manage_options')) wp_die('Unauthorized');

    $format     = in_array($_GET['bnp_export'], ['json', 'csv'], true) ? $_GET['bnp_export'] : 'json';
    $scope      = isset($_GET['export_scope']) && in_array($_GET['export_scope'], ['fonts', 'colors'], true)
                  ? $_GET['export_scope']
                  : 'all';

    $settings   = bnp_get_kit_settings();
    $fonts      = bnp_normalize_fonts(bnp_get_fonts($settings));
    $colors     = bnp_normalize_colors(bnp_get_colors($settings));

    /* ── JSON ── */
    if ($format === 'json') {
        $payload = ['bnp_type' => $scope, 'version' => '3.0'];
        if ($scope !== 'colors') $payload['fonts']  = $fonts;
        if ($scope !== 'fonts')  $payload['colors'] = $colors;

        $filename = 'elementor-' . $scope . '.json';
        header('Content-Type: application/json');
        header('Content-Disposition: attachment; filename=' . $filename);
        echo json_encode($payload, JSON_PRETTY_PRINT);
        exit;
    }

    /* ── CSV ── */
    if ($format === 'csv') {
        $filename = 'elementor-' . $scope . '.csv';
        header('Content-Type: text/csv');
        header('Content-Disposition: attachment; filename=' . $filename);

        $out = fopen('php://output', 'w');

        if ($scope !== 'colors') {
            fputcsv($out, ['bnp_type:fonts']);
            fputcsv($out, ['Name', 'ID', 'Family', 'Style', 'Transform', 'Decoration',
                'Desktop Size', 'Desktop Weight', 'Desktop Line-H', 'Desktop Letter-S', 'Desktop Word-S',
                'Tablet Size',  'Tablet Weight',  'Tablet Line-H',  'Tablet Letter-S',  'Tablet Word-S',
                'Mobile Size',  'Mobile Weight',  'Mobile Line-H',  'Mobile Letter-S',  'Mobile Word-S',
            ]);
            foreach ($fonts as $font) {
                fputcsv($out, [
                    $font['label'], $font['id'], $font['family'],
                    $font['style'], $font['transform'], $font['decoration'],
                    $font['desktop']['size'],        $font['desktop']['weight'],
                    $font['desktop']['line_height'], $font['desktop']['letter_spacing'], $font['desktop']['word_spacing'],
                    $font['tablet']['size'],         $font['tablet']['weight'],
                    $font['tablet']['line_height'],  $font['tablet']['letter_spacing'],  $font['tablet']['word_spacing'],
                    $font['mobile']['size'],         $font['mobile']['weight'],
                    $font['mobile']['line_height'],  $font['mobile']['letter_spacing'],  $font['mobile']['word_spacing'],
                ]);
            }
        }

        if ($scope !== 'fonts') {
            if ($scope === 'all') fputcsv($out, []); // blank separator row
            fputcsv($out, ['bnp_type:colors']);
            fputcsv($out, ['Name', 'ID', 'Hex Value']);
            foreach ($colors as $color) {
                fputcsv($out, [$color['label'], $color['id'], $color['value']]);
            }
        }

        fclose($out);
        exit;
    }
});

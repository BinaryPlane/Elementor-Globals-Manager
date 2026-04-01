<?php
if (!defined('ABSPATH')) exit;

function bnp_normalize_fonts($fonts) {
    $output = [];
    foreach ($fonts as $font) {
        $id   = $font['_id'] ?? '';
        $name = sanitize_title($font['title'] ?? $id);

        $output[$name] = [
            'id'         => $id,
            'label'      => $font['title'] ?? '',
            'family'     => $font['typography_font_family']     ?? '',
            'style'      => $font['typography_font_style']      ?? '',
            'transform'  => $font['typography_text_transform']  ?? '',
            'decoration' => $font['typography_text_decoration'] ?? '',
            'desktop' => [
                'size'           => bnp_format_value($font['typography_font_size']             ?? ''),
                'weight'         => bnp_format_value($font['typography_font_weight']           ?? ''),
                'line_height'    => bnp_format_value($font['typography_line_height']           ?? ''),
                'letter_spacing' => bnp_format_value($font['typography_letter_spacing']        ?? ''),
                'word_spacing'   => bnp_format_value($font['typography_word_spacing']          ?? ''),
            ],
            'tablet' => [
                'size'           => bnp_format_value($font['typography_font_size_tablet']      ?? ''),
                'weight'         => bnp_format_value($font['typography_font_weight_tablet']    ?? ''),
                'line_height'    => bnp_format_value($font['typography_line_height_tablet']    ?? ''),
                'letter_spacing' => bnp_format_value($font['typography_letter_spacing_tablet'] ?? ''),
                'word_spacing'   => bnp_format_value($font['typography_word_spacing_tablet']   ?? ''),
            ],
            'mobile' => [
                'size'           => bnp_format_value($font['typography_font_size_mobile']      ?? ''),
                'weight'         => bnp_format_value($font['typography_font_weight_mobile']    ?? ''),
                'line_height'    => bnp_format_value($font['typography_line_height_mobile']    ?? ''),
                'letter_spacing' => bnp_format_value($font['typography_letter_spacing_mobile'] ?? ''),
                'word_spacing'   => bnp_format_value($font['typography_word_spacing_mobile']   ?? ''),
            ],
        ];
    }
    return $output;
}

function bnp_normalize_colors($colors) {
    $output = [];
    foreach ($colors as $color) {
        $id   = $color['_id'] ?? '';
        $name = sanitize_title($color['title'] ?? $id);
        $output[$name] = [
            'id'    => $id,
            'label' => $color['title'] ?? '',
            'value' => $color['color'] ?? '',
        ];
    }
    return $output;
}

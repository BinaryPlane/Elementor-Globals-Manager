<?php
/*
Plugin Name: Elementor Globals Manager
Description: View, inline-edit, and export Elementor Global Fonts & Colors with full responsive typography support.
Version: 3.0
Author: BinaryPlane
Author URI: https://binaryplane.com
*/

if (!defined('ABSPATH')) exit;

define('BNP_EG_DIR', plugin_dir_path(__FILE__));
define('BNP_EG_URL', plugin_dir_url(__FILE__));

require_once BNP_EG_DIR . 'includes/helpers.php';
require_once BNP_EG_DIR . 'includes/normalization.php';
require_once BNP_EG_DIR . 'includes/export.php';
require_once BNP_EG_DIR . 'includes/ajax.php';
require_once BNP_EG_DIR . 'includes/import.php';
require_once BNP_EG_DIR . 'admin/page.php';

/* ── Menu ── */
add_action('admin_menu', function () {
    add_menu_page(
        'Elementor Globals',
        'Elementor Globals',
        'manage_options',
        'bnp-elementor-globals',
        'bnp_render_page',
        'dashicons-art',
        25
    );
});

/* ── Enqueue admin assets ── */
add_action('admin_enqueue_scripts', function ($hook) {
    if ($hook !== 'toplevel_page_bnp-elementor-globals') return;

    wp_enqueue_style(
        'bnp-eg-style',
        BNP_EG_URL . 'admin/style.css',
        [],
        '3.0'
    );

    wp_enqueue_script(
        'bnp-eg-script',
        BNP_EG_URL . 'admin/script.js',
        [],
        '3.0',
        true // load in footer
    );

    wp_localize_script('bnp-eg-script', 'bnpData', [
        'ajaxUrl' => admin_url('admin-ajax.php'),
        'nonce'   => wp_create_nonce('bnp_save_globals'),
        'fonts'   => bnp_get_all_fonts_grouped(),
    ]);
});

/**
 * Build a grouped font list for the family picker:
 *  - custom  : fonts uploaded via Elementor Custom Fonts
 *  - system  : common OS / web-safe fonts
 *  - google  : popular Google Fonts (static list, no API key needed)
 */
function bnp_get_all_fonts_grouped() {

    /* ── 1. Elementor custom fonts (uploaded via Elementor Custom Fonts) ── */
    $custom = [];
    if (post_type_exists('elementor_font')) {
        $posts = get_posts([
            'post_type'      => 'elementor_font',
            'posts_per_page' => -1,
            'post_status'    => 'publish',
            'orderby'        => 'title',
            'order'          => 'ASC',
        ]);
        foreach ($posts as $p) {
            $custom[] = $p->post_title;
        }
    }

    /* ── 2. Pull system + Google fonts from Elementor's own registry ── */
    $system = [];
    $google = [];

    // Primary: use Elementor's Fonts class (available once Elementor is loaded)
    if (class_exists('\Elementor\Fonts')) {
        $all = \Elementor\Fonts::get_fonts();
        foreach ($all as $name => $type) {
            if ($type === \Elementor\Fonts::SYSTEM) {
                $system[] = $name;
            } else {
                // googlefonts, local Adobe, etc. — all go in the google group
                $google[] = $name;
            }
        }
        sort($google);
        // system fonts keep Elementor's order (it's already the 7-font canonical list)
    }

    // Fallback: parse Elementor's fonts.php file directly (works before init fires)
    if (empty($system) || empty($google)) {
        $fonts_file = WP_PLUGIN_DIR . '/elementor/includes/settings/fonts.php';
        if (file_exists($fonts_file)) {
            $all = include $fonts_file;
            if (is_array($all)) {
                foreach ($all as $name => $type) {
                    if ($type === 'system') {
                        $system[] = $name;
                    } else {
                        $google[] = $name;
                    }
                }
                sort($google);
            }
        }
    }

    // Last-resort hardcoded fallback (matches Elementor's exact system list)
    if (empty($system)) {
        $system = ['Arial', 'Tahoma', 'Verdana', 'Helvetica', 'Times New Roman', 'Trebuchet MS', 'Georgia'];
    }

    return [
        'custom' => $custom,
        'system' => $system,
        'google' => $google,
    ];
}

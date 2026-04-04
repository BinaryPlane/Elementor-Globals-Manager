/* BNP Elementor Globals – Admin Script */
(function () {
    'use strict';

    var ajaxUrl = bnpData.ajaxUrl;
    var nonce   = bnpData.nonce;

    var dirty      = {};
    var saveBar    = document.getElementById('bnp-save-bar');

    // Context menu extension registry — addons push { types, icon, label, action(row,type,id,name) } here
    window.bnpCtxExtensions = window.bnpCtxExtensions || [];
    var saveBtn    = document.getElementById('bnp-save-btn');
    var discardBtn = document.getElementById('bnp-discard-btn');
    var saveStatus = document.getElementById('bnp-save-status');

    // Build Google font lookup at the top so loadGoogleFont can reference it
    // regardless of where it appears in the file.
    var googleFontSet = {};
    ((bnpData.fonts || {}).google || []).forEach(function (f) { googleFontSet[f] = true; });

    /* ──────────────────────────────────────────────────
       COLOR UTILITIES
    ────────────────────────────────────────────────── */

    function hexToRgba(hex) {
        hex = hex.replace(/^#/, '');
        if (hex.length === 3)  hex = hex.split('').map(function(c){ return c+c; }).join('');
        if (hex.length === 6)  hex += 'ff';
        if (hex.length !== 8)  return null;
        return {
            r: parseInt(hex.slice(0, 2), 16),
            g: parseInt(hex.slice(2, 4), 16),
            b: parseInt(hex.slice(4, 6), 16),
            a: +(parseInt(hex.slice(6, 8), 16) / 255).toFixed(2)
        };
    }

    function rgbaToHex(r, g, b, a) {
        var alpha = Math.round((a === undefined ? 1 : a) * 255);
        return '#' + [r, g, b, alpha].map(function(v) {
            return ('0' + Math.max(0, Math.min(255, v)).toString(16)).slice(-2);
        }).join('');
    }

    function rgbaToHex6(r, g, b) {
        return '#' + [r, g, b].map(function(v) {
            return ('0' + Math.max(0, Math.min(255, v)).toString(16)).slice(-2);
        }).join('');
    }

    function rgbaStringToComponents(str) {
        var m = str.match(/rgba?\s*\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/i);
        if (!m) return null;
        return { r: +m[1], g: +m[2], b: +m[3], a: m[4] !== undefined ? +m[4] : 1 };
    }

    function toRgbaString(r, g, b, a) {
        return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + (a !== undefined ? a : 1) + ')';
    }

    /* ──────────────────────────────────────────────────
       COLOR PICKER POPOVER
    ────────────────────────────────────────────────── */

    var activePopover = null;

    function closeActivePopover() {
        if (activePopover) {
            activePopover.remove();
            activePopover = null;
        }
    }

    document.addEventListener('click', function (e) {
        if (activePopover && !activePopover.contains(e.target) && !e.target.closest('.bnp-swatch-wrap')) {
            closeActivePopover();
        }
    });

    function openColorPicker(swatchWrap, hexSpan, colorId) {
        closeActivePopover();

        var currentHex = hexSpan.textContent.trim();
        if (currentHex === '—') currentHex = '#000000';

        // Ensure 6-digit hex for native input
        var rgba = hexToRgba(currentHex) || { r: 0, g: 0, b: 0, a: 1 };
        var hex6 = rgbaToHex6(rgba.r, rgba.g, rgba.b);

        var pop = document.createElement('div');
        pop.className = 'bnp-color-popover';
        pop.innerHTML =
            '<div class="bnp-cp-header">Color Picker</div>' +
            '<div class="bnp-cp-preview-bar"></div>' +
            '<div class="bnp-cp-body">' +
                '<div class="bnp-cp-row">' +
                    '<label class="bnp-cp-label">Visual</label>' +
                    '<input class="bnp-cp-native" type="color" value="' + hex6 + '">' +
                '</div>' +
                '<div class="bnp-cp-row">' +
                    '<label class="bnp-cp-label">Hex</label>' +
                    '<input class="bnp-cp-hex" type="text" value="' + currentHex + '" maxlength="9" spellcheck="false" placeholder="#rrggbb or #rrggbbaa">' +
                '</div>' +
                '<div class="bnp-cp-row">' +
                    '<label class="bnp-cp-label">RGBA</label>' +
                    '<input class="bnp-cp-rgba" type="text" value="' + toRgbaString(rgba.r, rgba.g, rgba.b, rgba.a) + '" spellcheck="false" placeholder="rgba(255, 255, 255, 1)">' +
                '</div>' +
                '<div class="bnp-cp-row">' +
                    '<label class="bnp-cp-label">Alpha</label>' +
                    '<div class="bnp-cp-alpha-wrap">' +
                        '<input class="bnp-cp-alpha" type="range" min="0" max="1" step="0.01" value="' + rgba.a + '">' +
                        '<span class="bnp-cp-alpha-val">' + rgba.a + '</span>' +
                    '</div>' +
                '</div>' +
                '<button class="bnp-cp-apply bnp-btn bnp-btn--primary">Apply</button>' +
            '</div>';

        var nativeInput = pop.querySelector('.bnp-cp-native');
        var hexInput    = pop.querySelector('.bnp-cp-hex');
        var rgbaInput   = pop.querySelector('.bnp-cp-rgba');
        var alphaInput  = pop.querySelector('.bnp-cp-alpha');
        var alphaVal    = pop.querySelector('.bnp-cp-alpha-val');
        var previewBar  = pop.querySelector('.bnp-cp-preview-bar');

        function updatePreview(hex) {
            previewBar.style.background = hex;
        }
        updatePreview(currentHex);

        // Native picker → update hex + rgba + alpha
        nativeInput.addEventListener('input', function () {
            var h = nativeInput.value;
            var r2 = hexToRgba(h + 'ff');
            var alpha = parseFloat(alphaInput.value);
            if (!r2) return;
            var fullHex = rgbaToHex(r2.r, r2.g, r2.b, alpha);
            hexInput.value  = fullHex;
            rgbaInput.value = toRgbaString(r2.r, r2.g, r2.b, alpha);
            updatePreview(fullHex);
        });

        // Hex input → update native + rgba + alpha
        hexInput.addEventListener('input', function () {
            var h = hexInput.value.trim();
            if (!h.startsWith('#')) h = '#' + h;
            var r2 = hexToRgba(h);
            if (!r2) return;
            nativeInput.value = rgbaToHex6(r2.r, r2.g, r2.b);
            alphaInput.value  = r2.a;
            alphaVal.textContent = r2.a;
            rgbaInput.value   = toRgbaString(r2.r, r2.g, r2.b, r2.a);
            updatePreview(h);
        });

        // RGBA input → update native + hex + alpha
        rgbaInput.addEventListener('input', function () {
            var c = rgbaStringToComponents(rgbaInput.value.trim());
            if (!c) return;
            var fullHex = rgbaToHex(c.r, c.g, c.b, c.a);
            nativeInput.value = rgbaToHex6(c.r, c.g, c.b);
            hexInput.value    = fullHex;
            alphaInput.value  = c.a;
            alphaVal.textContent = c.a;
            updatePreview(fullHex);
        });

        // Alpha slider → update hex + rgba
        alphaInput.addEventListener('input', function () {
            var alpha = parseFloat(alphaInput.value);
            alphaVal.textContent = alpha;
            var c = rgbaStringToComponents(rgbaInput.value) || hexToRgba(hexInput.value);
            if (!c) return;
            var fullHex = rgbaToHex(c.r, c.g, c.b, alpha);
            hexInput.value  = fullHex;
            rgbaInput.value = toRgbaString(c.r, c.g, c.b, alpha);
            updatePreview(fullHex);
        });

        // Apply button
        pop.querySelector('.bnp-cp-apply').addEventListener('click', function () {
            var finalHex = hexInput.value.trim();

            // Update the hex span text + mark dirty
            hexSpan.textContent = finalHex;
            markDirty(hexSpan);

            // Update the swatch
            var swatchEl = swatchWrap.querySelector('.bnp-swatch-color');
            if (swatchEl) swatchEl.style.background = finalHex;

            closeActivePopover();
        });

        // Position the popover below the swatch
        document.body.appendChild(pop);
        var rect = swatchWrap.getBoundingClientRect();
        pop.style.top  = (rect.bottom + window.scrollY + 6) + 'px';
        pop.style.left = (rect.left  + window.scrollX)     + 'px';

        // Flip up if not enough room below
        var popH = pop.offsetHeight || 300;
        if (rect.bottom + popH + 16 > window.innerHeight) {
            pop.style.top = (rect.top + window.scrollY - popH - 6) + 'px';
        }

        activePopover = pop;
    }

    // Swatch click — delegated so new color rows work automatically
    document.addEventListener('click', function (e) {
        var wrap = e.target.closest('.bnp-swatch-wrap');
        if (!wrap) return;
        e.stopPropagation();
        var row     = wrap.closest('tr');
        var hexSpan = row ? row.querySelector('[data-field="value"]') : null;
        var colorId = hexSpan ? hexSpan.dataset.id : null;
        if (hexSpan && colorId) openColorPicker(wrap, hexSpan, colorId);
    });

    /* ──────────────────────────────────────────────────
       FONT PREVIEW (Google Fonts)
    ────────────────────────────────────────────────── */

    var loadedFonts = {};

    function loadGoogleFont(family) {
        if (!family || family === '—' || loadedFonts[family]) return;
        // Only hit Google Fonts API for known Google Fonts — skip system/custom
        if (!googleFontSet[family]) return;
        loadedFonts[family] = true;

        var link = document.createElement('link');
        link.rel  = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family='
            + encodeURIComponent(family) + ':wght@400;700&display=swap';
        document.head.appendChild(link);
    }

    function updatePreviewCell(row) {
        var preview = row.querySelector('.bnp-preview');
        if (!preview) return;

        var famSpan  = row.querySelector('[data-field="family"]');
        var fam      = famSpan ? famSpan.textContent.trim() : '';
        var styleTrig = row.querySelector('[data-field="style"]');
        var transTrig = row.querySelector('[data-field="transform"]');
        var decorTrig = row.querySelector('[data-field="decoration"]');
        var weightEl  = row.querySelector('[data-field="weight"][data-bp=""]');

        var fontFamily  = (fam && fam !== '—') ? fam : 'inherit';
        var fontStyle   = styleTrig  ? (styleTrig.dataset.value  || '') : '';
        var fontTransform  = transTrig  ? (transTrig.dataset.value  || '') : '';
        var fontDecoration = decorTrig  ? (decorTrig.dataset.value  || '') : '';
        var fontWeight  = weightEl ? weightEl.textContent.trim() : '';

        preview.style.fontFamily    = fontFamily;
        preview.style.fontStyle     = fontStyle   || '';
        preview.style.fontWeight    = (fontWeight && fontWeight !== '—') ? fontWeight : '';
        preview.style.textTransform = fontTransform  || '';
        preview.style.textDecoration = fontDecoration || '';

        // Keep data attrs in sync for the modal
        preview.dataset.fontFamily    = (fam && fam !== '—') ? fam : '';
        preview.dataset.fontStyle     = fontStyle;
        preview.dataset.fontWeight    = (fontWeight && fontWeight !== '—') ? fontWeight : '';
        preview.dataset.fontTransform = fontTransform;
        preview.dataset.fontDecoration = fontDecoration;

        if (fam && fam !== '—') loadGoogleFont(fam);
    }

    // Initial preview sync for all rows
    document.querySelectorAll('.bnp-font-row').forEach(function (row) {
        updatePreviewCell(row);
    });

    /* ──────────────────────────────────────────────────
       INLINE EDITING  (event-delegated so new rows work)
    ────────────────────────────────────────────────── */

    function markDirty(el) {
        var key = [el.dataset.type, el.dataset.id, el.dataset.field, el.dataset.bp || ''].join(':');
        dirty[key] = {
            type:  el.dataset.type,
            id:    el.dataset.id,
            field: el.dataset.field,
            bp:    el.dataset.bp || 'desktop',
            value: el.dataset.value !== undefined ? el.dataset.value : el.textContent.trim()
        };
        var cell = el.closest('td');
        if (cell) cell.classList.add('is-dirty');
        showSaveBar();
    }

    document.addEventListener('keydown', function (e) {
        if (e.target.getAttribute('contenteditable') !== 'true') return;
        if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); }
    });

    document.addEventListener('paste', function (e) {
        if (e.target.getAttribute('contenteditable') !== 'true') return;
        e.preventDefault();
        var text = (e.clipboardData || window.clipboardData).getData('text/plain');
        document.execCommand('insertText', false, text.replace(/\n/g, ' '));
    });

    // When the user clicks into an empty "—" cell, clear the placeholder so they
    // can type straight away.  Keep bnp-val-empty on the element during editing
    // so styling stays consistent; it is resolved on blur.
    document.addEventListener('focusin', function (e) {
        if (e.target.getAttribute('contenteditable') !== 'true') return;
        var el = e.target;
        if (el.classList.contains('bnp-val-empty')) {
            el.textContent = '';
        }
    });

    // On blur: restore "—" + bnp-val-empty if nothing was typed; strip the class
    // when a real value exists.
    document.addEventListener('focusout', function (e) {
        if (e.target.getAttribute('contenteditable') !== 'true') return;
        var el   = e.target;
        var text = el.textContent.trim();
        if (!text || text === '—') {
            el.textContent = '—';
            el.classList.add('bnp-val-empty');
        } else {
            el.classList.remove('bnp-val-empty');
        }
    });

    document.addEventListener('input', function (e) {
        if (e.target.getAttribute('contenteditable') !== 'true') return;
        var el = e.target;
        // Remove the empty-placeholder class as soon as the user types something real
        if (el.textContent.trim()) {
            el.classList.remove('bnp-val-empty');
        }
        markDirty(el);
        if (el.dataset.type === 'font' && (el.dataset.field === 'family' || el.dataset.field === 'weight')) {
            var row = el.closest('tr');
            if (row) updatePreviewCell(row);
        }
    });

    /* ──────────────────────────────────────────────────
       SIMPLE DROPDOWN  (style / transform / decoration)
    ────────────────────────────────────────────────── */

    var simpleOpts = {
        style:      [['', '—'], ['normal', 'Normal'], ['italic', 'Italic'], ['oblique', 'Oblique']],
        transform:  [['', '—'], ['none', 'None'], ['capitalize', 'Capitalize'], ['uppercase', 'Uppercase'], ['lowercase', 'Lowercase']],
        decoration: [['', '—'], ['none', 'None'], ['underline', 'Underline'], ['overline', 'Overline'], ['line-through', 'Line-through']]
    };

    var activeSimpleDrop = null;

    function closeSimpleDropdown() {
        if (!activeSimpleDrop) return;
        activeSimpleDrop.el.remove();
        activeSimpleDrop.trigger.classList.remove('is-open');
        activeSimpleDrop = null;
    }

    document.addEventListener('click', function (e) {
        if (activeSimpleDrop && !activeSimpleDrop.el.contains(e.target) && !e.target.closest('.bnp-select-trigger')) {
            closeSimpleDropdown();
        }
    });

    function openSimpleDropdown(trigger) {
        closeSimpleDropdown();
        var field = trigger.dataset.field;
        var opts  = simpleOpts[field];
        if (!opts) return;

        var cur  = trigger.dataset.value || '';
        var drop = document.createElement('div');
        drop.className = 'bnp-simple-dropdown';

        opts.forEach(function (o) {
            var item = document.createElement('div');
            item.className = 'bnp-sd-item' + (o[0] === cur ? ' is-active' : '');
            item.textContent = o[1];
            item.addEventListener('mousedown', function (e) {
                e.preventDefault();
                trigger.textContent  = o[1];
                trigger.dataset.value = o[0];
                markDirty(trigger);
                closeSimpleDropdown();
                var row = trigger.closest('tr');
                if (row) updatePreviewCell(row);
            });
            drop.appendChild(item);
        });

        document.body.appendChild(drop);
        var rect  = trigger.getBoundingClientRect();
        var dropH = drop.offsetHeight || 180;
        drop.style.left = (rect.left + window.scrollX) + 'px';
        drop.style.top  = (rect.bottom + dropH + 8 > window.innerHeight)
            ? (rect.top  + window.scrollY - dropH - 4) + 'px'
            : (rect.bottom + window.scrollY + 4) + 'px';

        trigger.classList.add('is-open');
        activeSimpleDrop = { el: drop, trigger: trigger };
    }

    document.addEventListener('click', function (e) {
        var trigger = e.target.closest('.bnp-select-trigger');
        if (!trigger) return;
        e.stopPropagation();
        if (activeSimpleDrop && activeSimpleDrop.trigger === trigger) {
            closeSimpleDropdown();
            return;
        }
        openSimpleDropdown(trigger);
    });

    /* ──────────────────────────────────────────────────
       SAVE BAR
    ────────────────────────────────────────────────── */

    function showSaveBar() { saveBar.classList.add('is-visible'); }
    function hideSaveBar()  { saveBar.classList.remove('is-visible'); }

    saveBtn.addEventListener('click', function () {
        saveBtn.disabled = true;
        saveStatus.className = '';
        saveStatus.textContent = 'Saving\u2026';

        var changes = { fonts: [], colors: [] };
        Object.values(dirty).forEach(function (c) {
            if (c.type === 'font')  changes.fonts.push(c);
            if (c.type === 'color') changes.colors.push(c);
        });

        var form = new FormData();
        form.append('action',  'bnp_save_globals');
        form.append('nonce',   nonce);
        form.append('changes', JSON.stringify(changes));

        fetch(ajaxUrl, { method: 'POST', body: form })
            .then(function (r) { return r.json(); })
            .then(function (res) {
                saveBtn.disabled = false;
                if (res.success) {
                    dirty = {};
                    document.querySelectorAll('td.is-dirty').forEach(function (td) {
                        td.classList.remove('is-dirty');
                    });
                    saveStatus.className = 'is-success';
                    saveStatus.textContent = '\u2713 Saved successfully';
                    setTimeout(function () {
                        hideSaveBar();
                        saveStatus.textContent = '';
                    }, 2200);
                } else {
                    saveStatus.className = 'is-error';
                    saveStatus.textContent = '\u26a0 ' + (res.data || 'Could not save');
                }
            })
            .catch(function () {
                saveBtn.disabled = false;
                saveStatus.className = 'is-error';
                saveStatus.textContent = '\u26a0 Network error \u2014 please try again';
            });
    });

    discardBtn.addEventListener('click', function () {
        if (confirm('Discard all unsaved changes?')) location.reload();
    });

    /* ──────────────────────────────────────────────────
       EXPORT-ALL DROPDOWN
    ────────────────────────────────────────────────── */

    document.querySelectorAll('.bnp-dropdown-trigger').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            btn.closest('.bnp-dropdown-wrap').classList.toggle('is-open');
        });
    });

    document.addEventListener('click', function () {
        document.querySelectorAll('.bnp-dropdown-wrap.is-open').forEach(function (w) {
            w.classList.remove('is-open');
        });
    });

    /* ──────────────────────────────────────────────────
       IMPORT
    ────────────────────────────────────────────────── */

    var importBtn     = document.getElementById('bnp-import-btn');
    var importFile    = document.getElementById('bnp-import-file');
    var importBar     = document.getElementById('bnp-import-bar');
    var importName    = document.getElementById('bnp-import-filename');
    var importInfo    = document.getElementById('bnp-import-info');
    var importStatus  = document.getElementById('bnp-import-status');
    var importConfirm = document.getElementById('bnp-import-confirm');
    var importCancel  = document.getElementById('bnp-import-cancel');

    var pendingImport = null; // { content, format, preview }

    if (importBtn) {
        importBtn.addEventListener('click', function () { importFile.click(); });
    }

    if (importFile) {
        importFile.addEventListener('change', function () {
            var file = importFile.files[0];
            if (!file) return;

            var format = file.name.endsWith('.csv') ? 'csv' : 'json';
            var reader = new FileReader();

            reader.onload = function (e) {
                var content = e.target.result;

                // Quick client-side peek for preview info
                var preview = bnpPreviewImport(content, format);

                pendingImport = { content: content, format: format };

                importBar.style.display = 'flex';
                importName.textContent  = file.name;
                importInfo.textContent  = preview;
                importStatus.textContent = '';
                importStatus.className  = '';
                importConfirm.style.display = 'inline-flex';
            };

            reader.readAsText(file);
            importFile.value = ''; // reset so same file can be re-selected
        });
    }

    function bnpPreviewImport(content, format) {
        try {
            if (format === 'json') {
                var data = JSON.parse(content);
                var type   = data.bnp_type || 'all';
                var fonts  = data.fonts  ? Object.keys(data.fonts).length  : 0;
                var colors = data.colors ? Object.keys(data.colors).length : 0;
                var parts  = [];
                if (type !== 'colors' && fonts)  parts.push(fonts  + ' font style' + (fonts  !== 1 ? 's' : ''));
                if (type !== 'fonts'  && colors) parts.push(colors + ' color'      + (colors !== 1 ? 's' : ''));
                return parts.length ? '\u2014 ' + parts.join(', ') : '\u2014 No data detected';
            }
            if (format === 'csv') {
                var lines   = content.split(/\r?\n/).filter(function(l){ return l.trim(); });
                var fonts   = lines.filter(function(l){ return l.startsWith('bnp_type:fonts');  }).length;
                var colors  = lines.filter(function(l){ return l.startsWith('bnp_type:colors'); }).length;
                var parts   = [];
                if (fonts)  parts.push('font styles');
                if (colors) parts.push('colors');
                return parts.length ? '\u2014 Contains: ' + parts.join(' + ') : '\u2014 Format unrecognized';
            }
        } catch (e) { return '\u2014 Could not read file'; }
        return '';
    }

    if (importConfirm) {
        importConfirm.addEventListener('click', function () {
            if (!pendingImport) return;

            importConfirm.disabled = true;
            importStatus.className = '';
            importStatus.textContent = 'Importing\u2026';

            var form = new FormData();
            form.append('action',  'bnp_import_globals');
            form.append('nonce',   nonce);
            form.append('content', pendingImport.content);
            form.append('format',  pendingImport.format);

            fetch(ajaxUrl, { method: 'POST', body: form })
                .then(function (r) { return r.json(); })
                .then(function (res) {
                    importConfirm.disabled = false;
                    if (res.success) {
                        importStatus.className  = 'is-success';
                        importStatus.textContent = '\u2713 ' + res.data.message;
                        importConfirm.style.display = 'none';
                        pendingImport = null;
                        // Reload after short delay so table reflects changes
                        setTimeout(function () { location.reload(); }, 1800);
                    } else {
                        importStatus.className  = 'is-error';
                        importStatus.textContent = '\u26a0 ' + (res.data || 'Import failed');
                    }
                })
                .catch(function () {
                    importConfirm.disabled = false;
                    importStatus.className  = 'is-error';
                    importStatus.textContent = '\u26a0 Network error \u2014 please try again';
                });
        });
    }

    if (importCancel) {
        importCancel.addEventListener('click', function () {
            pendingImport = null;
            importBar.style.display = 'none';
            importConfirm.style.display = 'none';
        });
    }

    window.addEventListener('beforeunload', function (e) {
        if (Object.keys(dirty).length > 0) { e.preventDefault(); e.returnValue = ''; }
    });

    /* ──────────────────────────────────────────────────
       FONT FAMILY DROPDOWN
    ────────────────────────────────────────────────── */

    // Grouped fonts from PHP: { custom: [], system: [], google: [] }
    var fontGroups = bnpData.fonts || {};

    // All fonts as grouped array for the dropdown: [{ label, fonts[] }]
    var dropdownGroups = [
        { label: 'Custom Fonts',  key: 'custom', fonts: fontGroups.custom || [] },
        { label: 'System Fonts',  key: 'system', fonts: fontGroups.system || [] },
        { label: 'Google Fonts',  key: 'google', fonts: fontGroups.google || [] },
    ].filter(function (g) { return g.fonts.length > 0; });

    var activeFontDrop = null;

    function closeFontDropdown() {
        if (activeFontDrop) {
            if (activeFontDrop._cleanup) activeFontDrop._cleanup();
            activeFontDrop.remove();
            activeFontDrop = null;
        }
    }

    document.addEventListener('click', function (e) {
        if (activeFontDrop && !activeFontDrop.contains(e.target) && !e.target.closest('[data-field="family"]')) {
            closeFontDropdown();
        }
    });

    function openFontDropdown(familySpan) {
        closeFontDropdown();

        var current = familySpan.textContent.trim();

        var drop = document.createElement('div');
        drop.className = 'bnp-font-dropdown';
        drop.innerHTML =
            '<input class="bnp-fd-search" type="text" placeholder="Search fonts\u2026" autocomplete="off">' +
            '<div class="bnp-fd-list"></div>';

        var searchInput   = drop.querySelector('.bnp-fd-search');
        var list          = drop.querySelector('.bnp-fd-list');
        var CHUNK         = 60;
        var flatList      = [];
        var rendered      = 0;
        var prevObs       = null;
        var sentinelObs   = null;
        var searchDebounce = null;

        // Clean up observers when dropdown closes
        drop._cleanup = function () {
            if (sentinelObs) sentinelObs.disconnect();
            if (prevObs)     prevObs.disconnect();
        };

        // Build a flat [ {type:'header',label} | {type:'font',name} ] array
        function buildFlat(query) {
            var q = (query || '').toLowerCase();
            var out = [];
            dropdownGroups.forEach(function (g) {
                var fonts = q
                    ? g.fonts.filter(function (f) { return f.toLowerCase().indexOf(q) !== -1; })
                    : g.fonts;
                if (!fonts.length) return;
                out.push({ type: 'header', label: g.label });
                fonts.forEach(function (f) { out.push({ type: 'font', name: f }); });
            });
            return out;
        }

        function makeFontItem(fontName) {
            var item = document.createElement('div');
            item.className = 'bnp-fd-item' + (fontName === current ? ' is-active' : '');
            var prev = document.createElement('span');
            prev.className    = 'bnp-fd-preview';
            prev.dataset.font = fontName;
            prev.style.fontFamily = '\'' + fontName.replace(/'/g, "\\'") + '\'';
            prev.textContent  = 'Aa';
            var nm = document.createElement('span');
            nm.className = 'bnp-fd-name';
            nm.textContent = fontName;
            item.appendChild(prev);
            item.appendChild(nm);
            item.addEventListener('mousedown', function (e) {
                e.preventDefault();
                applyFont(familySpan, fontName);
                closeFontDropdown();
            });
            return item;
        }

        function renderChunk() {
            var end  = Math.min(rendered + CHUNK, flatList.length);
            var frag = document.createDocumentFragment();
            for (var i = rendered; i < end; i++) {
                var entry = flatList[i];
                if (entry.type === 'header') {
                    var h = document.createElement('div');
                    h.className   = 'bnp-fd-group-header';
                    h.textContent = entry.label;
                    frag.appendChild(h);
                } else {
                    frag.appendChild(makeFontItem(entry.name));
                }
            }
            rendered = end;
            list.appendChild(frag);

            // Register new preview spans with the lazy-load observer
            if (prevObs) {
                list.querySelectorAll('.bnp-fd-preview:not([data-fo])').forEach(function (el) {
                    el.dataset.fo = '1';
                    prevObs.observe(el);
                });
            }

            // Replace the scroll sentinel
            var old = list.querySelector('.bnp-fd-sentinel');
            if (old) { if (sentinelObs) sentinelObs.unobserve(old); old.remove(); }
            if (rendered < flatList.length) {
                var sentinel = document.createElement('div');
                sentinel.className = 'bnp-fd-sentinel';
                list.appendChild(sentinel);
                if (sentinelObs) sentinelObs.observe(sentinel);
            }
        }

        function resetList(query) {
            if (sentinelObs) sentinelObs.disconnect();
            if (prevObs)     prevObs.disconnect();
            list.innerHTML = '';
            rendered = 0;
            flatList = buildFlat(query);

            if (!flatList.length) {
                list.innerHTML = '<div class="bnp-fd-empty">No fonts match \u201c' + (query || '') + '\u201d</div>';
                return;
            }

            if (window.IntersectionObserver) {
                // Load Google Font stylesheet when a preview "Aa" span enters the viewport
                prevObs = new IntersectionObserver(function (entries) {
                    entries.forEach(function (entry) {
                        if (!entry.isIntersecting) return;
                        loadGoogleFont(entry.target.dataset.font);
                        prevObs.unobserve(entry.target);
                    });
                }, { root: list, rootMargin: '120px 0px' });

                // Append next chunk when the sentinel reaches the viewport
                sentinelObs = new IntersectionObserver(function (entries) {
                    if (entries[0].isIntersecting) renderChunk();
                }, { root: list });
            }

            renderChunk();

            var active = list.querySelector('.is-active');
            if (active) setTimeout(function () { active.scrollIntoView({ block: 'nearest' }); }, 0);
        }

        searchInput.addEventListener('input', function () {
            clearTimeout(searchDebounce);
            searchDebounce = setTimeout(function () { resetList(searchInput.value.trim()); }, 150);
        });

        // Scroll fallback for browsers without IntersectionObserver
        list.addEventListener('scroll', function () {
            if (window.IntersectionObserver) return;
            var lr = list.getBoundingClientRect();
            list.querySelectorAll('.bnp-fd-preview:not([data-fo])').forEach(function (el) {
                var r = el.getBoundingClientRect();
                if (r.top < lr.bottom + 120) { el.dataset.fo = '1'; loadGoogleFont(el.dataset.font); }
            });
        });

        document.body.appendChild(drop);

        var rect = familySpan.getBoundingClientRect();
        drop.style.top  = (rect.bottom + window.scrollY + 4) + 'px';
        drop.style.left = (rect.left   + window.scrollX)     + 'px';

        var dropH = 320;
        if (rect.bottom + dropH + 8 > window.innerHeight) {
            drop.style.top = (rect.top + window.scrollY - dropH - 4) + 'px';
        }

        searchInput.focus();
        activeFontDrop = drop;

        // Show the full browsable list immediately — no typing required
        resetList('');
    }

    function applyFont(familySpan, fontName) {
        familySpan.textContent = fontName;
        markDirty(familySpan);

        var row = familySpan.closest('tr');
        if (row) updatePreviewCell(row);
    }

    // Init existing family spans
    document.querySelectorAll('[data-field="family"]').forEach(function (span) {
        span.setAttribute('contenteditable', 'false');
        span.style.cursor = 'pointer';
    });

    // Family click — delegated so new font rows work automatically
    document.addEventListener('click', function (e) {
        var span = e.target.closest('[data-field="family"]');
        if (!span) return;
        e.stopPropagation();
        if (activeFontDrop) { closeFontDropdown(); return; }
        openFontDropdown(span);
    });

    /* ──────────────────────────────────────────────────
       CHECKBOX SELECTION + BULK DELETE
    ────────────────────────────────────────────────── */

    var bulkBar    = document.getElementById('bnp-bulk-bar');
    var bulkCount  = document.getElementById('bnp-bulk-count');
    var bulkDelete = document.getElementById('bnp-bulk-delete');
    var bulkCancel = document.getElementById('bnp-bulk-cancel');
    var checkAll   = document.getElementById('bnp-check-all');

    function getChecked() {
        return Array.from(document.querySelectorAll('.bnp-row-check:checked'));
    }

    function syncBulkBar() {
        var checked = getChecked();
        var n = checked.length;
        if (!bulkBar) return;
        if (n > 0) {
            bulkBar.classList.add('is-visible');
            bulkCount.textContent = n + ' item' + (n !== 1 ? 's' : '') + ' selected';
        } else {
            bulkBar.classList.remove('is-visible');
        }
        // Sync select-all indeterminate state
        if (checkAll) {
            var total = document.querySelectorAll('.bnp-row-check').length;
            checkAll.indeterminate = (n > 0 && n < total);
            checkAll.checked = (n === total && total > 0);
        }
    }

    // Select-all toggle
    if (checkAll) {
        checkAll.addEventListener('change', function () {
            document.querySelectorAll('.bnp-row-check').forEach(function (cb) {
                cb.checked = checkAll.checked;
                cb.closest('tr').classList.toggle('is-selected', checkAll.checked);
            });
            syncBulkBar();
        });
    }

    // Individual row checkbox — delegated (covers dynamically added rows)
    document.addEventListener('change', function (e) {
        if (!e.target.classList.contains('bnp-row-check')) return;
        e.target.closest('tr').classList.toggle('is-selected', e.target.checked);
        syncBulkBar();
    });

    // Cancel selection
    if (bulkCancel) {
        bulkCancel.addEventListener('click', function () {
            document.querySelectorAll('.bnp-row-check').forEach(function (cb) {
                cb.checked = false;
                cb.closest('tr').classList.remove('is-selected');
            });
            if (checkAll) { checkAll.checked = false; checkAll.indeterminate = false; }
            syncBulkBar();
        });
    }

    // Bulk delete
    if (bulkDelete) {
        bulkDelete.addEventListener('click', function () {
            var checked = getChecked();
            if (!checked.length) return;

            var names = checked.map(function (cb) {
                var row = cb.closest('tr');
                var nameEl = row.querySelector('[data-field="name"]');
                return '\u2022 ' + (nameEl ? nameEl.textContent.trim() : cb.dataset.id);
            });

            if (!confirm('Delete ' + checked.length + ' item' + (checked.length !== 1 ? 's' : '') + '?\n\n' + names.join('\n') + '\n\nThis cannot be undone.')) return;

            bulkDelete.disabled = true;

            var rows     = checked.map(function (cb) { return cb.closest('tr'); });
            var payloads = checked.map(function (cb) { return { type: cb.dataset.type, id: cb.dataset.id }; });

            rows.forEach(function (r) { r.classList.add('bnp-deleting'); });

            var promises = payloads.map(function (p) {
                var f = new FormData();
                f.append('action', 'bnp_delete_global');
                f.append('nonce',  nonce);
                f.append('type',   p.type);
                f.append('id',     p.id);
                return fetch(ajaxUrl, { method: 'POST', body: f }).then(function (r) { return r.json(); });
            });

            Promise.all(promises).then(function (results) {
                bulkDelete.disabled = false;
                results.forEach(function (res, i) {
                    if (res.success) {
                        // Clean up dirty state for this id
                        var id = payloads[i].id;
                        Object.keys(dirty).forEach(function (k) {
                            if (dirty[k] && dirty[k].id === id) delete dirty[k];
                        });
                        rows[i].remove();
                    } else {
                        rows[i].classList.remove('bnp-deleting');
                    }
                });
                syncBulkBar();
                if (Object.keys(dirty).length === 0) hideSaveBar();
            }).catch(function () {
                bulkDelete.disabled = false;
                rows.forEach(function (r) { r.classList.remove('bnp-deleting'); });
                alert('\u26a0 Network error \u2014 please try again');
            });
        });
    }

    /* ──────────────────────────────────────────────────
       INLINE ADD ROW  (no page reload)
    ────────────────────────────────────────────────── */

    function escH(s) {
        return String(s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function buildFontRow(id, d) {
        d = d || {};
        var bpMap   = [{bp:'desktop',cls:'desk'},{bp:'tablet',cls:'tab'},{bp:'mobile',cls:'mob'}];
        var rFields = ['size','line_height','letter_spacing','word_spacing'];
        var eH = escH(id);
        var ce = 'contenteditable="true" spellcheck="false"';
        var da = 'data-type="font" data-id="' + eH + '"';
        var fam = (d.family && d.family !== '—') ? d.family : '';

        function fv(v) { return (!v || v === '—') ? '—' : v; }
        function ec(v) { return (!v || v === '—') ? ' class="bnp-val-empty"' : ''; }

        var html = '<tr class="bnp-font-row" data-new-row="1">';
        html += '<td class="col-check"><input type="checkbox" class="bnp-row-check" data-type="font" data-id="' + eH + '"></td>';
        var previewStyle = 'font-family:' + escH(fam || 'inherit') + ';';
        if (d.style      && d.style      !== '—') previewStyle += 'font-style:'      + escH(d.style)      + ';';
        if (d.weight && d.weight !== '—') previewStyle += 'font-weight:' + escH(d.weight) + ';';
        if (d.transform  && d.transform  !== '—') previewStyle += 'text-transform:'  + escH(d.transform)  + ';';
        if (d.decoration && d.decoration !== '—') previewStyle += 'text-decoration:' + escH(d.decoration) + ';';
        html += '<td style="vertical-align:middle;"><button class="bnp-preview" type="button" title="Click to preview font" style="' + previewStyle + '" data-font-family="' + escH(fam) + '" data-font-label="' + escH(d.label || '') + '" data-font-style="' + escH(d.style || '') + '" data-font-transform="' + escH(d.transform || '') + '" data-font-decoration="' + escH(d.decoration || '') + '" data-font-weight="' + escH(d.weight || '') + '" data-font-size="' + escH((d.desktop && d.desktop.size) || '') + '">Aa</button></td>';
        html += '<td><span ' + ce + ' ' + da + ' data-field="name" data-bp="">' + escH(d.label || 'New Font Style') + '</span></td>';
        html += '<td class="col-id"><span class="bnp-id">' + eH + '</span></td>';
        html += '<td><span ' + ce + ' ' + da + ' data-field="family" data-bp="" contenteditable="false" style="cursor:pointer;display:inline-flex;align-items:center;gap:6px;padding:3px 8px 3px 6px;border:1px solid #dcdcde;border-radius:4px;background:#fafafa;min-width:110px;">' + escH(fam || '—') + '</span></td>';
        var buildFlatOpts = {
            style:      [['', '\u2014'], ['normal', 'Normal'], ['italic', 'Italic'], ['oblique', 'Oblique']],
            transform:  [['', '\u2014'], ['none', 'None'], ['capitalize', 'Capitalize'], ['uppercase', 'Uppercase'], ['lowercase', 'Lowercase']],
            decoration: [['', '\u2014'], ['none', 'None'], ['underline', 'Underline'], ['overline', 'Overline'], ['line-through', 'Line-through']]
        };
        ['style', 'transform', 'decoration'].forEach(function (f) {
            var cur   = (d[f] && d[f] !== '\u2014') ? d[f] : '';
            var entry = buildFlatOpts[f].find(function (o) { return o[0] === cur; }) || ['', '\u2014'];
            html += '<td><span class="bnp-select-trigger" ' + da + ' data-field="' + f + '" data-bp="" data-value="' + escH(cur) + '">' + escH(entry[1]) + '</span></td>';
        });
        // Flat weight (not per-breakpoint)
        html += '<td><span ' + ce + ' ' + da + ' data-field="weight" data-bp=""' + ec(d.weight) + '>' + escH(fv(d.weight)) + '</span></td>';
        bpMap.forEach(function (b) {
            var bpData = d[b.bp] || {};
            rFields.forEach(function (f) {
                var v = fv(bpData[f]);
                html += '<td class="bnp-td-' + b.cls + '"><span ' + ce + ' ' + da + ' data-field="' + f + '" data-bp="' + b.bp + '"' + ec(bpData[f]) + '>' + escH(v) + '</span></td>';
            });
        });
        html += '</tr>';
        return html;
    }

    function buildColorRow(id, d) {
        d = d || {};
        var eH  = escH(id);
        var ce  = 'contenteditable="true" spellcheck="false"';
        var da  = 'data-type="color" data-id="' + eH + '"';
        var hex = (d.value && d.value !== '—') ? d.value : '';
        var bg  = hex ? 'background:' + escH(hex) + ';' : 'background:#fff;';
        var html = '<tr data-new-row="1">';
        html += '<td class="col-check"><input type="checkbox" class="bnp-row-check" data-type="color" data-id="' + eH + '"></td>';
        html += '<td><span ' + ce + ' ' + da + ' data-field="name" data-bp="">' + escH(d.label || 'New Color') + '</span></td>';
        html += '<td class="col-id"><span class="bnp-id">' + eH + '</span></td>';
        html += '<td><div class="bnp-color-cell">' +
            '<button class="bnp-swatch-wrap" title="Pick color" type="button">' +
            '<span class="bnp-swatch-color" style="display:block;width:24px;height:24px;border-radius:4px;border:1px solid rgba(0,0,0,.12);' + bg + '"></span>' +
            '</button>' +
            '<span ' + ce + ' class="bnp-hex" ' + da + ' data-field="value" data-bp=""' + (hex ? '' : ' class="bnp-val-empty"') + '>' + escH(hex || '—') + '</span>' +
            '</div></td>';
        html += '</tr>';
        return html;
    }

    document.querySelectorAll('.bnp-add-row').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var type  = btn.dataset.type;
            var label = btn.querySelector('.dashicons');
            btn.disabled = true;
            if (label) label.className = 'dashicons dashicons-update bnp-spin';

            var form = new FormData();
            form.append('action', 'bnp_add_global');
            form.append('nonce',  nonce);
            form.append('type',   type);

            fetch(ajaxUrl, { method: 'POST', body: form })
                .then(function (r) { return r.json(); })
                .then(function (res) {
                    btn.disabled = false;
                    if (label) label.className = 'dashicons dashicons-plus-alt2';
                    if (!res.success) { alert('\u26a0 ' + (res.data || 'Could not add item')); return; }

                    var newId  = res.data.id;
                    var tbody  = document.querySelector('.bnp-table tbody');
                    if (!tbody) return;

                    // Inject new row
                    var html = type === 'font' ? buildFontRow(newId) : buildColorRow(newId);
                    tbody.insertAdjacentHTML('beforeend', html);

                    var newRow  = tbody.lastElementChild;
                    var nameEl  = newRow.querySelector('[data-field="name"]');

                    // Scroll + focus the name cell
                    newRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    if (nameEl) {
                        nameEl.focus();
                        // Select all so typing replaces the placeholder
                        var range = document.createRange();
                        range.selectNodeContents(nameEl);
                        var sel = window.getSelection();
                        sel.removeAllRanges();
                        sel.addRange(range);
                        markDirty(nameEl);
                    }
                    // Apply current screen-opts visibility classes
                    applyScreenOpts();
                })
                .catch(function () {
                    btn.disabled = false;
                    if (label) label.className = 'dashicons dashicons-plus-alt2';
                    alert('\u26a0 Network error \u2014 please try again');
                });
        });
    });

    /* ──────────────────────────────────────────────────
       TOAST NOTIFICATION
    ────────────────────────────────────────────────── */

    function showToast(msg) {
        var prev = document.querySelector('.bnp-toast');
        if (prev) prev.remove();
        var t = document.createElement('div');
        t.className = 'bnp-toast';
        t.textContent = msg;
        document.body.appendChild(t);
        requestAnimationFrame(function () {
            t.classList.add('is-visible');
            setTimeout(function () {
                t.classList.remove('is-visible');
                setTimeout(function () { t.remove(); }, 220);
            }, 2400);
        });
    }

    /* ──────────────────────────────────────────────────
       RIGHT-CLICK CONTEXT MENU
    ────────────────────────────────────────────────── */

    var activeCtx = null;

    function closeCtx() {
        if (activeCtx) { activeCtx.remove(); activeCtx = null; }
    }

    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeCtx(); });
    document.addEventListener('click',   function (e) { if (activeCtx && !activeCtx.contains(e.target)) closeCtx(); });
    document.addEventListener('scroll',  closeCtx, true);

    function buildCtxMenu(items) {
        var menu = document.createElement('div');
        menu.className = 'bnp-ctx-menu';
        menu.setAttribute('role', 'menu');
        items.forEach(function (item) {
            if (item === 'sep') {
                var s = document.createElement('div');
                s.className = 'bnp-ctx-sep';
                menu.appendChild(s);
                return;
            }
            var el = document.createElement('div');
            el.className = 'bnp-ctx-item' + (item.danger ? ' is-danger' : '');
            el.setAttribute('role', 'menuitem');
            el.innerHTML = '<span class="dashicons ' + item.icon + '"></span>' + item.label;
            el.addEventListener('click', function () { closeCtx(); item.action(); });
            menu.appendChild(el);
        });
        return menu;
    }

    function positionCtx(menu, x, y) {
        menu.style.left = x + 'px';
        menu.style.top  = y + 'px';
        var r = menu.getBoundingClientRect();
        if (r.right  > window.innerWidth  - 8) menu.style.left = (x - r.width)  + 'px';
        if (r.bottom > window.innerHeight - 8) menu.style.top  = (y - r.height) + 'px';
    }

    function copyToClipboard(text, label) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(function () { showToast('\u2713 ' + label); });
        } else {
            var ta = document.createElement('textarea');
            ta.value = text; ta.style.cssText = 'position:fixed;opacity:0;';
            document.body.appendChild(ta); ta.select();
            document.execCommand('copy'); ta.remove();
            showToast('\u2713 ' + label);
        }
    }

    function copyRowAsJson(row, type, id, name) {
        var data = { id: id, type: type, label: name };
        if (type === 'font') {
            var f = function (field, bp) {
                var sel = bp
                    ? row.querySelector('[data-field="' + field + '"][data-bp="' + bp + '"]')
                    : row.querySelector('[data-field="' + field + '"][data-bp=""]');
                return sel ? sel.textContent.trim() : '';
            };
            data.family = f('family'); data.style = f('style');
            data.transform = f('transform'); data.decoration = f('decoration');
            ['desktop','tablet','mobile'].forEach(function (bp) {
                data[bp] = {};
                ['size','weight','line_height','letter_spacing','word_spacing'].forEach(function (k) {
                    data[bp][k] = f(k, bp);
                });
            });
        } else {
            var hexEl = row.querySelector('[data-field="value"]');
            data.value = hexEl ? hexEl.textContent.trim() : '';
        }
        copyToClipboard(JSON.stringify(data, null, 2), 'Copied as JSON');
    }

    function deleteSingleRow(type, id, name, row) {
        if (!confirm('Delete \u201c' + name + '\u201d?\nThis cannot be undone.')) return;
        row.classList.add('bnp-deleting');
        var form = new FormData();
        form.append('action', 'bnp_delete_global');
        form.append('nonce',  nonce);
        form.append('type',   type);
        form.append('id',     id);
        fetch(ajaxUrl, { method: 'POST', body: form })
            .then(function (r) { return r.json(); })
            .then(function (res) {
                if (res.success) {
                    Object.keys(dirty).forEach(function (k) {
                        if (dirty[k] && dirty[k].id === id) delete dirty[k];
                    });
                    row.remove(); syncBulkBar();
                    if (Object.keys(dirty).length === 0) hideSaveBar();
                } else {
                    row.classList.remove('bnp-deleting');
                    alert('\u26a0 ' + (res.data || 'Could not delete'));
                }
            })
            .catch(function () { row.classList.remove('bnp-deleting'); });
    }

    function duplicateRow(sourceRow, type, id) {
        var form = new FormData();
        form.append('action', 'bnp_duplicate_global');
        form.append('nonce',  nonce);
        form.append('type',   type);
        form.append('id',     id);
        fetch(ajaxUrl, { method: 'POST', body: form })
            .then(function (r) { return r.json(); })
            .then(function (res) {
                if (!res.success) { alert('\u26a0 ' + (res.data || 'Could not duplicate')); return; }
                var d   = res.data;
                var html = type === 'font' ? buildFontRow(d.id, d) : buildColorRow(d.id, d);
                sourceRow.insertAdjacentHTML('afterend', html);
                var newRow = sourceRow.nextElementSibling;
                var nameEl = newRow.querySelector('[data-field="name"]');
                newRow.classList.add('bnp-row-highlight');
                setTimeout(function () { newRow.classList.remove('bnp-row-highlight'); }, 1200);
                if (nameEl) { newRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); nameEl.focus(); markDirty(nameEl); }
                if (type === 'font') {
                    var famEl = newRow.querySelector('[data-field="family"]');
                    if (famEl) famEl.setAttribute('contenteditable', 'false');
                    var fam = d.family && d.family !== '—' ? d.family : null;
                    if (fam) updatePreviewCell(newRow);
                }
                applyScreenOpts();
            });
    }

    document.addEventListener('contextmenu', function (e) {
        var row = e.target.closest('.bnp-table tbody tr');
        if (!row) return;
        e.preventDefault();
        closeCtx();

        var checkEl = row.querySelector('.bnp-row-check');
        if (!checkEl) return;
        var type = checkEl.dataset.type;
        var id   = checkEl.dataset.id;
        var nameEl = row.querySelector('[data-field="name"]');
        var name   = nameEl ? nameEl.textContent.trim() : id;

        var items = [
            {
                icon: 'dashicons-admin-page',
                label: 'Duplicate',
                action: function () { duplicateRow(row, type, id); }
            },
            'sep',
            {
                icon: checkEl.checked ? 'dashicons-minus' : 'dashicons-yes',
                label: checkEl.checked ? 'Deselect row' : 'Select row',
                action: function () {
                    checkEl.checked = !checkEl.checked;
                    row.classList.toggle('is-selected', checkEl.checked);
                    syncBulkBar();
                }
            },
            'sep',
            {
                icon: 'dashicons-clipboard',
                label: 'Copy ID',
                action: function () { copyToClipboard(id, 'ID copied'); }
            }
        ];

        if (type === 'font') {
            var famEl  = row.querySelector('[data-field="family"]');
            var family = famEl ? famEl.textContent.trim() : '';
            if (family && family !== '—') {
                items.push({
                    icon: 'dashicons-editor-textcolor',
                    label: 'Copy font family',
                    action: function () { copyToClipboard(family, 'Family name copied'); }
                });
            }
        }

        if (type === 'color') {
            var hexEl2 = row.querySelector('[data-field="value"]');
            var hex2   = hexEl2 ? hexEl2.textContent.trim() : '';
            if (hex2 && hex2 !== '—') {
                items.push({
                    icon: 'dashicons-color-picker',
                    label: 'Copy hex value',
                    action: function () { copyToClipboard(hex2, 'Hex value copied'); }
                });
            }
        }

        items.push({
            icon: 'dashicons-media-code',
            label: 'Copy as JSON',
            action: function () { copyRowAsJson(row, type, id, name); }
        });

        items.push('sep');
        items.push({
            icon: 'dashicons-trash',
            label: 'Delete',
            danger: true,
            action: function () { deleteSingleRow(type, id, name, row); }
        });

        // Inject items registered by addons (typography finder, color finder, etc.)
        if (window.bnpCtxExtensions.length) {
            items.push('sep');
            window.bnpCtxExtensions.forEach(function(ext) {
                if (!ext.types || ext.types.indexOf(type) !== -1) {
                    items.push({
                        icon: ext.icon,
                        label: ext.label,
                        action: (function(e) { return function() { e.action(row, type, id, name); }; })(ext)
                    });
                }
            });
        }

        var menu = buildCtxMenu(items);
        document.body.appendChild(menu);
        positionCtx(menu, e.clientX, e.clientY);
        activeCtx = menu;
    });

    /* ──────────────────────────────────────────────────
       SCREEN OPTIONS  (typography tab only)
    ────────────────────────────────────────────────── */

    var soBtn   = document.getElementById('bnp-screen-opts-btn');
    var soPanel = document.getElementById('bnp-screen-opts-panel');

    var SO_KEY  = 'bnp_screen_opts';
    var soState = { desk: true, tab: true, mob: true };

    // Restore persisted state
    try {
        var saved = localStorage.getItem(SO_KEY);
        if (saved) soState = Object.assign(soState, JSON.parse(saved));
    } catch (e) {}

    function applyScreenOpts() {
        var wrap = document.querySelector('.bnp-wrap');
        if (!wrap) return;
        wrap.classList.toggle('bnp-hide-desk', !soState.desk);
        wrap.classList.toggle('bnp-hide-tab',  !soState.tab);
        wrap.classList.toggle('bnp-hide-mob',  !soState.mob);
        // Keep checkboxes in sync (needed on first load)
        ['desk', 'tab', 'mob'].forEach(function (bp) {
            var cb = document.getElementById('bnp-so-' + bp);
            if (cb) cb.checked = soState[bp];
        });
    }

    // Apply immediately so columns are hidden before the user sees them
    applyScreenOpts();

    if (soBtn && soPanel) {
        soBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            var open = soBtn.classList.toggle('is-open');
            soPanel.classList.toggle('is-open', open);
        });

        // Close panel when clicking outside
        document.addEventListener('click', function (e) {
            if (soPanel.classList.contains('is-open') &&
                !soPanel.contains(e.target) &&
                e.target !== soBtn &&
                !soBtn.contains(e.target)) {
                soBtn.classList.remove('is-open');
                soPanel.classList.remove('is-open');
            }
        });

        ['desk', 'tab', 'mob'].forEach(function (bp) {
            var cb = document.getElementById('bnp-so-' + bp);
            if (!cb) return;
            cb.addEventListener('change', function () {
                soState[bp] = cb.checked;
                try { localStorage.setItem(SO_KEY, JSON.stringify(soState)); } catch (e) {}
                applyScreenOpts();
            });
        });
    }

    /* ──────────────────────────────────────────────────
       FONT PREVIEW MODAL
    ────────────────────────────────────────────────── */

    var fontModal         = document.getElementById('bnp-font-modal');
    var fontModalClose    = document.getElementById('bnp-font-modal-close');
    var fontModalCancel   = document.getElementById('bnp-font-modal-cancel');
    var fontModalApply    = document.getElementById('bnp-font-modal-apply');
    var fmpPreview        = document.getElementById('bnp-fmp-preview');
    var fmpFamilyInput    = document.getElementById('bnp-fmp-family');
    var fmpFamilyList     = document.getElementById('bnp-fmp-family-list');
    var fmpWeightInput    = document.getElementById('bnp-fmp-weight');
    var fmpWeightSlider   = document.getElementById('bnp-fmp-weight-slider');
    var fontModalTitle    = document.getElementById('bnp-font-modal-title');

    // Working state for the currently open modal
    var fmpState     = {};
    var fmpSavedState = null; // snapshot of values at open time (never mutated while modal is open)
    var fmpSourceRow = null;
    var fmpActiveBp  = 'desktop'; // tracks which BP tab is visible

    // Flat list of all font names for the family search
    var allFontsFlat = [];
    ['custom', 'system', 'google'].forEach(function (k) {
        ((bnpData.fonts || {})[k] || []).forEach(function (f) { allFontsFlat.push(f); });
    });

    // Label maps for flat fields
    var fmpFlatLabels = {
        style:      { '': '—', 'normal': 'Normal', 'italic': 'Italic', 'oblique': 'Oblique' },
        transform:  { '': '—', 'none': 'None', 'capitalize': 'Capitalize', 'uppercase': 'Uppercase', 'lowercase': 'Lowercase' },
        decoration: { '': '—', 'none': 'None', 'underline': 'Underline', 'overline': 'Overline', 'line-through': 'Line-through' }
    };

    // Append 'px' to a plain number; pass through any value that already has a unit,
    // is a CSS function (clamp, calc, etc.), or is empty.
    function fmpPx(v) {
        if (!v || v === '—') return '';
        v = v.trim();
        return /^-?[\d.]+$/.test(v) ? v + 'px' : v;
    }

    // Parse a stored CSS value (e.g. "16px", "1.5em", "clamp(...)") into
    // {val, unit} for populating the modal inputs.
    // defaultUnit is the field's first unit option (e.g. 'px', '' for line-height).
    function fmpParseValUnit(v, defaultUnit) {
        defaultUnit = defaultUnit !== undefined ? defaultUnit : 'px';
        if (!v || v === '—') return { val: '', unit: defaultUnit };
        v = v.trim();
        var m = v.match(/^(-?[\d.]+)\s*(px|em|rem|%|vw|vh|ch|ex|pt|cm|mm)$/i);
        if (m) return { val: m[1], unit: m[2].toLowerCase() };
        if (/^-?[\d.]+$/.test(v)) return { val: v, unit: defaultUnit };
        return { val: v, unit: 'custom' };
    }

    // Combine numeric value + unit into a CSS string stored in fmpState.
    // unit='' means unitless (used for line-height); unit='custom' means val is a raw CSS expression.
    function fmpCombineValUnit(val, unit) {
        val = (val || '').trim();
        if (!val) return '';
        if (unit === 'custom' || unit === '') return val;
        return val + unit;
    }

    // Mark an input as numeric-only (when unit != 'custom') or free-text ('custom').
    // Call whenever a unit select changes or an input is first populated.
    function fmpSetInputNumericMode(inp, unit) {
        if (!inp) return;
        if (unit === 'custom') {
            delete inp.dataset.numericOnly;
            inp.placeholder = 'CSS value';
        } else {
            inp.dataset.numericOnly = '1';
            inp.placeholder = '—';
        }
    }

    // Render the saved-state reference panel inside the modal.
    function fmpRenderSavedPanel() {
        var content = document.getElementById('bnp-fmp-saved-content');
        if (!content || !fmpSavedState) return;

        var fieldLabels = { size: 'Size', line_height: 'Line Height', letter_spacing: 'Letter Sp.', word_spacing: 'Word Sp.' };
        var bps = [
            { bp: 'desktop', label: 'Desktop', icon: 'dashicons-desktop', cls: 'desk' },
            { bp: 'tablet',  label: 'Tablet',  icon: 'dashicons-tablet',  cls: 'tab'  },
            { bp: 'mobile',  label: 'Mobile',  icon: 'dashicons-smartphone', cls: 'mob' },
        ];

        function savedRow(key, val) {
            return '<div class="bnp-fmp-saved-row">' +
                '<span class="bnp-fmp-saved-key">' + escH(key) + '</span>' +
                '<span class="bnp-fmp-saved-val">' + escH(val || '—') + '</span>' +
                '</div>';
        }

        var html = '<div class="bnp-fmp-saved-flat">';
        html += savedRow('Family',     fmpSavedState.family     || '—');
        html += savedRow('Style',      fmpFlatLabels.style[fmpSavedState.style]           || fmpSavedState.style      || '—');
        html += savedRow('Transform',  fmpFlatLabels.transform[fmpSavedState.transform]   || fmpSavedState.transform  || '—');
        html += savedRow('Decoration', fmpFlatLabels.decoration[fmpSavedState.decoration] || fmpSavedState.decoration || '—');
        html += savedRow('Weight',     fmpSavedState.weight || '—');
        html += '</div>';

        html += '<div class="bnp-fmp-saved-bps">';
        bps.forEach(function (b) {
            var bpData = fmpSavedState.bp[b.bp] || {};
            html += '<div class="bnp-fmp-saved-bp bnp-fmp-saved-bp--' + b.cls + '">';
            html += '<div class="bnp-fmp-saved-bp-head">' +
                '<span class="dashicons ' + b.icon + '"></span>' + b.label + '</div>';
            ['size', 'line_height', 'letter_spacing', 'word_spacing'].forEach(function (f) {
                html += savedRow(fieldLabels[f], bpData[f] || '—');
            });
            html += '</div>';
        });
        html += '</div>';

        content.innerHTML = html;
    }

    function fmpApplyToPreview() {
        if (!fmpPreview) return;
        var fam    = fmpState.family;
        var bpData = fmpState.bp[fmpActiveBp] || {};
        fmpPreview.style.fontFamily     = (fam && fam !== '—') ? '"' + fam + '", sans-serif' : 'inherit';
        fmpPreview.style.fontStyle      = fmpState.style      || '';
        fmpPreview.style.textTransform  = fmpState.transform  || '';
        fmpPreview.style.textDecoration = fmpState.decoration || '';
        // Weight is flat (same for all BPs)
        var w = fmpState.weight || '';
        fmpPreview.style.fontWeight     = (w && w !== '—') ? w : '';
        // Per-BP properties — fmpPx handles px-only numbers, passes everything else through
        fmpPreview.style.fontSize      = fmpPx(bpData.size) || '48px';
        fmpPreview.style.lineHeight    = bpData.line_height    || '';
        fmpPreview.style.letterSpacing = fmpPx(bpData.letter_spacing);
        fmpPreview.style.wordSpacing   = fmpPx(bpData.word_spacing);
    }

    function fmpSetActivePill(field, value) {
        if (!fontModal) return;
        var group = fontModal.querySelector('[data-fmp-field="' + field + '"]');
        if (!group) return;
        group.querySelectorAll('.bnp-fmp-pill').forEach(function (btn) {
            btn.classList.toggle('is-active', btn.dataset.value === value);
        });
    }

    // ── Modal family virtual-scroll state ──
    var fmpFlatFontList = [];
    var fmpFontRendered = 0;
    var fmpFontPrevObs  = null;
    var fmpFontSentObs  = null;
    var FMP_FONT_CHUNK  = 60;

    function fmpRenderFontChunk() {
        if (!fmpFamilyList) return;
        var end  = Math.min(fmpFontRendered + FMP_FONT_CHUNK, fmpFlatFontList.length);
        var frag = document.createDocumentFragment();
        for (var i = fmpFontRendered; i < end; i++) {
            var item = fmpFlatFontList[i];
            if (item.type === 'header') {
                var h = document.createElement('div');
                h.className   = 'bnp-fd-group-header';
                h.textContent = item.label;
                frag.appendChild(h);
            } else {
                var el = document.createElement('div');
                el.className       = 'bnp-fmp-fl-item';
                el.dataset.font    = item.name;
                el.style.fontFamily = '\'' + item.name.replace(/'/g, "\\'") + '\', sans-serif';
                el.textContent     = item.name;
                frag.appendChild(el);
            }
        }
        fmpFontRendered = end;
        fmpFamilyList.appendChild(frag);

        // Wire lazy Google-font loading for new items
        if (fmpFontPrevObs) {
            fmpFamilyList.querySelectorAll('.bnp-fmp-fl-item:not([data-fo])').forEach(function (el) {
                el.dataset.fo = '1';
                if (el.dataset.font) fmpFontPrevObs.observe(el);
            });
        }

        // Replace sentinel
        var old = fmpFamilyList.querySelector('.bnp-fd-sentinel');
        if (old) { if (fmpFontSentObs) fmpFontSentObs.unobserve(old); old.remove(); }
        if (fmpFontRendered < fmpFlatFontList.length) {
            var sentinel = document.createElement('div');
            sentinel.className = 'bnp-fd-sentinel';
            fmpFamilyList.appendChild(sentinel);
            if (fmpFontSentObs) fmpFontSentObs.observe(sentinel);
        }
    }

    function fmpShowFamilyList(query) {
        if (!fmpFamilyList) return;

        // Tear down previous observers
        if (fmpFontSentObs) fmpFontSentObs.disconnect();
        if (fmpFontPrevObs) fmpFontPrevObs.disconnect();
        fmpFamilyList.innerHTML = '';
        fmpFontRendered = 0;

        // Build flat list — show everything when query is empty
        var q = (query || '').toLowerCase();
        fmpFlatFontList = [];
        dropdownGroups.forEach(function (g) {
            var fonts = q
                ? g.fonts.filter(function (f) { return f.toLowerCase().indexOf(q) !== -1; })
                : g.fonts;
            if (!fonts.length) return;
            fmpFlatFontList.push({ type: 'header', label: g.label });
            fonts.forEach(function (f) { fmpFlatFontList.push({ type: 'font', name: f }); });
        });

        if (!fmpFlatFontList.length) {
            fmpFamilyList.innerHTML = '<div class="bnp-fmp-fl-empty">No fonts match</div>';
            fmpFamilyList.style.display = 'block';
            return;
        }

        if (window.IntersectionObserver) {
            fmpFontPrevObs = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (!entry.isIntersecting) return;
                    loadGoogleFont(entry.target.dataset.font);
                    fmpFontPrevObs.unobserve(entry.target);
                });
            }, { root: fmpFamilyList, rootMargin: '120px 0px' });

            fmpFontSentObs = new IntersectionObserver(function (entries) {
                if (entries[0].isIntersecting) fmpRenderFontChunk();
            }, { root: fmpFamilyList });
        }

        fmpRenderFontChunk();
        fmpFamilyList.style.display = 'block';
    }

    function openFontModal(triggerBtn) {
        if (!fontModal) return;

        fmpSourceRow = triggerBtn.closest('tr');
        var row = fmpSourceRow;

        // Read current values from the row
        var famSpan   = row ? row.querySelector('[data-field="family"]') : null;
        var styleTrig = row ? row.querySelector('[data-field="style"]') : null;
        var transTrig = row ? row.querySelector('[data-field="transform"]') : null;
        var decorTrig = row ? row.querySelector('[data-field="decoration"]') : null;
        var nameEl    = row ? row.querySelector('[data-field="name"]') : null;

        // Read flat weight from the dedicated flat cell
        var weightEl = row ? row.querySelector('[data-field="weight"][data-bp=""]') : null;
        var weightV  = weightEl ? weightEl.textContent.trim() : '';

        fmpState = {
            family:     famSpan   ? famSpan.textContent.trim().replace(/^—$/, '')   : (triggerBtn.dataset.fontFamily    || ''),
            style:      styleTrig ? (styleTrig.dataset.value  || '') : (triggerBtn.dataset.fontStyle     || ''),
            transform:  transTrig ? (transTrig.dataset.value  || '') : (triggerBtn.dataset.fontTransform  || ''),
            decoration: decorTrig ? (decorTrig.dataset.value  || '') : (triggerBtn.dataset.fontDecoration || ''),
            weight:     (weightV && weightV !== '—') ? weightV : '',
            bp: { desktop: {}, tablet: {}, mobile: {} }
        };

        ['desktop', 'tablet', 'mobile'].forEach(function (bp) {
            ['size', 'line_height', 'letter_spacing', 'word_spacing'].forEach(function (f) {
                var el = row ? row.querySelector('[data-field="' + f + '"][data-bp="' + bp + '"]') : null;
                var v  = el ? el.textContent.trim() : '';
                fmpState.bp[bp][f] = (v && v !== '—') ? v : '';
            });
        });

        // Snapshot saved state for the reference panel
        fmpSavedState = JSON.parse(JSON.stringify(fmpState));

        // Populate controls
        if (fmpFamilyInput) fmpFamilyInput.value = fmpState.family;
        // Show the browsable list immediately; filtered to current family if set
        fmpShowFamilyList(fmpState.family || '');

        ['style', 'transform', 'decoration'].forEach(function (field) {
            fmpSetActivePill(field, fmpState[field]);
        });

        // Flat weight input + slider
        if (fmpWeightInput)  fmpWeightInput.value = fmpState.weight || '';
        if (fmpWeightSlider) {
            var wn = parseFloat(fmpState.weight);
            fmpWeightSlider.value = !isNaN(wn) ? Math.max(100, Math.min(900, wn)) : 400;
            fmpFillSlider(fmpWeightSlider);
        }

        // BP panels — populate inputs, unit selects, and sliders
        fmpActiveBp = 'desktop';
        fontModal.querySelectorAll('.bnp-fmp-bp-panel').forEach(function (panel) {
            var bp = panel.dataset.bp;
            panel.querySelectorAll('.bnp-fmp-bp-input').forEach(function (inp) {
                var field   = inp.dataset.field;
                var stored  = fmpState.bp[bp][field] || '';
                var row     = inp.closest('.bnp-fmp-row');
                var unitSel = row && row.querySelector('.bnp-fmp-unit');
                var defUnit = unitSel ? unitSel.dataset.defaultUnit : 'px';
                var parsed  = fmpParseValUnit(stored, defUnit);
                inp.value = parsed.val;
                if (unitSel) unitSel.value = parsed.unit;
                fmpSetInputNumericMode(inp, parsed.unit);
                fmpInputToSlider(inp);
            });
        });

        // Reset BP tabs to desktop
        fontModal.querySelectorAll('.bnp-fmp-bp-tab').forEach(function (t) {
            t.classList.toggle('is-active', t.dataset.bp === 'desktop');
        });
        fontModal.querySelectorAll('.bnp-fmp-bp-panel').forEach(function (p) {
            p.style.display = p.dataset.bp === 'desktop' ? '' : 'none';
        });

        // Set title
        var label = nameEl ? nameEl.textContent.trim() : (triggerBtn.dataset.fontLabel || fmpState.family || 'Font Preview');
        if (fontModalTitle) fontModalTitle.textContent = label || 'Font Preview';

        // Load Google font and apply styles
        if (fmpState.family && googleFontSet[fmpState.family]) loadGoogleFont(fmpState.family);
        fmpApplyToPreview();

        // Render saved-state reference panel and ensure it starts collapsed
        fmpRenderSavedPanel();
        var _savedPanel  = document.getElementById('bnp-fmp-saved-panel');
        var _savedToggle = document.getElementById('bnp-fmp-saved-toggle');
        if (_savedPanel)  _savedPanel.classList.remove('is-open');
        if (_savedToggle) _savedToggle.classList.remove('is-open');

        fontModal.style.display = 'flex';
        setTimeout(function () { if (fmpPreview) fmpPreview.focus(); }, 80);
    }

    function closeFontModal() {
        if (!fontModal) return;
        fontModal.style.display = 'none';
        fmpSourceRow = null;
    }

    // ── Slider helpers ──

    // Update the filled-track CSS custom property so the left side shows the accent colour
    function fmpFillSlider(slider) {
        var min = parseFloat(slider.min);
        var max = parseFloat(slider.max);
        var val = parseFloat(slider.value);
        var pct = (max === min) ? 0 : Math.round(((val - min) / (max - min)) * 100);
        slider.style.setProperty('--fmp-pct', pct + '%');
    }

    // Sync a text input's numeric value → its sibling slider (no events fired).
    // Slider is only enabled when the unit select is 'px'.
    function fmpInputToSlider(inp) {
        var row = inp.closest('.bnp-fmp-row');
        if (!row) return;
        var sl      = row.querySelector('.bnp-fmp-slider');
        if (!sl) return;
        var unitSel = row.querySelector('.bnp-fmp-unit');
        var unit    = unitSel ? unitSel.value : 'px';
        sl.disabled = (unit !== 'px');
        if (!sl.disabled) {
            var n = parseFloat(inp.value);
            if (!isNaN(n)) {
                sl.value = Math.max(parseFloat(sl.min), Math.min(parseFloat(sl.max), n));
            }
            fmpFillSlider(sl);
        }
    }

    // Sync a slider → its sibling text input (no events fired)
    function fmpSliderToInput(sl) {
        var row = sl.closest('.bnp-fmp-row');
        if (!row) return;
        var inp = row.querySelector('.bnp-fmp-bp-input');
        if (inp) inp.value = sl.value;
        fmpFillSlider(sl);
    }

    // ── Flat weight input + slider ──
    if (fmpWeightInput) {
        fmpWeightInput.addEventListener('input', function () {
            fmpState.weight = fmpWeightInput.value.trim();
            if (fmpWeightSlider) {
                var n = parseFloat(fmpState.weight);
                if (!isNaN(n)) { fmpWeightSlider.value = Math.max(100, Math.min(900, n)); fmpFillSlider(fmpWeightSlider); }
            }
            fmpApplyToPreview();
        });
    }
    if (fmpWeightSlider) {
        fmpWeightSlider.addEventListener('input', function () {
            fmpState.weight = fmpWeightSlider.value;
            if (fmpWeightInput) fmpWeightInput.value = fmpWeightSlider.value;
            fmpFillSlider(fmpWeightSlider);
            fmpApplyToPreview();
        });
    }

    // ── Family search input ──
    if (fmpFamilyInput) {
        fmpFamilyInput.addEventListener('input', function () {
            fmpState.family = fmpFamilyInput.value.trim();
            fmpShowFamilyList(fmpState.family);
            if (fmpState.family && googleFontSet[fmpState.family]) loadGoogleFont(fmpState.family);
            fmpApplyToPreview();
        });
        fmpFamilyInput.addEventListener('focus', function () {
            // Always show the list on focus (full list if input is empty, filtered if not)
            fmpShowFamilyList(fmpFamilyInput.value.trim());
        });
        fmpFamilyInput.addEventListener('blur', function () {
            setTimeout(function () {
                if (fmpFamilyList) fmpFamilyList.style.display = 'none';
            }, 160);
        });
    }

    if (fmpFamilyList) {
        fmpFamilyList.addEventListener('mousedown', function (e) {
            var item = e.target.closest('.bnp-fmp-fl-item');
            if (!item) return;
            e.preventDefault();
            var f = item.dataset.font;
            if (fmpFamilyInput) fmpFamilyInput.value = f;
            fmpState.family = f;
            fmpFamilyList.style.display = 'none';
            if (googleFontSet[f]) loadGoogleFont(f);
            fmpApplyToPreview();
        });

        // Scroll fallback: load Google Fonts on scroll for browsers without IntersectionObserver
        fmpFamilyList.addEventListener('scroll', function () {
            if (window.IntersectionObserver) return;
            var lr = fmpFamilyList.getBoundingClientRect();
            fmpFamilyList.querySelectorAll('.bnp-fmp-fl-item:not([data-fo])').forEach(function (el) {
                var r = el.getBoundingClientRect();
                if (r.top < lr.bottom + 120) { el.dataset.fo = '1'; loadGoogleFont(el.dataset.font); }
            });
        });
    }

    // ── Pill buttons (style / transform / decoration) ──
    if (fontModal) {
        fontModal.addEventListener('click', function (e) {
            var pill = e.target.closest('.bnp-fmp-pill');
            if (!pill) return;
            var group = pill.closest('[data-fmp-field]');
            if (!group) return;
            var field = group.dataset.fmpField;
            fmpSetActivePill(field, pill.dataset.value);
            fmpState[field] = pill.dataset.value;
            fmpApplyToPreview();
        });
    }

    // ── BP tab switching ──
    if (fontModal) {
        fontModal.addEventListener('click', function (e) {
            var tab = e.target.closest('.bnp-fmp-bp-tab');
            if (!tab) return;
            var bp = tab.dataset.bp;
            fmpActiveBp = bp;
            fontModal.querySelectorAll('.bnp-fmp-bp-tab').forEach(function (t) {
                t.classList.toggle('is-active', t.dataset.bp === bp);
            });
            fontModal.querySelectorAll('.bnp-fmp-bp-panel').forEach(function (p) {
                p.style.display = p.dataset.bp === bp ? '' : 'none';
            });
            fmpApplyToPreview();
        });
    }

    // ── BP text inputs + sliders: unified input handler ──
    if (fontModal) {
        fontModal.addEventListener('input', function (e) {
            // Text input changed → combine with unit, sync slider, update state + preview
            var inp = e.target.closest('.bnp-fmp-bp-input');
            if (inp) {
                // Strip non-numeric characters when in numeric-only mode
                if (inp.dataset.numericOnly) {
                    var filtered = inp.value.replace(/[^\d.\-]/g, '');
                    if (filtered !== inp.value) {
                        var pos = inp.selectionStart - (inp.value.length - filtered.length);
                        inp.value = filtered;
                        try { inp.setSelectionRange(pos, pos); } catch (ex) {}
                    }
                }
                var bp      = inp.dataset.bp;
                var field   = inp.dataset.field;
                var row     = inp.closest('.bnp-fmp-row');
                var unitSel = row && row.querySelector('.bnp-fmp-unit');
                var unit    = unitSel ? unitSel.value : 'px';
                fmpState.bp[bp][field] = fmpCombineValUnit(inp.value, unit);
                fmpInputToSlider(inp);
                if (bp === fmpActiveBp) fmpApplyToPreview();
                return;
            }

            // Slider changed → sync sibling input, append its unit, update state + preview
            // (skip if no data-bp — the flat weight slider is handled separately)
            var sl = e.target.closest('.bnp-fmp-slider');
            if (sl && sl.dataset.bp) {
                var bp      = sl.dataset.bp;
                var field   = sl.dataset.field;
                var row     = sl.closest('.bnp-fmp-row');
                var unitSel = row && row.querySelector('.bnp-fmp-unit');
                var unit    = unitSel ? unitSel.value : 'px';
                fmpSliderToInput(sl);
                fmpState.bp[bp][field] = fmpCombineValUnit(sl.value, unit);
                if (bp === fmpActiveBp) fmpApplyToPreview();
            }
        });

        // Unit select changed → re-combine state, toggle slider, update preview
        fontModal.addEventListener('change', function (e) {
            var unitSel = e.target.closest('.bnp-fmp-unit');
            if (!unitSel) return;
            var bp    = unitSel.dataset.bp;
            var field = unitSel.dataset.field;
            var unit  = unitSel.value;
            var row   = unitSel.closest('.bnp-fmp-row');
            var inp   = row && row.querySelector('.bnp-fmp-bp-input');
            var sl    = row && row.querySelector('.bnp-fmp-slider');
            var val   = inp ? inp.value.trim() : '';
            if (inp) fmpSetInputNumericMode(inp, unit);
            fmpState.bp[bp][field] = fmpCombineValUnit(val, unit);
            if (sl) {
                sl.disabled = (unit !== 'px');
                if (!sl.disabled) fmpFillSlider(sl);
            }
            if (bp === fmpActiveBp) fmpApplyToPreview();
        });
    }

    // ── Close / Cancel ──
    if (fontModalClose)  fontModalClose.addEventListener('click', closeFontModal);
    if (fontModalCancel) fontModalCancel.addEventListener('click', closeFontModal);
    if (fontModal) {
        fontModal.querySelector('.bnp-font-modal-backdrop').addEventListener('click', closeFontModal);
    }
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && fontModal && fontModal.style.display !== 'none') closeFontModal();
    });

    // ── Numeric-only paste guard (strips non-numeric chars on paste into bp inputs) ──
    if (fontModal) {
        fontModal.addEventListener('paste', function (e) {
            var inp = e.target.closest('.bnp-fmp-bp-input');
            if (!inp || !inp.dataset.numericOnly) return;
            e.preventDefault();
            var text = (e.clipboardData || window.clipboardData).getData('text/plain');
            var stripped = text.replace(/[^\d.\-]/g, '');
            if (stripped) document.execCommand('insertText', false, stripped);
        });
    }

    // ── Saved settings panel toggle ──
    (function () {
        var savedToggle = document.getElementById('bnp-fmp-saved-toggle');
        var savedPanel  = document.getElementById('bnp-fmp-saved-panel');
        if (!savedToggle || !savedPanel) return;
        savedToggle.addEventListener('click', function () {
            var isOpen = savedPanel.classList.contains('is-open');
            savedPanel.classList.toggle('is-open', !isOpen);
            savedToggle.classList.toggle('is-open', !isOpen);
        });
    })();

    // ── Apply: write fmpState back to the row and mark dirty ──
    if (fontModalApply) {
        fontModalApply.addEventListener('click', function () {
            if (!fmpSourceRow) { closeFontModal(); return; }
            var row = fmpSourceRow;

            // Family
            var famSpan = row.querySelector('[data-field="family"]');
            if (famSpan) {
                famSpan.textContent = fmpState.family || '—';
                markDirty(famSpan);
            }

            // Style / Transform / Decoration
            ['style', 'transform', 'decoration'].forEach(function (field) {
                var trig = row.querySelector('[data-field="' + field + '"]');
                if (!trig) return;
                var val   = fmpState[field] || '';
                var label = (fmpFlatLabels[field] && fmpFlatLabels[field][val] !== undefined)
                    ? fmpFlatLabels[field][val] : (val || '—');
                trig.textContent   = label;
                trig.dataset.value = val;
                markDirty(trig);
            });

            // Flat weight
            var wEl = row.querySelector('[data-field="weight"][data-bp=""]');
            if (wEl) {
                var wv = fmpState.weight || '';
                wEl.textContent = wv || '—';
                wEl.classList.toggle('bnp-val-empty', !wv);
                markDirty(wEl);
            }

            // Breakpoint fields (weight is now flat, not per-BP)
            ['desktop', 'tablet', 'mobile'].forEach(function (bp) {
                ['size', 'line_height', 'letter_spacing', 'word_spacing'].forEach(function (f) {
                    var el = row.querySelector('[data-field="' + f + '"][data-bp="' + bp + '"]');
                    if (!el) return;
                    var v = fmpState.bp[bp][f] || '';
                    el.textContent = v || '—';
                    el.classList.toggle('bnp-val-empty', !v);
                    markDirty(el);
                });
            });

            // Refresh the chip in the table
            updatePreviewCell(row);

            closeFontModal();
        });
    }

    // ── Open modal when preview chip is clicked ──
    document.addEventListener('click', function (e) {
        var btn = e.target.closest('.bnp-preview');
        if (!btn) return;
        e.stopPropagation();
        openFontModal(btn);
    });

    /* ──────────────────────────────────────────────────
       PUBLIC API — for addons running on other tabs
       window.bnpOpenFontById(fontId) opens the preview
       modal for any typography row that is in the DOM.
    ────────────────────────────────────────────────── */

    window.bnpOpenFontById = function (fontId) {
        var chk = document.querySelector('.bnp-row-check[data-type="font"][data-id="' + fontId + '"]');
        var btn = chk && chk.closest('tr') ? chk.closest('tr').querySelector('.bnp-preview') : null;
        if (btn) openFontModal(btn);
    };

    // Auto-open when navigated here via ?bnp_preview_id=ID (e.g. from the Find & Replace addon)
    (function () {
        var params = new URLSearchParams(window.location.search);
        var pid    = params.get('bnp_preview_id');
        if (!pid) return;
        // Small delay lets the page finish rendering before opening the modal
        setTimeout(function () { window.bnpOpenFontById(pid); }, 300);
    })();

})();

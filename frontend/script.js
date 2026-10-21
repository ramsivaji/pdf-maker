// Initialize Lucide icons
lucide.createIcons();
const savedTheme = localStorage.getItem('pdf-studio-theme');
if (savedTheme === 'light') applyTheme('light');

function applyTheme(theme) {
    document.body.dataset.theme = theme;
    const button = document.getElementById('theme-toggle');
    if (button) {
        button.textContent = theme === 'light' ? 'Dark theme' : 'Light theme';
        button.setAttribute('aria-pressed', String(theme === 'light'));
    }
}

function toggleTheme() {
    const next = document.body.dataset.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('pdf-studio-theme', next);
    applyTheme(next);
}

// Since frontend is now served by FastAPI directly, API calls are relative
const API_BASE_URL = "";

// ============================================================
//  TOOL CONFIGURATIONS  (generic tool section)
// ============================================================
const tools = {
    'pdf-to-word': {
        title: 'PDF to Word',
        desc: 'Convert any PDF document into an editable Microsoft Word (.docx) file.',
        endpoint: '/api/convert/pdf-to-word',
        accept: '.pdf',
        multiple: false,
        btnText: 'Convert to Word',
        outName: 'converted_document.docx',
        hasQuality: false,
    },

    'word-to-pdf': {
        title: 'Word to PDF',
        desc: 'Convert a Microsoft Word (.docx) document into a high-quality PDF file.',
        endpoint: '/api/convert/word-to-pdf',
        accept: '.docx,.doc',
        multiple: false,
        btnText: 'Convert to PDF',
        outName: 'converted_document.pdf',
        hasQuality: false,
    },

    'merge-pdfs': {
        title: 'Merge PDFs',
        desc: 'Combine multiple PDF files into one single document. Upload 2 to 20 PDF files.',
        endpoint: '/api/convert/merge-pdfs',
        accept: '.pdf',
        multiple: true,
        btnText: 'Merge PDFs',
        outName: 'merged_document.pdf',
        hasQuality: false,
    },

    'image-to-pdf': {
        title: 'Image to PDF',
        desc: 'Convert one or multiple images (JPG, PNG, WebP) into a single PDF document.',
        endpoint: '/api/convert/image-to-pdf',
        accept: '.jpg,.jpeg,.png,.webp,.bmp,.tiff',
        multiple: true,
        btnText: 'Convert to PDF',
        outName: 'converted_images.pdf',
        hasQuality: false,
    },

    'compress-image': {
        title: 'Compress Image',
        desc: 'Reduce image file size while preserving visual quality. Supports JPEG, PNG and WEBP.',
        endpoint: '/api/convert/compress-image',
        accept: '.jpg,.jpeg,.png,.webp,.bmp',
        multiple: false,
        btnText: 'Compress Image',
        outName: 'compressed_image.jpg',
        hasQuality: true,
    },
};

let currentToolId = null;
let selectedFiles = [];

// ============================================================
//  ROUTING / UI TOGGLES
// ============================================================
function showSection(sectionId) {
    document.getElementById('sec-home').className    = 'section-hidden';
    document.getElementById('sec-tool').className    = 'section-hidden max-w-800 mx-auto';
    document.getElementById('sec-arrange').className = 'section-hidden max-w-1000 mx-auto';
    document.getElementById('sec-resize').className  = 'section-hidden max-w-700 mx-auto';
    document.getElementById('sec-studio').className = 'section-hidden max-w-800 mx-auto';

    if (sectionId === 'home') {
        document.getElementById('sec-home').className = 'section-active';
        currentToolId = null;
    } else if (sectionId === 'arrange-pdf') {
        document.getElementById('sec-arrange').className = 'section-active max-w-1000 mx-auto';
        lucide.createIcons();
    } else if (sectionId === 'resize-image') {
        document.getElementById('sec-resize').className = 'section-active max-w-700 mx-auto';
        lucide.createIcons();
    } else if (sectionId === 'studio-tools') {
        document.getElementById('sec-studio').className = 'section-active max-w-800 mx-auto';
        studioOperationChanged();
        loadStudioJobs();
    } else {
        document.getElementById('sec-tool').className = 'section-active max-w-800 mx-auto';
        loadToolConfig(sectionId);
    }
}

function studioOperationChanged() {
    const op = document.getElementById('studio-operation').value;
    const files = document.getElementById('studio-files');
    const multi = op === 'images';
    files.accept = multi ? '.png,.jpg,.jpeg' : (op === 'docx-to-pdf' ? '.docx' : '.pdf');
    files.multiple = multi;
    const options = document.getElementById('studio-options');
    options.innerHTML = '';
    if (op === 'split') options.innerHTML = '<label class="form-label" for="studio-pages">Page ranges (for example 1-3,5)</label><input id="studio-pages" class="form-control bg-dark text-light border-secondary" placeholder="1-3,5">';
    if (op === 'compress') options.innerHTML = '<label class="form-label" for="studio-level">Optimization level</label><select id="studio-level" class="form-select bg-dark text-light border-secondary"><option value="1">1 — light</option><option value="2" selected>2 — balanced</option><option value="3">3 — maximum</option></select>';
    if (op === 'to-images') options.innerHTML = '<label class="form-label" for="studio-pages">Pages (all or ranges)</label><input id="studio-pages" class="form-control bg-dark text-light border-secondary mb-2" value="all"><label class="form-label" for="studio-dpi">Resolution (DPI)</label><input id="studio-dpi" type="number" min="72" max="300" value="150" class="form-control bg-dark text-light border-secondary">';
    document.getElementById('studio-file-help').textContent = multi ? 'Choose up to 20 PNG or JPEG images.' : 'Select one PDF file. Upload and page limits are enforced by the server.';
}

async function runStudioTool() {
    const op = document.getElementById('studio-operation').value;
    const input = document.getElementById('studio-files');
    const files = Array.from(input.files || []);
    const result = document.getElementById('studio-result');
    if (!files.length) { result.innerHTML = '<div class="alert alert-warning">Select a file first.</div>'; return; }
    const form = new FormData();
    files.forEach(file => form.append(op === 'images' ? 'files' : 'file', file));
    let path = `/api/pdf/${op}`;
    if (op === 'to-docx') path = '/api/pdf/to-docx';
    if (op === 'docx-to-pdf') path = '/api/docx/to-pdf';
    if (op === 'extract') path = '/api/pdf/extract-text';
    if (op === 'images') path = '/api/images/to-pdf';
    if (op === 'split') form.append('pages', document.getElementById('studio-pages').value);
    if (op === 'compress') form.append('level', document.getElementById('studio-level').value);
    if (op === 'to-images') { form.append('pages', document.getElementById('studio-pages').value); form.append('dpi', document.getElementById('studio-dpi').value); }
    const button = document.getElementById('studio-submit'); button.disabled = true; button.textContent = 'Processing…';
    result.innerHTML = '<div class="text-secondary">Uploading and processing your document…</div>';
    const progress = document.getElementById('studio-progress');
    const progressBar = document.getElementById('studio-progress-bar');
    const progressLabel = document.getElementById('studio-progress-label');
    progress.classList.remove('d-none'); progressBar.style.width = '0%'; progressLabel.textContent = 'Uploading…';
    try {
        const body = await new Promise((resolve, reject) => {
            const request = new XMLHttpRequest();
            request.open('POST', path);
            request.upload.onprogress = event => {
                if (!event.lengthComputable) return;
                const percent = Math.round(event.loaded * 100 / event.total);
                progressBar.style.width = `${percent}%`;
                progressLabel.textContent = `Uploading… ${percent}%`;
            };
            request.upload.onload = () => { progressLabel.textContent = 'Processing document…'; progressBar.classList.remove('progress-bar-animated'); };
            request.onload = () => {
                let data = {};
                try { data = JSON.parse(request.responseText); } catch (_) {}
                if (request.status >= 200 && request.status < 300) resolve(data);
                else reject(new Error(data.detail || `Request failed (${request.status})`));
            };
            request.onerror = () => reject(new Error('Network error while sending the file.'));
            request.send(form);
        });
        if (op === 'metadata') {
            result.innerHTML = `<div class="alert alert-success">Pages: ${body.page_count} · Size: ${(body.file_size/1024).toFixed(1)} KB · Title: ${escapeHtml(body.title || '—')} · Author: ${escapeHtml(body.author || '—')} · Created: ${escapeHtml(body.creation_date || '—')}</div>`;
        } else {
            const reduction = body.input_size ? ((body.input_size-body.output_size)*100/body.input_size).toFixed(1) : '0.0';
            const detail = op === 'compress' ? ` Size: ${reduction}% ${reduction >= 0 ? 'smaller' : 'larger'}.` : '';
            result.innerHTML = `<div class="alert alert-success">Processing complete.${detail} <a href="${body.download_url}" class="alert-link" download="${escapeHtml(body.filename)}">Download ${escapeHtml(body.filename)}</a><div class="small">Output ${body.output_size} bytes · Job ${body.job_id}</div></div>`;
        }
        await loadStudioJobs();
    } catch (error) {
        result.innerHTML = `<div class="alert alert-danger">${escapeHtml(error.message)}</div>`;
    } finally { button.disabled = false; button.textContent = 'Process'; progress.classList.add('d-none'); progressBar.classList.add('progress-bar-animated'); }
}

function escapeHtml(value) { const div = document.createElement('div'); div.textContent = value; return div.innerHTML; }

async function loadStudioJobs() {
    const target = document.getElementById('studio-jobs');
    try {
        const response = await fetch('/api/jobs'); const body = await response.json();
        target.innerHTML = body.jobs.length ? body.jobs.map(job => `<div class="border-bottom border-secondary py-2"><strong>${escapeHtml(job.operation)}</strong> · ${escapeHtml(new Date(job.created_at).toLocaleString())} · ${job.input_size} → ${job.output_size} bytes</div>`).join('') : 'No processing jobs yet.';
    } catch (_) { target.textContent = 'Job history is temporarily unavailable.'; }
}

function loadToolConfig(toolId) {
    currentToolId = toolId;
    const config = tools[toolId];

    document.getElementById('tool-title').textContent = config.title;
    document.getElementById('tool-desc').textContent  = config.desc;

    const fileInput = document.getElementById('file-input');
    fileInput.accept = config.accept;
    if (config.multiple) {
        fileInput.setAttribute('multiple', 'multiple');
        document.getElementById('dropzone-label').textContent = `Accepts multiple files: ${config.accept}`;
    } else {
        fileInput.removeAttribute('multiple');
        document.getElementById('dropzone-label').textContent = `Accepts a single file: ${config.accept}`;
    }

    document.getElementById('btn-convert').textContent = config.btnText;

    // Show / hide quality slider
    const qualitySection = document.getElementById('quality-section');
    if (config.hasQuality) {
        qualitySection.classList.remove('d-none');
        document.getElementById('quality-slider').value = 80;
        updateQualityLabel(80);
    } else {
        qualitySection.classList.add('d-none');
    }

    resetTool();
    lucide.createIcons();
}

function updateQualityLabel(val) {
    document.getElementById('quality-value').textContent = `${val}%`;
}

// ============================================================
//  DRAG & DROP SETUP (generic tool)
// ============================================================
const dropzone = document.getElementById('dropzone');
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evt => {
    dropzone.addEventListener(evt, e => { e.preventDefault(); e.stopPropagation(); });
});
['dragenter', 'dragover'].forEach(evt => {
    dropzone.addEventListener(evt, () => dropzone.classList.add('dragover'));
});
['dragleave', 'drop'].forEach(evt => {
    dropzone.addEventListener(evt, () => dropzone.classList.remove('dragover'));
});
dropzone.addEventListener('drop', e => {
    processFiles(Array.from(e.dataTransfer.files));
});

function handleFileSelect(input) {
    processFiles(Array.from(input.files));
}

function processFiles(files) {
    const config = tools[currentToolId];
    document.getElementById('error-alert').classList.add('d-none');

    if (!config.multiple && files.length > 1) {
        files = [files[0]];
    }

    selectedFiles = files;
    renderFileList();

    if (selectedFiles.length > 0) {
        document.getElementById('btn-convert').classList.remove('disabled');
        document.getElementById('btn-reset').classList.remove('d-none');
    }
}

function renderFileList() {
    const list = document.getElementById('file-list');
    list.innerHTML = '';

    if (selectedFiles.length > 0) {
        list.classList.remove('d-none');
        selectedFiles.forEach(file => {
            const size = (file.size / 1024 / 1024).toFixed(2);
            list.innerHTML += `
                <li class="list-group-item list-group-item-dark d-flex justify-content-between align-items-center">
                    <span>📄 ${file.name}</span>
                    <span class="badge bg-secondary rounded-pill">${size} MB</span>
                </li>
            `;
        });
    } else {
        list.classList.add('d-none');
    }
}

function resetTool() {
    selectedFiles = [];
    document.getElementById('file-input').value = '';
    renderFileList();
    document.getElementById('btn-convert').classList.add('disabled');
    document.getElementById('btn-reset').classList.add('d-none');
    document.getElementById('error-alert').classList.add('d-none');
    document.getElementById('progress-container').classList.add('d-none');
    document.getElementById('progress-bar').style.width = '0%';
}

// ============================================================
//  API REQUEST LOGIC (generic tool)
// ============================================================
async function startConversion() {
    if (selectedFiles.length === 0) return;

    const config = tools[currentToolId];
    const formData = new FormData();

    if (config.multiple) {
        selectedFiles.forEach(f => formData.append('files', f));
    } else {
        formData.append('file', selectedFiles[0]);
    }

    // Append quality if applicable
    if (config.hasQuality) {
        const quality = parseInt(document.getElementById('quality-slider').value, 10);
        formData.append('quality', quality);
    }

    const btn = document.getElementById('btn-convert');
    btn.classList.add('disabled');
    btn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...`;

    const progressContainer = document.getElementById('progress-container');
    const progressBar       = document.getElementById('progress-bar');
    const progressText      = document.getElementById('progress-text');
    const errorAlert        = document.getElementById('error-alert');

    progressContainer.classList.remove('d-none');
    errorAlert.classList.add('d-none');
    progressBar.style.width = '50%';
    progressText.textContent = 'Uploading and processing on server. Please wait...';

    try {
        const response = await fetch(`${API_BASE_URL}${config.endpoint}`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            let errorMsg = 'An unexpected error occurred.';
            try {
                const errData = await response.json();
                errorMsg = errData.detail || errorMsg;
            } catch (e) {
                errorMsg = `Server returned status ${response.status}`;
            }
            throw new Error(errorMsg);
        }

        progressBar.style.width = '100%';
        progressText.textContent = 'Downloading file...';
        progressText.classList.add('text-success');

        // Determine filename from Content-Disposition if available
        const disposition = response.headers.get('Content-Disposition');
        let filename = config.outName;
        if (disposition) {
            const match = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^;"'\n]+)/i);
            if (match) filename = decodeURIComponent(match[1].replace(/['"]/g, ''));
        }

        const blob = await response.blob();
        const url  = window.URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);

        progressText.textContent = '✅ Success! File downloaded.';
        btn.textContent = 'Done!';

    } catch (error) {
        errorAlert.textContent = `Error: ${error.message}`;
        errorAlert.classList.remove('d-none');
        progressContainer.classList.add('d-none');
        btn.textContent = config.btnText;
        btn.classList.remove('disabled');
    }
}

// ============================================================
//  PDF ARRANGER  –  client-side PDF.js thumbnails + drag-drop
// ============================================================
let arrangeFile      = null;   // the uploaded File object
let arrangeThumbs    = [];     // data URL thumbnails (JPEG, rendered by PDF.js)
let arrangeOrder     = [];     // current page indices (0-indexed)
let dragSrcIndex     = null;

// Configure PDF.js worker from CDN (same version as the lib)
if (window.pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

// Drag & drop on the upload zone
const arrangeDz = document.getElementById('arrange-dropzone');
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evt => {
    arrangeDz.addEventListener(evt, e => { e.preventDefault(); e.stopPropagation(); });
});
['dragenter', 'dragover'].forEach(evt => {
    arrangeDz.addEventListener(evt, () => arrangeDz.classList.add('dragover'));
});
['dragleave', 'drop'].forEach(evt => {
    arrangeDz.addEventListener(evt, () => arrangeDz.classList.remove('dragover'));
});
arrangeDz.addEventListener('drop', e => {
    const files = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
    if (files.length > 0) renderPdfThumbnails(files[0]);
});

function loadPdfForArrange(input) {
    if (!input.files || input.files.length === 0) return;
    renderPdfThumbnails(input.files[0]);
}

async function renderPdfThumbnails(file) {
    arrangeFile = file;
    document.getElementById('arrange-loading').classList.remove('d-none');
    document.getElementById('arrange-error').classList.add('d-none');
    arrangeDz.style.pointerEvents = 'none';

    try {
        if (!window.pdfjsLib) throw new Error('PDF.js library failed to load. Please refresh the page.');

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        arrangeThumbs = [];
        arrangeOrder  = [];

        // Render each page to a canvas and capture as JPEG data URL
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page     = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: 0.5 });

            const canvas    = document.createElement('canvas');
            canvas.width    = viewport.width;
            canvas.height   = viewport.height;
            const ctx = canvas.getContext('2d');

            await page.render({ canvasContext: ctx, viewport }).promise;
            arrangeThumbs.push(canvas.toDataURL('image/jpeg', 0.75));
            arrangeOrder.push(pageNum - 1);   // 0-indexed
        }

        document.getElementById('arrange-page-count').textContent = pdf.numPages;
        renderPageGrid();

        document.getElementById('arrange-upload-step').classList.add('d-none');
        document.getElementById('arrange-pages-step').classList.remove('d-none');
        lucide.createIcons();

    } catch (err) {
        document.getElementById('arrange-error').textContent = `Error: ${err.message}`;
        document.getElementById('arrange-error').classList.remove('d-none');
    } finally {
        document.getElementById('arrange-loading').classList.add('d-none');
        arrangeDz.style.pointerEvents = '';
    }
}

function renderPageGrid() {
    const grid = document.getElementById('page-grid');
    grid.innerHTML = '';

    arrangeOrder.forEach((pageIndex, position) => {
        const thumb = arrangeThumbs[pageIndex]; // full data URL from PDF.js

        const card = document.createElement('div');
        card.className   = 'page-thumb';
        card.draggable   = true;
        card.dataset.pos = position;

        card.innerHTML = `
            <div class="page-thumb-inner">
                <img src="${thumb}" alt="Page ${pageIndex + 1}" draggable="false">
                <span class="page-label">Page ${pageIndex + 1}</span>
                <button class="page-delete-btn" title="Remove this page" onclick="removeArrangePage(${position})">
                    <i data-lucide="x" style="width:12px;height:12px;"></i>
                </button>
            </div>
        `;

        // Drag events for reordering
        card.addEventListener('dragstart', e => {
            dragSrcIndex = position;
            card.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });
        card.addEventListener('dragend', () => {
            card.classList.remove('dragging');
            document.querySelectorAll('.page-thumb').forEach(c => c.classList.remove('drag-over'));
        });
        card.addEventListener('dragover', e => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            document.querySelectorAll('.page-thumb').forEach(c => c.classList.remove('drag-over'));
            card.classList.add('drag-over');
        });
        card.addEventListener('drop', e => {
            e.preventDefault();
            if (dragSrcIndex === null || dragSrcIndex === position) return;
            const moved = arrangeOrder.splice(dragSrcIndex, 1)[0];
            arrangeOrder.splice(position, 0, moved);
            dragSrcIndex = null;
            renderPageGrid();
            lucide.createIcons();
        });

        grid.appendChild(card);
    });

    lucide.createIcons();
}

function removeArrangePage(position) {
    if (arrangeOrder.length <= 1) {
        alert('A PDF must have at least 1 page.');
        return;
    }
    arrangeOrder.splice(position, 1);
    document.getElementById('arrange-page-count').textContent = arrangeOrder.length;
    renderPageGrid();
    lucide.createIcons();
}

function resetArrange() {
    arrangeFile   = null;
    arrangeThumbs = [];
    arrangeOrder  = [];
    document.getElementById('arrange-file-input').value = '';
    document.getElementById('arrange-upload-step').classList.remove('d-none');
    document.getElementById('arrange-pages-step').classList.add('d-none');
    document.getElementById('arrange-error').classList.add('d-none');
    document.getElementById('arrange-error-2').classList.add('d-none');
    document.getElementById('arrange-progress').classList.add('d-none');
    lucide.createIcons();

}

async function applyArrangement() {
    if (!arrangeFile || arrangeOrder.length === 0) return;

    const btn = document.getElementById('arrange-apply-btn');
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Building PDF...`;

    document.getElementById('arrange-progress').classList.remove('d-none');
    document.getElementById('arrange-error-2').classList.add('d-none');

    const formData = new FormData();
    formData.append('file', arrangeFile);
    formData.append('page_order', JSON.stringify(arrangeOrder));

    try {
        const res = await fetch(`${API_BASE_URL}/api/arrange/apply`, {
            method: 'POST',
            body: formData,
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || `Server error ${res.status}`);
        }

        const disposition = res.headers.get('Content-Disposition');
        let filename = 'arranged_document.pdf';
        if (disposition) {
            const match = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^;"'\n]+)/i);
            if (match) filename = decodeURIComponent(match[1].replace(/['"]/g, ''));
        }

        const blob = await res.blob();
        const url  = window.URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);

        btn.innerHTML = `<i data-lucide="check" style="width:14px;height:14px;"></i> Downloaded!`;
        lucide.createIcons();

    } catch (err) {
        document.getElementById('arrange-error-2').textContent = `Error: ${err.message}`;
        document.getElementById('arrange-error-2').classList.remove('d-none');
        btn.innerHTML = `<i data-lucide="download" style="width:14px;height:14px;"></i> Download Arranged PDF`;
        lucide.createIcons();
    } finally {
        btn.disabled = false;
        document.getElementById('arrange-progress').classList.add('d-none');
    }
}

// ============================================================
//  IMAGE RESIZER
// ============================================================
let resizeFile     = null;
let resizeOrigW    = 0;
let resizeOrigH    = 0;
let resizeMode     = 'dims';   // 'dims' | 'pct'

// Drag & drop for resize dropzone
const resizeDz = document.getElementById('resize-dropzone');
['dragenter','dragover','dragleave','drop'].forEach(evt =>
    resizeDz.addEventListener(evt, e => { e.preventDefault(); e.stopPropagation(); })
);
['dragenter','dragover'].forEach(evt =>
    resizeDz.addEventListener(evt, () => resizeDz.classList.add('dragover'))
);
['dragleave','drop'].forEach(evt =>
    resizeDz.addEventListener(evt, () => resizeDz.classList.remove('dragover'))
);
resizeDz.addEventListener('drop', e => {
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) loadResizeFile(files[0]);
});

function onResizeFileSelect(input) {
    if (input.files && input.files.length > 0) loadResizeFile(input.files[0]);
}

function loadResizeFile(file) {
    resizeFile = file;
    const mb   = (file.size / 1024 / 1024).toFixed(2);
    document.getElementById('resize-filename').textContent  = file.name;
    document.getElementById('resize-orig-size').textContent = `${mb} MB`;

    // Use createImageBitmap to get original dimensions without loading into DOM
    const url = URL.createObjectURL(file);
    const img  = new Image();
    img.onload = () => {
        resizeOrigW = img.naturalWidth;
        resizeOrigH = img.naturalHeight;
        URL.revokeObjectURL(url);

        document.getElementById('resize-orig-dims').textContent = `${resizeOrigW} × ${resizeOrigH} px`;
        document.getElementById('resize-width').value  = resizeOrigW;
        document.getElementById('resize-height').value = resizeOrigH;
        document.getElementById('resize-pct-preview').textContent =
            `${resizeOrigW} × ${resizeOrigH} px`;

        document.getElementById('resize-info').classList.remove('d-none');
        document.getElementById('resize-controls').classList.remove('d-none');
        document.getElementById('resize-dropzone').style.display = 'none';
        lucide.createIcons();
    };
    img.src = url;
}

function switchResizeMode(mode) {
    resizeMode = mode;
    document.getElementById('tab-dims').classList.toggle('active', mode === 'dims');
    document.getElementById('tab-pct').classList.toggle('active', mode === 'pct');
    document.getElementById('mode-dims').classList.toggle('d-none', mode !== 'dims');
    document.getElementById('mode-pct').classList.toggle('d-none', mode !== 'pct');
    document.getElementById('resize-error').classList.add('d-none');
}

function onDimsChange(changed) {
    if (!document.getElementById('resize-lock-ar').checked) return;
    if (!resizeOrigW || !resizeOrigH) return;
    const aspect = resizeOrigW / resizeOrigH;
    if (changed === 'w') {
        const w = parseInt(document.getElementById('resize-width').value, 10);
        if (w > 0) document.getElementById('resize-height').value = Math.round(w / aspect);
    } else {
        const h = parseInt(document.getElementById('resize-height').value, 10);
        if (h > 0) document.getElementById('resize-width').value = Math.round(h * aspect);
    }
}

function onPctChange(val) {
    document.getElementById('resize-pct-value').textContent = `${val}%`;
    if (resizeOrigW && resizeOrigH) {
        const scale = val / 100;
        const nw = Math.max(1, Math.round(resizeOrigW * scale));
        const nh = Math.max(1, Math.round(resizeOrigH * scale));
        document.getElementById('resize-pct-preview').textContent = `${nw} × ${nh} px`;
    }
}

function resetResize() {
    resizeFile  = null;
    resizeOrigW = 0;
    resizeOrigH = 0;
    document.getElementById('resize-file-input').value = '';
    document.getElementById('resize-info').classList.add('d-none');
    document.getElementById('resize-controls').classList.add('d-none');
    document.getElementById('resize-error').classList.add('d-none');
    document.getElementById('resize-progress').classList.add('d-none');
    document.getElementById('resize-dropzone').style.display = '';
    document.getElementById('resize-width').value  = '';
    document.getElementById('resize-height').value = '';
    document.getElementById('resize-pct').value    = 100;
    document.getElementById('resize-pct-value').textContent   = '100%';
    document.getElementById('resize-pct-preview').textContent = '—';
    const btn = document.getElementById('resize-btn');
    btn.disabled = false;
    btn.innerHTML = `<i data-lucide="download" style="width:15px;height:15px;"></i> Resize &amp; Download`;
    lucide.createIcons();
}

async function doResize() {
    if (!resizeFile) return;

    const errorEl = document.getElementById('resize-error');
    errorEl.classList.add('d-none');

    const formData = new FormData();
    formData.append('file', resizeFile);

    if (resizeMode === 'pct') {
        const pct = parseInt(document.getElementById('resize-pct').value, 10);
        formData.append('percent', pct);
    } else {
        const w = document.getElementById('resize-width').value;
        const h = document.getElementById('resize-height').value;
        if (!w && !h) {
            errorEl.textContent = 'Please enter at least a width or height.';
            errorEl.classList.remove('d-none');
            return;
        }
        if (w) formData.append('width',  parseInt(w, 10));
        if (h) formData.append('height', parseInt(h, 10));
    }

    const btn = document.getElementById('resize-btn');
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Resizing…`;
    document.getElementById('resize-progress').classList.remove('d-none');

    try {
        const res = await fetch(`${API_BASE_URL}/api/convert/resize-image`, {
            method: 'POST',
            body: formData,
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || `Server error ${res.status}`);
        }

        const disposition = res.headers.get('Content-Disposition');
        let filename = 'resized_image.jpg';
        if (disposition) {
            const match = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^;"'\n]+)/i);
            if (match) filename = decodeURIComponent(match[1].replace(/['"]/g, ''));
        }

        const blob = await res.blob();
        const url  = window.URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);

        btn.innerHTML = `<i data-lucide="check" style="width:15px;height:15px;"></i> Downloaded!`;
        lucide.createIcons();

    } catch (err) {
        errorEl.textContent = `Error: ${err.message}`;
        errorEl.classList.remove('d-none');
        btn.innerHTML = `<i data-lucide="download" style="width:15px;height:15px;"></i> Resize &amp; Download`;
        lucide.createIcons();
    } finally {
        btn.disabled = false;
        document.getElementById('resize-progress').classList.add('d-none');
    }
}

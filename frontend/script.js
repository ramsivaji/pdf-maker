// Initialize Lucide icons
lucide.createIcons();

// Since frontend is now served by FastAPI directly, API calls are relative
const API_BASE_URL = "";

// Tool Configurations
const tools = {
    'pdf-to-word': {
        title: 'PDF to Word',
        desc: 'Convert any PDF document into an editable Microsoft Word (.docx) file.',
        endpoint: '/api/convert/pdf-to-word',
        accept: '.pdf',
        multiple: false,
        btnText: 'Convert to Word',
        outName: 'converted_document.docx'
    },

    'merge-pdfs': {
        title: 'Merge PDFs',
        desc: 'Combine multiple PDF files into one single document. Upload 2 to 20 PDF files.',
        endpoint: '/api/convert/merge-pdfs',
        accept: '.pdf',
        multiple: true,
        btnText: 'Merge PDFs',
        outName: 'merged_document.pdf'
    },
    'image-to-pdf': {
        title: 'Image to PDF',
        desc: 'Convert one or multiple images (JPG, PNG, WebP) into a single PDF document.',
        endpoint: '/api/convert/image-to-pdf',
        accept: '.jpg,.jpeg,.png,.webp,.bmp,.tiff',
        multiple: true,
        btnText: 'Convert to PDF',
        outName: 'converted_images.pdf'
    }
};

let currentToolId = null;
let selectedFiles = [];

// --- Routing / UI Toggles ---
function showSection(sectionId) {
    document.getElementById('sec-home').className = 'section-hidden';
    document.getElementById('sec-tool').className = 'section-hidden';

    if (sectionId === 'home') {
        document.getElementById('sec-home').className = 'section-active';
        currentToolId = null;
    } else {
        document.getElementById('sec-tool').className = 'section-active max-w-800 mx-auto';
        loadToolConfig(sectionId);
    }
}

function loadToolConfig(toolId) {
    currentToolId = toolId;
    const config = tools[toolId];

    document.getElementById('tool-title').textContent = config.title;
    document.getElementById('tool-desc').textContent = config.desc;

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
    resetTool();
}

// --- Drag & Drop Setup ---
const dropzone = document.getElementById('dropzone');
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evt => {
    dropzone.addEventListener(evt, e => {
        e.preventDefault();
        e.stopPropagation();
    });
});

['dragenter', 'dragover'].forEach(evt => {
    dropzone.addEventListener(evt, () => dropzone.classList.add('dragover'));
});

['dragleave', 'drop'].forEach(evt => {
    dropzone.addEventListener(evt, () => dropzone.classList.remove('dragover'));
});

dropzone.addEventListener('drop', e => {
    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
});

function handleFileSelect(input) {
    const files = Array.from(input.files);
    processFiles(files);
}

function processFiles(files) {
    const config = tools[currentToolId];
    document.getElementById('error-alert').classList.add('d-none');

    if (!config.multiple && files.length > 1) {
        files = [files[0]]; // force single file
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

// --- API Request Logic (Replaces Axios) ---
async function startConversion() {
    if (selectedFiles.length === 0) return;

    const config = tools[currentToolId];
    const formData = new FormData();

    if (config.multiple) {
        selectedFiles.forEach(f => formData.append('files', f));
    } else {
        formData.append('file', selectedFiles[0]);
    }

    const btn = document.getElementById('btn-convert');
    btn.classList.add('disabled');
    btn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...`;

    const progressContainer = document.getElementById('progress-container');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    const errorAlert = document.getElementById('error-alert');

    progressContainer.classList.remove('d-none');
    errorAlert.classList.add('d-none');
    progressBar.style.width = '50%';
    progressText.textContent = 'Uploading and processing on server. Please wait...';

    try {
        const response = await fetch(`${API_BASE_URL}${config.endpoint}`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            let errorMsg = "An unexpected error occurred.";
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

        // Handle Download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = config.outName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);

        progressText.textContent = 'Success! File downloaded.';
        btn.textContent = 'Finished';

    } catch (error) {
        errorAlert.textContent = `Error: ${error.message}`;
        errorAlert.classList.remove('d-none');
        progressContainer.classList.add('d-none');
        btn.textContent = config.btnText;
        btn.classList.remove('disabled');
    }
}

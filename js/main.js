
function setupUploader(dropZoneId, inputId, imgId, contentId) {
    const dropZone = document.getElementById(dropZoneId);
    const input = document.getElementById(inputId);
    const img = document.getElementById(imgId);
    const content = document.getElementById(contentId);

    const showPreview = (file) => {
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                img.src = e.target.result;
                img.style.display = 'block';
                content.style.display = 'none';
            };
            reader.readAsDataURL(file);
        }
    };

    dropZone.addEventListener('click', () => input.click());
    input.addEventListener('change', (e) => { showPreview(e.target.files[0]); });

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => { e.preventDefault(); e.stopPropagation(); }, false);
    });
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => { dropZone.classList.add('drag-over'); }, false);
    });
    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => { dropZone.classList.remove('drag-over'); }, false);
    });
    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        if (dt.files.length > 0) {
            input.files = dt.files;
            showPreview(dt.files[0]);
        }
    }, false);
}

setupUploader('drop-zone-original', 'file-original', 'preview-original', 'content-original');
setupUploader('drop-zone-reference', 'file-reference', 'preview-reference', 'content-reference');



async function parseCubeData(cubeText, is4D = false) {
    const lines = cubeText.split('\n');
    let idx_x = [], idx_y = [], idx_z = [], val_x = [], val_y = [], val_z = [], colors = [];
    let size = 33;
    

    const sampleStep = is4D ? 2 : 1; 
    let dataCount = 0;

    for (let line of lines) {
        if (line.startsWith('LUT_3D_SIZE')) {
            size = parseInt(line.split(' ')[1]);
            continue;
        }
        line = line.trim();
        if (!line || isNaN(line[0]) || line.startsWith('#')) continue;
        
        const parts = line.split(/\s+/);
        if (parts.length === 3) {
            if (dataCount % sampleStep === 0) {
                const r = parseFloat(parts[0]), g = parseFloat(parts[1]), b = parseFloat(parts[2]);
                const r_idx = (dataCount % size) / (size - 1);
                const g_idx = (Math.floor(dataCount / size) % size) / (size - 1);
                const b_idx = (Math.floor(dataCount / (size * size))) / (size - 1);

                idx_x.push(r_idx); idx_y.push(g_idx); idx_z.push(b_idx);
                val_x.push(r); val_y.push(g); val_z.push(b);
                colors.push(`rgb(${Math.round(r*255)}, ${Math.round(g*255)}, ${Math.round(b*255)})`);
            }
            dataCount++;
        }
    }
    return { idx: {x:idx_x, y:idx_y, z:idx_z}, val: {x:val_x, y:val_y, z:val_z}, colors };
}

function drawPlot(elementId, x, y, z, colors, isSmall = false) {
    const layout = {
        margin: {l:0, r:0, b:0, t:0},
        autosize: true, 
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        scene: {
            xaxis: { visible: !isSmall, showgrid: true, gridcolor: '#eee', zeroline: false, showticklabels: false, title: '' },
            yaxis: { visible: !isSmall, showgrid: true, gridcolor: '#eee', zeroline: false, showticklabels: false, title: '' },
            zaxis: { visible: !isSmall, showgrid: true, gridcolor: '#eee', zeroline: false, showticklabels: false, title: '' },
            aspectmode: 'cube',
            camera: { eye: {x: 1.5, y: 1.5, z: 1.5} }
        },
        showlegend: false
    };
    
    Plotly.newPlot(elementId, [{
        type: 'scatter3d',
        mode: 'markers',
        x: x, y: y, z: z,
        marker: { size: isSmall ? 1.5 : 2, color: colors, opacity: 1.0, line: {width: 0} }
    }], layout, {displayModeBar: false, responsive: true}); 
}


async function handleVisualization(data) {
    const sWrapper = document.getElementById('structure-wrapper');
    const dWrapper = document.getElementById('distribution-wrapper');
    const cmSection = document.getElementById('context-maps-section');
    const cmGrid = document.getElementById('context-maps-grid');
    const resultSec = document.getElementById('result-section');

    resultSec.style.display = 'block';

    if (data.mode === "4d" && Array.isArray(data.cube_data)) {

        sWrapper.className = 'grid-4d';
        dWrapper.className = 'grid-4d';


        let sHtml = '';
        let dHtml = '';
        for (let i = 0; i < data.cube_data.length; i++) {
            sHtml += `<div id="s-bin-${i}" class="bin-plot-container"><span class="bin-tag">Bin ${i}</span></div>`;
            dHtml += `<div id="d-bin-${i}" class="bin-plot-container"><span class="bin-tag">Bin ${i}</span></div>`;
        }

        sWrapper.innerHTML = sHtml;
        dWrapper.innerHTML = dHtml;


        for (let i = 0; i < data.cube_data.length; i++) {
            const plotData = await parseCubeData(data.cube_data[i], true);
            drawPlot(`s-bin-${i}`, plotData.idx.x, plotData.idx.y, plotData.idx.z, plotData.colors, true);
            drawPlot(`d-bin-${i}`, plotData.val.x, plotData.val.y, plotData.val.z, plotData.colors, true);
        }


        if (data.context_maps && data.context_maps.length > 0) {
            cmSection.style.display = 'block';
            let cmHtml = '';
            data.context_maps.forEach((mapBase64, index) => {
                cmHtml += `
                    <div class="cm-item">
                        <img src="${mapBase64}" alt="Bin ${index}">
                        <div class="cm-label">Bin ${index}</div>
                    </div>
                `;
            });
            cmGrid.innerHTML = cmHtml;
        } else {
            cmSection.style.display = 'none';
        }

    } else {

        sWrapper.className = '';
        dWrapper.className = '';
        

        sWrapper.innerHTML = '<div id="lut-plot-index" style="width: 100%; height: 100%;"></div>';
        dWrapper.innerHTML = '<div id="lut-plot-value" style="width: 100%; height: 100%;"></div>';
        cmSection.style.display = 'none';

        const plotData = await parseCubeData(data.cube_data, false);
        drawPlot('lut-plot-index', plotData.idx.x, plotData.idx.y, plotData.idx.z, plotData.colors, false);
        drawPlot('lut-plot-value', plotData.val.x, plotData.val.y, plotData.val.z, plotData.colors, false);
    }
}

async function startGeneration() {
    var btn = document.getElementById('generate-btn');
    var downloadBtn = document.getElementById('download-lut');
    var resultSec = document.getElementById('result-section');
    
    var originalInput = document.getElementById('file-original');
    var refInput = document.getElementById('file-reference');


    var fileOriginal = originalInput.files[0];
    var fileReference = refInput.files[0];

    if(!fileOriginal || !fileReference) {
        alert('Please upload both Original and Reference images!');
        return;
    }


    btn.disabled = true;
    btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Processing AI LUT...';
    downloadBtn.classList.add('is-disabled');


    var formData = new FormData();
    formData.append('file_original', fileOriginal);
    formData.append('file_reference', fileReference);

    var selectedMode = document.querySelector('input[name="lut_mode"]:checked').value;
    formData.append('mode', selectedMode);

    try {

        const response = await fetch('https://balladic-georgine-tumultuously.ngrok-free.dev/api/generate', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error("Server error");
        const data = await response.json();


        const imgAfterEl = document.getElementById('img-after');
        const imgBeforeEl = document.getElementById('img-before');

        const beforeDataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsDataURL(fileOriginal);
        });

        imgAfterEl.src = data.stylized_image;
        imgBeforeEl.src = beforeDataUrl;

        await Promise.all([
            waitForImage(imgAfterEl),
            waitForImage(imgBeforeEl)
        ]);

        sliderRatio = 0.5;
        syncComparisonLayout();


        if (data.mode === "4d" && Array.isArray(data.cube_data)) {

            const zip = new JSZip();
            

            data.cube_data.forEach((cubeStr, index) => {
                zip.file(`Davinci4D_bin_${index}.cube`, cubeStr);
            });
            

            zip.generateAsync({ type: "blob" }).then(function(content) {
                downloadBtn.href = URL.createObjectURL(content);
                downloadBtn.download = "Davinci4D_LUTs.zip"; 
                downloadBtn.classList.remove('is-disabled');
            });
        } else {

            const blob = new Blob([data.cube_data], { type: 'text/plain' });
            downloadBtn.href = URL.createObjectURL(blob);
            downloadBtn.download = "Davinci3D.cube";
            downloadBtn.classList.remove('is-disabled');
        }


        await handleVisualization(data);
        

    } catch (error) {
        console.error("API 调用失败:", error);
        alert("Failed to connect to AI server. Please check if the backend is running.");
    } finally {
        // 恢复按钮
        btn.disabled = false;
        btn.innerHTML = 'Generate Again';
    }
}


var container = document.getElementById('comparison-container');
var overlay = document.getElementById('img-overlay');
var handle = document.getElementById('slider-handle');
var beforeImg = document.getElementById('img-before');
var afterImg = document.getElementById('img-after');
var isDown = false;
var sliderRatio = 0.5;

function syncComparisonLayout() {
    if (!container || !overlay || !handle || !beforeImg) return;

    var rect = container.getBoundingClientRect();
    if (!rect.width || !rect.height) return;


    beforeImg.style.width = rect.width + 'px';
    beforeImg.style.height = rect.height + 'px';


    var x = rect.width * sliderRatio;
    overlay.style.width = x + 'px';
    handle.style.left = x + 'px';
}

function waitForImage(img) {
    return new Promise((resolve) => {
        if (img.complete && img.naturalWidth > 0) {
            resolve();
            return;
        }
        img.addEventListener('load', resolve, { once: true });
    });
}

window.addEventListener('resize', syncComparisonLayout);

handle.addEventListener('mousedown', function() { isDown = true; });
handle.addEventListener('touchstart', function() { isDown = true; });
window.addEventListener('mouseup', function() { isDown = false; });
window.addEventListener('touchend', function() { isDown = false; });
container.addEventListener('mousemove', handleMove);
container.addEventListener('touchmove', handleMove);


function handleMove(e) {
    if (!isDown) return;

    var rect = container.getBoundingClientRect();
    var clientX = e.clientX || (e.touches && e.touches[0].clientX);
    var x = clientX - rect.left;

    if (x < 0) x = 0;
    if (x > rect.width) x = rect.width;

    sliderRatio = rect.width ? (x / rect.width) : 0.5;
    syncComparisonLayout();
}



document.addEventListener('DOMContentLoaded', function() {

    const radios = document.querySelectorAll('input[name="lut_mode"]');

    const generateBtn = document.getElementById('generate-btn');
    const downloadBtn = document.getElementById('download-lut');

    const text3D_gen = 'Generate 3DLUT';
    const text3D_down = 'Download 3DLUT .CUBE';
    
    const text4D_gen = 'Run 4DLUT Grading';
    const text4D_down = 'Download 4DLUT Bins';


    radios.forEach(radio => {
        radio.addEventListener('change', function() {
            
            downloadBtn.classList.add('is-disabled');

            if (this.value === '4d') {

                generateBtn.innerHTML = text4D_gen;
                downloadBtn.innerHTML = text4D_down;
            } else {

                generateBtn.innerHTML = text3D_gen;
                downloadBtn.innerHTML = text3D_down;
            }
        });
    });
});


async function setSample(type, url) {

    const previewId = type === 'original' ? 'preview-original' : 'preview-reference';
    const contentId = type === 'original' ? 'content-original' : 'content-reference';
    const inputId = type === 'original' ? 'file-original' : 'file-reference';

    const preview = document.getElementById(previewId);
    const content = document.getElementById(contentId);
    const input = document.getElementById(inputId);


    preview.src = url;
    preview.style.display = 'block';
    content.style.display = 'none';

    try {
        const response = await fetch(url);
        const blob = await response.blob();
        

        const filename = url.substring(url.lastIndexOf('/') + 1);

        const file = new File([blob], filename, { type: blob.type });

        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        input.files = dataTransfer.files;
        
        console.log(`✅ success [${filename}] injected into ${type} upload box`);
    } catch (error) {
        console.error('Failed to convert sample image:', error);
    }
}



function renderPresets() {
    const contentContainer = document.getElementById('content-filmstrip');
    const styleContainer = document.getElementById('style-filmstrip');

    if (!contentContainer || !styleContainer) return;

    fetch('src/preset/presets.json')
        .then(response => {
            if (!response.ok) throw new Error('Presets JSON not found. Did you run the python script?');
            return response.json();
        })
        .then(presetConfig => {
    
            presetConfig.content.forEach((filename, index) => {
                const img = document.createElement('img');
                img.src = `src/preset/content/${filename}`;
                img.className = 'film-thumb';
                img.title = `Content Sample ${index + 1}`;
    
                img.onclick = function() { setSample('original', this.src); };
                contentContainer.appendChild(img);
            });


            presetConfig.style.forEach((filename, index) => {
                const img = document.createElement('img');
                img.src = `src/preset/style/${filename}`;
                img.className = 'film-thumb';
                img.title = `Style Sample ${index + 1}`;

                img.onclick = function() { setSample('reference', this.src); };
                styleContainer.appendChild(img);
            });
        })
        .catch(error => {
            console.error('Error loading presets:', error);
            console.log("make sure you have already run python scripts/build_presets.py");
        });
}


document.addEventListener('DOMContentLoaded', renderPresets);
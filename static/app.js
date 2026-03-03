// Configuration de l'application
const API_BASE_URL = '/api';
const GOOGLE_API_KEY = 'AIzaSyBAwNInPyqUO8U28dAPPxlWZUGGzJxBtkM';

// État global
let excelData = null;
let excelFile = null;
let stopProcessing = false;
let accessToken = null;

// Initialisation
document.addEventListener('DOMContentLoaded', async () => {
    log('🚀 Initialisation de l\'application...', 'info');
    await initializeAuth();
    setupEventListeners();
});

// AUTHENTIFICATION
async function initializeAuth() {
    try {
        log('🔐 Connexion à Microsoft Graph API...', 'info');
        
        const response = await fetch(`${API_BASE_URL}/auth`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.token) {
            accessToken = data.token;
            document.getElementById('userInfo').textContent = `✓ Connecté : ${data.user.email}`;
            log('✅ Authentification réussie', 'success');
        } else {
            throw new Error(data.error || 'Authentification échouée');
        }
    } catch (error) {
        log(`❌ Erreur d'authentification : ${error.message}`, 'error');
        document.getElementById('userInfo').textContent = '✗ Non connecté';
        alert('Erreur d\'authentification : ' + error.message);
    }
}

// EXTRACTION DU CHEMIN DEPUIS URL ONEDRIVE
function extractFolderPath(input) {
    input = input.trim();
    
    // Si c'est déjà un chemin simple, le retourner tel quel
    if (!input.includes('http') && !input.includes('sharepoint')) {
        return input;
    }
    
    // Si c'est une URL OneDrive, extraire le chemin
    try {
        // Exemple d'URL OneDrive:
        // https://walterre-my.sharepoint.com/personal/maxence_walterre_fr/Documents/Projets
        // ou https://walterre.sharepoint.com/Shared%20Documents/Projets
        
        const url = new URL(input);
        const pathname = decodeURIComponent(url.pathname);
        
        // Extraire la partie après /Documents/ ou /Shared Documents/
        let folderPath = '';
        
        if (pathname.includes('/Documents/')) {
            folderPath = 'Documents' + pathname.split('/Documents')[1];
        } else if (pathname.includes('/Shared%20Documents/') || pathname.includes('/Shared Documents/')) {
            folderPath = 'Shared Documents' + pathname.split('/Shared')[1].replace('%20Documents', ' Documents');
        } else {
            // Essayer d'extraire le dernier segment significatif
            const segments = pathname.split('/').filter(s => s && !s.includes('sharepoint') && !s.includes('personal'));
            folderPath = segments.join('/');
        }
        
        return folderPath || 'Documents';
        
    } catch (error) {
        log(`⚠️ Impossible d'analyser l'URL, utilisation de "Documents" par défaut`, 'warning');
        return 'Documents';
    }
}

// ÉVÉNEMENTS
function setupEventListeners() {
    const uploadZone = document.getElementById('uploadZone');
    const excelFileInput = document.getElementById('excelFile');
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');

    uploadZone.addEventListener('click', () => excelFileInput.click());
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('dragover');
    });
    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('dragover');
    });
    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    });
    excelFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
        }
    });
    startBtn.addEventListener('click', startProcessing);
    stopBtn.addEventListener('click', () => {
        stopProcessing = true;
        log('⏹️ Arrêt demandé', 'warning');
        stopBtn.disabled = true;
    });
}

// GESTION FICHIER EXCEL
async function handleFileSelect(file) {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
        alert('Veuillez sélectionner un fichier Excel');
        return;
    }

    try {
        log(`📂 Chargement du fichier : ${file.name}`, 'info');
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                excelData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                excelFile = file;
                
                const headers = excelData[0];
                const addrIndex = headers.findIndex(h => 
                    h && h.toString().toLowerCase().includes('adresse')
                );
                
                if (addrIndex === -1) {
                    throw new Error('Colonne "Adresse" non trouvée');
                }
                
                document.getElementById('uploadZone').classList.add('active');
                document.getElementById('fileInfo').classList.add('show');
                document.getElementById('fileName').textContent = file.name;
                document.getElementById('fileSize').textContent = 
                    `${excelData.length - 1} lignes • ${(file.size / 1024).toFixed(2)} KB`;
                document.getElementById('startBtn').disabled = false;
                
                log(`✅ Fichier chargé : ${excelData.length - 1} lignes`, 'success');
                
            } catch (error) {
                log(`❌ Erreur : ${error.message}`, 'error');
                alert(`Erreur : ${error.message}`);
            }
        };
        
        reader.readAsArrayBuffer(file);
        
    } catch (error) {
        log(`❌ Erreur : ${error.message}`, 'error');
        alert(`Erreur : ${error.message}`);
    }
}

// TRAITEMENT PRINCIPAL
async function startProcessing() {
    if (!excelData || !accessToken) {
        alert('Fichier ou authentification manquant');
        return;
    }

    const targetFolderInput = document.getElementById('targetFolder').value.trim();
    if (!targetFolderInput) {
        alert('Veuillez spécifier un dossier OneDrive');
        return;
    }

    // Extraire le chemin depuis l'URL ou utiliser tel quel
    const targetFolder = extractFolderPath(targetFolderInput);
    log(`📁 Chemin extrait : ${targetFolder}`, 'info');

    document.getElementById('startBtn').style.display = 'none';
    document.getElementById('stopBtn').style.display = 'inline-flex';
    document.getElementById('stopBtn').disabled = false;
    document.getElementById('progressSection').classList.add('active');
    document.getElementById('logConsole').innerHTML = '';
    document.getElementById('resultSection').classList.remove('active');
    stopProcessing = false;

    const imageSize = parseInt(document.getElementById('imageSize').value);
    const zoom = parseInt(document.getElementById('zoomLevel').value);
    const mapType = document.getElementById('mapType').value;

    const headers = excelData[0];
    const addrIndex = headers.findIndex(h => 
        h && h.toString().toLowerCase().includes('adresse')
    );

    const enrichedData = [
        [...headers, 'Longitude', 'Latitude', 'URL Photo']
    ];

    const totalRows = excelData.length - 1;
    let geoCount = 0;
    let photoCount = 0;
    let errorCount = 0;

    document.getElementById('statTotal').textContent = totalRows;
    updateStats(0, 0, 0);

    log('\n🚀 Démarrage du traitement...', 'info');
    log(`📁 Dossier cible : ${targetFolder}`, 'info');

    const today = new Date().toISOString().split('T')[0];
    const photosFolderName = `photos_${today}`;

    try {
        // Création du dossier photos
        log(`\n📁 Création du dossier ${photosFolderName}...`, 'info');
        
        const createFolderResponse = await fetch(`${API_BASE_URL}/create-folder`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                targetFolder: targetFolder,
                folderName: photosFolderName
            })
        });

        const folderResult = await createFolderResponse.json();
        
        if (!folderResult.success) {
            throw new Error(folderResult.error || 'Erreur création dossier');
        }

        log(`✅ Dossier créé`, 'success');

        // Traitement de chaque ligne
        for (let i = 1; i < excelData.length; i++) {
            if (stopProcessing) {
                log('\n⏹️ Traitement arrêté', 'warning');
                break;
            }

            const row = excelData[i];
            const address = row[addrIndex];

            log(`\n[${i}/${totalRows}] 🔍 ${address || 'Adresse vide'}`, 'info');

            if (!address || address.toString().trim() === '') {
                enrichedData.push([...row, '', '', 'Non géolocalisé']);
                errorCount++;
                updateStats(geoCount, photoCount, errorCount);
                updateProgress(i, totalRows);
                continue;
            }

            try {
                const processResponse = await fetch(`${API_BASE_URL}/process-location`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${accessToken}`
                    },
                    body: JSON.stringify({
                        address: address.toString(),
                        imageSize: imageSize,
                        zoom: zoom,
                        mapType: mapType,
                        targetFolder: targetFolder,
                        photosFolderName: photosFolderName,
                        googleApiKey: GOOGLE_API_KEY
                    })
                });

                const result = await processResponse.json();

                if (result.success) {
                    geoCount++;
                    log(`  ✓ Géolocalisée`, 'success');

                    if (result.photoUrl) {
                        photoCount++;
                        log(`  ✓ Photo uploadée`, 'success');
                        enrichedData.push([
                            ...row,
                            result.longitude,
                            result.latitude,
                            result.photoUrl
                        ]);
                    } else {
                        enrichedData.push([
                            ...row,
                            result.longitude,
                            result.latitude,
                            'Photo non disponible'
                        ]);
                        errorCount++;
                    }
                } else {
                    log(`  ❌ ${result.error}`, 'error');
                    enrichedData.push([...row, '', '', result.error || 'Erreur']);
                    errorCount++;
                }

            } catch (error) {
                log(`  ❌ ${error.message}`, 'error');
                enrichedData.push([...row, '', '', 'Erreur']);
                errorCount++;
            }

            updateStats(geoCount, photoCount, errorCount);
            updateProgress(i, totalRows);
            await sleep(500);
        }

        // Génération Excel enrichi
        log('\n💾 Génération Excel enrichi...', 'info');

        const newWorkbook = XLSX.utils.book_new();
        const newWorksheet = XLSX.utils.aoa_to_sheet(enrichedData);
        XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, 'Données enrichies');

        const excelBlob = workbookToBlob(newWorkbook);
        const excelBase64 = await blobToBase64(excelBlob);

        log('☁️ Upload Excel sur OneDrive...', 'info');

        const excelFileName = `donnees_enrichies_${today}.xlsx`;
        const uploadExcelResponse = await fetch(`${API_BASE_URL}/upload-excel`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                targetFolder: targetFolder,
                fileName: excelFileName,
                fileData: excelBase64
            })
        });

        const uploadResult = await uploadExcelResponse.json();

        if (uploadResult.success) {
            log(`✅ Excel uploadé`, 'success');
            showResults(uploadResult.fileUrl, folderResult.folderUrl, geoCount, photoCount, errorCount);
        } else {
            throw new Error(uploadResult.error || 'Erreur upload Excel');
        }

    } catch (error) {
        log(`\n❌ Erreur : ${error.message}`, 'error');
        alert(`Erreur : ${error.message}`);
    } finally {
        document.getElementById('stopBtn').style.display = 'none';
        document.getElementById('startBtn').style.display = 'inline-flex';
        document.getElementById('startBtn').disabled = false;
    }
}

// FONCTIONS UTILITAIRES
function updateStats(geo, photos, errors) {
    document.getElementById('statGeo').textContent = geo;
    document.getElementById('statPhotos').textContent = photos;
    document.getElementById('statErrors').textContent = errors;
}

function updateProgress(current, total) {
    const percent = Math.round((current / total) * 100);
    document.getElementById('progressBar').style.width = `${percent}%`;
    document.getElementById('progressBar').textContent = `${percent}%`;
    document.getElementById('progressText').textContent = 
        `Traitement : ${current} / ${total} (${percent}%)`;
}

function log(message, level = 'info') {
    const logConsole = document.getElementById('logConsole');
    const entry = document.createElement('div');
    entry.className = `log-entry log-${level}`;
    const timestamp = new Date().toLocaleTimeString();
    entry.textContent = `[${timestamp}] ${message}`;
    logConsole.appendChild(entry);
    logConsole.scrollTop = logConsole.scrollHeight;
}

function showResults(excelUrl, photosUrl, geo, photos, errors) {
    log('\n✅ TRAITEMENT TERMINÉ !', 'success');
    log(`📊 Géolocalisées : ${geo}`, 'success');
    log(`📷 Photos : ${photos}`, 'success');
    log(`❌ Erreurs : ${errors}`, 'error');

    const resultLinks = document.getElementById('resultLinks');
    resultLinks.innerHTML = `
        <a href="${excelUrl}" target="_blank" class="result-link">
            📊 Ouvrir le fichier Excel enrichi
        </a>
        <a href="${photosUrl}" target="_blank" class="result-link">
            📁 Ouvrir le dossier des photos
        </a>
    `;
    document.getElementById('resultSection').classList.add('active');
}

function workbookToBlob(workbook) {
    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

async function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = async function (context, req) {
    if (req.method === 'OPTIONS') {
        context.res = {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            },
            body: ''
        };
        return;
    }

    try {
        const { targetFolder, folderName } = req.body;
        const authHeader = req.headers.authorization;
        
        if (!authHeader) {
            throw new Error('Token manquant');
        }
        
        const token = authHeader.replace('Bearer ', '');
        
        // Créer le dossier sur OneDrive
        const createFolderUrl = `https://graph.microsoft.com/v1.0/me/drive/root:/${targetFolder}/${folderName}`;
        
        const response = await fetch(createFolderUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                folder: {},
                '@microsoft.graph.conflictBehavior': 'replace'
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Erreur création dossier');
        }
        
        const folderData = await response.json();
        
        context.res = {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: true,
                folderUrl: folderData.webUrl,
                folderId: folderData.id
            })
        };
        
    } catch (error) {
        context.log.error('Erreur create-folder:', error);
        context.res = {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: false,
                error: error.message
            })
        };
    }
};

module.exports = async function (context, req) {
    context.log('API Auth appelée');
    
    if (req.method === 'OPTIONS') {
        context.res = {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            },
            body: ''
        };
        return;
    }

    try {
        const clientId = process.env.AZURE_CLIENT_ID;
        const clientSecret = process.env.AZURE_CLIENT_SECRET;
        const tenantId = process.env.AZURE_TENANT_ID;

        if (!clientId || !clientSecret || !tenantId) {
            throw new Error('Variables manquantes');
        }

        const tokenEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
        
        const params = new URLSearchParams();
        params.append('client_id', clientId);
        params.append('client_secret', clientSecret);
        params.append('scope', 'https://graph.microsoft.com/.default');
        params.append('grant_type', 'client_credentials');

        const tokenResponse = await fetch(tokenEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString()
        });

        const tokenData = await tokenResponse.json();

        if (tokenData.access_token) {
            context.res = {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: true,
                    token: tokenData.access_token,
                    user: {
                        email: 'maxence@walterre.fr',
                        name: 'Maxence de Langautier'
                    }
                })
            };
        } else {
            throw new Error(tokenData.error_description || 'Auth failed');
        }
    } catch (error) {
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

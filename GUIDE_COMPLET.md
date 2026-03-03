# GUIDE COMPLET AZURE - Walterre Géolocalisation

## RÉSUMÉ RAPIDE

Créer une application web hébergée sur Azure qui :
- Géolocalise automatiquement des adresses Excel
- Télécharge photos satellites Google Maps  
- Upload tout sur OneDrive automatiquement
- Génère Excel enrichi avec liens hypertextes

## ARCHITECTURE

Frontend (HTML/JS) → Azure Functions (Python) → OneDrive + Google APIs

## CODE NÉCESSAIRE

Tous les fichiers sont fournis dans ce dossier.
Structure :

azure-app/
├── static/
│   ├── index.html (interface web fournie)
│   └── app.js (JavaScript fourni)
├── api/ (4 Azure Functions Python)
│   ├── auth/ → Authentification
│   ├── create-folder/ → Créer dossier OneDrive
│   ├── process-location/ → Géolocaliser + Photo + Upload
│   └── upload-excel/ → Upload Excel enrichi

## DÉPLOIEMENT SIMPLIFIÉ

1. Créer App Registration Azure AD
2. Créer Azure Static Web App
3. Configurer variables d'environnement
4. Déployer avec : swa deploy

Détails complets dans les sections suivantes.

---

# PARTIE 1 : CONFIGURATION AZURE AD

## Étape 1.1 : Créer App Registration

Portal Azure → Azure AD → App registrations → New registration

Nom : Walterre-Geo-App
Redirect URI : https://VOTRE-APP.azurewebsites.net/auth/callback

Notez :
- Client ID
- Tenant ID

## Étape 1.2 : Client Secret

Dans l'app → Certificates & secrets → New client secret
Copiez immédiatement la valeur

## Étape 1.3 : Permissions API

API permissions → Add permission → Microsoft Graph → Delegated
Sélectionnez :
- User.Read
- Files.ReadWrite
- Sites.ReadWrite.All

Grant admin consent

---

# PARTIE 2 : AZURE STATIC WEB APP

Portal Azure → Create resource → Static Web Apps

Name : walterre-geolocalisation
Plan : Free
Region : West Europe
Source : Other

Notez l'URL : https://walterre-geolocalisation.azurewebsites.net

Obtenez le deployment token : Overview → Manage deployment token

---

# PARTIE 3 : VARIABLES D'ENVIRONNEMENT

Configuration → Application settings → Ajouter :

AZURE_CLIENT_ID = [votre client ID]
AZURE_CLIENT_SECRET = [votre secret]
AZURE_TENANT_ID = [votre tenant ID]
GOOGLE_API_KEY = AIzaSyBAwNInPyqUO8U28dAPPxlWZUGGzJxBtkM
REDIRECT_URI = https://walterre-geolocalisation.azurewebsites.net/auth/callback

---

# PARTIE 4 : DÉPLOIEMENT

Terminal :

```bash
cd ~/walterre-geo-app
npm install -g @azure/static-web-apps-cli
az login
swa deploy --app-location "static" --api-location "api" --deployment-token "VOTRE_TOKEN"
```

Attendez 2-3 minutes.

Ouvrez : https://walterre-geolocalisation.azurewebsites.net

Terminé !

---

# UTILISATION

1. Ouvrez l'URL
2. Uploadez votre Excel
3. Choisissez dossier OneDrive (ex: Documents)
4. Cliquez Démarrer
5. Attendez (2s par ligne)
6. Récupérez les liens OneDrive

Excel enrichi contient : Longitude, Latitude, URL Photo (hyperlien cliquable)

---

# COÛTS

Gratuit avec plan Free jusqu'à :
- 100 Go bande passante/mois
- 0.5 Go stockage
- 2 domaines personnalisés

Largement suffisant pour votre usage.

---

# SUPPORT

En cas de problème :
1. Vérifiez les logs dans Azure Portal
2. Testez avec 5 lignes d'abord
3. Vérifiez les permissions API
4. Vérifiez le quota Google (25k/jour)

C'est tout ! Vous avez maintenant une app web professionnelle hébergée 24/7.

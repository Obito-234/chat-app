# React Firebase Real-Time Chat App

## Setup Instructions

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Firebase Setup:**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project and add a web app
   - Enable **Authentication** (Google sign-in)
   - Enable **Cloud Firestore**
   - Copy your Firebase config and paste it in `src/firebase.js`:
     ```js
     const firebaseConfig = {
       apiKey: "YOUR_API_KEY",
       authDomain: "YOUR_AUTH_DOMAIN",
       projectId: "YOUR_PROJECT_ID",
       storageBucket: "YOUR_STORAGE_BUCKET",
       messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
       appId: "YOUR_APP_ID"
     };
     ```

3. **Run the app:**
   ```bash
   npm start
   ```

## Features
- Google Authentication
- Real-time chat using Firestore
- Simple, modern UI

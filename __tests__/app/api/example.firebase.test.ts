/**
 * Example Firebase integration test.
 *
 * This test uses REAL Firebase connections — no jest.mock() for firebase modules.
 * It only runs when FIREBASE_ENV=ci to prevent accidental Firestore writes in
 * dev/CI environments without real credentials.
 *
 * To run:
 *   FIREBASE_ENV=ci npx jest __tests__/app/api/example.firebase.test.ts
 *
 * Requirements:
 *   - .env file with valid NEXT_PUBLIC_FIREBASE_* variables
 *   - Firebase project with Firestore in datastore mode or native mode
 */

const itIfCi = process.env.FIREBASE_ENV === 'ci' ? it : it.skip

describe('Firebase Integration [example]', () => {
  describe('firebase-client', () => {
    itIfCi('initializes Firebase app, db, and auth', async () => {
      const { initializeApp, getApps, getApp } = await import('firebase/app')
      const { getFirestore } = await import('firebase/firestore')
      const { getAuth } = await import('firebase/auth')

      const apps = getApps()
      if (apps.length === 0) {
        const firebaseConfig = {
          apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
          authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
          messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
          appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
        }
        initializeApp(firebaseConfig)
      }

      const app = getApp()
      expect(app).toBeDefined()
      expect(app.name).toBe('[DEFAULT]')

      const db = getFirestore(app)
      expect(db).toBeDefined()
      expect(db.type).toBe('firestore')

      const auth = getAuth(app)
      expect(auth).toBeDefined()
      expect(auth.name).toBe(app.name)
    })

    itIfCi('exports db, auth, and providers from firebase-client', async () => {
      const mod = await import('@/lib/firebase-client')
      expect(mod.db).toBeDefined()
      expect(mod.auth).toBeDefined()
      expect(mod.googleProvider).toBeDefined()
      expect(mod.githubProvider).toBeDefined()
      expect(mod.microsoftProvider).toBeDefined()
    })

    itIfCi('reuses the same app instance on repeated import', async () => {
      const { getApps } = await import('firebase/app')
      const countBefore = getApps().length

      await import('@/lib/firebase-client')

      const countAfter = getApps().length
      expect(countAfter).toBe(countBefore)
    })
  })

  describe('firestore document read (smoke test)', () => {
    itIfCi('reads a known collection reference without throwing', async () => {
      const { collection, getDocs } = await import('firebase/firestore')
      const { db } = await import('@/lib/firebase-client')

      const ref = collection(db, 'events')
      const snapshot = await getDocs(ref)

      expect(snapshot).toBeDefined()
      expect(snapshot.size).toBeGreaterThanOrEqual(0)
      expect(typeof snapshot.empty).toBe('boolean')
    })
  })
})

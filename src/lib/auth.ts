import { auth } from './firebase';
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User, signOut } from 'firebase/auth';

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/calendar.events');
provider.addScope('https://www.googleapis.com/auth/calendar.readonly');
// Force consent to ensure we always get the scopes when the user clicks 'connect google calendar' if they haven't given them.
// But we actually only want to force this if they specifically trigger the calendar connect, not necessarily on regular sign-in.
// So we'll have two login functions. One basic, one for calendar connect.
// Actually, it's fine to just request them on basic login. If they previously granted them, it won't prompt again.
provider.setCustomParameters({
  prompt: 'consent'
});

let cachedAccessToken: string | null = null;
const TOKEN_STORAGE_KEY = 'soma_google_access_token';

try {
  cachedAccessToken = typeof window !== 'undefined' ? sessionStorage.getItem(TOKEN_STORAGE_KEY) : null;
} catch (e) {
  // Ignore storage errors
}

let activeAuthSuccessCallback: ((user: User, token: string | null) => void) | null = null;
let activeAuthFailureCallback: (() => void) | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  if (onAuthSuccess) activeAuthSuccessCallback = onAuthSuccess;
  if (onAuthFailure) activeAuthFailureCallback = onAuthFailure;

  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (user.email !== 'fabriceib2006@gmail.com') {
        await signOut(auth);
        cachedAccessToken = null;
        try {
          sessionStorage.removeItem(TOKEN_STORAGE_KEY);
        } catch (e) {}
        if (onAuthFailure) onAuthFailure();
        return;
      }
      if (onAuthSuccess) {
        onAuthSuccess(user, cachedAccessToken);
      }
    } else {
      cachedAccessToken = null;
      try {
        sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      } catch (e) {}
      if (onAuthFailure) {
        onAuthFailure();
      }
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    const result = await signInWithPopup(auth, provider);
    
    if (result.user.email !== 'fabriceib2006@gmail.com') {
      await signOut(auth);
      const error = new Error('Access denied: Unauthorized account.');
      (error as any).code = 'auth/unauthorized-account';
      throw error;
    }

    const credential = GoogleAuthProvider.credentialFromResult(result);
    
    if (credential?.accessToken) {
      cachedAccessToken = credential.accessToken;
      try {
        sessionStorage.setItem(TOKEN_STORAGE_KEY, cachedAccessToken);
      } catch (e) {}
    }
    
    // Immediately notify active listeners so React state updates without delay
    if (activeAuthSuccessCallback && result.user) {
      activeAuthSuccessCallback(result.user, cachedAccessToken);
    }
    
    return { user: result.user, accessToken: cachedAccessToken || '' };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  }
};

export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const logout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  try {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch (e) {}
  if (activeAuthFailureCallback) {
    activeAuthFailureCallback();
  }
};

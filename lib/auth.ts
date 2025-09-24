// Client-side authentication functions for Bunny backend

const AUTH_STORAGE_KEY = 'bunny_auth_data';

export interface AuthData {
  access_token: string;
  refresh_token: string;
  token_type?: string;
  expires_in?: number;
  expires_at?: number;
  user: {
    id: string;
    email: string;
    created_at?: string;
    last_sign_in_at?: string;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  profile?: any; // Using any since the profile structure is complex
}

export interface LiveKitSessionData {
  token: string;
  roomUrl: string;
  room: string;
  conversation_id: string;
}

export async function authenticateUser(email: string, password: string): Promise<AuthData> {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (!backendUrl) {
      throw new Error('NEXT_PUBLIC_BACKEND_URL is not configured');
    }

    const response = await fetch(`${backendUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        password: password,
      }),
    });

    if (!response.ok) {
      throw new Error('Authentication failed');
    }

    const authData = await response.json();
    const formattedAuthData: AuthData = {
      access_token: authData.access_token,
      refresh_token: authData.refresh_token,
      token_type: authData.token_type,
      expires_in: authData.expires_in,
      expires_at: authData.expires_at,
      user: authData.user,
      profile: authData.profile,
    };

    // Store auth data in localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(formattedAuthData));
    }

    return formattedAuthData;
  } catch (error) {
    console.error('Authentication error:', error);
    throw error;
  }
}

export async function createLiveKitSession(accessToken: string): Promise<LiveKitSessionData> {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (!backendUrl) {
      throw new Error('NEXT_PUBLIC_BACKEND_URL is not configured');
    }

    const response = await fetch(`${backendUrl}/api/livekit-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: accessToken,
        // roomName and participantName are optional - backend generates them
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create LiveKit session');
    }

    const sessionData = await response.json();
    return {
      token: sessionData.token, // LiveKit JWT token
      roomUrl: sessionData.roomUrl, // LiveKit server URL
      room: sessionData.room, // Room name
      conversation_id: sessionData.conversation_id, // For tracking
    };
  } catch (error) {
    console.error('Session creation error:', error);
    throw error;
  }
}

// Complete initialization function
export async function initializeBunnySession(email: string, password: string) {
  try {
    // Step 1: Authenticate
    const authData = await authenticateUser(email, password);
    console.log('✅ Authenticated:', authData.user.email);

    // Step 2: Create LiveKit session
    const sessionData = await createLiveKitSession(authData.access_token);
    console.log('✅ LiveKit session created:', sessionData.conversation_id);

    return {
      authData,
      sessionData,
      conversationId: sessionData.conversation_id,
    };
  } catch (error) {
    console.error('Failed to initialize Bunny session:', error);
    throw error;
  }
}

// Get stored auth data
export function getStoredAuthData(): AuthData | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!stored) return null;

    const authData = JSON.parse(stored);

    // Check if token is expired (if expires_at is available)
    if (authData.expires_at && Date.now() / 1000 > authData.expires_at) {
      clearStoredAuthData();
      return null;
    }

    return authData;
  } catch (error) {
    console.error('Error reading stored auth data:', error);
    clearStoredAuthData();
    return null;
  }
}

// Clear stored auth data
export function clearStoredAuthData(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }
}

// Check if user is authenticated
export function isAuthenticated(): boolean {
  return getStoredAuthData() !== null;
}

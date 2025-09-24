// Client-side authentication functions for Bunny backend

const AUTH_STORAGE_KEY = 'bunny_auth_data';

export interface AuthData {
  access_token: string;
  expires_at?: number;
  user: {
    id: string;
    email: string;
  };
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

    // Generate a simple random mac_address since it's required
    const randomMac = `WEB:${Math.random().toString(16).substring(2, 8).toUpperCase()}:LOGIN`;

    const response = await fetch(
      `${backendUrl}/api/hardware_auth?device_code=${encodeURIComponent(password)}&email=${encodeURIComponent(email)}&mac_address=${encodeURIComponent(randomMac)}&expire_days=30`,
      {
        method: 'GET',
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Hardware auth failed:', errorText);
      throw new Error(`Hardware authentication failed: ${errorText}`);
    }

    const token = await response.text();
    console.log('📋 Raw token response:', token);

    // Check if the response is an error message instead of a valid token
    if (
      token === 'INVALID_CODE' ||
      token === 'INVALID_EMAIL' ||
      token === 'COULD NOT VERIFY USER DEVICE RELATIONSHIP'
    ) {
      throw new Error(`Authentication failed: ${token}`);
    }

    // Check if it looks like a JWT token (should have 3 parts separated by dots)
    if (!token.includes('.') || token.split('.').length !== 3) {
      throw new Error(`Invalid token format received: ${token}`);
    }

    // Decode the JWT to get user information and expiration
    let userId = 'temp_id';
    let expirationTime = null;
    try {
      const tokenPayload = JSON.parse(atob(token.split('.')[1]));
      console.log('🔍 Decoded JWT payload:', tokenPayload);

      userId = tokenPayload.user_id || 'temp_id';

      // Handle expiration - backend now uses standard Unix timestamp
      if (tokenPayload.exp) {
        if (typeof tokenPayload.exp === 'number') {
          // Standard JWT Unix timestamp format (current backend)
          expirationTime = tokenPayload.exp;
          console.log('⏰ Token expires at:', new Date(tokenPayload.exp * 1000).toISOString());
        } else if (typeof tokenPayload.exp === 'string') {
          // Legacy ISO string format (fallback)
          expirationTime = new Date(tokenPayload.exp).getTime() / 1000; // Convert to Unix timestamp
          console.log('⏰ Token expires at (legacy):', tokenPayload.exp);
        }
      }
    } catch (decodeError) {
      console.error('❌ Failed to decode JWT token:', decodeError);
      throw new Error(`Invalid JWT token received: ${token.substring(0, 50)}...`);
    }

    const authData: AuthData = {
      access_token: token,
      expires_at: expirationTime ?? undefined,
      user: {
        id: userId,
        email: email,
      },
    };

    // Store in localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
    }

    return authData;
  } catch (error) {
    console.error('❌ Authentication error:', error);
    throw error;
  }
}

export async function createLiveKitSession(accessToken: string): Promise<LiveKitSessionData> {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (!backendUrl) {
      throw new Error('NEXT_PUBLIC_BACKEND_URL is not configured');
    }

    // Check if token might be expired
    try {
      const tokenPayload = JSON.parse(atob(accessToken.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);

      let expiresAt;
      if (typeof tokenPayload.exp === 'number') {
        // Standard JWT Unix timestamp format (current backend)
        expiresAt = tokenPayload.exp;
        console.log('🕐 Token expires at:', new Date(expiresAt * 1000).toISOString());
      } else if (typeof tokenPayload.exp === 'string') {
        // Legacy ISO string format (fallback)
        expiresAt = new Date(tokenPayload.exp).getTime() / 1000;
        console.log('🕐 Token expires at (legacy):', tokenPayload.exp);
      }

      console.log('🕐 Current time:', new Date(currentTime * 1000).toISOString());

      if (currentTime >= expiresAt) {
        console.error('❌ Token is expired!');
        throw new Error('Access token has expired');
      } else {
        console.log('✅ Token is still valid');
      }
    } catch (parseError) {
      console.warn('⚠️ Could not parse token for expiration check:', parseError);
    }

    const requestBody = {
      token: accessToken,
      // roomName and participantName are optional - backend generates them
    };

    const response = await fetch(`${backendUrl}/api/livekit-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error response body:', errorText);
      throw new Error(`Failed to create LiveKit session: ${response.status} - ${errorText}`);
    }

    const sessionData = await response.json();
    console.log('✅ LiveKit session response:', sessionData);

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

    // Check if token is expired
    if (authData.expires_at && Date.now() / 1000 > authData.expires_at) {
      console.log('🕐 Token has expired, clearing stored auth data');
      clearStoredAuthData();
      return null;
    }

    // Log remaining time if token is valid
    if (authData.expires_at) {
      const remainingMinutes = Math.floor((authData.expires_at - Date.now() / 1000) / 60);
      console.log(`✅ Token is valid for ${remainingMinutes} more minutes`);
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

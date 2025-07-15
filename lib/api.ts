/**
 * API library for making HTTP requests
 */

const API_BASE_URL = 'http://localhost:3030';

/**
 * Health check response type
 */
export interface HealthCheckResponse {
  status: string;
  timestamp?: string;
  [key: string]: unknown;
}

export interface Character {
  name: string;
  image: string;
  slug: UserCharacter;
}

export type UserCharacter = 'bunny' | 'cat' | 'dog' | 'giraffe' | 'penguin';

/**
 * User interface
 */
export interface User {
  name: string;
  character: UserCharacter;
}

/**
 * User response from API
 */
export interface UserResponse {
  success: boolean;
  message: string;
  user: {
    id: string;
    name: string;
    character: UserCharacter;
    createdAt: string;
    updatedAt: string;
  };
}

/**
 * Makes a health check request to the API
 * @returns Promise<HealthCheckResponse>
 */
export const healthCheck = async (): Promise<HealthCheckResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);

    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Health check response:', data);
    return data;
  } catch (error) {
    console.error('Health check failed:', error);
    throw error;
  }
};

/**
 * Creates a slug from a name (lowercase, replace spaces with hyphens)
 * @param name - The name to convert to slug
 * @returns slug string
 */
export const createSlug = (name: string): string => {
  return name.toLowerCase().replace(/\s+/g, '-').trim();
};

/**
 * Checks if a user exists by slug
 * @param slug - User slug to check
 * @returns Promise<UserResponse | null>
 */
export const getUserBySlug = async (slug: string): Promise<UserResponse | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/users/${slug}`);

    if (response.status === 404) {
      return null; // User not found
    }

    if (!response.ok) {
      throw new Error(`Get user failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('User found:', data);
    return data;
  } catch (error) {
    console.error('Get user failed:', error);
    throw error;
  }
};

/**
 * Creates a new user
 * @param userData - User data to create
 * @returns Promise<UserResponse>
 */
export const createUser = async (userData: User): Promise<UserResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      throw new Error(`Create user failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('User created:', data);
    return data;
  } catch (error) {
    console.error('Create user failed:', error);
    throw error;
  }
};

/**
 * Generic API request helper
 * @param endpoint - API endpoint (without base URL)
 * @param options - Fetch options
 * @returns Promise<T>
 */
export const apiRequest = async <T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API request to ${endpoint} failed:`, error);
    throw error;
  }
};

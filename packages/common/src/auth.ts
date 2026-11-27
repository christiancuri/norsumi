export interface RegisterBody {
  email: string;
  /** Min 8 chars. */
  password: string;
  name: string;
}

export interface LoginBody {
  email: string;
  password: string;
}

/**
 * Sign in (or sign up) with Google. Clients obtain a Google ID token
 * (web: Google Identity Services; Android: Credential Manager) and send it;
 * the API verifies it locally against Google's JWKS.
 */
export interface GoogleLoginBody {
  idToken: string;
}

export interface RefreshBody {
  refreshToken: string;
}

export interface AuthSession {
  user: User;
  /** Short-lived JWT, sent as `Authorization: Bearer <token>`. */
  accessToken: string;
  /** Opaque, rotating. Every refresh returns a new one. */
  refreshToken: string;
  /** Access token lifetime in seconds. */
  expiresIn: number;
}

/**
 * DELETE /api/me. `password` is required when the account has the
 * "password" provider; Google-only accounts send no body.
 */
export interface DeleteMeBody {
  password?: string;
}

export interface UpdateMeBody {
  name?: string;
}

/** Shape of every non-2xx response. */
export interface ApiError {
  statusCode: number;
  error: string;
  message: string;
}

export interface ServerInfo {
  name: "norsumi";
  version: string;
  /** False when the server operator disabled sign-ups. */
  registrationOpen: boolean;
  auth: {
    /** Email + password sign-in is always available. */
    password: true;
    /** Null when the server has no Google OAuth client configured. */
    google: {
      /** OAuth client id the web app uses with Google Identity Services. */
      webClientId: string;
    } | null;
  };
}

export interface User {
  id: string;
  email: string;
  name: string;
  /** Profile picture (from Google), if any. */
  avatarUrl: string | null;
  /** Which sign-in methods this account has. */
  providers: Array<"password" | "google">;
  createdAt: string;
}

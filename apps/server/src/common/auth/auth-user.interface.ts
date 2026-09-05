export interface JwtPayload {
  sub: string;
  username: string;
  name: string;
  roles: string[];
  permissions: string[];
  type?: 'access' | 'refresh';
  jti?: string;
}

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  roles: string[];
  permissions: string[];
}

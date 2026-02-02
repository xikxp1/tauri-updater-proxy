export interface PlatformInfo {
  signature: string;
  url: string;
}

export interface UpdateManifest {
  version: string;
  notes: string;
  pub_date: string;
  platforms: Record<string, PlatformInfo>;
}

export interface Env {
  PORT: number;
  GITHUB_TOKEN: string;
  UPSTREAM_URL: string;
  AUTH_USERNAME: string;
  AUTH_PASSWORD: string;
}

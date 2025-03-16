
export interface ApiProxy {
  getCurrentEndpoint(): string;
  testConnectivity(): Promise<boolean>;
  post<T>(endpoint: string, data: any): Promise<T>;
  get<T>(endpoint: string, params?: Record<string, string>): Promise<T>;
  put<T>(endpoint: string, data: any): Promise<T>;
  delete<T>(endpoint: string): Promise<T>;
}

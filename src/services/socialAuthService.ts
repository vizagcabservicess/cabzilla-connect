import { authAPI } from './api/authAPI';

// Google OAuth configuration
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const FACEBOOK_APP_ID = import.meta.env.VITE_FACEBOOK_APP_ID || '';

// Facebook SDK initialization
declare global {
  interface Window {
    FB: any;
    gapi: any;
    google: any;
  }
}

export interface SocialUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
  provider: 'google' | 'facebook';
}

class SocialAuthService {
  private isGoogleSDKLoaded = false;
  private isFacebookSDKLoaded = false;

  // Initialize Google SDK
  async initGoogleSDK(): Promise<void> {
    if (this.isGoogleSDKLoaded) return;

    return new Promise((resolve, reject) => {
      // Check if script already exists
      const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
      if (existingScript) {
        // Remove existing script to force reload
        existingScript.remove();
        this.isGoogleSDKLoaded = false;
      }

      // Load Google SDK
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        this.isGoogleSDKLoaded = true;
        resolve();
      };
      script.onerror = (error) => {
        console.error('Failed to load Google SDK:', error);
        reject(new Error('Failed to load Google Sign-In SDK. Please check your internet connection and try again.'));
      };
      document.head.appendChild(script);
    });
  }

  // Initialize Facebook SDK
  async initFacebookSDK(): Promise<void> {
    if (this.isFacebookSDKLoaded) return;

    return new Promise((resolve, reject) => {
      // Check if script already exists
      const existingScript = document.querySelector('script[src="https://connect.facebook.net/en_US/sdk.js"]');
      if (existingScript) {
        this.isFacebookSDKLoaded = true;
        resolve();
        return;
      }

      // Load Facebook SDK
      const script = document.createElement('script');
      script.src = 'https://connect.facebook.net/en_US/sdk.js';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        // Initialize Facebook SDK
        try {
          window.FB.init({
            appId: FACEBOOK_APP_ID,
            cookie: true,
            xfbml: true,
            version: 'v18.0'
          });
          this.isFacebookSDKLoaded = true;
          resolve();
        } catch (error) {
          console.error('Failed to initialize Facebook SDK:', error);
          reject(new Error('Failed to initialize Facebook SDK. Please check your Facebook App ID configuration.'));
        }
      };
      script.onerror = (error) => {
        console.error('Failed to load Facebook SDK:', error);
        reject(new Error('Failed to load Facebook SDK. Please check your internet connection and try again.'));
      };
      document.head.appendChild(script);
    });
  }

    // Google Sign In
  async signInWithGoogle(): Promise<SocialUser> {
    if (!GOOGLE_CLIENT_ID) {
      throw new Error('Google Client ID is not configured. Please set VITE_GOOGLE_CLIENT_ID in your environment variables.');
    }

    console.log('Starting Google OAuth with client ID:', GOOGLE_CLIENT_ID);
    console.log('Current origin:', window.location.origin);

    // Force reload Google SDK to ensure fresh configuration
    this.isGoogleSDKLoaded = false;
    await this.initGoogleSDK();
    
    // Add a small delay to ensure Google's servers have updated
    await new Promise(resolve => setTimeout(resolve, 1000));

    return new Promise((resolve, reject) => {
      if (!window.google) {
        reject(new Error('Google SDK not loaded'));
        return;
      }

      // Add timeout to prevent hanging
      const timeout = setTimeout(() => {
        reject(new Error('Google login timed out. Please try again.'));
      }, 30000); // 30 seconds timeout

      // Create a temporary element for the button
      const tempElement = document.createElement('div');
      tempElement.style.position = 'absolute';
      tempElement.style.left = '-9999px';
      tempElement.style.top = '-9999px';
      document.body.appendChild(tempElement);

      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: async (response: any) => {
            try {
              clearTimeout(timeout); // Clear timeout on success
              
              // Check if response and credential exist
              if (!response || !response.credential) {
                throw new Error('Invalid Google OAuth response: missing credential');
              }
              
              const decoded = this.decodeJwtResponse(response.credential);
              
              // Validate required fields
              if (!decoded.sub || !decoded.email || !decoded.name) {
                throw new Error('Invalid Google OAuth response: missing required user data');
              }
              
              const socialUser: SocialUser = {
                id: decoded.sub,
                email: decoded.email,
                name: decoded.name,
                picture: decoded.picture || undefined,
                provider: 'google'
              };
              
              // Clean up
              if (tempElement.parentNode) {
                tempElement.parentNode.removeChild(tempElement);
              }
              
              resolve(socialUser);
            } catch (error) {
              clearTimeout(timeout); // Clear timeout on error
              // Clean up
              if (tempElement.parentNode) {
                tempElement.parentNode.removeChild(tempElement);
              }
              reject(error);
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
          use_fedcm_for_prompt: false, // Disable FedCM to avoid network errors
          context: 'signin' // Add context for better compatibility
        });

        // Render the button and click it programmatically
        window.google.accounts.id.renderButton(tempElement, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'rectangular',
          logo_alignment: 'left'
        });

        // Click the button after a short delay
        setTimeout(() => {
          const button = tempElement.querySelector('div[role="button"]') as HTMLElement;
          if (button) {
            button.click();
          } else {
            clearTimeout(timeout);
            if (tempElement.parentNode) {
              tempElement.parentNode.removeChild(tempElement);
            }
            reject(new Error('Google Sign-In button not found'));
          }
        }, 100);

      } catch (error) {
        clearTimeout(timeout);
        if (tempElement.parentNode) {
          tempElement.parentNode.removeChild(tempElement);
        }
        if (error instanceof Error && error.message.includes('origin')) {
          reject(new Error('Google OAuth origin not allowed. Please add localhost:8081 to your Google OAuth app\'s authorized JavaScript origins.'));
        } else {
          reject(error);
        }
      }
    });
  }

  // Facebook Sign In
  async signInWithFacebook(): Promise<SocialUser> {
    if (!FACEBOOK_APP_ID) {
      throw new Error('Facebook App ID is not configured. Please set VITE_FACEBOOK_APP_ID in your environment variables.');
    }

    await this.initFacebookSDK();

    return new Promise((resolve, reject) => {
      if (!window.FB) {
        reject(new Error('Facebook SDK not loaded'));
        return;
      }

      window.FB.login((response: any) => {
        if (response.authResponse) {
          // Get user info
          window.FB.api('/me', { fields: 'id,name,email,picture' }, (userInfo: any) => {
            const socialUser: SocialUser = {
              id: userInfo.id,
              email: userInfo.email,
              name: userInfo.name,
              picture: userInfo.picture?.data?.url,
              provider: 'facebook'
            };
            resolve(socialUser);
          });
        } else {
          reject(new Error('Facebook login failed'));
        }
      }, { scope: 'email,public_profile' });
    });
  }

  // Decode JWT response from Google
  private decodeJwtResponse(token: string) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  }

  // Authenticate with backend using social user data
  async authenticateWithBackend(socialUser: SocialUser): Promise<any> {
    try {
      const response = await authAPI.socialLogin({
        provider: socialUser.provider,
        providerId: socialUser.id,
        email: socialUser.email,
        name: socialUser.name,
        picture: socialUser.picture
      });
      return response;
    } catch (error) {
      throw new Error(`Social authentication failed: ${error}`);
    }
  }
}

export const socialAuthService = new SocialAuthService();

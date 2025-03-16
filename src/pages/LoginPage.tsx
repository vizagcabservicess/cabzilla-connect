
import { Link } from 'react-router-dom';
import { LoginForm } from '@/components/auth/LoginForm';
import { SocialLogin } from '@/components/SocialLogin';
import { Separator } from '@/components/ui/separator';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import ErrorBoundaryClass from '@/components/ErrorBoundary';

export default function LoginPage() {
  const [showDirectLogin, setShowDirectLogin] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  
  // Enable debug mode after 5 clicks on the title
  const handleTitleClick = () => {
    // Create or increment click counter
    const clickCount = Number(localStorage.getItem('title_clicks') || '0') + 1;
    localStorage.setItem('title_clicks', clickCount.toString());
    
    // Enable debug mode after 5 clicks
    if (clickCount >= 5) {
      setDebugMode(true);
      localStorage.setItem('debug_mode', 'true');
    }
  };
  
  return (
    <ErrorBoundaryClass>
      <div className="container mx-auto py-20 px-4">
        <div className="flex flex-col items-center justify-center">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <h1 
                className="text-3xl font-bold cursor-pointer" 
                onClick={handleTitleClick}
              >
                Log in to your account
              </h1>
              <p className="mt-2 text-gray-600">
                Welcome back! Please enter your details
              </p>
              
              {debugMode && (
                <div className="mt-2 text-xs text-blue-500">
                  Debug mode active - API tests available
                </div>
              )}
            </div>
            
            <div className="bg-white p-8 rounded-lg shadow-sm border">
              <ErrorBoundaryClass>
                <LoginForm />
              </ErrorBoundaryClass>
              
              <div className="mt-6">
                <Separator className="my-4" />
                
                <SocialLogin />
                
                <p className="text-center mt-6 text-sm text-gray-600">
                  Don't have an account?{' '}
                  <Link to="/signup" className="font-semibold text-blue-600 hover:text-blue-800">
                    Sign up
                  </Link>
                </p>
                
                {debugMode && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full text-xs"
                      onClick={() => setShowDirectLogin(!showDirectLogin)}
                    >
                      {showDirectLogin ? "Hide" : "Show"} Direct Login Options
                    </Button>
                    
                    {showDirectLogin && (
                      <Card className="mt-2 p-2 text-xs">
                        <p className="mb-2 text-gray-500">These buttons access the API directly, bypassing middleware:</p>
                        <div className="flex gap-2 flex-wrap">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="text-xs"
                            onClick={() => {
                              // Direct login with test account
                              fetch('https://saddlebrown-oryx-227656.hostingersite.com/api/login', {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                  'Accept': 'application/json',
                                  'Cache-Control': 'no-cache, no-store, must-revalidate',
                                  'Pragma': 'no-cache',
                                  'Expires': '0'
                                },
                                body: JSON.stringify({
                                  email: 'test@example.com',
                                  password: 'password123'
                                })
                              })
                              .then(res => res.json())
                              .then(data => {
                                console.log('Direct login response:', data);
                                if (data.token) {
                                  localStorage.setItem('auth_token', data.token);
                                  window.location.href = '/dashboard';
                                }
                              })
                              .catch(err => console.error('Direct login error:', err));
                            }}
                          >
                            Direct Test Login
                          </Button>
                          
                          <Button
                            variant="secondary"
                            size="sm"
                            className="text-xs"
                            onClick={() => {
                              // Check if login endpoint is accessible
                              fetch('https://saddlebrown-oryx-227656.hostingersite.com/api/login', {
                                method: 'OPTIONS',
                                headers: {
                                  'Accept': 'application/json'
                                }
                              })
                              .then(res => {
                                console.log('Login endpoint status:', res.status);
                                if (res.ok) {
                                  alert(`Login endpoint accessible: Status ${res.status}`);
                                } else {
                                  alert(`Login endpoint error: Status ${res.status}`);
                                }
                              })
                              .catch(err => {
                                console.error('Login endpoint test error:', err);
                                alert(`Login endpoint error: ${err.message}`);
                              });
                            }}
                          >
                            Test Login Endpoint
                          </Button>
                        </div>
                      </Card>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundaryClass>
  );
}

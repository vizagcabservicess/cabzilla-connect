import React, { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { PoolingLoginForm } from '@/components/pooling/auth/PoolingLoginForm';
import { PoolingRegisterForm } from '@/components/pooling/auth/PoolingRegisterForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function PoolingAuthPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto">
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex gap-2">
                <Button 
                  variant={isLogin ? "default" : "outline"}
                  onClick={() => setIsLogin(true)}
                  className="flex-1"
                >
                  Login
                </Button>
                <Button 
                  variant={!isLogin ? "default" : "outline"}
                  onClick={() => setIsLogin(false)}
                  className="flex-1"
                >
                  Register
                </Button>
              </div>
            </CardContent>
          </Card>

          {isLogin ? <PoolingLoginForm /> : <PoolingRegisterForm />}
        </div>
      </div>
    </div>
  );
}

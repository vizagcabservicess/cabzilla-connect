
import React, { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { PoolingLoginForm } from '@/components/pooling/auth/PoolingLoginForm';
import { PoolingRegisterForm } from '@/components/pooling/auth/PoolingRegisterForm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function PoolingAuthPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            <TabsContent value="login" className="mt-6">
              <PoolingLoginForm />
            </TabsContent>
            <TabsContent value="register" className="mt-6">
              <PoolingRegisterForm />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

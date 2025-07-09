import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Building2, Star, Phone, Mail, MapPin, Save, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { usePrivileges } from '@/hooks/usePrivileges';
import { AdminProfile, CreateAdminProfileRequest, UpdateAdminProfileRequest } from '@/types/adminProfile';
import { adminProfileAPI } from '@/services/api/adminProfileAPI';

export function AdminProfileManagement() {
  const { user } = useAuth();
  const { isSuperAdmin, isAdmin } = usePrivileges();
  const [profiles, setProfiles] = useState<AdminProfile[]>([]);
  const [myProfile, setMyProfile] = useState<AdminProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [editingProfile, setEditingProfile] = useState<AdminProfile | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [formData, setFormData] = useState<CreateAdminProfileRequest>({
    businessName: '',
    displayName: '',
    businessPhone: '',
    businessEmail: '',
    businessAddress: '',
    description: '',
    startingFare: 0,
    serviceAreas: [],
    amenities: [],
    vehicleTypes: []
  });

  useEffect(() => {
    if (isSuperAdmin()) {
      fetchAllProfiles();
    } else if (isAdmin()) {
      fetchMyProfile();
    }
  }, []);

  const fetchAllProfiles = async () => {
    try {
      setIsLoading(true);
      
      // Debug: Check if we have an auth token
      const token = localStorage.getItem('auth_token');
      console.log('DEBUG: Auth token present:', !!token);
      console.log('DEBUG: Token preview:', token ? token.substring(0, 20) + '...' : 'none');
      
      const data = await adminProfileAPI.getAllAdminProfiles();
      console.log('DEBUG: Profiles loaded successfully:', data);
      setProfiles(data);
    } catch (error) {
      console.error('Error fetching profiles:', error);
      console.log('DEBUG: Full error object:', error);
      
      // Check if it's an auth error
      if (error.response?.status === 401) {
        console.log('DEBUG: Authentication failed - clearing token');
        localStorage.removeItem('auth_token');
        toast.error('Authentication failed. Please log in again.');
      } else {
        toast.error('Failed to load admin profiles');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMyProfile = async () => {
    try {
      setIsLoading(true);
      const data = await adminProfileAPI.getMyProfile();
      setMyProfile(data);
      if (data) {
        setFormData({
          businessName: data.businessName,
          displayName: data.displayName,
          businessPhone: data.businessPhone || '',
          businessEmail: data.businessEmail || '',
          businessAddress: data.businessAddress || '',
          description: data.description || '',
          startingFare: data.startingFare,
          serviceAreas: data.serviceAreas,
          amenities: data.amenities,
          vehicleTypes: data.vehicleTypes
        });
      }
    } catch (error) {
      console.error('Error fetching my profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      
      if (myProfile) {
        // Update existing profile
        const updateData: UpdateAdminProfileRequest = {
          ...formData,
          id: myProfile.id
        };
        await adminProfileAPI.updateAdminProfile(updateData);
        toast.success('Profile updated successfully');
        fetchMyProfile();
      } else {
        // Create new profile
        await adminProfileAPI.createAdminProfile(formData);
        toast.success('Profile created successfully');
        fetchMyProfile();
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to save profile');
    } finally {
      setIsLoading(false);
    }
  };

  const addArrayItem = (field: 'serviceAreas' | 'amenities' | 'vehicleTypes', value: string) => {
    if (value.trim()) {
      setFormData(prev => ({
        ...prev,
        [field]: [...prev[field], value.trim()]
      }));
    }
  };

  const removeArrayItem = (field: 'serviceAreas' | 'amenities' | 'vehicleTypes', index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  if (!isSuperAdmin() && !isAdmin()) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-10">
          <div className="text-center">
            <Building2 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">Access denied. Admin privileges required.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* My Profile Section (for Admins) */}
      {isAdmin() && !isSuperAdmin() && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              My Operator Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Business Name</label>
                <Input
                  value={formData.businessName}
                  onChange={(e) => setFormData(prev => ({ ...prev, businessName: e.target.value }))}
                  placeholder="Enter business name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Display Name</label>
                <Input
                  value={formData.displayName}
                  onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                  placeholder="Enter display name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Business Phone</label>
                <Input
                  value={formData.businessPhone}
                  onChange={(e) => setFormData(prev => ({ ...prev, businessPhone: e.target.value }))}
                  placeholder="Enter phone number"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Business Email</label>
                <Input
                  value={formData.businessEmail}
                  onChange={(e) => setFormData(prev => ({ ...prev, businessEmail: e.target.value }))}
                  placeholder="Enter email address"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Starting Fare (₹)</label>
                <Input
                  type="number"
                  value={formData.startingFare}
                  onChange={(e) => setFormData(prev => ({ ...prev, startingFare: parseFloat(e.target.value) || 0 }))}
                  placeholder="Enter starting fare"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Business Address</label>
              <Textarea
                value={formData.businessAddress}
                onChange={(e) => setFormData(prev => ({ ...prev, businessAddress: e.target.value }))}
                placeholder="Enter business address"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe your services"
                rows={3}
              />
            </div>

            {/* Service Areas */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Service Areas</label>
              <div className="flex gap-2 mb-2">
                <Input
                  placeholder="Add service area"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addArrayItem('serviceAreas', e.currentTarget.value);
                      e.currentTarget.value = '';
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    const input = document.querySelector('input[placeholder="Add service area"]') as HTMLInputElement;
                    if (input?.value) {
                      addArrayItem('serviceAreas', input.value);
                      input.value = '';
                    }
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.serviceAreas.map((area, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {area}
                    <Trash2 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => removeArrayItem('serviceAreas', index)}
                    />
                  </Badge>
                ))}
              </div>
            </div>

            {/* Amenities */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Amenities</label>
              <div className="flex gap-2 mb-2">
                <Input
                  placeholder="Add amenity"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addArrayItem('amenities', e.currentTarget.value);
                      e.currentTarget.value = '';
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    const input = document.querySelector('input[placeholder="Add amenity"]') as HTMLInputElement;
                    if (input?.value) {
                      addArrayItem('amenities', input.value);
                      input.value = '';
                    }
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.amenities.map((amenity, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {amenity}
                    <Trash2 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => removeArrayItem('amenities', index)}
                    />
                  </Badge>
                ))}
              </div>
            </div>

            {/* Vehicle Types */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Vehicle Types</label>
              <div className="flex gap-2 mb-2">
                <Input
                  placeholder="Add vehicle type"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addArrayItem('vehicleTypes', e.currentTarget.value);
                      e.currentTarget.value = '';
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    const input = document.querySelector('input[placeholder="Add vehicle type"]') as HTMLInputElement;
                    if (input?.value) {
                      addArrayItem('vehicleTypes', input.value);
                      input.value = '';
                    }
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.vehicleTypes.map((type, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {type}
                    <Trash2 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => removeArrayItem('vehicleTypes', index)}
                    />
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={isLoading}>
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? 'Saving...' : 'Save Profile'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Profiles Section (for Super Admin) */}
      {isSuperAdmin() && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              All Operator Profiles
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading profiles...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {profiles.map((profile) => (
                  <Card key={profile.id} className="border">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold">{profile.businessName}</h3>
                          <p className="text-sm text-gray-600">{profile.displayName}</p>
                        </div>
                        <Badge variant={profile.isActive ? "default" : "secondary"}>
                          {profile.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Star className="h-4 w-4 text-yellow-500" />
                          <span>{profile.rating.toFixed(1)} ({profile.totalRatings} reviews)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-gray-500" />
                          <span>{profile.businessPhone || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-gray-500" />
                          <span>{profile.businessEmail || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-gray-500" />
                          <span>₹{profile.startingFare} starting fare</span>
                        </div>
                      </div>

                      <div className="mt-3">
                        <p className="text-xs text-gray-600 mb-2">Admin: {profile.adminUser?.name}</p>
                        <div className="text-xs text-gray-500">
                          {profile.vehicleCount || 0} vehicles • {profile.bookingCount || 0} bookings
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
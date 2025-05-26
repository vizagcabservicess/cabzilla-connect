
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { commissionAPI } from '@/services/api/commissionAPI';
import { CommissionSetting } from '@/types/cab';

interface CommissionSettingsFormProps {
  onSettingUpdated?: () => void;
}

export function CommissionSettingsForm({ onSettingUpdated }: CommissionSettingsFormProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [setting, setSetting] = useState<CommissionSetting>({
    id: 1,
    vehicleType: 'default',
    name: 'Default Commission',
    description: 'Default commission percentage for fleet vehicles',
    defaultPercentage: 10,
    isActive: true,
    createdAt: '',
    updatedAt: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    const fetchCommissionSetting = async () => {
      setIsLoading(true);
      try {
        const settings = await commissionAPI.getCommissionSettings();
        if (settings && settings.length > 0) {
          const activeSetting = settings.find((s: CommissionSetting) => s.isActive) || settings[0];
          setSetting({
            id: activeSetting.id,
            vehicleType: activeSetting.vehicleType || 'default',
            name: activeSetting.name || 'Default Commission',
            description: activeSetting.description || '',
            defaultPercentage: activeSetting.default_percentage || activeSetting.defaultPercentage || 10,
            isActive: activeSetting.isActive || true,
            createdAt: activeSetting.createdAt || '',
            updatedAt: activeSetting.updatedAt || ''
          });
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error loading commission settings",
          description: "Failed to load commission settings. Using default values."
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchCommissionSetting();
  }, [toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      if (setting.id) {
        // Update existing setting
        await commissionAPI.updateCommissionSetting(String(setting.id), {
          name: setting.name,
          description: setting.description,
          default_percentage: setting.defaultPercentage,
          is_active: setting.isActive
        });
      } else {
        // Create new setting
        await commissionAPI.createCommissionSetting({
          name: setting.name,
          description: setting.description,
          default_percentage: setting.defaultPercentage,
          is_active: setting.isActive
        });
      }
      
      toast({
        title: "Settings saved",
        description: "Commission settings have been updated successfully."
      });
      
      if (onSettingUpdated) {
        onSettingUpdated();
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error saving settings",
        description: "Failed to save commission settings. Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Commission Settings</CardTitle>
        <CardDescription>
          Configure the default commission rate for fleet vehicles
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Setting Name</Label>
            <Input
              id="name"
              value={setting.name || ''}
              onChange={(e) => setSetting({ ...setting, name: e.target.value })}
              disabled={isLoading}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={setting.description || ''}
              onChange={(e) => setSetting({ ...setting, description: e.target.value })}
              disabled={isLoading}
              rows={3}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="defaultPercentage">Default Commission Rate (%)</Label>
            <Input
              id="defaultPercentage"
              type="number"
              min={0}
              max={100}
              step={0.01}
              value={setting.defaultPercentage}
              onChange={(e) => setSetting({ 
                ...setting, 
                defaultPercentage: parseFloat(e.target.value) || 0 
              })}
              disabled={isLoading}
            />
            <p className="text-sm text-muted-foreground">
              Default percentage to be applied to all vehicles unless overridden
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="isActive"
              checked={setting.isActive}
              onCheckedChange={(checked) => setSetting({ ...setting, isActive: checked })}
              disabled={isLoading}
            />
            <Label htmlFor="isActive">Active</Label>
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <Button variant="outline" type="button" onClick={() => setSetting({
            id: 1,
            vehicleType: 'default',
            name: 'Default Commission',
            description: 'Default commission percentage for fleet vehicles',
            defaultPercentage: 10,
            isActive: true,
            createdAt: '',
            updatedAt: ''
          })} disabled={isLoading}>
            Reset
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Settings'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

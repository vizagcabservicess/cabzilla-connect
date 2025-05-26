
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { CancellationPolicy } from '@/types/api';

export function CancellationPolicyManager() {
  const [policies, setPolicies] = useState<CancellationPolicy[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<CancellationPolicy | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    rules: []
  });

  useEffect(() => {
    loadPolicies();
  }, []);

  const loadPolicies = async () => {
    setIsLoading(true);
    try {
      // Mock data - replace with actual API call
      const mockPolicies: CancellationPolicy[] = [
        {
          id: '1',
          name: 'Standard Cancellation',
          description: 'Standard cancellation policy for pooling rides',
          rules: []
        }
      ];
      setPolicies(mockPolicies);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load cancellation policies"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (policy: CancellationPolicy) => {
    setSelectedPolicy(policy);
    setFormData({
      name: policy.name,
      description: policy.description || '',
      rules: policy.rules
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      // Mock save - replace with actual API call
      toast({
        title: "Success",
        description: "Cancellation policy updated successfully"
      });
      setIsEditing(false);
      setSelectedPolicy(null);
      loadPolicies();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save cancellation policy"
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Cancellation Policies</CardTitle>
          <CardDescription>
            Manage cancellation policies for pooling rides
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div>Loading...</div>
          ) : (
            <div className="space-y-4">
              {policies.map((policy) => (
                <div key={policy.id} className="border p-4 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{policy.name}</h3>
                      <p className="text-sm text-muted-foreground">{policy.description}</p>
                    </div>
                    <Button onClick={() => handleEdit(policy)} variant="outline" size="sm">
                      Edit
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {isEditing && (
        <Card>
          <CardHeader>
            <CardTitle>Edit Policy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Policy Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave}>Save</Button>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

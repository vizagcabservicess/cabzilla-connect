
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CancellationPolicy } from '@/types/api';
import { toast } from 'sonner';

interface CancellationPolicyManagerProps {
  policies: CancellationPolicy[];
  onUpdate: (policy: CancellationPolicy) => void;
  onCreate: (policy: Partial<CancellationPolicy>) => void;
}

export function CancellationPolicyManager({ policies, onUpdate, onCreate }: CancellationPolicyManagerProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<CancellationPolicy | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    timeBeforeDeparture: 0,
    refundPercentage: 0,
    cancellationFee: 0,
    isActive: true
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Policy name is required');
      return;
    }

    if (formData.timeBeforeDeparture < 0) {
      toast.error('Time before departure cannot be negative');
      return;
    }

    if (formData.refundPercentage < 0 || formData.refundPercentage > 100) {
      toast.error('Refund percentage must be between 0 and 100');
      return;
    }

    if (formData.cancellationFee < 0) {
      toast.error('Cancellation fee cannot be negative');
      return;
    }

    if (editingPolicy) {
      onUpdate({
        ...editingPolicy,
        ...formData,
        updatedAt: new Date().toISOString()
      });
    } else {
      onCreate({
        ...formData,
        id: `policy_${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      timeBeforeDeparture: 0,
      refundPercentage: 0,
      cancellationFee: 0,
      isActive: true
    });
    setIsCreating(false);
    setEditingPolicy(null);
  };

  const startEdit = (policy: CancellationPolicy) => {
    setFormData({
      name: policy.name,
      description: policy.description,
      timeBeforeDeparture: policy.timeBeforeDeparture,
      refundPercentage: policy.refundPercentage,
      cancellationFee: policy.cancellationFee,
      isActive: policy.isActive
    });
    setEditingPolicy(policy);
    setIsCreating(true);
  };

  const togglePolicyStatus = (policy: CancellationPolicy) => {
    onUpdate({
      ...policy,
      isActive: !policy.isActive,
      updatedAt: new Date().toISOString()
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Cancellation Policies</h2>
        <Button onClick={() => setIsCreating(true)}>
          Create New Policy
        </Button>
      </div>

      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingPolicy ? 'Edit Policy' : 'Create New Policy'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Policy Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Standard Cancellation Policy"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe when this policy applies"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="timeBeforeDeparture">Hours Before Departure</Label>
                  <Input
                    id="timeBeforeDeparture"
                    type="number"
                    min="0"
                    value={formData.timeBeforeDeparture}
                    onChange={(e) => setFormData(prev => ({ ...prev, timeBeforeDeparture: Number(e.target.value) }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="refundPercentage">Refund Percentage (%)</Label>
                  <Input
                    id="refundPercentage"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.refundPercentage}
                    onChange={(e) => setFormData(prev => ({ ...prev, refundPercentage: Number(e.target.value) }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cancellationFee">Cancellation Fee (₹)</Label>
                  <Input
                    id="cancellationFee"
                    type="number"
                    min="0"
                    value={formData.cancellationFee}
                    onChange={(e) => setFormData(prev => ({ ...prev, cancellationFee: Number(e.target.value) }))}
                    required
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                />
                <Label htmlFor="isActive">Active Policy</Label>
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingPolicy ? 'Update' : 'Create'} Policy
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {policies.map((policy) => (
          <Card key={policy.id}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{policy.name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      policy.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {policy.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  
                  {policy.description && (
                    <p className="text-gray-600 mb-3">{policy.description}</p>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Time Before:</span>
                      <div>{policy.timeBeforeDeparture} hours</div>
                    </div>
                    <div>
                      <span className="font-medium">Refund:</span>
                      <div>{policy.refundPercentage}%</div>
                    </div>
                    <div>
                      <span className="font-medium">Fee:</span>
                      <div>₹{policy.cancellationFee}</div>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => startEdit(policy)}
                  >
                    Edit
                  </Button>
                  <Button 
                    variant={policy.isActive ? "destructive" : "default"}
                    size="sm"
                    onClick={() => togglePolicyStatus(policy)}
                  >
                    {policy.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

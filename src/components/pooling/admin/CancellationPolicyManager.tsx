
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { CancellationPolicy } from '@/types/enhancedPooling';

const CancellationPolicyManager = () => {
  const [policies, setPolicies] = useState<CancellationPolicy[]>([
    {
      id: 1,
      type: 'customer',
      hoursBeforeDeparture: 2,
      refundPercentage: 80,
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z'
    },
    {
      id: 2,
      type: 'customer',
      hoursBeforeDeparture: 24,
      refundPercentage: 90,
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z'
    },
    {
      id: 3,
      type: 'provider',
      hoursBeforeDeparture: 0,
      refundPercentage: 100,
      penaltyAmount: 100,
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z'
    }
  ]);

  const [editingPolicy, setEditingPolicy] = useState<CancellationPolicy | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const [formData, setFormData] = useState({
    type: 'customer' as 'customer' | 'provider',
    hoursBeforeDeparture: 0,
    refundPercentage: 100,
    penaltyAmount: 0,
    isActive: true
  });

  const handleSavePolicy = () => {
    if (editingPolicy) {
      setPolicies(policies.map(p => 
        p.id === editingPolicy.id 
          ? { ...editingPolicy, ...formData }
          : p
      ));
      setEditingPolicy(null);
    } else {
      const newPolicy: CancellationPolicy = {
        id: Date.now(),
        ...formData,
        createdAt: new Date().toISOString()
      };
      setPolicies([...policies, newPolicy]);
      setShowAddForm(false);
    }
    
    // Reset form
    setFormData({
      type: 'customer',
      hoursBeforeDeparture: 0,
      refundPercentage: 100,
      penaltyAmount: 0,
      isActive: true
    });
  };

  const handleEditPolicy = (policy: CancellationPolicy) => {
    setEditingPolicy(policy);
    setFormData({
      type: policy.type,
      hoursBeforeDeparture: policy.hoursBeforeDeparture,
      refundPercentage: policy.refundPercentage,
      penaltyAmount: policy.penaltyAmount || 0,
      isActive: policy.isActive
    });
  };

  const handleDeletePolicy = (id: number) => {
    setPolicies(policies.filter(p => p.id !== id));
  };

  const getPolicyDescription = (policy: CancellationPolicy) => {
    if (policy.type === 'customer') {
      if (policy.hoursBeforeDeparture === 0) {
        return 'After ride starts - No refund';
      }
      return `${policy.hoursBeforeDeparture}+ hours before departure - ${policy.refundPercentage}% refund`;
    } else {
      return `Provider cancellation - ${policy.refundPercentage}% refund + ₹${policy.penaltyAmount || 0} penalty`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customer Policies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {policies.filter(p => p.type === 'customer' && p.isActive).length}
            </div>
            <p className="text-xs text-muted-foreground">Active cancellation policies</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Provider Policies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {policies.filter(p => p.type === 'provider' && p.isActive).length}
            </div>
            <p className="text-xs text-muted-foreground">Active provider policies</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Refund</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(policies.reduce((acc, p) => acc + p.refundPercentage, 0) / policies.length)}%
            </div>
            <p className="text-xs text-muted-foreground">Across all policies</p>
          </CardContent>
        </Card>
      </div>

      {/* Add New Policy Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Cancellation Policies</h3>
        <Button 
          onClick={() => setShowAddForm(true)} 
          className="flex items-center gap-2"
          disabled={showAddForm || editingPolicy}
        >
          <Plus className="h-4 w-4" />
          Add Policy
        </Button>
      </div>

      {/* Add/Edit Form */}
      {(showAddForm || editingPolicy) && (
        <Card>
          <CardHeader>
            <CardTitle>{editingPolicy ? 'Edit Policy' : 'Add New Policy'}</CardTitle>
            <CardDescription>
              Configure cancellation terms and refund percentages
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Policy Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: 'customer' | 'provider') => 
                    setFormData({ ...formData, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer">Customer Cancellation</SelectItem>
                    <SelectItem value="provider">Provider Cancellation</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="hours">Hours Before Departure</Label>
                <Input
                  id="hours"
                  type="number"
                  value={formData.hoursBeforeDeparture}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    hoursBeforeDeparture: parseInt(e.target.value) || 0 
                  })}
                  placeholder="0 for after start"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="refund">Refund Percentage</Label>
                <Input
                  id="refund"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.refundPercentage}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    refundPercentage: parseInt(e.target.value) || 0 
                  })}
                />
              </div>

              {formData.type === 'provider' && (
                <div className="space-y-2">
                  <Label htmlFor="penalty">Penalty Amount (₹)</Label>
                  <Input
                    id="penalty"
                    type="number"
                    min="0"
                    value={formData.penaltyAmount}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      penaltyAmount: parseInt(e.target.value) || 0 
                    })}
                  />
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="active"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="active">Active Policy</Label>
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingPolicy(null);
                  setFormData({
                    type: 'customer',
                    hoursBeforeDeparture: 0,
                    refundPercentage: 100,
                    penaltyAmount: 0,
                    isActive: true
                  });
                }}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSavePolicy}>
                <Save className="h-4 w-4 mr-2" />
                Save Policy
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Policies List */}
      <div className="space-y-4">
        {policies.map((policy) => (
          <Card key={policy.id}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={policy.type === 'customer' ? 'default' : 'secondary'}>
                      {policy.type === 'customer' ? 'Customer' : 'Provider'}
                    </Badge>
                    <Badge variant={policy.isActive ? 'default' : 'outline'}>
                      {policy.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <p className="font-medium">{getPolicyDescription(policy)}</p>
                  <p className="text-sm text-gray-600">
                    Created: {new Date(policy.createdAt).toLocaleDateString()}
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditPolicy(policy)}
                    disabled={editingPolicy !== null || showAddForm}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeletePolicy(policy.id)}
                    disabled={editingPolicy !== null || showAddForm}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export { CancellationPolicyManager };

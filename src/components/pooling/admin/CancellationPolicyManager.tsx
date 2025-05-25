import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { CancellationPolicy } from '@/types/api';
import { toast } from 'sonner';

interface CancellationPolicyFormData {
  name: string;
  description: string;
  timeBeforeDeparture: number;
  refundPercentage: number;
  cancellationFee: number;
  isActive: boolean;
}

export function CancellationPolicyManager() {
  const [policies, setPolicies] = useState<CancellationPolicy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingPolicy, setEditingPolicy] = useState<CancellationPolicy | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formData, setFormData] = useState<CancellationPolicyFormData>({
    name: '',
    description: '',
    timeBeforeDeparture: 24,
    refundPercentage: 100,
    cancellationFee: 0,
    isActive: true
  });

  useEffect(() => {
    loadPolicies();
  }, []);

  const loadPolicies = async () => {
    try {
      setIsLoading(true);
      // Mock data for now
      const mockPolicies: CancellationPolicy[] = [
        {
          id: 1,
          name: "Standard Cancellation",
          description: "Standard cancellation policy for regular bookings",
          hours_before: 24,
          refund_percentage: 100,
          active: true,
          timeBeforeDeparture: 24,
          refundPercentage: 100,
          cancellationFee: 0,
          isActive: true,
          updatedAt: new Date().toISOString()
        }
      ];
      setPolicies(mockPolicies);
    } catch (error) {
      toast.error('Failed to load cancellation policies');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const policyData = {
        ...formData,
        hours_before: Number(formData.timeBeforeDeparture), // Convert to number
        refund_percentage: formData.refundPercentage,
        active: formData.isActive
      };

      if (editingPolicy) {
        // Update existing policy
        const updatedPolicy = {
          ...editingPolicy,
          ...policyData,
          timeBeforeDeparture: Number(formData.timeBeforeDeparture),
          refundPercentage: formData.refundPercentage,
          cancellationFee: formData.cancellationFee,
          isActive: formData.isActive
        };
        
        setPolicies(prev => prev.map(p => p.id === editingPolicy.id ? updatedPolicy : p));
        toast.success('Policy updated successfully');
      } else {
        // Create new policy
        const newPolicy: CancellationPolicy = {
          id: Date.now(),
          ...policyData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          timeBeforeDeparture: Number(formData.timeBeforeDeparture),
          refundPercentage: formData.refundPercentage,
          cancellationFee: formData.cancellationFee,
          isActive: formData.isActive,
          updatedAt: new Date().toISOString()
        };
        
        setPolicies(prev => [...prev, newPolicy]);
        toast.success('Policy created successfully');
      }
      
      resetForm();
    } catch (error) {
      toast.error('Failed to save policy');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      timeBeforeDeparture: 24,
      refundPercentage: 100,
      cancellationFee: 0,
      isActive: true
    });
    setEditingPolicy(null);
    setShowAddDialog(false);
  };

  const handleEdit = (policy: CancellationPolicy) => {
    setFormData({
      name: policy.name,
      description: policy.description,
      timeBeforeDeparture: policy.timeBeforeDeparture || policy.hours_before,
      refundPercentage: policy.refundPercentage || policy.refund_percentage,
      cancellationFee: policy.cancellationFee || 0,
      isActive: policy.isActive ?? policy.active
    });
    setEditingPolicy(policy);
    setShowAddDialog(true);
  };

  const handleDelete = async (policyId: number) => {
    try {
      setPolicies(prev => prev.filter(p => p.id !== policyId));
      toast.success('Policy deleted successfully');
    } catch (error) {
      toast.error('Failed to delete policy');
    }
  };

  const handleToggleActive = async (policy: CancellationPolicy) => {
    try {
      const updatedPolicy = {
        ...policy,
        active: !policy.active,
        isActive: !policy.isActive
      };
      
      setPolicies(prev => prev.map(p => p.id === policy.id ? updatedPolicy : p));
      toast.success(`Policy ${updatedPolicy.active ? 'activated' : 'deactivated'}`);
    } catch (error) {
      toast.error('Failed to update policy status');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Cancellation Policies</h2>
          <p className="text-muted-foreground">Manage cancellation policies for pooling rides</p>
        </div>
        
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Policy
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingPolicy ? 'Edit' : 'Add'} Cancellation Policy</DialogTitle>
              <DialogDescription>
                {editingPolicy ? 'Update the cancellation policy details' : 'Create a new cancellation policy'}
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Policy Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter policy name"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter policy description"
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="timeBeforeDeparture">Hours Before Departure</Label>
                <Input
                  id="timeBeforeDeparture"
                  type="number"
                  min="0"
                  value={formData.timeBeforeDeparture}
                  onChange={(e) => setFormData({ ...formData, timeBeforeDeparture: Number(e.target.value) })}
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
                  onChange={(e) => setFormData({ ...formData, refundPercentage: Number(e.target.value) })}
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
                  onChange={(e) => setFormData({ ...formData, cancellationFee: Number(e.target.value) })}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="isActive">Active</Label>
              </div>
              
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={resetForm} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">
                  <Save className="h-4 w-4 mr-2" />
                  {editingPolicy ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Policies</CardTitle>
          <CardDescription>Current cancellation policies</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Hours Before</TableHead>
                  <TableHead>Refund %</TableHead>
                  <TableHead>Fee</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {policies.map((policy) => (
                  <TableRow key={policy.id}>
                    <TableCell className="font-medium">{policy.name}</TableCell>
                    <TableCell>{policy.timeBeforeDeparture || policy.hours_before}</TableCell>
                    <TableCell>{policy.refundPercentage || policy.refund_percentage}%</TableCell>
                    <TableCell>₹{policy.cancellationFee || 0}</TableCell>
                    <TableCell>
                      <Badge variant={policy.isActive ?? policy.active ? "default" : "secondary"}>
                        {policy.isActive ?? policy.active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(policy)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleActive(policy)}
                        >
                          {policy.isActive ?? policy.active ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(policy.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default CancellationPolicyManager;

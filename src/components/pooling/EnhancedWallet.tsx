
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Wallet, Plus, Minus, ArrowUpRight, ArrowDownRight, IndianRupee } from 'lucide-react';
import { usePoolingAuth } from '@/providers/PoolingAuthProvider';
import { toast } from 'sonner';

interface EnhancedWalletProps {
  transactions: any[];
  onTransactionUpdate: () => void;
}

export function EnhancedWallet({ transactions, onTransactionUpdate }: EnhancedWalletProps) {
  const { walletData, wallet, user } = usePoolingAuth();
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const balance = walletData?.balance || walletData?.data?.balance || 0;

  const handleAddFunds = async () => {
    if (!user || !amount || parseFloat(amount) <= 0) return;

    setIsLoading(true);
    try {
      await wallet.deposit(user.id, parseFloat(amount));
      toast.success(`₹${amount} added to wallet successfully!`);
      setAmount('');
      setShowAddFunds(false);
      onTransactionUpdate();
    } catch (error) {
      console.error('Failed to add funds:', error);
      toast.error('Failed to add funds. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'credit':
      case 'deposit':
        return <ArrowDownRight className="h-4 w-4 text-green-600" />;
      case 'debit':
      case 'payment':
        return <ArrowUpRight className="h-4 w-4 text-red-600" />;
      default:
        return <IndianRupee className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatAmount = (amount: number, type: string) => {
    const prefix = type === 'credit' || type === 'deposit' ? '+' : '-';
    return `${prefix}₹${Math.abs(amount)}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          My Wallet
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <div className="text-sm text-gray-600">Available Balance</div>
          <div className="text-3xl font-bold text-blue-600">₹{balance}</div>
        </div>

        {!showAddFunds ? (
          <Button 
            onClick={() => setShowAddFunds(true)} 
            className="w-full"
            variant="outline"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Funds
          </Button>
        ) : (
          <div className="space-y-3">
            <Input
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="1"
            />
            <div className="flex gap-2">
              <Button 
                onClick={handleAddFunds} 
                disabled={isLoading || !amount || parseFloat(amount) <= 0}
                className="flex-1"
              >
                {isLoading ? 'Adding...' : 'Add Funds'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowAddFunds(false);
                  setAmount('');
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">Recent Transactions</h4>
            <Badge variant="secondary">{transactions.length} transactions</Badge>
          </div>
          
          {transactions.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <Wallet className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p>No transactions yet</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {transactions.slice(0, 5).map((transaction, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center gap-2">
                    {getTransactionIcon(transaction.type)}
                    <div>
                      <div className="text-sm font-medium">
                        {transaction.description || transaction.type}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(transaction.created_at || transaction.date).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className={`font-medium ${
                    transaction.type === 'credit' || transaction.type === 'deposit' 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {formatAmount(transaction.amount, transaction.type)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}


import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Wallet, Plus, Minus, CreditCard, IndianRupee } from 'lucide-react';
import { PoolingWallet, WalletTransaction } from '@/types/pooling';
import { format } from 'date-fns';

interface WalletManagerProps {
  wallet: PoolingWallet | null;
  transactions: WalletTransaction[];
  userRole: 'guest' | 'provider';
  onDeposit: (amount: number) => Promise<void>;
  onWithdraw: (amount: number) => Promise<void>;
}

export function WalletManager({ wallet, transactions, userRole, onDeposit, onWithdraw }: WalletManagerProps) {
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'deposit' | 'withdraw' | 'history'>('overview');

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (amount > 0) {
      await onDeposit(amount);
      setDepositAmount('');
    }
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (amount > 0 && wallet && amount <= wallet.balance) {
      await onWithdraw(amount);
      setWithdrawAmount('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Wallet Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Wallet className="h-5 w-5" />
            <span>Wallet Overview</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-sm text-gray-600">Available Balance</p>
              <p className="text-2xl font-bold text-green-600">₹{wallet?.balance || 0}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Locked Amount</p>
              <p className="text-2xl font-bold text-orange-600">₹{wallet?.lockedAmount || 0}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Total Earnings</p>
              <p className="text-2xl font-bold text-blue-600">₹{wallet?.totalEarnings || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Wallet Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Plus className="h-5 w-5 text-green-600" />
              <span>Add Money</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="deposit-amount">Amount (₹)</Label>
              <Input
                id="deposit-amount"
                type="number"
                placeholder="Enter amount"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
              />
            </div>
            <Button onClick={handleDeposit} className="w-full">
              <CreditCard className="mr-2 h-4 w-4" />
              Add Money
            </Button>
          </CardContent>
        </Card>

        {userRole === 'provider' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Minus className="h-5 w-5 text-red-600" />
                <span>Withdraw Money</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="withdraw-amount">Amount (₹)</Label>
                <Input
                  id="withdraw-amount"
                  type="number"
                  placeholder="Enter amount"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  max={wallet?.balance || 0}
                />
              </div>
              <Button 
                onClick={handleWithdraw} 
                variant="outline" 
                className="w-full"
                disabled={!wallet?.canWithdraw}
              >
                <IndianRupee className="mr-2 h-4 w-4" />
                Withdraw Money
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {transactions.length === 0 ? (
              <p className="text-gray-600 text-center py-4">No transactions yet</p>
            ) : (
              transactions.map(transaction => (
                <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{transaction.description}</p>
                    <p className="text-sm text-gray-600">
                      {format(new Date(transaction.createdAt), 'MMM dd, yyyy HH:mm')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                      {transaction.type === 'credit' ? '+' : '-'}₹{transaction.amount}
                    </p>
                    <Badge variant={transaction.status === 'completed' ? 'default' : 'secondary'}>
                      {transaction.status}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

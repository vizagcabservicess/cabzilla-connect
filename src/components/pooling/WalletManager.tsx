
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Wallet, 
  Plus, 
  Minus, 
  TrendingUp, 
  TrendingDown, 
  IndianRupee,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { PoolingWallet, WalletTransaction, UserRole } from '@/types/pooling';
import { toast } from 'sonner';

interface WalletManagerProps {
  wallet: PoolingWallet | null;
  transactions: WalletTransaction[];
  userRole: UserRole;
  onDeposit?: (amount: number) => Promise<void>;
  onWithdraw?: (amount: number) => Promise<void>;
}

export function WalletManager({ 
  wallet, 
  transactions, 
  userRole,
  onDeposit,
  onWithdraw 
}: WalletManagerProps) {
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const canWithdraw = wallet && userRole === 'provider' && 
    wallet.balance > wallet.minimumBalance;
  
  const maxWithdrawAmount = wallet ? 
    Math.max(0, wallet.balance - wallet.minimumBalance) : 0;

  const handleDeposit = async () => {
    if (!depositAmount || !onDeposit) return;
    
    const amount = parseFloat(depositAmount);
    if (amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      setLoading(true);
      await onDeposit(amount);
      setDepositAmount('');
      toast.success('Deposit initiated successfully');
    } catch (error) {
      toast.error('Failed to process deposit');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || !onWithdraw || !canWithdraw) return;
    
    const amount = parseFloat(withdrawAmount);
    if (amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (amount > maxWithdrawAmount) {
      toast.error(`Maximum withdrawal amount is ₹${maxWithdrawAmount}`);
      return;
    }

    try {
      setLoading(true);
      await onWithdraw(amount);
      setWithdrawAmount('');
      toast.success('Withdrawal request submitted');
    } catch (error) {
      toast.error('Failed to process withdrawal');
    } finally {
      setLoading(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'credit': return <Plus className="h-4 w-4 text-green-600" />;
      case 'debit': return <Minus className="h-4 w-4 text-red-600" />;
      case 'lock': return <Clock className="h-4 w-4 text-orange-600" />;
      case 'unlock': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'penalty': return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'withdrawal': return <TrendingDown className="h-4 w-4 text-blue-600" />;
      default: return <IndianRupee className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!wallet) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Wallet className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Wallet Not Found</h3>
          <p className="text-gray-600">Unable to load wallet information</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Wallet Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Wallet className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Current Balance</p>
                <p className="text-2xl font-bold">₹{wallet.balance}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {userRole === 'provider' && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-8 w-8 text-orange-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Locked Amount</p>
                  <p className="text-2xl font-bold">₹{wallet.lockedAmount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Earnings</p>
                <p className="text-2xl font-bold">₹{wallet.totalEarnings}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingDown className="h-8 w-8 text-red-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Spent</p>
                <p className="text-2xl font-bold">₹{wallet.totalSpent}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Minimum Balance Alert for Providers */}
      {userRole === 'provider' && wallet.balance < wallet.minimumBalance && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <div>
                <p className="font-medium text-orange-800">
                  Minimum Balance Required
                </p>
                <p className="text-sm text-orange-700">
                  Maintain ₹{wallet.minimumBalance} minimum balance to create rides.
                  Current shortfall: ₹{wallet.minimumBalance - wallet.balance}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Wallet Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Plus className="h-5 w-5" />
              <span>Add Money</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="deposit-amount">Amount</Label>
              <Input
                id="deposit-amount"
                type="number"
                placeholder="Enter amount"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
              />
            </div>
            <Button 
              onClick={handleDeposit} 
              disabled={!depositAmount || loading}
              className="w-full"
            >
              Add Money
            </Button>
          </CardContent>
        </Card>

        {userRole === 'provider' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Minus className="h-5 w-5" />
                <span>Withdraw Money</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="withdraw-amount">
                  Amount (Max: ₹{maxWithdrawAmount})
                </Label>
                <Input
                  id="withdraw-amount"
                  type="number"
                  placeholder="Enter amount"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  max={maxWithdrawAmount}
                />
              </div>
              <Button 
                onClick={handleWithdraw} 
                disabled={!canWithdraw || !withdrawAmount || loading}
                variant="outline"
                className="w-full"
              >
                Withdraw Money
              </Button>
              {!canWithdraw && (
                <p className="text-sm text-gray-600">
                  Maintain ₹{wallet.minimumBalance} minimum balance
                </p>
              )}
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
          {transactions.length === 0 ? (
            <p className="text-gray-600 text-center py-8">No transactions yet</p>
          ) : (
            <div className="space-y-3">
              {transactions.map(transaction => (
                <div key={transaction.id} className="flex items-center justify-between py-3 border-b">
                  <div className="flex items-center space-x-3">
                    {getTransactionIcon(transaction.type)}
                    <div>
                      <p className="font-medium">{transaction.description}</p>
                      <p className="text-sm text-gray-600">
                        {format(new Date(transaction.createdAt), 'MMM dd, yyyy • HH:mm')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${
                      transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.type === 'credit' ? '+' : '-'}₹{transaction.amount}
                    </p>
                    <div className="flex items-center space-x-2">
                      <Badge className={getStatusColor(transaction.status)}>
                        {transaction.status}
                      </Badge>
                      <span className="text-sm text-gray-600">
                        Bal: ₹{transaction.balanceAfter}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

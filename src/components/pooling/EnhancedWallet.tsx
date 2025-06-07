import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Wallet, Plus, Minus, IndianRupee, TrendingUp, TrendingDown } from 'lucide-react';
import { usePoolingAuth } from '@/providers/PoolingAuthProvider';
import { poolingAPI } from '@/services/api/poolingAPI';
import { toast } from 'sonner';

interface Transaction {
  id: number;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  createdAt: string;
  status: string;
}

interface EnhancedWalletProps {
  transactions: Transaction[];
  onTransactionUpdate: () => void;
}

function safeToFixed(value: any, digits = 2, fallback = '0.00') {
  const num = Number(value);
  return isNaN(num) ? fallback : num.toFixed(digits);
}

export function EnhancedWallet({ transactions, onTransactionUpdate }: EnhancedWalletProps) {
  const { user, walletData, setWalletData } = usePoolingAuth();
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const currentBalance = walletData?.data?.balance || 0;

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!user || !amount || amount <= 0 || amount > currentBalance) return;

    setIsProcessing(true);
    try {
      await poolingAPI.wallet.withdraw(user.id, amount);
      const updatedWallet = await poolingAPI.wallet.getBalance(user.id);
      if (typeof setWalletData === 'function') setWalletData(updatedWallet);
      onTransactionUpdate();
      setWithdrawAmount('');
      toast.success('Withdrawal successful!');
    } catch (error) {
      toast.error('Failed to process withdrawal');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTransactionTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card className="h-fit">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center space-x-2">
          <Wallet className="h-5 w-5 text-blue-600" />
          <span>My Wallet</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Balance Display */}
        <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
          <div className="text-sm text-blue-600 mb-1">Available Balance</div>
          <div className="text-3xl font-bold text-blue-900 flex items-center justify-center">
            <IndianRupee className="h-7 w-7" />
            {safeToFixed(currentBalance, 2, '0.00')}
          </div>
        </div>

        {/* Withdraw Section */}
        <div className="space-y-3">
          <Label htmlFor="withdraw-amount" className="text-sm font-medium">
            Withdraw Amount
          </Label>
          <div className="flex space-x-2">
            <div className="relative flex-1">
              <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                id="withdraw-amount"
                type="number"
                placeholder="Enter amount"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                max={currentBalance}
                className="pl-10"
              />
            </div>
            <Button
              onClick={handleWithdraw}
              variant="outline"
              disabled={
                isProcessing ||
                !withdrawAmount ||
                isNaN(Number(withdrawAmount)) ||
                Number(withdrawAmount) <= 0 ||
                Number(withdrawAmount) > currentBalance
              }
              className="px-6"
            >
              {isProcessing ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
              ) : (
                <Minus className="h-4 w-4" />
              )}
            </Button>
          </div>
          {withdrawAmount && Number(withdrawAmount) > currentBalance && (
            <p className="text-sm text-red-600">Insufficient balance</p>
          )}
        </div>

        {/* Transaction History */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">Recent Transactions</h4>
            <Badge variant="outline" className="text-xs">
              {Array.isArray(transactions) ? transactions.length : 0} transactions
            </Badge>
          </div>
          
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {!Array.isArray(transactions) || transactions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Wallet className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No transactions yet</p>
              </div>
            ) : (
              transactions.slice(0, 10).map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-1 rounded-full ${
                      transaction.type === 'credit' 
                        ? 'bg-green-100 text-green-600' 
                        : 'bg-red-100 text-red-600'
                    }`}>
                      {transaction.type === 'credit' ? 
                        <TrendingUp className="h-3 w-3" /> : 
                        <TrendingDown className="h-3 w-3" />
                      }
                    </div>
                    <div>
                      <p className="font-medium text-sm text-gray-900">
                        {transaction.description}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatTransactionTime(transaction.createdAt)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className={`font-bold text-sm ${
                      transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.type === 'credit' ? '+' : '-'}₹{transaction.amount}
                    </p>
                    <Badge 
                      variant={transaction.status === 'completed' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {transaction.status}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

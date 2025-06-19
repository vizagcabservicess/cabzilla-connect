
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle } from 'lucide-react';

interface FeatureChecklistProps {
  features?: string[];
}

const FeatureChecklist: React.FC<FeatureChecklistProps> = ({ 
  features = [
    "AC", "Music System", "Charging Point", "Water", "Bottle Water", 
    "Extra Legroom", "WiFi", "Entertainment System"
  ] 
}) => {
  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Vehicle Features</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {features.map((feature, index) => (
            <div key={index} className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <Badge variant="outline" className="text-sm">
                {feature}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default FeatureChecklist;

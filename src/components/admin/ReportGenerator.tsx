
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ReportGeneratorProps {
  data?: any;
}

export function ReportGenerator({ data }: ReportGeneratorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Report Generator</CardTitle>
      </CardHeader>
      <CardContent>
        <div>Report generation functionality will be implemented here.</div>
        {data && <pre className="mt-4 p-2 bg-gray-100 rounded">{JSON.stringify(data, null, 2)}</pre>}
      </CardContent>
    </Card>
  );
}

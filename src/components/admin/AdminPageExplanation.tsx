
import React from 'react';
import { HelpCircle } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from '@/components/ui/button';

interface AdminPageExplanationProps {
  title: string;
  description: string;
  children?: React.ReactNode;
}

export function AdminPageExplanation({ title, description, children }: AdminPageExplanationProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 ml-2">
          <HelpCircle className="h-4 w-4" />
          <span className="sr-only">Help</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-2">
          <h4 className="font-medium">{title}</h4>
          <p className="text-sm text-gray-500">{description}</p>
          {children}
        </div>
      </PopoverContent>
    </Popover>
  );
}

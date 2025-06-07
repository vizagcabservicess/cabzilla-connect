
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Star, ThumbsUp, Shield, Clock, Sparkles } from 'lucide-react';
import { PoolingBooking } from '@/types/pooling';

interface RatingSystemProps {
  booking: PoolingBooking;
  onSubmitRating: (rating: RatingData) => void;
  onClose: () => void;
}

interface RatingData {
  rating: number;
  review: string;
  aspects: {
    punctuality: number;
    cleanliness: number;
    behavior: number;
    safety: number;
  };
}

export function RatingSystem({ booking, onSubmitRating, onClose }: RatingSystemProps) {
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [aspects, setAspects] = useState({
    punctuality: 0,
    cleanliness: 0,
    behavior: 0,
    safety: 0
  });

  const aspectLabels = {
    punctuality: { icon: Clock, label: 'Punctuality' },
    cleanliness: { icon: Sparkles, label: 'Cleanliness' },
    behavior: { icon: ThumbsUp, label: 'Behavior' },
    safety: { icon: Shield, label: 'Safety' }
  };

  const handleSubmit = () => {
    if (rating === 0) return;

    const ratingData: RatingData = {
      rating,
      review,
      aspects
    };

    onSubmitRating(ratingData);
  };

  const StarRating = ({ 
    value, 
    onChange, 
    size = 'md' 
  }: { 
    value: number; 
    onChange: (value: number) => void; 
    size?: 'sm' | 'md' | 'lg' 
  }) => {
    const sizeClasses = {
      sm: 'h-4 w-4',
      md: 'h-6 w-6',
      lg: 'h-8 w-8'
    };

    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className={`${sizeClasses[size]} transition-colors ${
              star <= value 
                ? 'text-yellow-400 fill-yellow-400' 
                : 'text-gray-300 hover:text-yellow-400'
            }`}
          >
            <Star className="w-full h-full" />
          </button>
        ))}
      </div>
    );
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">Rate Your Experience</CardTitle>
        <p className="text-sm text-gray-600 text-center">
          Help other passengers by sharing your experience
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Overall Rating */}
        <div className="text-center space-y-3">
          <Label className="text-lg font-medium">Overall Rating</Label>
          <StarRating value={rating} onChange={setRating} size="lg" />
          {rating > 0 && (
            <p className="text-sm text-gray-600">
              {rating === 1 && "Poor"}
              {rating === 2 && "Fair"}
              {rating === 3 && "Good"}
              {rating === 4 && "Very Good"}
              {rating === 5 && "Excellent"}
            </p>
          )}
        </div>

        {/* Aspect Ratings */}
        <div className="space-y-4">
          <Label className="font-medium">Rate Different Aspects</Label>
          {Object.entries(aspectLabels).map(([key, { icon: Icon, label }]) => (
            <div key={key} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium">{label}</span>
              </div>
              <StarRating 
                value={aspects[key as keyof typeof aspects]} 
                onChange={(value) => setAspects({...aspects, [key]: value})}
                size="sm"
              />
            </div>
          ))}
        </div>

        {/* Review */}
        <div className="space-y-2">
          <Label htmlFor="review">Write a Review (Optional)</Label>
          <Textarea
            id="review"
            placeholder="Share your experience with other passengers..."
            value={review}
            onChange={(e) => setReview(e.target.value)}
            maxLength={300}
          />
          <p className="text-xs text-gray-500">
            {review.length}/300 characters
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Skip
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={rating === 0}
            className="flex-1"
          >
            Submit Rating
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

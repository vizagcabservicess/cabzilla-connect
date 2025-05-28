
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Star, User, CheckCircle } from 'lucide-react';
import { RideRating } from '@/types/pooling';
import { usePoolingAuth } from '@/providers/PoolingAuthProvider';
import { toast } from 'sonner';

interface RatingSystemProps {
  rideId: number;
  bookingId: number;
  ratedUserId: number;
  ratedUserName: string;
  ratedUserType: 'guest' | 'provider';
  existingRating?: RideRating;
  onSubmitRating: (rating: Omit<RideRating, 'id' | 'createdAt'>) => Promise<void>;
}

export function RatingSystem({
  rideId,
  bookingId,
  ratedUserId,
  ratedUserName,
  ratedUserType,
  existingRating,
  onSubmitRating
}: RatingSystemProps) {
  const { user } = usePoolingAuth();
  const [rating, setRating] = useState(existingRating?.rating || 0);
  const [review, setReview] = useState(existingRating?.review || '');
  const [aspects, setAspects] = useState({
    punctuality: existingRating?.aspects?.punctuality || 0,
    cleanliness: existingRating?.aspects?.cleanliness || 0,
    behavior: existingRating?.aspects?.behavior || 0,
    safety: existingRating?.aspects?.safety || 0
  });
  const [submitting, setSubmitting] = useState(false);

  const handleStarClick = (value: number, aspect?: keyof typeof aspects) => {
    if (aspect) {
      setAspects(prev => ({ ...prev, [aspect]: value }));
    } else {
      setRating(value);
    }
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Please provide an overall rating');
      return;
    }

    if (!user) {
      toast.error('User not authenticated');
      return;
    }

    try {
      setSubmitting(true);

      const ratingData: Omit<RideRating, 'id' | 'createdAt'> = {
        rideId,
        bookingId,
        raterId: user.id,
        ratedId: ratedUserId,
        raterType: user.role as 'guest' | 'provider',
        rating,
        review: review.trim() || undefined,
        aspects: Object.values(aspects).some(v => v > 0) ? aspects : undefined
      };

      await onSubmitRating(ratingData);
      toast.success('Rating submitted successfully!');
    } catch (error) {
      toast.error('Failed to submit rating');
    } finally {
      setSubmitting(false);
    }
  };

  const StarRating = ({ 
    value, 
    onChange, 
    label, 
    readonly = false 
  }: { 
    value: number; 
    onChange?: (value: number) => void; 
    label?: string;
    readonly?: boolean;
  }) => (
    <div className="flex items-center space-x-2">
      {label && <span className="text-sm text-gray-600 w-20">{label}:</span>}
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-5 w-5 cursor-pointer transition-colors ${
              star <= value
                ? 'text-yellow-500 fill-current'
                : 'text-gray-300 hover:text-yellow-400'
            }`}
            onClick={() => !readonly && onChange?.(star)}
          />
        ))}
      </div>
      <span className="text-sm text-gray-600">({value}/5)</span>
    </div>
  );

  if (existingRating) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span>Rating Submitted</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-3">
            <User className="h-8 w-8 text-gray-400" />
            <div>
              <p className="font-medium">{ratedUserName}</p>
              <Badge variant="outline" className="capitalize">
                {ratedUserType}
              </Badge>
            </div>
          </div>

          <StarRating value={existingRating.rating} readonly />

          {existingRating.aspects && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Detailed Ratings:</p>
              <StarRating value={existingRating.aspects.punctuality} label="Punctuality" readonly />
              <StarRating value={existingRating.aspects.cleanliness} label="Cleanliness" readonly />
              <StarRating value={existingRating.aspects.behavior} label="Behavior" readonly />
              <StarRating value={existingRating.aspects.safety} label="Safety" readonly />
            </div>
          )}

          {existingRating.review && (
            <div>
              <p className="text-sm font-medium mb-2">Review:</p>
              <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                {existingRating.review}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rate Your Experience</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center space-x-3">
          <User className="h-8 w-8 text-gray-400" />
          <div>
            <p className="font-medium">{ratedUserName}</p>
            <Badge variant="outline" className="capitalize">
              {ratedUserType}
            </Badge>
          </div>
        </div>

        {/* Overall Rating */}
        <div className="space-y-2">
          <Label>Overall Rating *</Label>
          <StarRating 
            value={rating} 
            onChange={setRating}
          />
        </div>

        {/* Detailed Aspects */}
        <div className="space-y-3">
          <Label>Detailed Ratings (Optional)</Label>
          <StarRating 
            value={aspects.punctuality} 
            onChange={(value) => handleStarClick(value, 'punctuality')}
            label="Punctuality"
          />
          <StarRating 
            value={aspects.cleanliness} 
            onChange={(value) => handleStarClick(value, 'cleanliness')}
            label="Cleanliness"
          />
          <StarRating 
            value={aspects.behavior} 
            onChange={(value) => handleStarClick(value, 'behavior')}
            label="Behavior"
          />
          <StarRating 
            value={aspects.safety} 
            onChange={(value) => handleStarClick(value, 'safety')}
            label="Safety"
          />
        </div>

        {/* Review */}
        <div className="space-y-2">
          <Label htmlFor="review">Review (Optional)</Label>
          <Textarea
            id="review"
            placeholder="Share your experience..."
            value={review}
            onChange={(e) => setReview(e.target.value)}
            rows={4}
          />
        </div>

        {/* Submit Button */}
        <Button 
          onClick={handleSubmit}
          disabled={rating === 0 || submitting}
          className="w-full"
        >
          {submitting ? 'Submitting...' : 'Submit Rating'}
        </Button>
      </CardContent>
    </Card>
  );
}

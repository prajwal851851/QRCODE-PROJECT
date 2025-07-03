from django.db import models
from UserRole.models import BaseModel
from qrgenerator.models import Order
from django.db.models import Avg, Count

# Review model has been removed 

class Review(BaseModel):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='reviews')
    rating = models.IntegerField(choices=[(i, i) for i in range(1, 6)])
    comment = models.TextField()
    is_public = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Review for Order #{self.order.id} - {self.rating} stars"

    @classmethod
    def get_feedback_overview(cls, user):
        # Get reviews for the specific user's orders
        reviews = cls.objects.filter(order__user=user)
        total_reviews = reviews.count()
        
        if total_reviews == 0:
            return None
            
        # Calculate average rating
        average_rating = reviews.aggregate(Avg('rating'))['rating__avg']
        
        # Calculate rating distribution
        rating_distribution = {
            5: reviews.filter(rating=5).count(),
            4: reviews.filter(rating=4).count(),
            3: reviews.filter(rating=3).count(),
            2: reviews.filter(rating=2).count(),
            1: reviews.filter(rating=1).count(),
        }
        
        # Calculate positive and negative review percentages
        positive_reviews = reviews.filter(rating__gte=4).count()
        negative_reviews = reviews.filter(rating__lte=2).count()
        
        positive_reviews_percentage = (positive_reviews / total_reviews) * 100
        negative_reviews_percentage = (negative_reviews / total_reviews) * 100
        
        return {
            'total_reviews': total_reviews,
            'average_rating': average_rating,
            'rating_distribution': rating_distribution,
            'positive_reviews_percentage': positive_reviews_percentage,
            'negative_reviews_percentage': negative_reviews_percentage,
        } 
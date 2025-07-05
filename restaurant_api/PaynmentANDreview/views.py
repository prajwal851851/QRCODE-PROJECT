from rest_framework import generics, permissions
from UserRole.models import CustomUser
from .models import Review
from .serializers import ReviewSerializer, ReviewCreateSerializer
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
from django.utils import timezone
from django.db.models import Count
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from qrgenerator.models import Order
from collections import Counter

# Review views have been removed

class ReviewCreateView(generics.CreateAPIView):
    queryset = Review.objects.all()
    serializer_class = ReviewCreateSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        order_id = request.data.get('order')
        
        # Check if a review already exists for this order
        if Review.objects.filter(order_id=order_id).exists():
            return Response(
                {"error": "A review already exists for this order."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return super().create(request, *args, **kwargs)

class ReviewListView(generics.ListAPIView):
    serializer_class = ReviewSerializer
    
    def get_permissions(self):
        # Allow unauthenticated access for checking existing reviews
        return [permissions.AllowAny()]

    def get_queryset(self):
        # If user is authenticated, filter by user
        if self.request.user.is_authenticated:
            user = self.request.user
            if hasattr(user, 'is_employee') and user.is_employee and user.created_by:
                admin_user = user.created_by
            else:
                admin_user = user
            return Review.objects.filter(order__user=admin_user)
        else:
            # For unauthenticated users, allow checking reviews by order ID
            order_id = self.request.query_params.get('order')
            if order_id:
                return Review.objects.filter(order__id=order_id)
            # If no order ID provided, return empty queryset for unauthenticated users
            return Review.objects.none()

class ReviewDetailView(generics.RetrieveDestroyAPIView):
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if hasattr(user, 'is_employee') and user.is_employee and user.created_by:
            admin_user = user.created_by
        else:
            admin_user = user
        return Review.objects.filter(order__user=admin_user)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)

class ReviewDeleteAllView(generics.DestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if hasattr(user, 'is_employee') and user.is_employee and user.created_by:
            admin_user = user.created_by
        else:
            admin_user = user
        return Review.objects.filter(order__user=admin_user)

    def destroy(self, request, *args, **kwargs):
        self.get_queryset().delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

class FeedbackOverviewView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        if hasattr(user, 'is_employee') and user.is_employee and user.created_by:
            admin_user = user.created_by
        else:
            admin_user = user
            
        feedback_overview = Review.get_feedback_overview(admin_user)
        
        if feedback_overview is None:
            return Response({
                'message': 'No reviews available'
            }, status=status.HTTP_200_OK)
            
        return Response(feedback_overview, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def popular_items(request):
    # Get the last 30 days of orders
    thirty_days_ago = timezone.now() - timezone.timedelta(days=30)
    
    # Get all orders from the last 30 days for the current user
    orders = Order.objects.filter(
        created_at__gte=thirty_days_ago,
        user=request.user  # Filter by current user
    )
    print(f"Found {orders.count()} orders in the last 30 days for user {request.user}")
    
    # Count items across all orders
    item_counter = Counter()
    for order in orders:
        print(f"Processing order {order.id} with items: {order.items}")
        for item in order.items:
            item_counter[item['name']] += item['quantity']
    
    # Get top 5 most ordered items
    popular_items = [
        {
            'id': idx + 1,
            'name': item_name,
            'total_orders': count
        }
        for idx, (item_name, count) in enumerate(item_counter.most_common(5))
    ]
    
    print(f"Popular items for user {request.user}: {popular_items}")
    return Response(popular_items)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def table_performance(request):
    # Get the last 30 days of orders
    thirty_days_ago = timezone.now() - timezone.timedelta(days=30)
    
    # Get all orders from the last 30 days for the current user
    orders = Order.objects.filter(
        created_at__gte=thirty_days_ago,
        user=request.user
    )
    
    # Calculate table performance
    table_stats = {}
    for order in orders:
        table_name = order.table.name
        if table_name not in table_stats:
            table_stats[table_name] = {
                'orders': 0,
                'revenue': 0,
                'id': order.table.id
            }
        table_stats[table_name]['orders'] += 1
        table_stats[table_name]['revenue'] += float(order.total)
    
    # Convert to list and sort by revenue
    table_performance = [
        {
            'id': stats['id'],
            'name': table_name,
            'orders': stats['orders'],
            'revenue': stats['revenue'],
            'occupancy_rate': min(100, (stats['orders'] * 100) / 30)  # Assuming 30 days period
        }
        for table_name, stats in table_stats.items()
    ]
    
    # Sort by revenue and get top 5
    table_performance.sort(key=lambda x: x['revenue'], reverse=True)
    table_performance = table_performance[:5]
    
    return Response(table_performance)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def peak_hours_analysis(request):
    print(f"Processing peak hours analysis for user: {request.user}")
    
    # Get the last 30 days of orders
    thirty_days_ago = timezone.now() - timezone.timedelta(days=30)
    print(f"Looking for orders since: {thirty_days_ago}")
    
    # Get all orders from the last 30 days for the current user
    orders = Order.objects.filter(
        created_at__gte=thirty_days_ago,
        user=request.user
    )
    print(f"Found {orders.count()} orders for user {request.user}")
    
    # Initialize data structures
    hourly_data = {hour: 0 for hour in range(24)}
    daily_data = {
        'Monday': 0, 'Tuesday': 0, 'Wednesday': 0, 'Thursday': 0,
        'Friday': 0, 'Saturday': 0, 'Sunday': 0
    }
    
    # Process orders
    for order in orders:
        # Get hour and day from created_at
        hour = order.created_at.hour
        day = order.created_at.strftime('%A')
        
        # Update counts
        hourly_data[hour] += 1
        daily_data[day] += 1
        print(f"Processing order {order.id} - Hour: {hour}, Day: {day}")
    
    print(f"Hourly data: {hourly_data}")
    print(f"Daily data: {daily_data}")
    
    # Find peak hours (top 3 busiest hours)
    peak_hours = sorted(
        [{'hour': hour, 'orders': count} for hour, count in hourly_data.items()],
        key=lambda x: x['orders'],
        reverse=True
    )[:3]
    
    # Find peak days (top 3 busiest days)
    peak_days = sorted(
        [{'day': day, 'orders': count} for day, count in daily_data.items()],
        key=lambda x: x['orders'],
        reverse=True
    )[:3]
    
    print(f"Peak hours: {peak_hours}")
    print(f"Peak days: {peak_days}")
    
    # Format hours for display
    def format_hour(hour):
        if hour == 0:
            return '12 AM'
        elif hour < 12:
            return f'{hour} AM'
        elif hour == 12:
            return '12 PM'
        else:
            return f'{hour-12} PM'
    
    # Format the response
    response_data = {
        'peak_hours': [
            {
                'hour': format_hour(item['hour']),
                'orders': item['orders']
            }
            for item in peak_hours
        ],
        'peak_days': [
            {
                'day': item['day'],
                'orders': item['orders']
            }
            for item in peak_days
        ],
        'busiest_hour': format_hour(peak_hours[0]['hour']) if peak_hours else None,
        'busiest_day': peak_days[0]['day'] if peak_days else None,
        'total_orders': sum(hourly_data.values())
    }
    
    print(f"Response data: {response_data}")
    return Response(response_data)



def isNaN(num):
    return num != num

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
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if hasattr(user, 'is_employee') and user.is_employee and user.created_by:
            admin_user = user.created_by
        else:
            admin_user = user
        return Review.objects.filter(order__user=admin_user)

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

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_full_stats(request):
    try:
        # Get date range from query parameters
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        # Base queryset for the current user
        orders_queryset = Order.objects.filter(user=request.user)
        
        # Apply date filters if provided
        if start_date:
            orders_queryset = orders_queryset.filter(created_at__gte=start_date)
        if end_date:
            orders_queryset = orders_queryset.filter(created_at__lte=end_date)
        
        # Get all orders for the user
        orders = orders_queryset.order_by('-created_at')
        
        # Calculate total revenue and orders
        total_revenue = 0
        for order in orders:
            try:
                # Handle both string and numeric total_amount
                amount = order.total_amount
                print(f"Raw amount for order {order.id}: {amount}, type: {type(amount)}")
                
                if isinstance(amount, str):
                    # Remove any currency symbols and convert to float
                    amount = amount.replace('Rs', '').replace('$', '').strip()
                    amount = float(amount) if amount else 0
                else:
                    amount = float(amount or 0)
                print(f"Processed amount for order {order.id}: {amount}")
                total_revenue += amount
            except (ValueError, TypeError) as e:
                print(f"Error processing amount for order {order.id}: {str(e)}")
                continue
        
        total_orders = orders.count()
        
        # Calculate average order value
        average_order_value = 0
        if total_orders > 0:
            average_order_value = total_revenue / total_orders
        
        print(f"Debug - Total Revenue: {total_revenue}")
        print(f"Debug - Total Orders: {total_orders}")
        print(f"Debug - Average Order Value: {average_order_value}")
        
        # Get recent orders (last 10)
        recent_orders = orders[:10]
        
        # Calculate completion rate
        completed_orders = orders.filter(status='completed').count()
        completion_rate = (completed_orders / total_orders * 100) if total_orders > 0 else 0
        
        # Calculate average preparation time (if available)
        preparation_times = []
        for order in orders:
            if order.created_at and order.updated_at and order.status == 'completed':
                prep_time = (order.updated_at - order.created_at).total_seconds() / 60
                preparation_times.append(prep_time)
        
        avg_preparation_time = sum(preparation_times) / len(preparation_times) if preparation_times else 0
        
        # Format the response
        response_data = {
            'total_revenue': float(total_revenue),
            'total_orders': total_orders,
            'average_order_value': float(average_order_value),
            'completion_rate': round(completion_rate, 2),
            'completed_orders': completed_orders,
            'avg_preparation_time': round(avg_preparation_time, 2),
            'recent_orders': [
                {
                    'id': order.id,
                    'table_number': order.table_number,
                    'status': order.status,
                    'total_amount': float(order.total_amount or 0),
                    'created_at': order.created_at,
                    'items': order.items if hasattr(order, 'items') else []
                }
                for order in recent_orders
            ]
        }
        
        print(f"Final Response - Total Revenue: {response_data['total_revenue']}")
        print(f"Final Response - Average Order Value: {response_data['average_order_value']}")
        return Response(response_data)
    except Exception as e:
        print(f"Error in dashboard_full_stats: {str(e)}")
        return Response({'error': str(e)}, status=500)

def isNaN(num):
    return num != num

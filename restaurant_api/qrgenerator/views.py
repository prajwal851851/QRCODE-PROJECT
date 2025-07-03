from django.shortcuts import redirect
from rest_framework import viewsets, status
from rest_framework.decorators import action, permission_classes
from rest_framework.response import Response
from .models import Table, Order, WaiterCall
from our_menu.models import Discount, MenuItem, Category, ExtraCharge
from .serializers import TableSerializer, OrderSerializer, DiscountSerializer, WaiterCallSerializer
from our_menu.serializers import MenuItemSerializer, CategorySerializer
from rest_framework.decorators import api_view
from django.utils import timezone
from django.db.models import Q
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
import time
from django.db import models
from django.db.models import Sum, Count, F
from django.utils import timezone
import calendar
import datetime
from collections import Counter
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import get_user_model
from django_filters.rest_framework import DjangoFilterBackend
from InventoryManagement.models import StockOut, IngredientMapping, InventoryItem
from decimal import Decimal


class TableViewSet(viewsets.ModelViewSet):
    queryset = Table.objects.none()
    serializer_class = TableSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        # Allow unauthenticated access to list tables (for public_id lookup)
        if self.action == 'list':
            return [AllowAny()]
        return super().get_permissions()

    def get_queryset(self):
        user = self.request.user
        # Allow unauthenticated access for public table lookup (e.g. order placement)
        if not user.is_authenticated:
            return Table.objects.all()
        if hasattr(user, 'is_employee') and user.is_employee and user.created_by:
            admin_user = user.created_by
        else:
            admin_user = user
        return Table.objects.filter(user=admin_user)


    def perform_create(self, serializer):
        from django.db import IntegrityError
        try:
            user = self.request.user
            # If employee, set user and admin to their admin, and created_by to employee
            if hasattr(user, 'is_employee') and user.is_employee and user.created_by:
                admin_user = user.created_by
                table = serializer.save(user=admin_user, admin=admin_user)
            else:
                table = serializer.save(user=user, admin=user)
            qr_url = f"http://localhost:3003/menu?tableId={table.name}"
            table.qr_code_url = qr_url
            table.save(update_fields=['qr_code_url'])
        except IntegrityError:
            return Response({'error': 'A table with this name already exists for this user.'}, status=400)

    @action(detail=True, methods=['get'])
    def qr_code_url(self, request, pk=None):
        table = self.get_object()
        if not table.qr_code_url:
            qr_url = f"http://localhost:3003/menu?tableId={table.name}"  # Use table.name instead of table.id
            table.qr_code_url = qr_url
            table.save(update_fields=['qr_code_url'])
        return Response({'qr_code_url': table.qr_code_url})

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        public_id = request.query_params.get('public_id')
        name = request.query_params.get('name')
        import uuid
        if public_id:
            try:
                uuid_val = uuid.UUID(public_id)
                queryset = queryset.filter(public_id=uuid_val)
            except (ValueError, TypeError):
                # Not a valid UUID, fallback to name lookup
                queryset = queryset.filter(name=public_id)
        elif name:
            queryset = queryset.filter(name=name)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)



class DiscountViewSet(viewsets.ModelViewSet):
    queryset = Discount.objects.none()
    serializer_class = DiscountSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if hasattr(user, 'is_employee') and user.is_employee and user.created_by:
            admin_user = user.created_by
        else:
            admin_user = user
        return Discount.objects.filter(user=admin_user)

    def perform_create(self, serializer):
        user = self.request.user
        # If employee, set user to their admin
        if hasattr(user, 'is_employee') and user.is_employee and user.created_by:
            admin_user = user.created_by
            serializer.save(user=admin_user)
        else:
            serializer.save(user=user)

    # Optional: Filter discounts to only show active ones or future ones
    # def get_queryset(self):
    #     return Discount.objects.filter(active=True, end_date__gte=timezone.now().date())


@api_view(['GET'])
def menu_redirect_view(request):
    table_id = request.query_params.get('table_id')
    if table_id:
        return redirect(f'http://localhost:3003/menu?tableid={table_id}')
    return Response({'error': 'Missing tableNumber parameter'}, status=400)


def generate_unique_order_id():
    # Get count of orders for today
    today = timezone.now().date()
    count = Order.objects.filter(created_at__date=today).count()
    # Create a shorter timestamp (last 4 digits of current timestamp)
    timestamp = str(int(time.time()))[-4:]
    # Combine timestamp and count to create a unique ID (max 10 chars)
    return f"ORD{timestamp}{count+1:03d}"


class CreateOrderFromMenuView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        try:
            table_name = request.data.get('tableName')
            table_uid = request.data.get('tableUid') or request.data.get('table_uid')
            items = request.data.get('items', [])
            special_instructions = request.data.get('specialInstructions', '')
            customer_name = request.data.get('customerName', '')
            dining_option = request.data.get('diningOption', 'dine-in')

            if not table_name and not table_uid:
                return Response({'error': 'Table identifier (name or UID) is required'}, status=status.HTTP_400_BAD_REQUEST)

            if not items:
                return Response({'error': 'At least one item is required'}, status=status.HTTP_400_BAD_REQUEST)

            # Get the table by public_id (UID) or name
            from qrgenerator.models import Table
            table = None
            import logging
            logger = logging.getLogger('django')
            logger.info(f"Order creation: Received table_uid={table_uid}, table_name={table_name}")
            import uuid
            if table_uid:
                try:
                    uuid_val = uuid.UUID(str(table_uid))
                    table = Table.objects.filter(public_id=uuid_val).first()
                    logger.info(f"Order creation: Table lookup by UID found: {table}")
                except (ValueError, TypeError):
                    logger.info(f"Order creation: {table_uid} is not a valid UUID, trying as name")
                    table = Table.objects.filter(name=table_uid).first()
                    logger.info(f"Order creation: Table lookup by name (from UID) found: {table}")
            if not table and table_name:
                table = Table.objects.filter(name=table_name).first()
                logger.info(f"Order creation: Table lookup by name found: {table}")
            if not table:
                logger.warning(f"Order creation error: Table not found for UID={table_uid}, name={table_name}")
                return Response({'error': 'Table not found'}, status=status.HTTP_404_NOT_FOUND)

            # Calculate total
            total = sum(item['price'] * item['quantity'] for item in items)

            # Fetch admin user for extra charges
            admin_user = table.user
            if hasattr(admin_user, 'is_employee') and admin_user.is_employee and admin_user.created_by:
                admin_user = admin_user.created_by

            # Fetch active extra charges for admin
            extra_charges_qs = ExtraCharge.objects.filter(user=admin_user, active=True)
            extra_charges_applied = [
                {'label': ec.label, 'amount': float(ec.amount)} for ec in extra_charges_qs
            ]
            extra_total = sum(ec['amount'] for ec in extra_charges_applied)
            total_with_extra = total + extra_total

            payment_method = request.data.get('payment_method', 'cash')  # Default to cash if not provided

            # Create the order, storing extra charges breakdown
            order = Order.objects.create(
                table=table,
                items=items,
                total=total_with_extra,
                special_instructions=special_instructions,
                customer_name=customer_name,
                status='pending',
                payment_status='pending',
                payment_method=payment_method,
                dining_option=dining_option,
                user=table.user,  # Assign the admin user to the order
                extra_charges_applied=extra_charges_applied
            )

            # --- STOCK OUT LOGIC ---
            for item in items:
                menu_item_id = item.get('id')
                quantity = Decimal(item.get('quantity', 1))
                if not menu_item_id:
                    continue
                # Get all ingredient mappings for this menu item
                ingredient_mappings = IngredientMapping.objects.filter(dish_id=menu_item_id)
                for mapping in ingredient_mappings:
                    total_ingredient_qty = mapping.quantity * quantity
                    StockOut.objects.create(
                        item=mapping.ingredient,
                        quantity=total_ingredient_qty,
                        date=timezone.now().date(),
                        reason='used',
                        dish=mapping.dish,
                        remarks=f"Auto-deducted for order {order.id}",
                        created_by=table.user
                    )
            # --- END STOCK OUT LOGIC ---

            return Response({
                'message': 'Order created successfully',
                'order': OrderSerializer(order).data
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.none()
    serializer_class = OrderSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['transaction_uuid']

    def get_permissions(self):
        from rest_framework.permissions import AllowAny, IsAuthenticated
        # Allow unauthenticated access for creating, listing, and retrieving orders (customer placement)
        if self.action in ['create', 'list', 'retrieve']:
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        print(f"[OrderViewSet] user: {user} id: {getattr(user, 'id', None)} is_employee: {getattr(user, 'is_employee', None)} created_by: {getattr(user, 'created_by', None)}")
        if not user.is_authenticated:
            print("[OrderViewSet] Not authenticated, returning no orders.")
            return Order.objects.none()
        # Use the same admin-employee linkage logic as TableViewSet
        if hasattr(user, 'is_employee') and user.is_employee and user.created_by:
            admin_user = user.created_by
        else:
            admin_user = user
        print(f"[OrderViewSet] admin_user: {admin_user} id: {getattr(admin_user, 'id', None)}")
        # Get all tables for the admin (Table.user = admin_user)
        admin_tables = Table.objects.filter(user=admin_user)
        print(f"[OrderViewSet] admin_tables: {[t.id for t in admin_tables]}")
        # Show all orders for any table where table.user is this admin (team linkage, matches menu section)
        qs = Order.objects.filter(table__user=admin_user).select_related('table').order_by('-created_at')
        print(f"[OrderViewSet] orders count: {qs.count()}")
        
        # Debug: Check for duplicate order IDs
        order_ids = list(qs.values_list('id', flat=True))
        unique_ids = set(order_ids)
        if len(order_ids) != len(unique_ids):
            print(f"[OrderViewSet] WARNING: Duplicate order IDs found!")
            print(f"[OrderViewSet] Total orders: {len(order_ids)}, Unique orders: {len(unique_ids)}")
            # Find duplicates
            from collections import Counter
            duplicates = [id for id, count in Counter(order_ids).items() if count > 1]
            print(f"[OrderViewSet] Duplicate IDs: {duplicates}")
        
        return qs


    def retrieve(self, request, *args, **kwargs):
        try:
            order = Order.objects.get(pk=kwargs['pk'])
        except Order.DoesNotExist:
            return Response({'detail': 'Order not found.'}, status=404)
        # Allow any user (authenticated or not) to view order details
        serializer = self.get_serializer(order)
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        print(f"[OrderViewSet] Received data: {request.data}")
        
        # Check for existing order with same transaction_uuid to prevent duplicates
        transaction_uuid = request.data.get('transaction_uuid')
        if transaction_uuid:
            existing_order = Order.objects.filter(transaction_uuid=transaction_uuid).first()
            if existing_order:
                print(f"[OrderViewSet] Found existing order with transaction_uuid: {transaction_uuid}")
                # Return the existing order instead of creating a duplicate
                serializer = self.get_serializer(existing_order)
                return Response(serializer.data, status=200)
        
        # Proceed with normal creation if no duplicate found
        try:
            # Validate the data first
            serializer = self.get_serializer(data=request.data)
            if not serializer.is_valid():
                print(f"[OrderViewSet] Validation errors: {serializer.errors}")
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
            return super().create(request, *args, **kwargs)
        except Exception as e:
            print(f"[OrderViewSet] Error creating order: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def perform_create(self, serializer):
        order_id = generate_unique_order_id()
        # Always assign the order to the admin user (table.user), not the employee
        table_id = self.request.data.get('table') or self.request.data.get('table_id')
        table = None
        if table_id:
            try:
                table = Table.objects.get(id=table_id)
            except Table.DoesNotExist:
                pass
        
        # Use the admin user for all orders on this table
        if table and table.user:
            order = serializer.save(id=order_id, user=table.user)
        else:
            order = serializer.save(id=order_id)
        # --- STOCK OUT LOGIC ---
        
        from decimal import Decimal
        from django.utils import timezone
        items = order.items if hasattr(order, 'items') else []
        for item in items:
            menu_item_id = item.get('id')
            quantity = Decimal(item.get('quantity', 1))
            if not menu_item_id:
                continue
            ingredient_mappings = IngredientMapping.objects.filter(dish_id=menu_item_id)
            for mapping in ingredient_mappings:
                total_ingredient_qty = mapping.quantity * quantity
                StockOut.objects.create(
                    item=mapping.ingredient,
                    quantity=total_ingredient_qty,
                    date=timezone.now().date(),
                    reason='used',
                    dish=mapping.dish,
                    remarks=f"Auto-deducted for order {order.id}",
                    created_by=order.user
                )
        # --- END STOCK OUT LOGIC ---

    def perform_update(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        order = self.get_object()
        new_status = request.data.get('status')
        
        if not new_status:
            return Response({'error': 'Status is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        if new_status not in dict(Order.STATUS_CHOICES):
            return Response({'error': 'Invalid status'}, status=status.HTTP_400_BAD_REQUEST)
            
        order.status = new_status
        order.save()
        
        # Here you could add notification logic
        return Response({'status': 'success'})

    @action(detail=True, methods=['post'])
    def update_payment(self, request, pk=None):
        order = self.get_object()
        payment_status = request.data.get('payment_status')
        payment_method = request.data.get('payment_method')
        
        if not payment_status:
            return Response({'error': 'Payment status is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        if payment_status not in dict(Order.PAYMENT_STATUS_CHOICES):
            return Response({'error': 'Invalid payment status'}, status=status.HTTP_400_BAD_REQUEST)
            
        if payment_method and payment_method not in dict(Order.PAYMENT_METHOD_CHOICES):
            return Response({'error': 'Invalid payment method'}, status=status.HTTP_400_BAD_REQUEST)
            
        order.payment_status = payment_status
        if payment_method:
            order.payment_method = payment_method
        order.save()
        
        return Response({'status': 'success'})

    @action(detail=False, methods=['get'])
    def dashboard_stats(self, request):
        user = request.user
        if hasattr(user, 'is_employee') and user.is_employee and user.created_by:
            admin_user = user.created_by
        else:
            admin_user = user
        total_orders = Order.objects.filter(user=admin_user).count()
        pending_orders = Order.objects.filter(user=admin_user, status='pending').count()
        in_progress_orders = Order.objects.filter(user=admin_user, status='in-progress').count()
        completed_orders = Order.objects.filter(user=admin_user, status='completed').count()
        unpaid_orders = Order.objects.filter(user=admin_user, payment_status='pending').count()
        return Response({
            'total_orders': total_orders,
            'pending_orders': pending_orders,
            'in_progress_orders': in_progress_orders,
            'completed_orders': completed_orders,
            'unpaid_orders': unpaid_orders
        })

    @action(detail=False, methods=['get'])
    def dashboard_full_stats(self, request):
        from django.db.models import Sum, Count, F, Q
        from django.utils import timezone
        import datetime
        import calendar
        from collections import Counter
        user = request.user
        if hasattr(user, 'is_employee') and user.is_employee and user.created_by:
            admin_user = user.created_by
        else:
            admin_user = user
        # Date range filter
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        orders = Order.objects.filter(user=admin_user)
        if start_date:
            orders = orders.filter(created_at__date__gte=start_date)
        if end_date:
            orders = orders.filter(created_at__date__lte=end_date)
        # Total revenue (completed orders)
        total_revenue = orders.filter(status='completed').aggregate(total=Sum('total'))['total'] or 0
        # Total orders
        total_orders = orders.count()
        # Total customers (unique customer_name for completed orders)
        total_customers = orders.filter(status='completed').values('customer_name').distinct().count()
        # Active/inactive tables
        active_tables = Table.objects.filter(user=admin_user, active=True).count()
        inactive_tables = Table.objects.filter(user=admin_user, active=False).count()
        # Recent orders
        recent_orders = OrderSerializer(orders.order_by('-created_at')[:5], many=True).data
        # Add currency to recent_orders
        for o in recent_orders:
            o['total'] = f"Rs {o['total']}"
        # Revenue overview (monthly for last 12 months)
        today = timezone.now().date()
        months = []
        revenue_overview = []
        for i in range(11, -1, -1):
            first = (today.replace(day=1) - datetime.timedelta(days=30*i)).replace(day=1)
            last = (first + datetime.timedelta(days=32)).replace(day=1) - datetime.timedelta(days=1)
            month_orders = orders.filter(created_at__date__gte=first, created_at__date__lte=last, status='completed')
            revenue = month_orders.aggregate(total=Sum('total'))['total'] or 0
            months.append(first.strftime('%b %Y'))
            revenue_overview.append({'month': first.strftime('%b %Y'), 'revenue': f"Rs {revenue}"})
        # Most ordered item (aggregate from items JSON field)
        item_counter = Counter()
        for order in orders:
            for item in order.items:
                item_counter[item.get('name')] += item.get('quantity', 1)
        most_ordered_item = None
        if item_counter:
            name, count = item_counter.most_common(1)[0]
            most_ordered_item = {'name': name, 'count': count}
        # Recent activities (last 10 order status changes)
        recent_activities = orders.order_by('-updated_at').values('id', 'status', 'table', 'updated_at')[:10]
        # Month revenue (for chart)
        month_revenue = revenue_overview
        # Order heatmap (by weekday/hour)
        heatmap = {}
        for weekday in range(7):
            heatmap[calendar.day_name[weekday]] = [0]*24
        for o in orders:
            dt = o.created_at
            heatmap[calendar.day_name[dt.weekday()]][dt.hour] += 1
        # Table occupancy rate (approximate)
        total_table_time = 0
        occupied_time = 0
        for t in Table.objects.filter(user=request.user):
            table_orders = orders.filter(table=t)
            if table_orders.exists():
                times = list(table_orders.order_by('created_at').values_list('created_at', flat=True))
                total_table_time += (timezone.now() - times[0]).total_seconds()
                for i in range(1, len(times)):
                    occupied_time += (times[i] - times[i-1]).total_seconds()
        table_occupancy_rate = (occupied_time / total_table_time * 100) if total_table_time else 0
        # Average order value
        average_order_value = (total_revenue / total_orders) if total_orders else 0
        # Top customers
        top_customers = orders.filter(status='completed').values('customer_name').annotate(count=Count('id'), revenue=Sum('total')).order_by('-revenue')[:5]
        # Add currency to top_customers revenue
        for c in top_customers:
            c['revenue'] = f"Rs {c['revenue']}"
        # Order status breakdown
        status_breakdown = orders.values('status').annotate(count=Count('id'))
        # Pending actions
        pending_actions = OrderSerializer(orders.filter(status__in=['pending', 'in-progress']).order_by('-created_at')[:5], many=True).data
        for o in pending_actions:
            o['total'] = f"Rs {o['total']}"
        # Feedback overview (if available)
        feedback_overview = None
        # Inventory alerts (if inventory tracked)
        inventory_alerts = None
        return Response({
            'total_revenue': f"Rs {total_revenue}",
            'total_orders': total_orders,
            'total_customers': total_customers,
            'active_tables': active_tables,
            'inactive_tables': inactive_tables,
            'recent_orders': recent_orders,
            'revenue_overview': revenue_overview,
            'most_ordered_item': most_ordered_item,
            'recent_activities': list(recent_activities),
            'month_revenue': month_revenue,
            'order_heatmap': heatmap,
            'table_occupancy_rate': table_occupancy_rate,
            'average_order_value': f"Rs {average_order_value}",
            'top_customers': list(top_customers),
            'order_status_breakdown': list(status_breakdown),
            'pending_actions': pending_actions,
            'feedback_overview': feedback_overview,
            'inventory_alerts': inventory_alerts,
        })

    def list(self, request, *args, **kwargs):
        # Use the shared get_queryset logic for both admin and employee (team linkage)
        queryset = self.get_queryset()
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['delete'])
    def delete_all(self, request):
        if not request.user.is_staff and not request.user.is_superuser:
            return Response({'error': 'Not authorized'}, status=403)
        Order.objects.all().delete()
        return Response({'status': 'All orders deleted.'})


@api_view(['GET'])
def categorized_menu_view(request):
    """
    API endpoint to get menu items categorized with applied discounts.
    """
    try:
        menu_items = MenuItem.objects.filter(user=request.user, available=True).select_related('category')
        serializer = MenuItemSerializer(menu_items, many=True)
        serialized_menu_items = serializer.data

        # Group items by category
        categorized_data = []
        categories = Category.objects.all()
        for category in categories:
            category_items = [item for item in serialized_menu_items if item['category'] == category.id]
            if category_items:
                # Fetch category details using CategorySerializer
                category_serializer = CategorySerializer(category)
                categorized_data.append({
                    'category': category_serializer.data,
                    'items': category_items
                })

        return Response(categorized_data)

    except Exception as e:
        print(f"Error in categorized_menu_view: {e}")
        return Response({"error": str(e)}, status=500)


@api_view(['GET'])
@permission_classes([AllowAny])
def customer_menu_view(request):
    from our_menu.models import Discount as OurMenuDiscount
    from django.utils import timezone
    table_uid = request.query_params.get('tableUid')
    table_id = request.query_params.get('tableId')
    table = None
    if table_uid:
        try:
            table = Table.objects.get(public_id=table_uid)
        except Table.DoesNotExist:
            return Response({'error': 'Table not found'}, status=404)
    elif table_id:
        tables = Table.objects.filter(name=table_id)
        if tables.exists():
            table = tables.first()
        else:
            try:
                table = Table.objects.get(id=table_id)
            except Table.DoesNotExist:
                return Response({'error': 'Table not found'}, status=404)
    else:
        return Response({'error': 'Missing tableUid or tableId'}, status=400)
    if not table.user:
        return Response({'error': 'Table is not assigned to any admin user.'}, status=400)

    menu_items = MenuItem.objects.filter(user=table.user, available=True)
    today = timezone.now().date()
    # Fetch all active discounts for this admin
    discounts = OurMenuDiscount.objects.filter(
        user=table.user,
        active=True
    ).filter(
        (models.Q(start_date__isnull=True) | models.Q(start_date__lte=today)),
        (models.Q(end_date__isnull=True) | models.Q(end_date__gte=today))
    )

    # Prepare a mapping of item_id to highest discount
    item_discounts = {}
    for discount in discounts:
        applicable_items = discount.applicable_items.all()
        if applicable_items.exists():
            for item in applicable_items:
                if item.id not in item_discounts or discount.discount_percentage > item_discounts[item.id]:
                    item_discounts[item.id] = discount.discount_percentage
        else:
            # Discount applies to all items
            for item in menu_items:
                if item.id not in item_discounts or discount.discount_percentage > item_discounts[item.id]:
                    item_discounts[item.id] = discount.discount_percentage

    # Attach discount_percentage to each menu item
    serialized_items = []
    for item in menu_items:
        discount_percentage = item_discounts.get(item.id, 0)
        item_data = MenuItemSerializer(item).data
        item_data['discount_percentage'] = discount_percentage
        serialized_items.append(item_data)
    
    # Return a response with the restaurant owner's user ID included
    restaurant_user_id = table.user.id
    print(f"Responding with restaurant_user_id: {restaurant_user_id}")
    
    response_data = {
        'items': serialized_items,
        'restaurant_user_id': restaurant_user_id
    }

    return Response(response_data)


class WaiterCallViewSet(viewsets.ModelViewSet):
    queryset = WaiterCall.objects.none()
    serializer_class = WaiterCallSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        # Allow unauthenticated access to create, resolve, list, and active endpoints
        if self.action in ['create', 'resolve', 'list', 'active']:
            return [AllowAny()]
        return super().get_permissions()

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return WaiterCall.objects.all().select_related('table')
        # Team linkage: employees see their admin's tables, admins see their own
        if hasattr(user, 'is_employee') and user.is_employee and user.created_by:
            admin_user = user.created_by
        else:
            admin_user = user
        return WaiterCall.objects.filter(table__user=admin_user).select_related('table')

    def create(self, request, *args, **kwargs):
        table_name = request.data.get('table_name')
        table_id = request.data.get('table_id')
        table_uid = request.data.get('table_uid') or request.data.get('tableUid')
        table = None
        if table_name:
            table = Table.objects.filter(name=table_name).first()
        if not table and table_id:
            table = Table.objects.filter(id=table_id).first()
        if not table and table_uid:
            table = Table.objects.filter(public_id=table_uid).first()
        if not table:
            return Response({'error': 'Table not found'}, status=status.HTTP_404_NOT_FOUND)
        # Only one active call per table
        if WaiterCall.objects.filter(table=table, status='active').exists():
            return Response({'error': 'There is already an active call for this table.'}, status=status.HTTP_400_BAD_REQUEST)
        # Create waiter call with the table's owner as the user
        call = WaiterCall.objects.create(table=table, user=table.user)
        serializer = self.get_serializer(call)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'])
    def active(self, request):
        table_id = request.query_params.get('table_id')
        table_uid = request.query_params.get('table_uid') or request.query_params.get('tableUid')
        calls = WaiterCall.objects.filter(status='active')
        if table_id:
            calls = calls.filter(table__id=table_id)
        elif table_uid:
            calls = calls.filter(table__public_id=table_uid)
        elif request.user.is_authenticated:
            # Handle both admin and employee users
            if hasattr(request.user, 'is_employee') and request.user.is_employee and request.user.created_by:
                admin_user = request.user.created_by
            else:
                admin_user = request.user
            calls = calls.filter(table__user=admin_user)
        else:
            calls = WaiterCall.objects.none()
        calls = calls.select_related('table').order_by('-created_at')
        serializer = self.get_serializer(calls, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        # Allow unauthenticated access to resolve waiter calls
        self.permission_classes = []
        call = self.get_object()
        if call.status == 'resolved':
            return Response({'error': 'Call already resolved.'}, status=status.HTTP_400_BAD_REQUEST)
        call.status = 'resolved'
        call.save()
        return Response({'status': 'resolved'})
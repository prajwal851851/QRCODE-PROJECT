from django.http import JsonResponse, Http404
from django.views import View
from .models import MenuItem, Category, Discount, ExtraCharge
from .serializers import MenuItemSerializer, CategorySerializer, ExtraChargeSerializer
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from django.views.decorators.csrf import ensure_csrf_cookie
from django.utils.decorators import method_decorator
from django.db.models import Q
from django.utils import timezone
from django.shortcuts import render
from rest_framework.decorators import api_view, permission_classes
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated, AllowAny

def root_view(request):
    return JsonResponse({"message": "Welcome to the Restaurant API"})

@method_decorator(ensure_csrf_cookie, name='dispatch')
class CSRFTokenView(View):
    def get(self, request):
        return JsonResponse({"detail": "CSRF cookie set"})

class MenuItemList(APIView):
    def get(self, request):
        # If employee, fetch menu for their admin
        user = request.user
        if hasattr(user, 'is_employee') and user.is_employee and user.created_by:
            admin_user = user.created_by
        else:
            admin_user = user
        items = MenuItem.objects.filter(user=admin_user)
        serializer = MenuItemSerializer(items, many=True)
        return Response(serializer.data)

    def post(self, request):
        # Always save menu items for the admin (not the employee)
        user = request.user
        if hasattr(user, 'is_employee') and user.is_employee and user.created_by:
            admin_user = user.created_by
        else:
            admin_user = user
        serializer = MenuItemSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=admin_user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class MenuItemDetail(APIView):
    def get(self, request, id):
        # If employee, fetch menu item for their admin
        user = request.user
        if hasattr(user, 'is_employee') and user.is_employee and user.created_by:
            admin_user = user.created_by
        else:
            admin_user = user
        try:
            item = MenuItem.objects.get(pk=id, user=admin_user)
        except MenuItem.DoesNotExist:
            raise Http404("MenuItem does not exist")
        serializer = MenuItemSerializer(item)
        return Response(serializer.data)

    def put(self, request, id):
        user = request.user
        if hasattr(user, 'is_employee') and user.is_employee and user.created_by:
            admin_user = user.created_by
        else:
            admin_user = user
        try:
            item = MenuItem.objects.get(pk=id, user=admin_user)
        except MenuItem.DoesNotExist:
            raise Http404("MenuItem does not exist")
        serializer = MenuItemSerializer(item, data=request.data)
        if serializer.is_valid():
            serializer.save(user=admin_user)
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, id):
        user = request.user
        if hasattr(user, 'is_employee') and user.is_employee and user.created_by:
            admin_user = user.created_by
        else:
            admin_user = user
        try:
            item = MenuItem.objects.get(pk=id, user=admin_user)
        except MenuItem.DoesNotExist:
            raise Http404("MenuItem does not exist")
        item.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

class SpecialMenuItemList(APIView):
    def get(self, request):
        specials = MenuItem.objects.filter(is_new=True, user=request.user)
        serializer = MenuItemSerializer(specials, many=True)
        return Response(serializer.data)

class CategoryList(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        if hasattr(user, 'is_employee') and user.is_employee and user.created_by:
            admin_user = user.created_by
        else:
            admin_user = user
        categories = Category.objects.filter(user=admin_user)
        serializer = CategorySerializer(categories, many=True)
        return Response(serializer.data)

    def post(self, request):
        user = request.user
        if hasattr(user, 'is_employee') and user.is_employee and user.created_by:
            admin_user = user.created_by
        else:
            admin_user = user
        # Check for duplicate category name for this user
        name = request.data.get('name')
        if Category.objects.filter(user=admin_user, name__iexact=name).exists():
            return Response({'detail': 'Category already exists for this admin.'}, status=status.HTTP_400_BAD_REQUEST)
        serializer = CategorySerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=admin_user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class CategorizedMenuItemList(APIView):
    """
    API view to return menu items grouped by category, including active discounts.
    """
    permission_classes = [IsAuthenticated]
    def get(self, request):
        if not request.user or not request.user.is_authenticated:
            return Response({'error': 'Authentication required.'}, status=401)
        categories = Category.objects.all()
        data = []
        for category in categories:
            items = MenuItem.objects.filter(category=category, user=request.user)
            serializer = MenuItemSerializer(items, many=True)
            items_with_discounts = serializer.data
            category_serializer = CategorySerializer(category)
            data.append({
                'category': category_serializer.data,
                'items': items_with_discounts
            })
        return Response(data)

class ExtraChargeViewSet(viewsets.ModelViewSet):
    queryset = ExtraCharge.objects.none()
    serializer_class = ExtraChargeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if hasattr(user, 'is_employee') and user.is_employee and user.created_by:
            admin_user = user.created_by
        else:
            admin_user = user
        return ExtraCharge.objects.filter(user=admin_user)

    def get_permissions(self):
        # Employees can only view
        if hasattr(self.request.user, 'is_employee') and self.request.user.is_employee:
            if self.action in ['list', 'retrieve']:
                return [IsAuthenticated()]
            else:
                # Forbid add/edit/delete for employees
                from rest_framework.permissions import BasePermission
                class DenyAll(BasePermission):
                    def has_permission(self, request, view):
                        return False
                return [DenyAll()]
        return super().get_permissions()

    def perform_create(self, serializer):
        user = self.request.user
        # Only allow admin to create
        if hasattr(user, 'is_employee') and user.is_employee:
            raise PermissionDenied("Employees cannot add extra charges.")
        print(f"[DEBUG] Creating ExtraCharge as user: {user} (email: {getattr(user, 'email', None)})")
        serializer.save(user=user)


class ExtraChargesByUserView(APIView):
    """
    API view to return extra charges for a specific user.
    This is used by customer-facing menu pages to show the correct extra charges
    for a specific restaurant/admin.
    """
    permission_classes = []
    
    def get(self, request, user_id):
        # Log user_id for debugging
        print(f"Fetching extra charges for user_id: {user_id}")
        
        # Retrieve extra charges for the specific user
        extra_charges = ExtraCharge.objects.filter(user_id=user_id, active=True)
        print(f"Found {extra_charges.count()} active extra charges")
        
        serializer = ExtraChargeSerializer(extra_charges, many=True)
        return Response(serializer.data)

@api_view(['GET'])
@permission_classes([])
def public_category_list(request):
    user_id = request.GET.get('user_id')
    if not user_id:
        return Response({'detail': 'user_id is required.'}, status=400)
    try:
        user_id_int = int(user_id)
    except (TypeError, ValueError):
        return Response({'detail': 'user_id must be an integer.'}, status=400)
    categories = Category.objects.filter(user_id=user_id_int)
    serializer = CategorySerializer(categories, many=True)
    return Response(serializer.data)
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from qrgenerator.models import Order, Table
from EsewaIntegration.models import EsewaTransaction
from django.db.models import Q

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_payments(request):
    try:
        user = request.user
        admin_user = user.created_by if hasattr(user, 'is_employee') and user.is_employee else user
        admin_tables = Table.objects.filter(user=admin_user)
        orders = Order.objects.filter(
            Q(payment_status='paid') | Q(payment_status='pending'),
            table__in=admin_tables
        ).select_related('table').order_by('-created_at')

        payments = []
        
        for order in orders:
            # Only show completed eSewa transactions
            esewa_txn = EsewaTransaction.objects.filter(order=order, status='COMPLETED').first()
            if esewa_txn:
                # Check if we already added this order via another transaction
                if not any(payment['order']['id'] == order.id for payment in payments):
                    payments.append({
                        'id': f'ESEWA-{esewa_txn.id}',
                        'order': {
                            'id': order.id,
                            'table': order.table.name if order.table else 'N/A',
                            'items': order.items if hasattr(order, 'items') else [],
                        },
                        'amount': float(esewa_txn.amount),
                        'status': 'paid',
                        'payment_method': 'esewa',
                        'created_at': esewa_txn.created_at,
                    })
            elif order.payment_status == 'paid':
                # Check if we already added this order via eSewa transaction
                if not any(payment['order']['id'] == order.id for payment in payments):
                    payments.append({
                        'id': f'ORDER-{order.id}',
                        'order': {
                            'id': order.id,
                            'table': order.table.name if order.table else 'N/A',
                            'items': order.items if hasattr(order, 'items') else [],
                        },
                        'amount': float(order.total),
                        'status': 'paid',
                        'payment_method': order.payment_method or 'cash',
                        'created_at': order.created_at,
                    })
            # Optionally, add pending/unpaid orders if you want

        payments.sort(key=lambda x: x['created_at'], reverse=True)
        return Response(payments)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def toggle_payment_status(request, payment_id):
    try:
        user = request.user
        # Get admin user (either the user themselves or their admin if they're an employee)
        admin_user = user.created_by if hasattr(user, 'is_employee') and user.is_employee else user

        # Get all tables owned by this admin
        admin_tables = Table.objects.filter(user=admin_user)

        # Check if it's an eSewa transaction
        if payment_id.startswith('ESEWA-'):
            transaction_id = payment_id.replace('ESEWA-', '')
            try:
                transaction = EsewaTransaction.objects.get(
                    id=transaction_id,
                    order__table__in=admin_tables
                )
                order = transaction.order
            except EsewaTransaction.DoesNotExist:
                return Response(
                    {'error': 'Payment not found or not authorized'},
                    status=status.HTTP_404_NOT_FOUND
                )
        else:
            # It's a regular order
            order_id = payment_id.replace('ORDER-', '')
            try:
                order = Order.objects.get(
                    id=order_id,
                    table__in=admin_tables
                )
            except Order.DoesNotExist:
                return Response(
                    {'error': 'Payment not found or not authorized'},
                    status=status.HTTP_404_NOT_FOUND
                )

        # Toggle payment status
        order.payment_status = 'unpaid' if order.payment_status == 'paid' else 'paid'
        order.save()

        return Response({
            'status': 'success',
            'message': f'Payment status updated to {order.payment_status}',
            'payment_status': order.payment_status
        })

    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        ) 

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_payment(request, payment_id):
    user = request.user
    admin_user = user.created_by if hasattr(user, 'is_employee') and user.is_employee else user
    admin_tables = Table.objects.filter(user=admin_user)
    try:
        if payment_id.startswith('ESEWA-'):
            transaction_id = payment_id.replace('ESEWA-', '')
            transaction = EsewaTransaction.objects.get(id=transaction_id, order__table__in=admin_tables)
            transaction.delete()
            return Response({'status': 'success', 'message': 'Esewa payment deleted.'})
        elif payment_id.startswith('ORDER-'):
            order_id = payment_id.replace('ORDER-', '')
            order = Order.objects.get(id=order_id, table__in=admin_tables)
            order.delete()
            return Response({'status': 'success', 'message': 'Order payment deleted.'})
        else:
            return Response({'status': 'error', 'message': 'Invalid payment ID.'}, status=400)
    except (EsewaTransaction.DoesNotExist, Order.DoesNotExist):
        return Response({'status': 'error', 'message': 'Payment not found.'}, status=404)
    except Exception as e:
        return Response({'status': 'error', 'message': str(e)}, status=500)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_all_payments(request):
    user = request.user
    admin_user = user.created_by if hasattr(user, 'is_employee') and user.is_employee else user
    admin_tables = Table.objects.filter(user=admin_user)
    try:
        # Delete all EsewaTransactions for this admin
        EsewaTransaction.objects.filter(order__table__in=admin_tables).delete()
        # Delete all Orders for this admin
        Order.objects.filter(table__in=admin_tables).delete()
        return Response({'status': 'success', 'message': 'All payments deleted.'})
    except Exception as e:
        return Response({'status': 'error', 'message': str(e)}, status=500)
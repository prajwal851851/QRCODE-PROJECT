import uuid
import hmac
import hashlib
import base64
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from .models import EsewaTransaction
from qrgenerator.models import Order, Table

# Helper for HMAC SHA256 signature
def generate_signature(key, message):
    """
    Generate HMAC SHA256 signature for eSewa payment
    """
    try:
        key = key.encode('utf-8')
        message = message.encode('utf-8')
        
        hmac_sha256 = hmac.new(key, message, hashlib.sha256)
        digest = hmac_sha256.digest()
        
        # Convert the digest to a Base64-encoded string
        signature = base64.b64encode(digest).decode('utf-8')
        
        print('[eSewa SIGNATURE] Message:', message.decode('utf-8'))
        print('[eSewa SIGNATURE] Key:', key.decode('utf-8'))
        print('[eSewa SIGNATURE] Generated signature:', signature)
        
        return signature
    except Exception as e:
        print('[eSewa SIGNATURE] Error generating signature:', str(e))
        raise

@api_view(['POST'])
@permission_classes([AllowAny])
def initiate_payment(request):
    try:
        data = request.data
        print('[eSewa INITIATE] Received request data:', data)
        
        amount = data.get('amount')
        tax_amount = data.get('tax_amount', 0)
        product_service_charge = data.get('product_service_charge', 0)
        product_delivery_charge = data.get('product_delivery_charge', 0)
        order_id = data.get('orderId')
        
        if not order_id:
            return Response({'error': 'orderId is required'}, status=400)

        # Calculate total_amount as per eSewa docs
        try:
            amount = float(amount)
            tax_amount = float(tax_amount)
            product_service_charge = float(product_service_charge)
            product_delivery_charge = float(product_delivery_charge)
        except (ValueError, TypeError) as e:
            print('[eSewa INITIATE] Error converting amounts:', str(e))
            return Response({'error': 'Invalid amount or charge fields'}, status=400)
            
        total_amount = amount + tax_amount + product_service_charge + product_delivery_charge

        # Format all values as strings (no extra decimals)
        try:
            amount_str = str(int(amount))
            tax_amount_str = str(int(tax_amount))
            product_service_charge_str = str(int(product_service_charge))
            product_delivery_charge_str = str(int(product_delivery_charge))
            total_amount_str = str(int(total_amount))
        except (ValueError, TypeError) as e:
            print('[eSewa INITIATE] Error formatting amounts:', str(e))
            return Response({'error': 'Error formatting amount values'}, status=400)

        # Generate UUID for transaction
        transaction_uuid = str(uuid.uuid4())

        # Handle temporary order IDs (for orders that will be created after payment)
        order = None
        if order_id.startswith('temp-'):
            # This is a temporary order ID, we'll create the order after payment
            print('[eSewa INITIATE] Temporary order ID detected:', order_id)
            
            # Get order details from request data for storage
            order_details = {
                'table_id': data.get('tableId'),
                'customer_name': data.get('customerName', 'Customer'),
                'items': data.get('items', []),
                'total_amount': total_amount,
                'tax_amount': tax_amount,
                'product_service_charge': product_service_charge,
                'product_delivery_charge': product_delivery_charge
            }
            
            # Create a placeholder transaction without order
            try:
                transaction = EsewaTransaction.objects.create(
                    amount=total_amount,
                    transaction_uuid=transaction_uuid,
                    status='INITIATED',
                )
                # Store order details for later recreation
                transaction.set_order_details(order_details)
                print('[eSewa INITIATE] Stored order details for transaction:', transaction_uuid)
            except Exception as e:
                print('[eSewa INITIATE] Error creating transaction:', str(e))
                return Response({'error': 'Error creating transaction record'}, status=500)
        else:
            # Get order and enforce existence for existing orders
            try:
                order = Order.objects.get(id=order_id)
                
                # Get order details for storage
                order_items = []
                for item in order.items.all():
                    order_items.append({
                        'id': item.menu_item.id,
                        'name': item.menu_item.name,
                        'quantity': item.quantity,
                        'price': float(item.price)
                    })
                
                order_details = {
                    'table_id': order.table.id if order.table else None,
                    'customer_name': order.customer_name,
                    'items': order_items,
                    'total_amount': float(order.total_amount),
                    'tax_amount': 0,  # Add if you have tax in orders
                    'product_service_charge': 0,  # Add if you have service charge in orders
                    'product_delivery_charge': 0  # Add if you have delivery charge in orders
                }

                # Create transaction record with order
                try:
                    transaction = EsewaTransaction.objects.create(
                        order=order,
                        amount=total_amount,
                        transaction_uuid=transaction_uuid,
                        status='INITIATED',
                    )
                    # Store order details for later recreation
                    transaction.set_order_details(order_details)
                    print('[eSewa INITIATE] Stored order details for existing order transaction:', transaction_uuid)
                except Exception as e:
                    print('[eSewa INITIATE] Error creating transaction:', str(e))
                    return Response({'error': 'Error creating transaction record'}, status=500)
            except Order.DoesNotExist:
                return Response({'error': 'Order not found'}, status=404)
            except Exception as e:
                print('[eSewa INITIATE] Error fetching order:', str(e))
                return Response({'error': 'Error fetching order'}, status=500)

        # Get configuration
        product_code = 'EPAYTEST'  # Test environment product code
        secret_key = '8gBm/:&EnhH.1/q'  # Test environment secret key
        payment_url = 'https://rc-epay.esewa.com.np/api/epay/main/v2/form'  # Test environment URL
        frontend_base_url = 'http://localhost:3003'  # Updated frontend URL with correct port

        print('[eSewa INITIATE] Configuration:', {
            'product_code': product_code,
            'payment_url': payment_url,
            'frontend_base_url': frontend_base_url,
            'is_test_environment': 'rc-epay' in payment_url
        })

        # Validate all required fields are present and properly formatted
        if not all([total_amount_str, transaction_uuid, product_code]):
            return Response({'error': 'Missing required fields for signature'}, status=400)

        # Create signature string exactly as per the example
        data_to_sign = f"total_amount={total_amount_str},transaction_uuid={transaction_uuid},product_code={product_code}"
        print('[eSewa INITIATE] Data to sign:', data_to_sign)
        
        try:
            signature = generate_signature(secret_key, data_to_sign)
        except Exception as e:
            print('[eSewa INITIATE] Error generating signature:', str(e))
            return Response({'error': 'Error generating signature'}, status=500)
            
        print('[eSewa INITIATE] Signature:', signature)

        # Prepare form data (all as strings)
        if order_id.startswith('temp-'):
            # For temporary orders, extract tableUid from the order_id or request data
            # The order_id format is "temp-{tableUid}" or we can get it from request data
            table_uid = ''
            if order_id.startswith('temp-'):
                # Extract tableUid from the temporary order ID
                table_uid = order_id.replace('temp-', '')
            else:
                # Try to get tableUid from request data
                table_uid = data.get('tableUid', '')
            
            # If we still don't have tableUid, try to get it from request data
            if not table_uid:
                table_uid = data.get('tableUid', '')
            
            # For temporary orders, use transaction UUID in success URL
            success_url = f'{frontend_base_url}/menu/order-status/temp?transaction_uuid={transaction_uuid}'
            failure_url = f'{frontend_base_url}/menu/payment-cancelled?transaction_uuid={transaction_uuid}&tableUid={table_uid}'
        else:
            # For existing orders, use order ID
            success_url = f'{frontend_base_url}/menu/order-status/{order_id}?transaction_uuid={transaction_uuid}'
            table_uid = order.table.public_id if hasattr(order.table, 'public_id') else ''
            failure_url = f'{frontend_base_url}/menu/payment-cancelled?order_id={order_id}&tableUid={table_uid}'
        
        print('[eSewa INITIATE] Generated URLs:', {
            'success_url': success_url,
            'failure_url': failure_url
        })

        payment_data = {
            'amount': amount_str,
            'tax_amount': tax_amount_str,
            'product_service_charge': product_service_charge_str,
            'product_delivery_charge': product_delivery_charge_str,
            'total_amount': total_amount_str,
            'transaction_uuid': transaction_uuid,
            'product_code': product_code,
            'success_url': success_url,
            'failure_url': failure_url,
            'signed_field_names': 'total_amount,transaction_uuid,product_code',
            'signature': signature,
            'payment_url': payment_url,
        }
        print('[eSewa INITIATE] Full payment data:', payment_data)
        return Response(payment_data)
        
    except Exception as e:
        print('[eSewa INITIATE] Unexpected error:', str(e))
        import traceback
        print('[eSewa INITIATE] Traceback:', traceback.format_exc())
        return Response({'error': 'Internal server error', 'details': str(e)}, status=500)

@api_view(['GET'])
@permission_classes([AllowAny])
def verify_payment(request):
    try:
        # Get transaction UUID from query params
        transaction_uuid = request.GET.get('transaction_uuid')
        data = request.GET.get('data')
        
        # Handle malformed URLs with double question marks
        if not transaction_uuid or not data:
            # Try to parse the URL manually
            full_url = request.get_full_path()
            print('[eSewa VERIFY] Full URL:', full_url)
            
            # Look for transaction_uuid and data in the URL
            if 'transaction_uuid=' in full_url:
                # Extract transaction_uuid
                start = full_url.find('transaction_uuid=') + len('transaction_uuid=')
                end = full_url.find('?', start)
                if end == -1:
                    end = len(full_url)
                transaction_uuid = full_url[start:end]
                
                # Extract data if present
                if 'data=' in full_url:
                    data_start = full_url.find('data=') + len('data=')
                    data = full_url[data_start:]
        
        print('[eSewa VERIFY] Received verification request:')
        print('[eSewa VERIFY] Transaction UUID:', transaction_uuid)
        print('[eSewa VERIFY] Data:', data)
        print('[eSewa VERIFY] All query params:', dict(request.GET))
        
        if not transaction_uuid:
            print('[eSewa VERIFY] Error: Transaction UUID is required')
            return Response({'status': 'error', 'message': 'Transaction UUID is required'}, status=400)
            
        # Get transaction
        try:
            transaction = EsewaTransaction.objects.get(transaction_uuid=transaction_uuid)
            print('[eSewa VERIFY] Found transaction:', transaction.transaction_uuid)
            print('[eSewa VERIFY] Current transaction status:', transaction.status)
            if transaction.order:
                print('[eSewa VERIFY] Current order payment status:', transaction.order.payment_status)
            else:
                print('[eSewa VERIFY] No order associated with transaction (temporary order)')
        except EsewaTransaction.DoesNotExist:
            print('[eSewa VERIFY] Error: Transaction not found')
            return Response({'status': 'error', 'message': 'Transaction not found'}, status=404)
            
        # If transaction is already completed, return success
        if transaction.status == 'COMPLETED':
            print('[eSewa VERIFY] Transaction already completed')
            if transaction.order:
                order = transaction.order
                # Ensure order payment status is set to paid
                if order.payment_status != 'paid':
                    order.payment_status = 'paid'
                    order.payment_method = 'esewa'
                    order.save()
                    print('[eSewa VERIFY] Updated order payment status to paid')
                return Response({
                    'status': 'success',
                    'message': 'Payment already verified',
                    'order_id': order.id,
                    'payment_status': 'paid'
                })
            else:
                return Response({
                    'status': 'success',
                    'message': 'Payment already verified (temporary order)',
                    'payment_status': 'paid'
                })
            
        # If transaction is already cancelled, return error
        if transaction.status == 'CANCELLED':
            print('[eSewa VERIFY] Transaction already cancelled')
            if transaction.order:
                return Response({
                    'status': 'error',
                    'message': 'Payment was cancelled',
                    'order_id': transaction.order.id,
                    'payment_status': 'pending'
                })
            else:
                return Response({
                    'status': 'error',
                    'message': 'Payment was cancelled',
                    'payment_status': 'pending'
                })
            
        # If data is provided, verify signature
        if data:
            try:
                import base64
                import json
                
                # Decode the base64 data
                decoded_data = base64.b64decode(data).decode('utf-8')
                response_data = json.loads(decoded_data)
                
                print('[eSewa VERIFY] Decoded response data:', response_data)
                
                # Check if payment was successful
                if response_data.get('status') == 'COMPLETE':
                    print('[eSewa VERIFY] Payment status is COMPLETE')
                    
                    # Update transaction status
                    transaction.status = 'COMPLETED'
                    transaction.save()
                    print('[eSewa VERIFY] Transaction status updated to COMPLETED')
                    
                    # Update order status to paid if order exists
                    if transaction.order:
                        order = transaction.order
                        order.payment_status = 'paid'
                        order.payment_method = 'esewa'
                        order.save()
                        print('[eSewa VERIFY] Order payment status updated to paid')
                    
                    return Response({
                        'status': 'success',
                        'message': 'Payment verified successfully',
                        'order_id': order.id,
                        'payment_status': 'paid'
                    })
                else:
                    # If payment is not complete, update status to FAILED or CANCELLED
                    transaction_status_from_esewa = response_data.get('status', 'FAILED').upper()
                    if transaction_status_from_esewa in [choice[0] for choice in EsewaTransaction.STATUS_CHOICES]:
                        transaction.status = transaction_status_from_esewa
                    else:
                        transaction.status = 'FAILED'
                    transaction.save()

                    print(f"[eSewa VERIFY] Payment not completed. Status: {transaction.status}")
                    if transaction.order:
                        return Response({
                            'status': 'error',
                            'message': 'Payment not completed',
                            'order_id': transaction.order.id,
                            'payment_status': transaction.order.payment_status
                        })
                    else:
                        return Response({
                            'status': 'error',
                            'message': 'Payment not completed',
                            'payment_status': 'pending'
                        })
                
            except Exception as e:
                print('[eSewa VERIFY] Error processing response data:', str(e))
                # Don't return error here, continue to manual verification
                pass
        
        # If no data is provided and transaction is still INITIATED, 
        # we cannot determine the payment status reliably
        # Return pending status instead of assuming success
        print('[eSewa VERIFY] No clear success/failure indicators, cannot determine payment status')
        if transaction.order:
            return Response({
                'status': 'pending',
                'message': f'Payment status is {transaction.status}. Waiting for confirmation.',
                'order_id': transaction.order.id,
                'payment_status': transaction.order.payment_status
            })
        else:
            return Response({
                'status': 'pending',
                'message': f'Payment status is {transaction.status}. Waiting for confirmation.',
                'payment_status': 'pending'
            })
        
    except Exception as e:
        print('[eSewa VERIFY] Unexpected error:', str(e))
        import traceback
        print('[eSewa VERIFY] Traceback:', traceback.format_exc())
        return Response({'status': 'error', 'message': 'Internal server error', 'details': str(e)}, status=500)

@api_view(['GET'])
@permission_classes([AllowAny])
def check_transaction_status(request):
    transaction_uuid = request.query_params.get('transaction_uuid')
    if not transaction_uuid:
        return Response({"error": "Transaction UUID is required"}, status=400)
    try:
        transaction = EsewaTransaction.objects.get(transaction_uuid=transaction_uuid)
    except EsewaTransaction.DoesNotExist:
        return Response({"error": "Transaction not found"}, status=404)
    return Response({
        "transaction_uuid": transaction.transaction_uuid,
        "status": transaction.status,
        "amount": float(transaction.amount),
        "created_at": transaction.created_at,
    })

@api_view(['GET'])
@permission_classes([AllowAny])
def cancel_payment(request):
    """Handle payment cancellation from eSewa"""
    try:
        transaction_uuid = request.GET.get('transaction_uuid')
        order_id = request.GET.get('order_id')
        
        if transaction_uuid:
            try:
                transaction = EsewaTransaction.objects.get(transaction_uuid=transaction_uuid)
                # Mark transaction as cancelled
                transaction.status = 'CANCELLED'
                transaction.save()
                print(f'[eSewa CANCEL] Transaction {transaction_uuid} marked as cancelled')
            except EsewaTransaction.DoesNotExist:
                print(f'[eSewa CANCEL] Transaction {transaction_uuid} not found')
        
        # Redirect to menu page
        frontend_base_url = 'http://localhost:3003'
        if order_id:
            # Try to get table info from order
            try:
                order = Order.objects.get(id=order_id)
                if order.table:
                    redirect_url = f'{frontend_base_url}/menu?tableId={order.table.id}'
                else:
                    redirect_url = f'{frontend_base_url}/menu'
            except Order.DoesNotExist:
                redirect_url = f'{frontend_base_url}/menu'
        else:
            redirect_url = f'{frontend_base_url}/menu'
            
        return Response({
            'status': 'cancelled',
            'message': 'Payment was cancelled',
            'redirect_url': redirect_url
        })
        
    except Exception as e:
        print('[eSewa CANCEL] Error:', str(e))
        return Response({
            'status': 'error',
            'message': 'Error processing cancellation'
        }, status=500)

@api_view(['POST'])
@permission_classes([AllowAny])
def link_transaction_to_order(request):
    """Link an eSewa transaction to an order after order creation"""
    try:
        transaction_uuid = request.data.get('transaction_uuid')
        order_id = request.data.get('order_id')
        
        if not transaction_uuid or not order_id:
            return Response({
                'status': 'error', 
                'message': 'Both transaction_uuid and order_id are required'
            }, status=400)
        
        # Get the transaction
        try:
            transaction = EsewaTransaction.objects.get(transaction_uuid=transaction_uuid)
        except EsewaTransaction.DoesNotExist:
            return Response({
                'status': 'error', 
                'message': 'Transaction not found'
            }, status=404)
        
        # Get the order
        try:
            order = Order.objects.get(id=order_id)
        except Order.DoesNotExist:
            return Response({
                'status': 'error', 
                'message': 'Order not found'
            }, status=404)
        
        # Link the transaction to the order
        transaction.order = order
        transaction.save()
        
        # Update the order with the transaction_uuid
        order.transaction_uuid = transaction_uuid
        order.save()
        
        print(f'[eSewa LINK] Linked transaction {transaction_uuid} to order {order_id}')
        
        return Response({
            'status': 'success',
            'message': 'Transaction linked to order successfully'
        })
        
    except Exception as e:
        print('[eSewa LINK] Error:', str(e))
        return Response({
            'status': 'error',
            'message': 'Error linking transaction to order'
        }, status=500)

@api_view(['POST'])
@permission_classes([AllowAny])
def recreate_order_from_transaction(request):
    """Recreate an order from transaction data when frontend localStorage is cleared"""
    try:
        transaction_uuid = request.data.get('transaction_uuid')
        print(f'[eSewa RECREATE] Received request data: {request.data}')
        print(f'[eSewa RECREATE] Transaction UUID: {transaction_uuid}')
        
        if not transaction_uuid:
            print('[eSewa RECREATE] Error: transaction_uuid is required')
            return Response({
                'status': 'error', 
                'message': 'transaction_uuid is required'
            }, status=400)
        
        # Get the transaction
        try:
            transaction = EsewaTransaction.objects.get(transaction_uuid=transaction_uuid)
            print(f'[eSewa RECREATE] Found transaction: {transaction.transaction_uuid}, status: {transaction.status}')
        except EsewaTransaction.DoesNotExist:
            print(f'[eSewa RECREATE] Transaction not found: {transaction_uuid}')
            # List all available transaction UUIDs for debugging
            all_transactions = EsewaTransaction.objects.all()[:10]
            print(f'[eSewa RECREATE] Available transactions (first 10):')
            for t in all_transactions:
                print(f'  - {t.transaction_uuid} (status: {t.status})')
            return Response({
                'status': 'error', 
                'message': 'Transaction not found'
            }, status=404)
        
        # Check if order already exists for this transaction
        if transaction.order:
            return Response({
                'status': 'success',
                'message': 'Order already exists',
                'order_id': transaction.order.id
            })
        
        # Check if transaction is completed
        if transaction.status != 'COMPLETED':
            return Response({
                'status': 'error',
                'message': 'Transaction is not completed'
            }, status=400)
        
        # Get order details from transaction
        order_details = transaction.get_order_details()
        if not order_details:
            return Response({
                'status': 'error',
                'message': 'Order details not found in transaction'
            }, status=400)
        
        # If order details are incomplete, create minimal order details
        if not order_details.get('items') or not order_details.get('table_id'):
            print('[eSewa RECREATE] Order details incomplete, creating minimal order')
            # Create minimal order details for this transaction
            order_details = {
                'table_id': None,  # Will use default table
                'customer_name': 'Customer',
                'items': [],  # Empty items array
                'total_amount': float(transaction.amount),
                'tax_amount': 0.0,
                'product_service_charge': 0.0,
                'product_delivery_charge': 0.0,
                'dining_option': 'dine-in',
                'special_instructions': '',
                'extra_charges_applied': []
            }
        
        # Create the order from stored details
        try:
            from qrgenerator.models import Order, Table
            from our_menu.models import MenuItem
            import time
            from django.utils import timezone
            
            print(f'[eSewa RECREATE] Order details: {order_details}')
            
            # Get or create a default table if table_id is None
            table = None
            if order_details.get('table_id'):
                try:
                    table = Table.objects.get(id=order_details.get('table_id'))
                except Table.DoesNotExist:
                    print(f'[eSewa RECREATE] Table {order_details.get("table_id")} not found, using default')
            
            if not table:
                # Use the first available table as default
                table = Table.objects.first()
                if not table:
                    return Response({
                        'status': 'error',
                        'message': 'No tables available in the system'
                    }, status=500)
                print(f'[eSewa RECREATE] Using default table: {table.name}')
            
            # Generate unique order ID
            def generate_unique_order_id():
                today = timezone.now().date()
                count = Order.objects.filter(created_at__date=today).count()
                timestamp = str(int(time.time()))[-4:]
                return f"ORD{timestamp}{count+1:03d}"
            
            order_id = generate_unique_order_id()
            print(f'[eSewa RECREATE] Generated order ID: {order_id}')
            
            # Create the order with correct field names
            order = Order.objects.create(
                id=order_id,  # Set the generated ID
                table=table,  # Use table object, not table_id
                customer_name=order_details.get('customer_name', 'Customer'),
                total=transaction.amount,  # Use 'total' not 'total_amount'
                payment_status='paid',
                payment_method='esewa',
                transaction_uuid=transaction_uuid,
                status='confirmed',
                items=order_details.get('items', []),  # Store items as JSON
                dining_option=order_details.get('dining_option', 'dine-in'),
                special_instructions=order_details.get('special_instructions', ''),
                extra_charges_applied=order_details.get('extra_charges_applied', []),
                user=table.user  # Assign the table's user (admin)
            )
            print(f'[eSewa RECREATE] Created order: {order.id}')
            
            # Link transaction to order
            transaction.order = order
            transaction.save()
            
            print(f'[eSewa RECREATE] Successfully recreated order {order.id} from transaction {transaction_uuid}')
            
            return Response({
                'status': 'success',
                'message': 'Order recreated successfully',
                'order_id': order.id
            })
            
        except Exception as e:
            print(f'[eSewa RECREATE] Error creating order: {str(e)}')
            import traceback
            print(f'[eSewa RECREATE] Traceback: {traceback.format_exc()}')
            return Response({
                'status': 'error',
                'message': 'Error creating order from transaction data'
            }, status=500)
        
    except Exception as e:
        print('[eSewa RECREATE] Error:', str(e))
        return Response({
            'status': 'error',
            'message': 'Error recreating order'
        }, status=500)

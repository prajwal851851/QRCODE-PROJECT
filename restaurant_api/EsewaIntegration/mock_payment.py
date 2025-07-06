"""
Mock eSewa Payment System for Testing
Use this when you don't have real eSewa credentials
"""

import time
import random
from datetime import datetime
from django.conf import settings

class MockEsewaPayment:
    """Mock eSewa payment system for testing"""
    
    def __init__(self):
        self.success_rate = 0.8  # 80% success rate for testing
        self.test_transactions = {}
    
    def initiate_payment(self, order_id, amount, product_code, success_url, failure_url):
        """
        Mock payment initiation
        Returns a mock payment URL that simulates eSewa
        """
        transaction_id = f"mock_{order_id}_{int(time.time())}"
        
        # Store transaction details
        self.test_transactions[transaction_id] = {
            'order_id': order_id,
            'amount': amount,
            'product_code': product_code,
            'status': 'PENDING',
            'created_at': datetime.now(),
            'success_url': success_url,
            'failure_url': failure_url
        }
        
        # Return mock payment URL
        mock_payment_url = f"{settings.FRONTEND_BASE_URL}/mock-payment/{transaction_id}"
        
        return {
            'success': True,
            'payment_url': mock_payment_url,
            'transaction_id': transaction_id,
            'message': 'Mock payment initiated successfully'
        }
    
    def process_callback(self, transaction_id, status='SUCCESS'):
        """
        Process mock payment callback
        """
        if transaction_id not in self.test_transactions:
            return {
                'success': False,
                'message': 'Transaction not found'
            }
        
        transaction = self.test_transactions[transaction_id]
        
        # Simulate payment processing
        if status == 'SUCCESS':
            transaction['status'] = 'COMPLETE'
            transaction['completed_at'] = datetime.now()
            transaction['reference_id'] = f"REF_{random.randint(100000, 999999)}"
            
            return {
                'success': True,
                'status': 'COMPLETE',
                'transaction_id': transaction_id,
                'reference_id': transaction['reference_id'],
                'amount': transaction['amount'],
                'message': 'Payment completed successfully'
            }
        
        elif status == 'FAILURE':
            transaction['status'] = 'FAILED'
            transaction['failed_at'] = datetime.now()
            
            return {
                'success': False,
                'status': 'FAILED',
                'transaction_id': transaction_id,
                'message': 'Payment failed'
            }
        
        elif status == 'CANCELLED':
            transaction['status'] = 'CANCELLED'
            transaction['cancelled_at'] = datetime.now()
            
            return {
                'success': False,
                'status': 'CANCELLED',
                'transaction_id': transaction_id,
                'message': 'Payment cancelled by user'
            }
    
    def get_transaction_status(self, transaction_id):
        """
        Get mock transaction status
        """
        if transaction_id not in self.test_transactions:
            return None
        
        return self.test_transactions[transaction_id]
    
    def simulate_payment_result(self, transaction_id):
        """
        Simulate random payment result for testing
        """
        if transaction_id not in self.test_transactions:
            return None
        
        # Random result based on success rate
        if random.random() < self.success_rate:
            return self.process_callback(transaction_id, 'SUCCESS')
        else:
            return self.process_callback(transaction_id, 'FAILURE')

# Global mock payment instance
mock_payment = MockEsewaPayment() 
"""
SQLAlchemy models for subscriptions and payments.

These map to the Supabase tables created in the
`add_subscriptions_and_payments` migration.
"""

from sqlalchemy import Column, String, Integer, DateTime, text
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    user_id = Column(String, nullable=False, unique=True, index=True)
    plan = Column(String(20), nullable=False, server_default="free")          # free | pro_daily | pro_monthly | pro_annual
    status = Column(String(20), nullable=False, server_default="active")      # active | expired | cancelled
    starts_at = Column(DateTime(timezone=True), server_default=text("NOW()"))
    expires_at = Column(DateTime(timezone=True), nullable=True)
    razorpay_order_id = Column(String(255), nullable=True)
    razorpay_payment_id = Column(String(255), nullable=True)
    razorpay_subscription_id = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=text("NOW()"))
    updated_at = Column(DateTime(timezone=True), server_default=text("NOW()"))


class Payment(Base):
    __tablename__ = "payments"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    user_id = Column(String, nullable=False, index=True)
    razorpay_order_id = Column(String(255), nullable=True)
    razorpay_payment_id = Column(String(255), nullable=True)
    razorpay_signature = Column(String(255), nullable=True)
    razorpay_subscription_id = Column(String(255), nullable=True)
    amount = Column(Integer, nullable=False)                                   # in paise (44900 = ₹449)
    currency = Column(String(10), nullable=False, server_default="INR")
    plan = Column(String(20), nullable=False)
    status = Column(String(20), nullable=False, server_default="created")      # created | paid | failed
    created_at = Column(DateTime(timezone=True), server_default=text("NOW()"))

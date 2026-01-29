'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Group,
  SendDiagonal,
  DollarCircle,
  WarningTriangle,
  ArrowRight,
  GraphUp,
} from 'iconoir-react';
import { adminApi, DashboardMetrics } from '@/services/admin-api';
import LoadingPanel from '@/components/LoadingPanel';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: { value: string; positive: boolean };
  href?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  href,
}) => {
  const content = (
    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 bg-gray-100 rounded-lg">{icon}</div>
        {trend && (
          <div
            className={`flex items-center gap-1 text-sm font-medium ${
              trend.positive ? 'text-green-600' : 'text-red-600'
            }`}
          >
            <GraphUp
              className={`w-4 h-4 ${!trend.positive ? 'rotate-180' : ''}`}
            />
            {trend.value}
          </div>
        )}
      </div>
      <p className="text-sm text-gray-500 mb-1">{title}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      {href && (
        <div className="flex items-center gap-1 text-sm text-[#5E53E0] mt-3 font-medium">
          View details
          <ArrowRight className="w-4 h-4" />
        </div>
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
};

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchMetrics = async () => {
      const response = await adminApi.getDashboardMetrics();
      if (response.data) {
        setMetrics(response.data);
      } else if (response.error) {
        setError(response.error.message);
      }
      setIsLoading(false);
    };

    fetchMetrics();
  }, []);

  if (isLoading) {
    return <LoadingPanel />;
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        {error}
      </div>
    );
  }

  // Handle case where metrics endpoint returns empty or backend not ready
  const displayMetrics: DashboardMetrics = metrics || {
    users: { total: 0, active: 0, suspended: 0, pendingKyc: 0 },
    transfers: { total: 0, activeToday: 0, completedToday: 0, expiredToday: 0 },
    payments: { totalRevenue: 0, revenueToday: 0, pendingPayouts: 0 },
    disputes: { open: 0, underReview: 0, resolvedToday: 0 },
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard Overview</h2>
        <p className="text-gray-500 mt-1">Monitor platform activity and key metrics</p>
      </div>

      {/* Users Section */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Users</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Users"
            value={displayMetrics.users.total.toLocaleString()}
            icon={<Group className="w-5 h-5 text-gray-600" />}
            href="/admin/users"
          />
          <MetricCard
            title="Active Users"
            value={displayMetrics.users.active.toLocaleString()}
            icon={<Group className="w-5 h-5 text-green-600" />}
          />
          <MetricCard
            title="Suspended"
            value={displayMetrics.users.suspended}
            icon={<Group className="w-5 h-5 text-red-600" />}
          />
          <MetricCard
            title="Pending KYC"
            value={displayMetrics.users.pendingKyc}
            icon={<Group className="w-5 h-5 text-yellow-600" />}
          />
        </div>
      </section>

      {/* Transfers Section */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Transfers</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Transfers"
            value={displayMetrics.transfers.total.toLocaleString()}
            icon={<SendDiagonal className="w-5 h-5 text-gray-600" />}
            href="/admin/transfers"
          />
          <MetricCard
            title="Active Today"
            value={displayMetrics.transfers.activeToday}
            icon={<SendDiagonal className="w-5 h-5 text-blue-600" />}
          />
          <MetricCard
            title="Completed Today"
            value={displayMetrics.transfers.completedToday}
            icon={<SendDiagonal className="w-5 h-5 text-green-600" />}
          />
          <MetricCard
            title="Expired Today"
            value={displayMetrics.transfers.expiredToday}
            icon={<SendDiagonal className="w-5 h-5 text-gray-400" />}
          />
        </div>
      </section>

      {/* Payments Section */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Payments</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard
            title="Total Revenue"
            value={formatCurrency(displayMetrics.payments.totalRevenue)}
            icon={<DollarCircle className="w-5 h-5 text-gray-600" />}
          />
          <MetricCard
            title="Revenue Today"
            value={formatCurrency(displayMetrics.payments.revenueToday)}
            icon={<DollarCircle className="w-5 h-5 text-green-600" />}
          />
          <MetricCard
            title="Pending Payouts"
            value={formatCurrency(displayMetrics.payments.pendingPayouts)}
            icon={<DollarCircle className="w-5 h-5 text-yellow-600" />}
          />
        </div>
      </section>

      {/* Disputes Section */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Disputes</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard
            title="Open Disputes"
            value={displayMetrics.disputes.open}
            icon={<WarningTriangle className="w-5 h-5 text-red-600" />}
            href="/admin/disputes"
          />
          <MetricCard
            title="Under Review"
            value={displayMetrics.disputes.underReview}
            icon={<WarningTriangle className="w-5 h-5 text-yellow-600" />}
          />
          <MetricCard
            title="Resolved Today"
            value={displayMetrics.disputes.resolvedToday}
            icon={<WarningTriangle className="w-5 h-5 text-green-600" />}
          />
        </div>
      </section>
    </div>
  );
}

import { useState, useEffect } from 'react';
import {
  MdTrendingUp,
  MdTrendingDown,
  MdStore,
  MdPeople,
  MdCalendarToday,
  MdAttachMoney,
  MdBarChart,
  MdShowChart,
} from 'react-icons/md';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import api from '../utils/api';

export default function Analytics() {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalBookings: 0,
    totalSalons: 0,
    totalUsers: 0,
    revenueGrowth: 0,
    bookingsGrowth: 0,
  });
  const [loading, setLoading] = useState(true);

  // Sample data for charts
  const revenueData = [
    { month: 'Jan', revenue: 45000, bookings: 120 },
    { month: 'Feb', revenue: 52000, bookings: 145 },
    { month: 'Mar', revenue: 48000, bookings: 132 },
    { month: 'Apr', revenue: 61000, bookings: 168 },
    { month: 'May', revenue: 55000, bookings: 152 },
    { month: 'Jun', revenue: 67000, bookings: 185 },
  ];

  const salonTypeData = [
    { name: 'Approved', value: 45, color: '#10b981' },
    { name: 'Pending', value: 12, color: '#f59e0b' },
    { name: 'Rejected', value: 3, color: '#ef4444' },
  ];

  const userTypeData = [
    { name: 'Clients', value: 850 },
    { name: 'Salon Owners', value: 45 },
  ];

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const [salonsRes, usersRes, bookingsRes] = await Promise.all([
        api.get('/admin/salons'),
        api.get('/admin/users'),
        api.get('/admin/bookings'),
      ]);

      const salons = salonsRes.data.data.salons || [];
      const users = usersRes.data.data.users || [];
      const bookings = bookingsRes.data.data.bookings || [];

      // Calculate revenue (assuming average booking value)
      const avgBookingValue = 500;
      const totalRevenue = bookings.length * avgBookingValue;

      setStats({
        totalRevenue,
        totalBookings: bookings.length,
        totalSalons: salons.length,
        totalUsers: users.length,
        revenueGrowth: 12.5,
        bookingsGrowth: 8.3,
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Revenue',
      value: `₹${stats.totalRevenue.toLocaleString()}`,
      change: stats.revenueGrowth,
      icon: MdAttachMoney,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Total Bookings',
      value: stats.totalBookings,
      change: stats.bookingsGrowth,
      icon: MdCalendarToday,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Active Salons',
      value: stats.totalSalons,
      change: 5.2,
      icon: MdStore,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-500/10',
    },
    {
      title: 'Total Users',
      value: stats.totalUsers,
      change: 15.8,
      icon: MdPeople,
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-500/10',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold-500"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2 bg-gradient-to-r from-gold-400 to-gold-600 bg-clip-text text-transparent">
          Analytics Dashboard
        </h1>
        <p className="text-gray-400 flex items-center gap-2">
          <MdBarChart size={20} />
          Platform insights and performance metrics
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          const isPositive = card.change > 0;
          return (
            <div
              key={index}
              className="bg-gray-800/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50 hover:border-gold-500/50 transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl ${card.bgColor} flex items-center justify-center`}>
                  <Icon size={24} className={`text-${card.color.split('-')[1]}-400`} />
                </div>
                <div className={`flex items-center gap-1 text-sm font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                  {isPositive ? <MdTrendingUp size={16} /> : <MdTrendingDown size={16} />}
                  {Math.abs(card.change)}%
                </div>
              </div>
              <h3 className="text-gray-400 text-sm font-medium mb-1">
                {card.title}
              </h3>
              <p className="text-3xl font-bold text-white">{card.value}</p>
            </div>
          );
        })}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Revenue Trend */}
        <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Revenue Trend</h2>
              <p className="text-gray-400 text-sm">Monthly revenue overview</p>
            </div>
            <MdShowChart size={24} className="text-gold-500" />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="month" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '0.5rem',
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#d4af37"
                strokeWidth={3}
                dot={{ fill: '#d4af37', r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Bookings Chart */}
        <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Bookings Overview</h2>
              <p className="text-gray-400 text-sm">Monthly booking statistics</p>
            </div>
            <MdBarChart size={24} className="text-blue-500" />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="month" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '0.5rem',
                }}
              />
              <Legend />
              <Bar dataKey="bookings" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Salon Status Distribution */}
        <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white mb-1">Salon Status</h2>
            <p className="text-gray-400 text-sm">Distribution by approval status</p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={salonTypeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {salonTypeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '0.5rem',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* User Distribution */}
        <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white mb-1">User Distribution</h2>
            <p className="text-gray-400 text-sm">Clients vs Salon Owners</p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={userTypeData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis type="number" stroke="#9ca3af" />
              <YAxis dataKey="name" type="category" stroke="#9ca3af" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '0.5rem',
                }}
              />
              <Bar dataKey="value" fill="#d4af37" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

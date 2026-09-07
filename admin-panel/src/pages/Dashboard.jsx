import { useState, useEffect } from 'react';
import { 
  MdStore, 
  MdPeople, 
  MdCalendarToday, 
  MdTrendingUp,
  MdPending,
  MdCheckCircle,
  MdArrowForward
} from 'react-icons/md';
import api from '../utils/api';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalSalons: 0,
    pendingSalons: 0,
    totalUsers: 0,
    totalBookings: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [salonsRes, usersRes, bookingsRes] = await Promise.all([
        api.get('/admin/salons'),
        api.get('/admin/users'),
        api.get('/admin/bookings'),
      ]);

      const salons = salonsRes.data.data.salons || [];
      const users = usersRes.data.data.users || [];
      const bookings = bookingsRes.data.data.bookings || [];

      setStats({
        totalSalons: salons.length,
        pendingSalons: salons.filter((s) => !s.isApproved).length,
        totalUsers: users.length,
        totalBookings: bookings.length,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Salons',
      value: stats.totalSalons,
      icon: MdStore,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-500/10',
      textColor: 'text-blue-400',
    },
    {
      title: 'Pending Approval',
      value: stats.pendingSalons,
      icon: MdPending,
      color: 'from-yellow-500 to-yellow-600',
      bgColor: 'bg-yellow-500/10',
      textColor: 'text-yellow-400',
    },
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: MdPeople,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-500/10',
      textColor: 'text-green-400',
    },
    {
      title: 'Total Bookings',
      value: stats.totalBookings,
      icon: MdCalendarToday,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-500/10',
      textColor: 'text-purple-400',
    },
  ];

  const quickActions = [
    {
      title: 'Manage Salons',
      description: 'Approve or reject salon registrations',
      icon: MdStore,
      link: '/salons',
      color: 'from-blue-500 to-blue-600',
    },
    {
      title: 'Manage Users',
      description: 'View and manage user accounts',
      icon: MdPeople,
      link: '/users',
      color: 'from-green-500 to-green-600',
    },
    {
      title: 'View Bookings',
      description: 'Monitor all salon bookings',
      icon: MdCalendarToday,
      link: '/bookings',
      color: 'from-purple-500 to-purple-600',
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
          Dashboard
        </h1>
        <p className="text-gray-400">Welcome to Lustril Admin Panel</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={index}
              className="bg-gray-800/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50 hover:border-gold-500/50 transition-all hover:shadow-lg hover:shadow-gold-500/10 group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-14 h-14 rounded-xl ${card.bgColor} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <Icon size={28} className={card.textColor} />
                </div>
                <MdTrendingUp size={20} className="text-green-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <h3 className="text-gray-400 text-sm font-medium mb-2">
                {card.title}
              </h3>
              <p className="text-4xl font-bold text-white">{card.value}</p>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Quick Actions</h2>
          <MdCheckCircle size={24} className="text-gold-500" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <a
                key={index}
                href={action.link}
                className="group p-6 bg-gray-700/30 rounded-xl hover:bg-gray-700/50 transition-all border border-gray-600/30 hover:border-gold-500/50 relative overflow-hidden"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-0 group-hover:opacity-10 transition-opacity`}></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <Icon size={32} className="text-gold-500 group-hover:scale-110 transition-transform" />
                    <MdArrowForward size={20} className="text-gray-600 group-hover:text-gold-500 group-hover:translate-x-1 transition-all" />
                  </div>
                  <h3 className="text-white font-semibold text-lg mb-2">
                    {action.title}
                  </h3>
                  <p className="text-gray-400 text-sm">
                    {action.description}
                  </p>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}

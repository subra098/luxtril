import { useState, useEffect } from 'react';
import api from '../utils/api';

export default function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const response = await api.get('/admin/bookings');
      setBookings(response.data.data.bookings || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-500/20 text-yellow-400',
      confirmed: 'bg-blue-500/20 text-blue-400',
      completed: 'bg-green-500/20 text-green-400',
      cancelled: 'bg-red-500/20 text-red-400',
    };
    return colors[status] || 'bg-gray-500/20 text-gray-400';
  };

  if (loading) {
    return <div className="text-white text-center py-12">Loading...</div>;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Bookings</h1>
        <p className="text-gray-400">View all salon bookings</p>
      </div>

      <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-700">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                Booking ID
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                Client
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                Salon
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                Date
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                Amount
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {bookings.map((booking) => (
              <tr key={booking._id} className="hover:bg-gray-700/50">
                <td className="px-6 py-4 text-gray-300 font-mono text-sm">
                  {booking._id.slice(-8)}
                </td>
                <td className="px-6 py-4 text-white">
                  {booking.user?.name || 'N/A'}
                </td>
                <td className="px-6 py-4 text-gray-300">
                  {booking.salon?.name || 'N/A'}
                </td>
                <td className="px-6 py-4 text-gray-300">
                  {new Date(booking.bookingDate).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-white font-semibold">
                  ₹{booking.totalAmount}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(
                      booking.status
                    )}`}
                  >
                    {booking.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {bookings.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400">No bookings found</p>
          </div>
        )}
      </div>
    </div>
  );
}

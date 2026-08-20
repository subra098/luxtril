import { useState, useEffect } from 'react';
import { 
  MdStore, 
  MdCheckCircle, 
  MdCancel, 
  MdLocationOn, 
  MdPhone, 
  MdEmail,
  MdPerson,
  MdImage,
  MdFilterList
} from 'react-icons/md';
import api from '../utils/api';

export default function Salons() {
  const [salons, setSalons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, pending, approved

  useEffect(() => {
    fetchSalons();
  }, []);

  const fetchSalons = async () => {
    try {
      const response = await api.get('/admin/salons');
      setSalons(response.data.data.salons || []);
    } catch (error) {
      console.error('Error fetching salons:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (salonId) => {
    if (!confirm('Are you sure you want to approve this salon?')) return;

    try {
      await api.put(`/admin/salons/${salonId}/approve`, { isApproved: true });
      alert('Salon approved successfully!');
      fetchSalons();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to approve salon');
    }
  };

  const handleReject = async (salonId) => {
    if (!confirm('Are you sure you want to reject this salon?')) return;

    try {
      await api.delete(`/admin/salons/${salonId}`);
      alert('Salon rejected successfully!');
      fetchSalons();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to reject salon');
    }
  };

  const handleToggleStatus = async (salonId, currentActiveStatus) => {
    const actionName = currentActiveStatus ? 'suspend' : 'activate';
    if (!confirm(`Are you sure you want to ${actionName} this salon?`)) return;

    try {
      await api.put(`/admin/salons/${salonId}/status`, { isActive: !currentActiveStatus });
      alert(`Salon ${actionName}ed successfully!`);
      fetchSalons();
    } catch (error) {
      alert(error.response?.data?.message || `Failed to ${actionName} salon`);
    }
  };

  const filteredSalons = salons.filter((salon) => {
    if (filter === 'pending') return !salon.isApproved;
    if (filter === 'approved') return salon.isApproved;
    return true;
  });

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
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2 bg-gradient-to-r from-gold-400 to-gold-600 bg-clip-text text-transparent">
            Salons Management
          </h1>
          <p className="text-gray-400 flex items-center gap-2">
            <MdStore size={20} />
            Manage salon registrations and approvals
          </p>
        </div>
        <div className="flex items-center gap-2">
          <MdFilterList size={24} className="text-gray-400" />
          <div className="flex space-x-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-xl font-medium transition-all ${
                filter === 'all'
                  ? 'bg-gradient-to-r from-gold-500 to-gold-600 text-white shadow-lg shadow-gold-500/20'
                  : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
              }`}
            >
              All ({salons.length})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-xl font-medium transition-all ${
                filter === 'pending'
                  ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white shadow-lg shadow-yellow-500/20'
                  : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Pending ({salons.filter((s) => !s.isApproved).length})
            </button>
            <button
              onClick={() => setFilter('approved')}
              className={`px-4 py-2 rounded-xl font-medium transition-all ${
                filter === 'approved'
                  ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/20'
                  : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Approved ({salons.filter((s) => s.isApproved).length})
            </button>
          </div>
        </div>
      </div>

      {/* Salons Grid */}
      <div className="grid grid-cols-1 gap-6">
        {filteredSalons.map((salon) => (
          <div
            key={salon._id}
            className="bg-gray-800/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50 hover:border-gold-500/50 transition-all hover:shadow-lg hover:shadow-gold-500/10"
          >
            <div className="flex gap-6">
              {/* Salon Images */}
              {salon.images && salon.images.length > 0 ? (
                <div className="flex-shrink-0">
                  <div className="relative w-48 h-48 rounded-xl overflow-hidden group">
                    <img
                      src={salon.images[0]}
                      alt={salon.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      onError={(e) => {
                        e.target.src = 'https://via.placeholder.com/200?text=No+Image';
                      }}
                    />
                    {salon.images.length > 1 && (
                      <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1">
                        <MdImage size={16} className="text-white" />
                        <span className="text-white text-xs font-bold">
                          +{salon.images.length - 1}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-shrink-0 w-48 h-48 bg-gray-700/50 rounded-xl flex items-center justify-center">
                  <MdStore size={48} className="text-gray-600" />
                </div>
              )}

              {/* Salon Details */}
              <div className="flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-2xl font-bold text-white">{salon.name}</h3>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
                          salon.isApproved
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}
                      >
                        {salon.isApproved ? (
                          <>
                            <MdCheckCircle size={14} />
                            Approved
                          </>
                        ) : (
                          <>
                            <MdCancel size={14} />
                            Pending
                          </>
                        )}
                      </span>
                      {salon.isApproved && (
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold ${
                            salon.isActive
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {salon.isActive ? 'Active' : 'Suspended'}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-400 text-sm">{salon.description || 'No description'}</p>
                  </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                      <MdPerson size={20} className="text-blue-400" />
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Owner</p>
                      <p className="text-white font-medium">{salon.owner?.name || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                      <MdPhone size={20} className="text-green-400" />
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Phone</p>
                      <p className="text-white font-medium">{salon.phone}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                      <MdEmail size={20} className="text-purple-400" />
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Email</p>
                      <p className="text-white font-medium text-sm">{salon.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-red-500/10 rounded-lg flex items-center justify-center">
                      <MdLocationOn size={20} className="text-red-400" />
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Location</p>
                      <p className="text-white font-medium">
                        {salon.address?.city}, {salon.address?.state}
                      </p>
                      {salon.address?.pincode && (
                        <p className="text-gray-400 text-xs">PIN: {salon.address.pincode}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                {!salon.isApproved ? (
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => handleApprove(salon._id)}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-medium rounded-xl transition-all shadow-lg shadow-green-500/20"
                    >
                      <MdCheckCircle size={20} />
                      Approve Salon
                    </button>
                    <button
                      onClick={() => handleReject(salon._id)}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium rounded-xl transition-all shadow-lg shadow-red-500/20"
                    >
                      <MdCancel size={20} />
                      Reject Salon
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => handleToggleStatus(salon._id, salon.isActive)}
                      className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 font-medium rounded-xl transition-all shadow-lg ${
                        salon.isActive
                          ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-orange-500/20'
                          : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-blue-500/20'
                      }`}
                    >
                      <MdCancel size={20} />
                      {salon.isActive ? 'Suspend / Block Salon' : 'Reactivate / Unblock Salon'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {filteredSalons.length === 0 && (
          <div className="text-center py-16 bg-gray-800/30 rounded-2xl border border-gray-700/50">
            <MdStore size={64} className="text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg font-medium">No salons found</p>
            <p className="text-gray-500 text-sm mt-2">Try changing the filter</p>
          </div>
        )}
      </div>
    </div>
  );
}

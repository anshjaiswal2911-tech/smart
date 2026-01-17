import { useState, useEffect } from 'react';
import { Calendar, Clock, Sparkles, Bell, CheckCircle, XCircle, AlertCircle, History, MapPin } from 'lucide-react';
import { MOCK_SERVICES, getStoredAppointments, saveAppointments, generateTokenNumber } from '../utils/mockData';
import { AIEngine } from '../utils/aiEngine';
import { TimeSlot, Appointment } from '../types';
import { NotificationsPanel } from './NotificationsPanel';
import { NearbyLocations } from './NearbyLocations';

export function CitizenPortal() {
  const [selectedService, setSelectedService] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [showSlots, setShowSlots] = useState(false);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [myAppointments, setMyAppointments] = useState<Appointment[]>([]);
  const [appointmentHistory, setAppointmentHistory] = useState<Appointment[]>([]);
  const [showBookingSuccess, setShowBookingSuccess] = useState(false);
  const [lastBookedAppointment, setLastBookedAppointment] = useState<Appointment | null>(null);
  const [activeView, setActiveView] = useState<'book' | 'notifications' | 'locations'>('book');

  useEffect(() => {
    loadMyAppointments();
  }, []);

  const loadMyAppointments = () => {
    const allAppointments = getStoredAppointments();
    // In real app, filter by user ID
    setMyAppointments(allAppointments.filter(apt => apt.status === 'scheduled'));
    setAppointmentHistory(allAppointments.filter(apt => apt.status === 'completed' || apt.status === 'cancelled'));
  };

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    if (selectedService && date) {
      generateSlots(date);
    }
  };

  const generateSlots = (date: string) => {
    const appointments = getStoredAppointments();
    const generatedSlots = AIEngine.generateSlotRecommendations(date, selectedService, appointments);
    setSlots(generatedSlots);
    setShowSlots(true);
  };

  const bookAppointment = async (slot: TimeSlot) => {
    const service = MOCK_SERVICES.find(s => s.id === selectedService);
    if (!service) return;

    const newAppointment: Appointment = {
      id: `apt-${Date.now()}`,
      serviceId: service.id,
      serviceName: service.name,
      date: selectedDate,
      timeSlot: slot.time,
      tokenNumber: generateTokenNumber(service.id),
      status: 'scheduled',
      citizenName: 'Demo User',
      citizenPhone: '+91-9999999999',
      createdAt: new Date().toISOString(),
      estimatedTime: slot.time,
    };

    const appointments = getStoredAppointments();
    appointments.push(newAppointment);
    saveAppointments(appointments);

    // Create notification in backend
    try {
      await fetch('http://localhost:5001/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'success',
          title: 'Booking Confirmed',
          message: `Appointment for ${service.name} booked at ${slot.time} (Token: ${newAppointment.tokenNumber})`,
        }),
      });
    } catch (err) {
      console.error('Failed to create notification:', err);
    }

    setLastBookedAppointment(newAppointment);
    setShowBookingSuccess(true);
    setShowSlots(false);
    loadMyAppointments();

    // Auto-hide success message
    setTimeout(() => setShowBookingSuccess(false), 5000);
  };

  const cancelAppointment = (id: string) => {
    const appointments = getStoredAppointments();
    const updated = appointments.map(apt =>
      apt.id === id ? { ...apt, status: 'cancelled' as const } : apt
    );
    saveAppointments(updated);
    loadMyAppointments();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* View Selector */}
      <div className="flex gap-2 mb-6 bg-gray-900 border border-gray-800 rounded-xl p-2">
        <button
          onClick={() => setActiveView('book')}
          className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${activeView === 'book'
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
        >
          <Calendar className="w-4 h-4" />
          Book Appointment
        </button>
        <button
          onClick={() => setActiveView('notifications')}
          className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${activeView === 'notifications'
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
        >
          <Bell className="w-4 h-4" />
          Notifications
        </button>
        <button
          onClick={() => setActiveView('locations')}
          className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${activeView === 'locations'
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
        >
          <MapPin className="w-4 h-4" />
          Nearby Centers
        </button>
      </div>

      {/* Success Message */}
      {showBookingSuccess && lastBookedAppointment && (
        <div className="mb-6 bg-green-900/30 border border-green-500 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white mb-2">Appointment Booked Successfully! 🎉</h3>
              <div className="space-y-1 text-sm text-gray-300">
                <p>Token: <span className="font-bold text-green-400">{lastBookedAppointment.tokenNumber}</span></p>
                <p>Service: {lastBookedAppointment.serviceName}</p>
                <p>Date & Time: {formatDate(lastBookedAppointment.date)} at {lastBookedAppointment.timeSlot}</p>
                <p className="text-yellow-400 mt-2">📱 WhatsApp reminder will be sent 30 minutes before your slot</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {activeView === 'book' && (
            <>
              {/* Book New Appointment */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-blue-400" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Book New Appointment</h2>
                </div>

                {/* Service Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Select Service
                  </label>
                  <select
                    value={selectedService}
                    onChange={(e) => setSelectedService(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Choose a service...</option>
                    {MOCK_SERVICES.filter(s => s.enabled).map(service => (
                      <option key={service.id} value={service.id}>
                        {service.name} ({service.nameHindi}) - ~{service.averageTime} min
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date Selection */}
                {selectedService && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Select Date
                    </label>
                    <input
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      max={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                      value={selectedDate}
                      onChange={(e) => handleDateSelect(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                {/* AI Slot Recommendations */}
                {showSlots && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Sparkles className="w-5 h-5 text-yellow-400" />
                      <h3 className="font-bold text-white">AI-Recommended Time Slots</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {slots.slice(0, 6).map((slot) => (
                        <button
                          key={slot.id}
                          onClick={() => bookAppointment(slot)}
                          disabled={slot.booked >= slot.capacity}
                          className={`p-4 rounded-lg border text-left transition-all ${slot.booked >= slot.capacity
                              ? 'bg-gray-800 border-gray-700 opacity-50 cursor-not-allowed'
                              : slot.aiScore >= 80
                                ? 'bg-green-900/20 border-green-500 hover:bg-green-900/30'
                                : slot.aiScore >= 60
                                  ? 'bg-yellow-900/20 border-yellow-500 hover:bg-yellow-900/30'
                                  : 'bg-gray-800 border-gray-700 hover:bg-gray-700'
                            }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-gray-400" />
                              <span className="font-bold text-white">{slot.time}</span>
                            </div>
                            {slot.aiScore >= 80 && (
                              <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full flex items-center gap-1">
                                <Sparkles className="w-3 h-3" />
                                Best
                              </span>
                            )}
                          </div>

                          <div className="space-y-1 text-xs text-gray-400 mb-2">
                            <div className="flex items-center justify-between">
                              <span>Congestion:</span>
                              <span className={
                                slot.congestion === 'Low' ? 'text-green-400' :
                                  slot.congestion === 'Medium' ? 'text-yellow-400' :
                                    'text-red-400'
                              }>
                                {slot.congestion}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span>Available:</span>
                              <span className="text-white">{slot.capacity - slot.booked}/{slot.capacity}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span>Est. Wait:</span>
                              <span className="text-white">~{slot.estimatedWait} min</span>
                            </div>
                          </div>

                          <div className="text-xs text-gray-500 border-t border-gray-700 pt-2">
                            {AIEngine.getSlotExplanation(slot)}
                          </div>

                          {slot.booked >= slot.capacity ? (
                            <div className="mt-2 text-xs text-red-400 font-medium">Fully Booked</div>
                          ) : (
                            <div className="mt-2 text-xs text-blue-400 font-medium">Click to Book</div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Real-time Queue Status */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <Bell className="w-5 h-5 text-purple-400" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Live Queue Status</h2>
                </div>

                <div className="space-y-3">
                  {MOCK_SERVICES.slice(0, 4).map(service => {
                    const queueLength = Math.floor(Math.random() * 12) + 3;
                    const avgWait = queueLength * service.averageTime;

                    return (
                      <div key={service.id} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <div className="font-bold text-white">{service.name}</div>
                            <div className="text-xs text-gray-400">{service.nameHindi}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-white">{queueLength}</div>
                            <div className="text-xs text-gray-400">in queue</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4 text-yellow-400" />
                          <span className="text-gray-300">Estimated wait: ~{avgWait} minutes</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {activeView === 'notifications' && <NotificationsPanel />}

          {activeView === 'locations' && <NearbyLocations />}
        </div>

        {/* Right Column - My Appointments & History */}
        <div className="space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 sticky top-24">
            <h2 className="text-xl font-bold text-white mb-6">My Appointments</h2>

            {myAppointments.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500">No active appointments</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myAppointments.map(apt => (
                  <div key={apt.id} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-bold text-white mb-1">{apt.serviceName}</div>
                        <div className="text-sm text-gray-400">Token: {apt.tokenNumber}</div>
                      </div>
                      {apt.status === 'scheduled' && (
                        <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                          Active
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 text-sm text-gray-400 mb-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(apt.date)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>{apt.timeSlot}</span>
                      </div>
                    </div>

                    {apt.status === 'scheduled' && (
                      <button
                        onClick={() => cancelAppointment(apt.id)}
                        className="w-full px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <XCircle className="w-4 h-4" />
                        Cancel Appointment
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Appointment History */}
          {appointmentHistory.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <History className="w-5 h-5 text-gray-400" />
                <h3 className="font-bold text-white">History</h3>
              </div>
              <div className="space-y-2">
                {appointmentHistory.slice(0, 3).map(apt => (
                  <div key={apt.id} className="bg-gray-800 border border-gray-700 rounded-lg p-3">
                    <div className="text-sm font-medium text-gray-300 mb-1">{apt.serviceName}</div>
                    <div className="text-xs text-gray-500">{formatDate(apt.date)}</div>
                    <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-xs ${apt.status === 'completed'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                      }`}>
                      {apt.status === 'completed' ? 'Completed' : 'Cancelled'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
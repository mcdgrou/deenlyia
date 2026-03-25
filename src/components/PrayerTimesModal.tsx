import React, { useState, useEffect } from 'react';
import { X, Clock, MapPin, Navigation, Loader2, Bell, BellOff, Settings } from 'lucide-react';
import { Coordinates, CalculationMethod, PrayerTimes, SunnahTimes } from 'adhan';

interface PrayerTimesModalProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode: boolean;
  language: string;
  t: any;
  showToast?: (message: string, type?: 'error' | 'success') => void;
}

export const PrayerTimesModal: React.FC<PrayerTimesModalProps> = ({ isOpen, onClose, darkMode, language, t, showToast }) => {
  const [location, setLocation] = useState({ city: 'Madrid', lat: 40.4168, lng: -3.7038 });
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimes | null>(null);
  const [nextPrayer, setNextPrayer] = useState<{ name: string; time: Date; countdown: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [locationInput, setLocationInput] = useState('');
  const [isEditingLocation, setIsEditingLocation] = useState(false);

  useEffect(() => {
    if (isOpen) {
      calculatePrayerTimes();
    }
  }, [isOpen, location]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (prayerTimes) {
        updateNextPrayer(prayerTimes);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [prayerTimes]);

  const calculatePrayerTimes = () => {
    const coords = new Coordinates(location.lat, location.lng);
    const date = new Date();
    const params = CalculationMethod.MuslimWorldLeague();
    const times = new PrayerTimes(coords, date, params);
    setPrayerTimes(times);
    updateNextPrayer(times);
  };

  const updateNextPrayer = (times: PrayerTimes) => {
    const next = times.nextPrayer();
    if (next !== 'none') {
      const nextTime = times.timeForPrayer(next);
      if (nextTime) {
        const diff = nextTime.getTime() - new Date().getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        const prayerName = t[next.toLowerCase()] || next;
        setNextPrayer({
          name: prayerName,
          time: nextTime,
          countdown: `${hours}h ${minutes}m ${seconds}s`
        });
      }
    }
  };

  const handleDetectLocation = () => {
    setIsUpdating(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await response.json();
          const city = data.address.city || data.address.town || data.address.village || data.address.state || 'Ubicación detectada';
          setLocation({ city, lat: latitude, lng: longitude });
          setIsEditingLocation(false);
        } catch (error: any) {
          console.error('Error geocoding:', error);
          if (showToast) showToast(language === 'Español' ? "Error al obtener dirección" : "Error getting address", 'error');
          setLocation({ ...location, lat: latitude, lng: longitude });
        } finally {
          setIsUpdating(false);
        }
      }, (error) => {
        console.error('Geolocation error:', error);
        if (showToast) showToast(language === 'Español' ? "Error de geolocalización" : "Geolocation error", 'error');
        setIsUpdating(false);
      });
    } else {
      if (showToast) showToast(language === 'Español' ? "Geolocalización no soportada" : "Geolocation not supported", 'error');
      setIsUpdating(false);
    }
  };

  const handleGeocodeCity = async (city: string) => {
    if (!city.trim()) return;
    setIsUpdating(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}&limit=1`);
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        const cityName = display_name.split(',')[0];
        setLocation({ city: cityName, lat: parseFloat(lat), lng: parseFloat(lon) });
        setIsEditingLocation(false);
      }
    } catch (error) {
      console.error('Error geocoding city:', error);
      if (showToast) showToast(language === 'Español' ? "Ciudad no encontrada" : "City not found", 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      
      <div
        className={`relative w-full max-w-md overflow-hidden rounded-[40px] shadow-2xl flex flex-col ${
          darkMode ? 'bg-deenly-dark-surface border border-white/10' : 'bg-deenly-cream border border-deenly-gold/20'
        }`}
      >
        {/* Header */}
        <div className="p-6 border-b border-deenly-gold/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-deenly-gold/10 text-deenly-gold flex items-center justify-center">
              <Clock size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">{t.prayerTitle || 'Horarios de Oración'}</h2>
              <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-deenly-gold/60">{t.prayerSubtitle || 'Conexión espiritual diaria'}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-deenly-gold/10 rounded-xl transition-colors text-deenly-gold"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto scrollbar-hide">
          {/* Location Card */}
          <div className={`p-6 rounded-3xl border ${darkMode ? 'border-deenly-gold/20 bg-deenly-dark-bg/30' : 'border-deenly-gold/10 bg-white/30'}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-deenly-gold/10 text-deenly-gold flex items-center justify-center">
                  <MapPin size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-deenly-gold uppercase tracking-widest">{t.location || 'Ubicación'}</p>
                  <h4 className="text-sm font-bold">{location.city}</h4>
                </div>
              </div>
              <button 
                onClick={handleDetectLocation}
                className="p-2 rounded-lg bg-deenly-gold text-white hover:bg-deenly-gold/90 transition-colors shadow-lg shadow-deenly-gold/20"
              >
                <Navigation size={16} />
              </button>
            </div>
            
              <div className="flex flex-col gap-3">
                {isEditingLocation ? (
                  <div 
                    className="space-y-3 overflow-hidden"
                  >
                    <input
                      type="text"
                      value={locationInput}
                      onChange={(e) => setLocationInput(e.target.value)}
                      placeholder="Ciudad, País"
                      className={`w-full py-3 px-4 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-deenly-gold/30 ${
                        darkMode ? 'bg-deenly-dark-bg border-deenly-gold/20 text-white' : 'bg-white border-deenly-gold/10 text-deenly-green'
                      }`}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleGeocodeCity(locationInput);
                        if (e.key === 'Escape') setIsEditingLocation(false);
                      }}
                    />
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleGeocodeCity(locationInput)}
                        disabled={isUpdating || !locationInput.trim()}
                        className="flex-1 py-2 bg-deenly-gold text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-deenly-gold/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isUpdating ? <Loader2 size={12} className="animate-spin" /> : t.confirm}
                      </button>
                      <button 
                        onClick={() => setIsEditingLocation(false)}
                        className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-colors ${
                          darkMode ? 'border-deenly-gold/20 hover:bg-white/5' : 'border-deenly-gold/10 hover:bg-black/5'
                        }`}
                      >
                        {t.cancel}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={() => {
                      setIsEditingLocation(true);
                      setLocationInput(location.city);
                    }}
                    className={`w-full py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-colors ${
                      darkMode ? 'border-deenly-gold/20 hover:bg-white/5' : 'border-deenly-gold/10 hover:bg-black/5'
                    }`}
                  >
                    {t.changeLocation || 'Cambiar ubicación'}
                  </button>
                )}
              </div>
          </div>

          {/* Next Prayer Card */}
          {nextPrayer && (
            <div className={`p-6 rounded-3xl border relative overflow-hidden ${darkMode ? 'bg-deenly-gold/10 border-deenly-gold/20' : 'bg-deenly-gold/5 border-deenly-gold/10'}`}>
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-deenly-gold uppercase tracking-widest mb-1">{t.nextPrayer || 'Siguiente Oración'}</p>
                  <h3 className="text-2xl font-bold">{nextPrayer.name}</h3>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-deenly-gold uppercase tracking-widest mb-1">{t.startsIn || 'Comienza en'}</p>
                  <p className="text-lg font-mono font-bold">{nextPrayer.countdown}</p>
                </div>
              </div>
              <div className="absolute -right-4 -bottom-4 opacity-5">
                <Clock size={100} />
              </div>
            </div>
          )}

          {/* Times List */}
          <div className="space-y-3">
            {prayerTimes && (['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const).map((prayer) => {
              const time = prayerTimes.timeForPrayer(prayer);
              const isNext = nextPrayer?.name === t[prayer];
              return (
                <div 
                  key={prayer} 
                  className={`flex items-center justify-between p-4 rounded-2xl border transition-colors ${
                    isNext 
                      ? 'bg-deenly-gold text-white border-deenly-gold shadow-lg shadow-deenly-gold/20' 
                      : darkMode 
                        ? 'bg-deenly-dark-bg/40 border-deenly-gold/10' 
                        : 'bg-white border-deenly-gold/10'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-2 h-2 rounded-full ${isNext ? 'bg-white animate-pulse' : 'bg-deenly-gold/20'}`} />
                    <span className="text-sm font-bold uppercase tracking-widest">{t[prayer]}</span>
                  </div>
                  <span className="text-lg font-mono font-bold">
                    {time?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

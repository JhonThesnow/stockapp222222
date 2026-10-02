import React from 'react';
import { Bell } from 'lucide-react';
import useNotificationStore from '../store/useNotificationStore';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const GlobalNotification = () => {
  const { latestNotification, unreadCount, markAllAsRead } = useNotificationStore();

  const getBubbleColor = (type) => {
    switch (type) {
      case 'success':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'info':
      default:
        return 'bg-gray-200 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-3">
      {/* Burbuja de texto */}
      <div
        className={twMerge(
          clsx(
            'px-4 py-2 rounded-2xl shadow-sm border transition-all duration-300 ease-in-out',
            latestNotification
              ? 'opacity-100 translate-x-0'
              : 'opacity-0 translate-x-4 pointer-events-none',
            latestNotification && getBubbleColor(latestNotification.type)
          )
        )}
      >
        {latestNotification?.message}
      </div>

      {/* Campana */}
      <div className="relative">
        <button
          onClick={markAllAsRead}
          className="p-2 bg-gray-200 rounded-2xl shadow-sm hover:bg-gray-300 transition-colors focus:outline-none"
        >
          <Bell size={24} className="text-gray-700" />
        </button>

        {/* Badge de notificaciones */}
        {unreadCount > 0 && !latestNotification && (
          <div className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1 bg-red-500 text-white text-xs font-bold rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </div>
        )}
      </div>
    </div>
  );
};

export default GlobalNotification;

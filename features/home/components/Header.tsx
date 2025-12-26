'use client';

import React, { useState } from 'react';
import Link from 'next/link';

const Header = () => {
  const [activeMenu, setActiveMenu] = useState<string>('');

  const mainMenuItems = [
    { label: "Centre d'aide", href: '/help' },
    { label: 'Comment ça marche', href: '/how-it-works' },
    { label: 'Annonceurs', href: '/advertisers' },
    { label: 'À propos', href: '/about' },
  ];

  const connectMenuItems = [
    { label: 'Se connecter', href: '/login' },
    { label: "S'inscrire - c'est gratuit", href: '/signup', isPrimary: true },
  ];

  return (
    <header className="w-full bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/" className="text-2xl font-bold text-gray-900">
              Ze File
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex items-center space-x-1">
            {/* Main Menu */}
            <div className="flex items-center space-x-1">
              {mainMenuItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 hover:text-gray-900 transition-colors rounded-lg ${
                    activeMenu === item.label ? 'bg-gray-200' : ''
                  }`}
                  onMouseEnter={() => setActiveMenu(item.label)}
                  onMouseLeave={() => setActiveMenu('')}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            {/* Separator */}
            <div className="h-6 w-px bg-gray-300 mx-2" />

            {/* Connect Menu */}
            <div className="flex items-center space-x-1">
              {connectMenuItems.map((item) => (
                <React.Fragment key={item.label}>
                  {item.isPrimary ? (
                    <Link
                      href={item.href}
                      className="px-4 py-2 text-sm font-medium text-white bg-green-500 hover:bg-green-600 transition-colors rounded"
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <Link
                      href={item.href}
                      className={`px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 hover:text-gray-900 transition-colors rounded-lg ${
                        activeMenu === item.label ? 'bg-gray-200' : ''
                      }`}
                      onMouseEnter={() => setActiveMenu(item.label)}
                      onMouseLeave={() => setActiveMenu('')}
                    >
                      {item.label}
                    </Link>
                  )}
                </React.Fragment>
              ))}
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;

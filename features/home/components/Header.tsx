'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import LanguageSwitcher from './LanguageSwitcher';

const Header = () => {
  const t = useTranslations('header');
  const tCommon = useTranslations('common');
  const [activeMenu, setActiveMenu] = useState<string>('');
  const [hoverMenu, setHoverMenu] = useState<string>('');

  const mainMenuItems = [
    { label: t('helpCenter'), href: '/help' },
    { label: t('howItWorks'), href: '/how-it-works' },
    { label: t('advertisers'), href: '/advertisers' },
    { label: t('about'), href: '/about' },
  ];

  const connectMenuItems = [
    { label: t('login'), href: '/login' },
    {
      label: t('signup'),
      href: '/signup',
      isPrimary: true,
      renderLabel: () => (
        <>
          <span className="font-bold">{t('signupBold')}</span>
          {t('signupSuffix')}
        </>
      )
    },
  ];

  const getMenuItemStyle = (itemLabel: string) => ({
    backgroundColor: hoverMenu === itemLabel || activeMenu === itemLabel ? '#E5E5E5' : 'transparent',
    color: '#171717',
    borderRadius: '8px',
    transition: 'background-color 0.2s ease'
  });

  return (
    <header id="ze-header" className="ze-header">
      <div className="ze-header-container">
        {/* Logo */}
        <div id="ze-header-logo" className="ze-header-logo flex-shrink-0">
          <Link href="/" className="flex items-center">
            <Image
              src="/zefile-logo.svg"
              alt={tCommon('appName')}
              width={120}
              height={33}
              priority
            />
          </Link>
        </div>

        {/* Navigation */}
        <nav id="ze-header-nav" className="ze-header-nav flex items-center space-x-1">
          {/* Main Menu */}
          <div id="ze-main-menu" className="ze-main-menu flex items-center space-x-1">
            {mainMenuItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="ze-menu-item"
                onMouseEnter={() => setHoverMenu(item.label)}
                onMouseLeave={() => setHoverMenu('')}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Separator */}
          <div id="ze-menu-separator" className="ze-menu-separator h-6 mx-2 w-px bg-gray-300" />

          {/* Language Switcher */}
          <div className="ml-4">
            <LanguageSwitcher />
          </div>

          {/* Connect Menu */}
          <div id="ze-connect-menu" className="ze-connect-menu flex items-center space-x-1 ml-4">
            {connectMenuItems.map((item: any) => (
              <React.Fragment key={item.label}>
                {item.isPrimary ? (
                  <Link href={item.href} className="ze-button-primary">
                    {item.renderLabel ? item.renderLabel() : item.label}
                  </Link>
                ) : (
                  <Link
                    href={item.href}
                    className="ze-menu-item"
                    onMouseEnter={() => setHoverMenu(item.label)}
                    onMouseLeave={() => setHoverMenu('')}
                  >
                    {item.label}
                  </Link>
                )}
              </React.Fragment>
            ))}
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Header;

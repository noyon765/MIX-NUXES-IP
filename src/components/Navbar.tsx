import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { AppView, SiteSettings, UserProfile } from '../types/index.ts';
import { BrandMark } from './BrandMark.tsx';

interface NavbarProps {
  siteSettings: SiteSettings;
  userProfile: UserProfile | null;
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  onOpenAdminPanel: () => void;
  onScrollToSection: (sectionId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  siteSettings,
  userProfile,
  currentView,
  onNavigate,
  onOpenAdminPanel,
  onScrollToSection,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNavClick = (sectionId: string) => {
    setMobileOpen(false);
    if (currentView !== 'landing') {
      onNavigate('landing');
      setTimeout(() => onScrollToSection(sectionId), 80);
    } else {
      onScrollToSection(sectionId);
    }
  };

  const primaryLabel = userProfile
    ? userProfile.role === 'admin'
      ? currentView === 'admin'
        ? 'Dashboard'
        : 'Admin Panel'
      : 'Dashboard'
    : 'Sign In';

  const handlePrimaryAction = () => {
    setMobileOpen(false);
    if (!userProfile) {
      onNavigate('auth');
      return;
    }
    if (userProfile.role === 'admin' && currentView !== 'admin') {
      onNavigate('admin');
    } else {
      onNavigate('dashboard');
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#07090E]/85 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <button
          type="button"
          onClick={() => {
            setMobileOpen(false);
            onNavigate('landing');
          }}
          className="flex items-center gap-3 text-left whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded-lg"
        >
          <BrandMark logoUrl={siteSettings.logoUrl} size={32} />
          <span className="text-base sm:text-lg font-semibold tracking-tight text-white whitespace-nowrap shrink-0">
            {siteSettings.siteName}
          </span>
        </button>

        {/* Zone 2: Clean Single-Line Nav Links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-300">
          <button
            type="button"
            onClick={() => handleNavClick('architecture')}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0 py-1 border-b border-transparent hover:border-violet-400/70"
          >
            Architecture
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('pricing')}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0 py-1 border-b border-transparent hover:border-violet-400/70"
          >
            Pricing
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('security')}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0 py-1 border-b border-transparent hover:border-violet-400/70"
          >
            Security
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('support')}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0 py-1 border-b border-transparent hover:border-violet-400/70"
          >
            Support
          </button>
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              onOpenAdminPanel();
            }}
            className="hover:text-violet-300 transition-colors whitespace-nowrap shrink-0 py-1 border-b border-transparent hover:border-violet-400/70"
          >
            Admin Panel
          </button>
        </nav>

        {/* Zone 3: 1 Primary Action + Mobile Three-Line Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handlePrimaryAction}
            className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors whitespace-nowrap shrink-0 min-h-[40px]"
          >
            {primaryLabel}
          </button>
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="md:hidden p-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Three-Line Dropdown Navigation */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/10 bg-[#0B101D] px-4 py-3 space-y-1">
          <button
            type="button"
            onClick={() => handleNavClick('architecture')}
            className="w-full text-left px-3 py-3 rounded-lg text-sm font-medium text-slate-200 hover:bg-white/5 min-h-[44px]"
          >
            Architecture
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('pricing')}
            className="w-full text-left px-3 py-3 rounded-lg text-sm font-medium text-slate-200 hover:bg-white/5 min-h-[44px]"
          >
            Pricing
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('security')}
            className="w-full text-left px-3 py-3 rounded-lg text-sm font-medium text-slate-200 hover:bg-white/5 min-h-[44px]"
          >
            Security
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('support')}
            className="w-full text-left px-3 py-3 rounded-lg text-sm font-medium text-slate-200 hover:bg-white/5 min-h-[44px]"
          >
            Support
          </button>
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              onOpenAdminPanel();
            }}
            className="w-full text-left px-3 py-3 rounded-lg text-sm font-medium text-violet-300 hover:bg-white/5 min-h-[44px]"
          >
            Admin Panel
          </button>
        </div>
      )}
    </header>
  );
};

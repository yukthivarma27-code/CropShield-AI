import React, { useState, useEffect } from 'react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { LanguageSelector } from '../components/common/LanguageSelector';
import { UserProfile } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import { indiaLocations } from '../data/indiaLocations';
import { Save, User, MapPin, Globe } from 'lucide-react';

interface SettingsPageProps {
  profile: UserProfile;
  updateProfile: (profile: UserProfile) => Promise<void>;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ profile, updateProfile }) => {
  const { t } = useTranslation();
  const [name, setName] = useState<string>(profile.name || '');
  const [phone, setPhone] = useState<string>(profile.phone || '');
  const [state, setState] = useState<string>(profile.state || 'Andhra Pradesh');
  const [district, setDistrict] = useState<string>(profile.district || 'Visakhapatnam');

  const states = Object.keys(indiaLocations);

  // Sync state values on load
  useEffect(() => {
    setName(profile.name || '');
    setPhone(profile.phone || '');
    const savedState = profile.state || 'Andhra Pradesh';
    setState(savedState);
    const districts = indiaLocations[savedState] || [];
    const savedDistrict = profile.district || '';
    setDistrict(districts.includes(savedDistrict) ? savedDistrict : '');
  }, [profile]);

  const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const s = e.target.value;
    setState(s);
    setDistrict('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfile({
      name,
      phone,
      state,
      district,
      language: localStorage.getItem('agrivision_lang') || 'en'
    });
    alert('Profile saved successfully.');
  };

  return (
    <div className="space-y-4">
      {/* Language Selector Component */}
      <Card title={t('language')}>
        <div className="flex flex-col gap-2">
          <p className="text-[10px] text-gray-400 dark:text-zinc-550 leading-tight">
            Choose your preferred language for predictions and assistant voice explanation.
          </p>
          <LanguageSelector />
        </div>
      </Card>

      {/* User Profile Form */}
      <Card title={t('profile')}>
        <form onSubmit={handleSave} className="space-y-4">
          {/* Name */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-700 dark:text-zinc-300 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              {t('name')}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="w-full text-xs p-3 rounded-2xl border border-gray-150 bg-gray-50 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-50 focus:outline-none focus:border-primary-500"
              required
            />
          </div>

          {/* Phone number */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-700 dark:text-zinc-300 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" />
              {t('phone')}
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g., +91 9876543210"
              className="w-full text-xs p-3 rounded-2xl border border-gray-150 bg-gray-50 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-50 focus:outline-none focus:border-primary-500"
            />
          </div>

          {/* Region location details */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-700 dark:text-zinc-300 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              {t('state')}
            </label>
            <select
              value={state}
              onChange={handleStateChange}
              className="w-full text-xs p-3 rounded-2xl border border-gray-150 bg-gray-50 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-50 focus:outline-none focus:border-primary-500"
            >
              {states.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* District Selection */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-700 dark:text-zinc-300 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              {t('district')}
            </label>
            <select
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              disabled={!state}
              className="w-full text-xs p-3 rounded-2xl border border-gray-150 bg-gray-50 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-50 focus:outline-none focus:border-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">{t('select_district') || 'Select District'}</option>
              {(indiaLocations[state] || []).map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <Button
            type="submit"
            variant="primary"
            fullWidth
            icon={<Save className="w-4 h-4" />}
          >
            {t('save_profile')}
          </Button>
        </form>
      </Card>
    </div>
  );
};

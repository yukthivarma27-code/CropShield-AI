import React, { useState, useEffect } from 'react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { LanguageSelector } from '../components/common/LanguageSelector';
import { UserProfile } from '../types';
import { useTranslation } from '../hooks/useTranslation';
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

  const states = [
    'Andaman and Nicobar Islands',
    'Andhra Pradesh',
    'Arunachal Pradesh',
    'Assam',
    'Bihar',
    'Chandigarh',
    'Chhattisgarh',
    'Dadra and Nagar Haveli and Daman and Diu',
    'Delhi (NCT)',
    'Goa',
    'Gujarat',
    'Haryana',
    'Himachal Pradesh',
    'Jammu and Kashmir',
    'Jharkhand',
    'Karnataka',
    'Kerala',
    'Ladakh',
    'Lakshadweep',
    'Madhya Pradesh',
    'Maharashtra',
    'Manipur',
    'Meghalaya',
    'Mizoram',
    'Nagaland',
    'Odisha',
    'Puducherry',
    'Punjab',
    'Rajasthan',
    'Sikkim',
    'Tamil Nadu',
    'Telangana',
    'Tripura',
    'Uttar Pradesh',
    'Uttarakhand',
    'West Bengal',
  ];

  const districtsMap: Record<string, string[]> = {
    'Andaman and Nicobar Islands': ['Port Blair', 'South Andaman', 'North and Middle Andaman', 'Nicobar'],
    'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Kurnool', 'Nellore', 'Tirupati', 'Anantapur'],
    'Arunachal Pradesh': ['Itanagar', 'Naharlagun', 'Pasighat', 'Tawang', 'Ziro'],
    'Assam': ['Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Nagaon', 'Tezpur'],
    'Bihar': ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Purnia', 'Darbhanga'],
    'Chandigarh': ['Chandigarh'],
    'Chhattisgarh': ['Raipur', 'Bhilai', 'Bilaspur', 'Korba', 'Durg', 'Rajnandgaon'],
    'Dadra and Nagar Haveli and Daman and Diu': ['Silvassa', 'Daman', 'Diu'],
    'Delhi (NCT)': ['New Delhi', 'Central Delhi', 'South Delhi', 'East Delhi', 'West Delhi', 'North Delhi'],
    'Goa': ['North Goa', 'South Goa', 'Panaji', 'Margao'],
    'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar'],
    'Haryana': ['Chandigarh', 'Faridabad', 'Gurugram', 'Panipat', 'Hisar', 'Karnal'],
    'Himachal Pradesh': ['Shimla', 'Dharamshala', 'Mandi', 'Solan', 'Kullu', 'Hamirpur'],
    'Jammu and Kashmir': ['Srinagar', 'Jammu', 'Anantnag', 'Baramulla', 'Kathua'],
    'Jharkhand': ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro', 'Hazaribagh', 'Deoghar'],
    'Karnataka': ['Bengaluru', 'Mysuru', 'Hubli-Dharwad', 'Mangaluru', 'Belagavi', 'Shimoga'],
    'Kerala': ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Alappuzha', 'Kollam'],
    'Ladakh': ['Leh', 'Kargil'],
    'Lakshadweep': ['Kavaratti', 'Minicoy'],
    'Madhya Pradesh': ['Bhopal', 'Indore', 'Jabalpur', 'Gwalior', 'Ujjain', 'Sagar'],
    'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Aurangabad', 'Solapur'],
    'Manipur': ['Imphal', 'Bishnupur', 'Thoubal', 'Churachandpur'],
    'Meghalaya': ['Shillong', 'Tura', 'Nongstoin', 'Jowai'],
    'Mizoram': ['Aizawl', 'Lunglei', 'Champhai', 'Serchhip'],
    'Nagaland': ['Kohima', 'Dimapur', 'Mokokchung', 'Tuensang'],
    'Odisha': ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Berhampur', 'Sambalpur', 'Puri'],
    'Puducherry': ['Puducherry', 'Karaikal', 'Yanam', 'Mahe'],
    'Punjab': ['Chandigarh', 'Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda'],
    'Rajasthan': ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Bikaner', 'Ajmer'],
    'Sikkim': ['Gangtok', 'Namchi', 'Mangan', 'Gyalshing'],
    'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Salem', 'Tiruchirappalli', 'Tirunelveli'],
    'Telangana': ['Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar', 'Khammam', 'Nalgonda'],
    'Tripura': ['Agartala', 'Udaipur', 'Dharmanagar', 'Kailashahar'],
    'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Varanasi', 'Agra', 'Prayagraj', 'Ghaziabad'],
    'Uttarakhand': ['Dehradun', 'Haridwar', 'Nainital', 'Rishikesh', 'Haldwani'],
    'West Bengal': ['Kolkata', 'Howrah', 'Darjeeling', 'Siliguri', 'Asansol', 'Bardhaman'],
  };

  // Sync state values on load
  useEffect(() => {
    setName(profile.name || '');
    setPhone(profile.phone || '');
    setState(profile.state || 'Andhra Pradesh');
    setDistrict(profile.district || 'Visakhapatnam');
  }, [profile]);

  const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const s = e.target.value;
    setState(s);
    // Set default district for selected state
    const dList = districtsMap[s] || [];
    if (dList.length > 0) {
      setDistrict(dList[0]);
    }
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
              className="w-full text-xs p-3 rounded-2xl border border-gray-150 bg-gray-50 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-50 focus:outline-none focus:border-primary-500"
            >
              {(districtsMap[state] || []).map((d) => (
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

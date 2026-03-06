import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { User, Calendar, ShieldCheck } from 'lucide-react';

export default function Profile() {
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // If there's a public profiles table, we'd query it here.
                // For now, since Supabase Auth handles metadata directly, we can use user metadata.
                // E.g., user.user_metadata.full_name
                setProfileData({
                    name: user.user_metadata?.full_name || user.user_metadata?.name || 'Unnamed Agent',
                    email: user.email,
                    created_at: new Date(user.created_at),
                    role: 'user'
                });
            }
            setLoading(false);
        };
        fetchProfile();
    }, []);

    if (loading) {
        return <div className="p-10 text-center text-brand-400">Loading profile data...</div>;
    }

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white">Agent Personnel File</h1>
            </div>

            <div className="glass-panel overflow-hidden rounded-2xl">
                <div className="p-8 sm:p-10">
                    <div className="sm:flex sm:items-center sm:justify-between">
                        <div className="sm:flex sm:space-x-5">
                            <div className="flex-shrink-0">
                                <div className="h-24 w-24 rounded-full bg-brand-800 border-4 border-brand-900 flex items-center justify-center shadow-inner">
                                    <User className="h-10 w-10 text-brand-400" />
                                </div>
                            </div>
                            <div className="mt-4 text-center sm:mt-0 sm:pt-1 sm:text-left">
                                <p className="text-sm font-medium text-brand-400">Welcome back,</p>
                                <p className="text-2xl font-bold text-white sm:text-3xl">{profileData?.name}</p>
                                <p className="text-sm font-medium text-brand-300 flex items-center gap-1.5 mt-2 justify-center sm:justify-start">
                                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                                    Status: Active / Clear
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="border-t border-border bg-surface-hover/20 px-4 py-5 sm:p-0">
                    <dl className="sm:divide-y sm:divide-border">
                        <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-10">
                            <dt className="text-sm font-medium text-brand-300">Email address</dt>
                            <dd className="mt-1 text-sm text-white sm:mt-0 sm:col-span-2">{profileData?.email}</dd>
                        </div>
                        <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-10">
                            <dt className="text-sm font-medium text-brand-300 flex items-center gap-2">
                                <Calendar className="w-4 h-4" /> Access Granted
                            </dt>
                            <dd className="mt-1 text-sm text-white sm:mt-0 sm:col-span-2">
                                {profileData?.created_at?.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </dd>
                        </div>
                        <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-10">
                            <dt className="text-sm font-medium text-brand-300">Account Type</dt>
                            <dd className="mt-1 text-sm text-white sm:mt-0 sm:col-span-2 capitalize">
                                {profileData?.role || 'User'} Level Access
                            </dd>
                        </div>
                    </dl>
                </div>
            </div>
        </div>
    );
}

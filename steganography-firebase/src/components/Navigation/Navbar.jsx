import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { Shield, LogOut, User as UserIcon, LayoutDashboard, Fingerprint } from 'lucide-react';

export default function Navbar({ session }) {
    const navigate = useNavigate();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/');
    };

    return (
        <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center">
                        <Link to="/" className="flex items-center gap-2 text-brand-100 hover:text-white transition-colors">
                            <div className="bg-brand-600 p-1.5 rounded-lg">
                                <Shield className="w-5 h-5 text-white" />
                            </div>
                            <span className="font-bold text-xl tracking-wide">Stegano<span className="text-brand-500 font-light">Pro</span></span>
                        </Link>
                    </div>

                    <div className="flex items-center gap-4">
                        {session ? (
                            <>
                                <Link to="/dashboard" className="text-brand-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 transition-colors">
                                    <LayoutDashboard className="w-4 h-4" />
                                    Dashboard
                                </Link>
                                <Link to="/profile" className="text-brand-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 transition-colors">
                                    <UserIcon className="w-4 h-4" />
                                    Profile
                                </Link>
                                <div className="h-6 w-px bg-border mx-2 border-r border-slate-700"></div>
                                <button
                                    onClick={handleLogout}
                                    className="text-brand-300 hover:text-red-400 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 transition-colors"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Sign out
                                </button>
                            </>
                        ) : (
                            <>
                                <Link to="/login" className="text-brand-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">
                                    Log in
                                </Link>
                                <Link
                                    to="/register"
                                    className="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-md shadow-brand-900/30 flex items-center gap-1.5"
                                >
                                    <Fingerprint className="w-4 h-4" />
                                    Get Started
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}

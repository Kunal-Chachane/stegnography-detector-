import React from 'react';
import { Shield } from 'lucide-react';

export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="w-full bg-surface/50 border-t border-border mt-auto backdrop-blur-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-brand-400">
                        <Shield className="w-4 h-4" />
                        <span className="text-sm font-medium tracking-wide">Stegano<span className="text-brand-600 font-light">Pro</span></span>
                    </div>

                    <div className="text-sm text-brand-300">
                        Developed by <span className="font-semibold text-white">Kunal Chachane</span> and <span className="font-semibold text-white">Ansh Jagnit</span>
                    </div>

                    <div className="text-sm text-brand-500">
                        &copy; {currentYear} All Rights Reserved
                    </div>
                </div>
            </div>
        </footer>
    );
}

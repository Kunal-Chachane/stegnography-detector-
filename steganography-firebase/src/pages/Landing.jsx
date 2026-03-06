import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, EyeOff, LockKeyhole, ArrowRight } from 'lucide-react';

export default function Landing() {
    return (
        <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-center relative overflow-hidden">

            {/* Background decoration */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-600/20 blur-[120px] rounded-full pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/20 blur-[120px] rounded-full pointer-events-none"></div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative z-10 w-full">
                <div className="text-center max-w-4xl mx-auto">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-900/50 border border-brand-700/50 text-brand-300 text-sm font-medium mb-8">
                        <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></span>
                        Enterprise-Grade Steganography
                    </div>

                    <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 text-white leading-tight">
                        Secure your data in <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-300 to-brand-600">
                            plain sight.
                        </span>
                    </h1>

                    <p className="mt-4 text-xl text-brand-200 mb-10 max-w-2xl mx-auto leading-relaxed">
                        The most advanced AI-powered platform for hiding confidential information within images using cryptographic LSB steganography algorithms.
                    </p>

                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <Link to="/register" className="btn-primary group">
                            Start Securing Now
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </Link>
                        <Link to="/login" className="btn-secondary">
                            Sign In to Dashboard
                        </Link>
                    </div>
                </div>

                <div className="mt-32 grid md:grid-cols-3 gap-8 text-center max-w-5xl mx-auto">
                    <div className="glass-panel p-8 rounded-2xl">
                        <div className="mx-auto w-12 h-12 bg-brand-900/80 rounded-xl flex items-center justify-center mb-6">
                            <EyeOff className="w-6 h-6 text-brand-400" />
                        </div>
                        <h3 className="text-xl font-semibold mb-3">Undetectable Output</h3>
                        <p className="text-brand-300/80 text-sm leading-relaxed">
                            Our advanced algorithm modifies the lowest bits of image channels, ensuring the hidden payload is visually imperceptible to the naked eye.
                        </p>
                    </div>

                    <div className="glass-panel p-8 rounded-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-600 to-transparent"></div>
                        <div className="mx-auto w-12 h-12 bg-brand-900/80 rounded-xl flex items-center justify-center mb-6">
                            <LockKeyhole className="w-6 h-6 text-brand-400" />
                        </div>
                        <h3 className="text-xl font-semibold mb-3">Military-Grade Security</h3>
                        <p className="text-brand-300/80 text-sm leading-relaxed">
                            Every interaction is protected under a robust authentication layer. Only you have the key to encode or decode your private information.
                        </p>
                    </div>

                    <div className="glass-panel p-8 rounded-2xl">
                        <div className="mx-auto w-12 h-12 bg-brand-900/80 rounded-xl flex items-center justify-center mb-6">
                            <Shield className="w-6 h-6 text-brand-400" />
                        </div>
                        <h3 className="text-xl font-semibold mb-3">Serverless Privacy</h3>
                        <p className="text-brand-300/80 text-sm leading-relaxed">
                            Your payloads stay fully encrypted in your device's memory. The steganography engine runs 100% client-side for maximum confidentiality.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

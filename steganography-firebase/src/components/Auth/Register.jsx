import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { UserPlus, AlertCircle } from 'lucide-react';

export default function Register() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');

        if (password.length < 8) {
            return setError('Password must be at least 8 characters long.');
        }
        if (password !== confirmPassword) {
            return setError('Passwords do not match.');
        }

        setLoading(true);

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            // Create user profile document in Firestore
            await setDoc(doc(db, 'users', userCredential.user.uid), {
                name: name,
                email: email,
                created_at: new Date(),
                last_login: new Date(),
                role: 'user'
            });
            navigate('/dashboard');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex-grow flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 glass-panel p-10 rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-600 to-transparent"></div>

                <div className="text-center">
                    <div className="mx-auto w-12 h-12 bg-brand-900/80 rounded-xl flex items-center justify-center mb-6">
                        <UserPlus className="w-6 h-6 text-brand-400" />
                    </div>
                    <h2 className="text-3xl font-extrabold text-white tracking-tight">Create Account</h2>
                    <p className="mt-2 text-sm text-brand-300">
                        Or <Link to="/login" className="font-medium text-brand-500 hover:text-brand-400 transition-colors">sign in to an existing account</Link>
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleRegister}>
                    {error && (
                        <div className="bg-red-900/30 border border-red-500/50 p-4 rounded-lg flex items-start gap-3 text-red-200">
                            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <p className="text-sm">{error}</p>
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-brand-200 mb-1">Full Name</label>
                            <input
                                type="text"
                                required
                                className="input-field"
                                placeholder="Agent Smith"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-brand-200 mb-1">Email address</label>
                            <input
                                type="email"
                                required
                                className="input-field"
                                placeholder="Secure email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-brand-200 mb-1">Password</label>
                            <input
                                type="password"
                                required
                                className="input-field"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-brand-200 mb-1">Confirm Password</label>
                            <input
                                type="password"
                                required
                                className="input-field"
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full btn-primary"
                    >
                        {loading ? 'Registering...' : 'Secure Registration'}
                    </button>
                </form>
            </div>
        </div>
    );
}

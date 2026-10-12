import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import { FiLock, FiUser, FiLogIn, FiAlertCircle } from 'react-icons/fi';

const LoginPage = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const { login, loading, error } = useAuthStore();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!username || !password) return;

        const res = await login(username, password);
        if (res.success) {
            if (res.user.role === 'admin') {
                navigate('/admin');
            } else if (res.user.role === 'caja') {
                navigate('/caja');
            } else {
                navigate('/sales');
            }
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 select-none relative overflow-hidden">
            {/* Ambient background glow */}
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl shadow-slate-950/20 p-8 relative z-10 border border-slate-200/80">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/25 mb-4 font-black text-xl tracking-wider">
                        STK
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Acceso al Sistema</h1>
                    <p className="text-sm text-slate-600 mt-1">Ingresa tus credenciales para operar en el punto de venta</p>
                </div>

                {error && (
                    <div className="mb-6 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-3">
                        <FiAlertCircle className="text-lg flex-shrink-0 text-red-600" />
                        <span className="font-medium">{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                            Usuario
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                <FiUser className="text-base" />
                            </div>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Ej: admin o tu usuario"
                                required
                                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50/70 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-colors text-slate-900 text-sm placeholder:text-slate-400"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                            Contraseña
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                <FiLock className="text-base" />
                            </div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50/70 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-colors text-slate-900 text-sm placeholder:text-slate-400"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full mt-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <>
                                <FiLogIn className="text-lg" />
                                <span>Ingresar al Sistema</span>
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-8 pt-5 border-t border-slate-100 text-xs text-slate-600 text-center space-y-1">
                    <p className="font-semibold text-slate-700">Cuentas disponibles para pruebas:</p>
                    <p>• Admin: <span className="font-medium text-slate-800">admin</span> / <span className="font-medium text-slate-800">admin123</span></p>
                    <p>• Empleado: <span className="font-medium text-slate-800">empleado</span> / <span className="font-medium text-slate-800">empleado123</span></p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;

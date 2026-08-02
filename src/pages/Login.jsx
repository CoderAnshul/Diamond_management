import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiUser, FiLock } from 'react-icons/fi';
import toast from 'react-hot-toast';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    const result = await login(data.username, data.password);
    setLoading(false);

    if (result.success) {
      toast.success('Logged in successfully');
      navigate('/');
    } else {
      toast.error(result.error || 'Invalid credentials');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 light:bg-zinc-100 p-4 relative overflow-hidden transition-colors duration-300">
      
      {/* Decorative Orbs */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl"></div>

      <div className="w-full max-w-md glass-panel rounded-3xl p-8 relative z-10 shadow-2xl border border-zinc-800/80 light:border-zinc-200/80 flex flex-col items-center">
        
        {/* Logo */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white font-extrabold text-3xl shadow-xl shadow-emerald-500/15 mb-4">
          D
        </div>
        
        <h2 className="text-2xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-400">
          DIAMOND LOCKER
        </h2>
        <p className="text-xs text-zinc-500 light:text-zinc-400 tracking-wide font-semibold mt-1 mb-8 uppercase">
          Locker Management System
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="w-full space-y-5">
          {/* Username Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-400 light:text-zinc-600 tracking-wider uppercase">
              Username
            </label>
            <div className="relative flex items-center">
              <FiUser className="absolute left-3 text-zinc-500" />
              <input
                type="text"
                placeholder="Enter username"
                className={`w-full bg-zinc-900/60 light:bg-zinc-200/60 border ${
                  errors.username ? 'border-rose-500/50' : 'border-zinc-850 light:border-zinc-300'
                } focus:border-emerald-500 rounded-xl py-3 pl-10 pr-4 text-sm font-medium outline-none transition-all placeholder-zinc-600 light:placeholder-zinc-400`}
                {...register('username', { required: 'Username is required' })}
              />
            </div>
            {errors.username && (
              <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wide">
                {errors.username.message}
              </span>
            )}
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-400 light:text-zinc-600 tracking-wider uppercase">
              Password
            </label>
            <div className="relative flex items-center">
              <FiLock className="absolute left-3 text-zinc-500" />
              <input
                type="password"
                placeholder="Enter password"
                className={`w-full bg-zinc-900/60 light:bg-zinc-200/60 border ${
                  errors.password ? 'border-rose-500/50' : 'border-zinc-850 light:border-zinc-300'
                } focus:border-emerald-500 rounded-xl py-3 pl-10 pr-4 text-sm font-medium outline-none transition-all placeholder-zinc-600 light:placeholder-zinc-400`}
                {...register('password', { required: 'Password is required' })}
              />
            </div>
            {errors.password && (
              <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wide">
                {errors.password.message}
              </span>
            )}
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-semibold py-3.5 rounded-xl text-sm transition-all duration-200 shadow-lg shadow-emerald-500/20 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-8 text-center text-[10px] text-zinc-600 light:text-zinc-400 font-semibold tracking-wider uppercase">
          Audit Enabled • Secure JWT Session
        </div>
      </div>
    </div>
  );
};

export default Login;

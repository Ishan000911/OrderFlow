import { zodResolver } from '@hookform/resolvers/zod';
import { Package } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '../../context/AuthContext.jsx';
import { api } from '../../lib/api.js';

const loginSchema = z.object({ email: z.email('Enter a valid email.'), password: z.string().min(1, 'Password is required.') });
const registerSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name.'),
  email: z.email('Enter a valid email.'),
  password: z.string().min(6, 'Use at least 6 characters.').regex(/[A-Z]/, 'Add an uppercase letter.').regex(/[a-z]/, 'Add a lowercase letter.').regex(/\d/, 'Add a number.'),
});

function AuthFrame({ title, subtitle, children }) {
  return <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl lg:grid-cols-2"><div className="flex items-center justify-center px-4 py-12"><div className="w-full max-w-md"><Link to="/" className="mb-8 inline-flex items-center gap-2 font-bold"><span className="grid size-9 place-items-center rounded-xl bg-brand-600 text-white"><Package size={18}/></span>OrderFlow</Link><h1 className="text-3xl font-bold">{title}</h1><p className="mt-2 text-slate-500">{subtitle}</p>{children}</div></div><div className="m-4 hidden overflow-hidden rounded-3xl bg-brand-900 lg:block"><img className="size-full object-cover opacity-80" src="https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=85" alt="Modern workspace"/></div></div>;
}

const Field = ({ register, errors, name, label, type = 'text' }) => <label><span className="label">{label}</span><input className="field" type={type} {...register(name)}/>{errors[name] && <span className="mt-1 block text-xs text-red-600">{errors[name].message}</span>}</label>;

export function LoginPage() {
  const { login } = useAuth(); const nav = useNavigate(); const [serverError, setServerError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(loginSchema) });
  const submit = async (values) => { try { setServerError(''); await login(values); nav('/'); } catch (error) { setServerError(error.message); } };
  return <AuthFrame title="Welcome back" subtitle="Sign in to continue to your account."><form className="mt-8 space-y-4" onSubmit={handleSubmit(submit)}><Field register={register} errors={errors} name="email" label="Email" type="email"/><Field register={register} errors={errors} name="password" label="Password" type="password"/>{serverError && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{serverError}</p>}<button disabled={isSubmitting} className="btn-primary w-full">{isSubmitting ? 'Signing in…' : 'Sign in'}</button></form><p className="mt-6 text-center text-sm text-slate-500">New here? <Link className="font-semibold text-brand-700" to="/register">Create an account</Link></p></AuthFrame>;
}

export function RegisterPage() {
  const nav = useNavigate(); const [serverError, setServerError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(registerSchema) });
  const submit = async (values) => { try { setServerError(''); await api.post('/auth/register', values); nav('/login'); } catch (error) { setServerError(error.message); } };
  return <AuthFrame title="Create your account" subtitle="Start shopping with persistent carts and clear order tracking."><form className="mt-8 space-y-4" onSubmit={handleSubmit(submit)}><Field register={register} errors={errors} name="name" label="Full name"/><Field register={register} errors={errors} name="email" label="Email" type="email"/><Field register={register} errors={errors} name="password" label="Password" type="password"/>{serverError && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{serverError}</p>}<button disabled={isSubmitting} className="btn-primary w-full">{isSubmitting ? 'Creating account…' : 'Create account'}</button></form><p className="mt-6 text-center text-sm text-slate-500">Already have an account? <Link className="font-semibold text-brand-700" to="/login">Sign in</Link></p></AuthFrame>;
}

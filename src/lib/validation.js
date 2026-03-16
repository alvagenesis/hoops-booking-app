import { z } from 'zod';

// Phone: optional, but if provided must be a valid format
const phoneRegex = /^(\+?\d{1,3}[-.\s]?)?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}$/;

export const signupSchema = z.object({
    firstName: z.string().min(1, 'First name is required').max(50),
    lastName: z.string().min(1, 'Last name is required').max(50),
    phone: z.string().regex(phoneRegex, 'Invalid phone number').or(z.literal('')).optional(),
    address: z.string().max(200).optional(),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
});

export const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
    email: z.string().email('Invalid email address'),
});

export const profileSchema = z.object({
    firstName: z.string().min(1, 'First name is required').max(50),
    lastName: z.string().min(1, 'Last name is required').max(50),
    phone: z.string().regex(phoneRegex, 'Invalid phone number').or(z.literal('')).optional(),
    address: z.string().max(200).optional(),
});

export const bookingSchema = z.object({
    title: z.string().min(1, 'Title is required').max(100),
    notes: z.string().max(500).optional(),
});

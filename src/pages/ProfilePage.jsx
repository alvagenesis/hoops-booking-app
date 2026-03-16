import { useState, useRef } from 'react';
import { User, Phone, MapPin, Save, Loader2, Camera } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useAuth } from '../hooks/useAuth';
import { profileSchema } from '../lib/validation';

const ProfilePage = () => {
    const { profile, updateProfile, uploadAvatar, displayName } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});
    const [avatarUploading, setAvatarUploading] = useState(false);
    const fileInputRef = useRef(null);

    const handleAvatarChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            setError('Please select an image file (JPEG, PNG, etc.)');
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            setError('Image must be under 2 MB.');
            return;
        }
        setAvatarUploading(true);
        setError('');
        try {
            await uploadAvatar(file);
            setSuccess('Avatar updated!');
        } catch (err) {
            setError(err.message || 'Avatar upload failed.');
        } finally {
            setAvatarUploading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setFieldErrors({});
        setSuccess('');
        setLoading(true);

        const form = e.target;
        const data = {
            firstName: form.firstName.value,
            lastName: form.lastName.value,
            phone: form.phone.value || '',
            address: form.address.value || '',
        };

        const result = profileSchema.safeParse(data);
        if (!result.success) {
            setFieldErrors(Object.fromEntries(result.error.issues.map(i => [i.path[0], i.message])));
            setLoading(false);
            return;
        }

        try {
            await updateProfile({
                first_name: data.firstName,
                last_name: data.lastName,
                phone: data.phone,
                address: data.address,
            });
            setSuccess('Profile updated successfully!');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <div className="relative group">
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={avatarUploading}
                        className="w-16 h-16 rounded-full bg-blue-600/20 border-2 border-blue-500/30 flex items-center justify-center overflow-hidden relative hover:border-blue-400 transition-colors cursor-pointer"
                    >
                        {profile?.avatar_url ? (
                            <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-blue-400 font-bold text-xl">
                                {displayName?.charAt(0)?.toUpperCase() || 'U'}
                            </span>
                        )}
                        {avatarUploading && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                <Loader2 className="w-5 h-5 text-white animate-spin" />
                            </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Camera className="w-5 h-5 text-white" />
                        </div>
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className="hidden"
                    />
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-gray-100">Profile Settings</h2>
                    <p className="text-sm text-gray-500">Click avatar to upload a photo</p>
                </div>
            </div>

            <div className="bg-[#111116] border border-gray-800 rounded-xl p-6">
                {error && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                        {error}
                    </div>
                )}
                {success && (
                    <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm">
                        {success}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <Input
                                label="First Name"
                                name="firstName"
                                placeholder="John"
                                icon={User}
                                defaultValue={profile?.first_name || ''}
                                required
                            />
                            {fieldErrors.firstName && <p className="text-red-400 text-xs mt-1">{fieldErrors.firstName}</p>}
                        </div>
                        <div>
                            <Input
                                label="Last Name"
                                name="lastName"
                                placeholder="Doe"
                                icon={User}
                                defaultValue={profile?.last_name || ''}
                                required
                            />
                            {fieldErrors.lastName && <p className="text-red-400 text-xs mt-1">{fieldErrors.lastName}</p>}
                        </div>
                    </div>

                    <div>
                        <Input
                            label="Phone Number"
                            name="phone"
                            type="tel"
                            placeholder="+63 912 345 6789"
                            icon={Phone}
                            defaultValue={profile?.phone || ''}
                        />
                        {fieldErrors.phone && <p className="text-red-400 text-xs mt-1">{fieldErrors.phone}</p>}
                    </div>

                    <div>
                        <Input
                            label="Complete Address"
                            name="address"
                            placeholder="123 Street, City"
                            icon={MapPin}
                            defaultValue={profile?.address || ''}
                        />
                        {fieldErrors.address && <p className="text-red-400 text-xs mt-1">{fieldErrors.address}</p>}
                    </div>

                    <div className="pt-2">
                        <Button type="submit" className="gap-2" disabled={loading}>
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {loading ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProfilePage;

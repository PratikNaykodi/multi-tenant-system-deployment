import { useEffect, useState } from "react";
import { getCurrentUser } from "../../users/services/userService";
import { useAuth } from "../../../context/AuthContext";
import { toast } from "react-toastify";
import "./ProfilePage.css";

const ProfilePage = () => {
    const {
        user,
        tenant
    } = useAuth();

    const [profile, setProfile] =
        useState(null);

    const [loading, setLoading] =
        useState(true);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            setLoading(true);
            const response = await getCurrentUser();

            setProfile(
                response.user || response
            );
        } catch (error) {
            console.error( "Load profile error:", error );

            toast.error(
                error?.response?.data?.message ||
                "Unable to load profile"
            );
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="profile-page">
                <div className="profile-loading">
                    Loading profile...
                </div>
            </div>
        );
    }

    const profileData = profile || user;

    return (
        <div className="profile-page">
            {/* =========================================
                HEADER
            ========================================== */}
            <div className="profile-page-header">
                <div>
                    <h1>
                        My Profile
                    </h1>
                    <p>
                        View your account information
                    </p>
                </div>
            </div>

            {/* =========================================
                PROFILE CARD
            ========================================== */}
            <div className="profile-card">
                <div className="profile-avatar">
                    {profileData?.name
                        ?.charAt(0)
                        ?.toUpperCase() || "U"}
                </div>

                <div className="profile-details">
                    <div className="profile-field">
                        <label>
                            Name
                        </label>
                        <div>
                            {profileData?.name || "-"}
                        </div>
                    </div>

                    <div className="profile-field">
                        <label>
                            Email
                        </label>
                        <div>
                            {profileData?.email || "-"}
                        </div>
                    </div>

                    <div className="profile-field">
                        <label>
                            Role
                        </label>
                        <div className="profile-role">
                            {profileData?.role || "-"}
                        </div>
                    </div>

                    <div className="profile-field">
                        <label>
                            Tenant
                        </label>
                        <div>
                            {tenant?.name || "-"}
                        </div>
                    </div>

                    <div className="profile-field">
                        <label>
                            Tenant Identifier
                        </label>
                        <div>
                            {tenant?.identifier || "-"}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;